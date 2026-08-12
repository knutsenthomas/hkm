export const maxDuration = 60; // Allow Vercel serverless function up to 60s

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const appId = process.env.PLANNING_CENTER_APP_ID;
  const secret = process.env.PLANNING_CENTER_SECRET;

  if (!appId || !secret) {
    return res.status(500).json({ error: 'Planning Center credentials are not configured.' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${appId}:${secret}`).toString('base64');

  try {
    if (req.method === 'GET') {
      const resource = req.query?.resource;

      if (resource === 'lists') {
        const listsRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/lists?per_page=100', {
          headers: { Authorization: authHeader }
        });
        const listsData = await listsRes.json();
        if (!listsRes.ok) {
          return res.status(listsRes.status).json({ error: listsData.errors?.[0]?.detail || 'Kunne ikke hente lister fra Planning Center' });
        }
        const lists = (listsData.data || []).map(l => ({
          id: l.id,
          name: l.attributes?.name || 'Liste',
          description: l.attributes?.description || '',
          totalResults: l.attributes?.total_results || 0,
          category: l.attributes?.category || 'Allmenn'
        }));
        return res.status(200).json({ success: true, count: lists.length, lists });
      }

      if (resource === 'tags') {
        const tagsRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/tags?per_page=100', {
          headers: { Authorization: authHeader }
        });
        const tagsData = await tagsRes.json();
        if (!tagsRes.ok) {
          return res.status(tagsRes.status).json({ error: tagsData.errors?.[0]?.detail || 'Kunne ikke hente etiketter fra Planning Center' });
        }
        const tags = (tagsData.data || []).map(t => ({
          id: t.id,
          name: t.attributes?.name || 'Etikett'
        }));
        return res.status(200).json({ success: true, count: tags.length, tags });
      }

      const pcoRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/people?per_page=100&include=emails,phone_numbers', {
        headers: { Authorization: authHeader }
      });
      const data = await pcoRes.json();
      if (!pcoRes.ok) {
        return res.status(pcoRes.status).json({ error: data.errors?.[0]?.detail || 'Planning Center API error', details: data });
      }
      return res.status(200).json({
        success: true,
        count: data.meta?.total_count || data.data?.length || 0,
        data: data.data || [],
        included: data.included || []
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      // Handle Bulk Sync Array
      if (Array.isArray(body.contacts)) {
        let syncedCount = 0;
        const results = [];

        for (const c of body.contacts) {
          const fn = c.firstName || (c.name ? c.name.split(' ')[0] : 'Medlem');
          const ln = c.lastName || (c.name ? c.name.split(' ').slice(1).join(' ') : '');
          try {
            const contactTags = Array.isArray(c.tags) ? c.tags : (Array.isArray(c.labels) ? c.labels : (c.label ? [c.label] : []));
            const syncRes = await createOrSyncPerson(authHeader, {
              firstName: fn,
              lastName: ln,
              email: c.email,
              phone: c.phone,
              tags: contactTags,
              createFollowupTask: false
            });
            if (syncRes && syncRes.success) syncedCount++;
            results.push(syncRes);
          } catch (e) {
            console.warn('Bulk sync item error:', c, e);
            results.push({ success: false, error: e.message });
          }
          // Small 150ms delay between items to respect Planning Center rate limits
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        return res.status(200).json({ success: true, syncedCount, total: body.contacts.length, results });
      }

      // Handle Single Contact Sync
      const { firstName, lastName, email, phone, tags, note, createFollowupTask } = body;
      if (!firstName && !lastName) {
        return res.status(400).json({ error: 'firstName eller lastName er påkrevd.' });
      }

      const syncRes = await createOrSyncPerson(authHeader, { firstName, lastName, email, phone, tags, note, createFollowupTask });
      return res.status(200).json(syncRes);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Planning Center People API Error:', err);
    return res.status(500).json({ error: err.message || 'Serverfeil ved koble mot Planning Center' });
  }
}

// Robust fetch helper with automatic 429 Rate Limit retries
async function fetchPCO(url, options, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const retryHeader = res.headers.get('retry-after');
      const waitMs = retryHeader ? parseInt(retryHeader, 10) * 1000 + 800 : 2500;
      console.warn(`PCO API Rate Limit 429 hit. Retrying in ${waitMs}ms (Attempt ${attempt + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return await fetch(url, options);
}

async function findExistingPerson(authHeader, firstName, lastName, email) {
  try {
    if (email) {
      const emailRes = await fetchPCO(`https://api.planningcenteronline.com/people/v2/people?where[search_name_or_email]=${encodeURIComponent(email)}`, {
        headers: { Authorization: authHeader }
      });
      const emailData = await emailRes.json();
      if (emailData.data && emailData.data.length > 0) {
        return emailData.data[0];
      }
    }
    if (firstName && lastName) {
      const nameRes = await fetchPCO(`https://api.planningcenteronline.com/people/v2/people?where[first_name]=${encodeURIComponent(firstName)}&where[last_name]=${encodeURIComponent(lastName)}`, {
        headers: { Authorization: authHeader }
      });
      const nameData = await nameRes.json();
      if (nameData.data && nameData.data.length > 0) {
        return nameData.data[0];
      }
    }
  } catch (err) {
    console.warn('Find existing person error:', err);
  }
  return null;
}

async function createOrSyncPerson(authHeader, { firstName, lastName, email, phone, tags, note, createFollowupTask }) {
  // Search for existing person first to avoid creating duplicates in Planning Center
  const existingPerson = await findExistingPerson(authHeader, firstName, lastName, email);
  let personId = existingPerson?.id;
  let personData = existingPerson;

  if (!personId) {
    const pcoRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/people', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          type: 'Person',
          attributes: {
            first_name: firstName || 'Medlem',
            last_name: lastName || '-'
          }
        }
      })
    });

    const data = await pcoRes.json();
    if (!pcoRes.ok) {
      const fallbackPerson = await findExistingPerson(authHeader, firstName, lastName, email);
      if (fallbackPerson?.id) {
        personId = fallbackPerson.id;
        personData = fallbackPerson;
      } else {
        return { success: false, error: data.errors?.[0]?.detail || 'Kunne ikke opprette person i Planning Center', details: data };
      }
    } else {
      personId = data.data?.id;
      personData = data.data;
    }
  }

  // Add email if provided and not already associated
  if (email && personId && !existingPerson) {
    await fetchPCO(`https://api.planningcenteronline.com/people/v2/people/${personId}/emails`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Email',
          attributes: { address: email, location: 'Home' }
        }
      })
    }).catch(() => {});
  }

  // Add phone if provided and not already associated
  if (phone && personId && !existingPerson) {
    let cleanPhone = String(phone).trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length === 8) {
      cleanPhone = '+47' + cleanPhone;
    }
    await fetchPCO(`https://api.planningcenteronline.com/people/v2/people/${personId}/phone_numbers`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'PhoneNumber',
          attributes: { number: cleanPhone, location: 'Mobile' }
        }
      })
    }).catch(() => {});
  }

  // Automatically create a Follow-up Workflow Task in Planning Center if requested
  let taskData = null;
  if (createFollowupTask !== false && personId && !existingPerson) {
    const workflowId = await ensureWorkflow(authHeader);
    if (workflowId) {
      taskData = await createWorkflowCard(authHeader, workflowId, personId, note || `Ny oppfølgingsoppgave for ${firstName} ${lastName}`.trim());
    }
  }

  // Sync tags/labels from HKM CRM to Planning Center People
  if (Array.isArray(tags) && tags.length > 0 && personId) {
    await syncPersonTags(authHeader, personId, tags);
  }

  return {
    success: true,
    person: personData,
    isExisting: !!existingPerson,
    taskCreated: !!taskData
  };
}

async function ensureWorkflow(authHeader) {
  try {
    const listRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/workflows', {
      headers: { Authorization: authHeader }
    });
    const listData = await listRes.json();
    let wf = (listData.data || []).find(w => w.attributes?.name === 'Oppfølging fra HKM Nettside');
    
    if (wf) return wf.id;

    const createRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/workflows', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Workflow',
          attributes: {
            name: 'Oppfølging fra HKM Nettside'
          }
        }
      })
    });
    const createData = await createRes.json();
    return createData.data?.id;
  } catch (err) {
    console.warn('Workflow creation warning:', err);
    return null;
  }
}

async function createWorkflowCard(authHeader, workflowId, personId, note = '') {
  if (!workflowId || !personId) return null;
  try {
    const cardRes = await fetchPCO(`https://api.planningcenteronline.com/people/v2/workflows/${workflowId}/cards`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'WorkflowCard',
          attributes: {
            note: note || 'Ny registrering/henvendelse fra HKM Nettside'
          },
          relationships: {
            person: {
              data: {
                type: 'Person',
                id: personId
              }
            }
          }
        }
      })
    });
    return await cardRes.json();
  } catch (err) {
    console.warn('Workflow card creation warning:', err);
    return null;
  }
}

async function syncPersonTags(authHeader, personId, tags = []) {
  if (!personId || !Array.isArray(tags) || tags.length === 0) return;

  try {
    const pcoTagsRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/tags?per_page=100', {
      headers: { Authorization: authHeader }
    });
    const pcoTagsData = await pcoTagsRes.json();
    const existingPcoTags = pcoTagsData.data || [];

    const personTaggingsRes = await fetchPCO(`https://api.planningcenteronline.com/people/v2/people/${personId}/taggings?include=tag`, {
      headers: { Authorization: authHeader }
    });
    const personTaggingsData = await personTaggingsRes.json();
    const existingTagIds = new Set((personTaggingsData.included || []).filter(inc => inc.type === 'Tag').map(t => t.id));

    let hkmGroupTagId = null;

    for (const rawTag of tags) {
      if (!rawTag || typeof rawTag !== 'string') continue;
      const tagName = rawTag.trim();
      if (!tagName) continue;

      let matchedTag = existingPcoTags.find(t => (t.attributes?.name || '').toLowerCase() === tagName.toLowerCase());

      if (!matchedTag) {
        if (!hkmGroupTagId) {
          hkmGroupTagId = await ensureHkmTagGroup(authHeader);
        }
        if (hkmGroupTagId) {
          matchedTag = await createPcoTag(authHeader, hkmGroupTagId, tagName);
          if (matchedTag) existingPcoTags.push(matchedTag);
        }
      }

      if (matchedTag && matchedTag.id && !existingTagIds.has(matchedTag.id)) {
        await fetchPCO(`https://api.planningcenteronline.com/people/v2/people/${personId}/taggings`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              type: 'Tagging',
              relationships: {
                tag: {
                  data: { type: 'Tag', id: matchedTag.id }
                }
              }
            }
          })
        }).catch(err => console.warn(`Kunne ikke tagge ${tagName} på person ${personId}:`, err));
        existingTagIds.add(matchedTag.id);
      }

      // Automatically ensure a matching List exists on the Planning Center Lists page
      await ensurePcoList(authHeader, tagName).catch(() => {});
    }
  } catch (err) {
    console.warn('syncPersonTags error:', err);
  }
}

async function ensureHkmTagGroup(authHeader) {
  try {
    const res = await fetchPCO('https://api.planningcenteronline.com/people/v2/tag_groups', {
      headers: { Authorization: authHeader }
    });
    const data = await res.json();
    const groups = data.data || [];
    const existingGroup = groups.find(g => (g.attributes?.name || '').toLowerCase() === 'hkm crm');
    if (existingGroup) return existingGroup.id;

    const createRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/tag_groups', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'TagGroup',
          attributes: { name: 'HKM CRM' }
        }
      })
    });
    const createData = await createRes.json();
    if (createRes.ok && createData.data?.id) {
      return createData.data.id;
    }

    if (groups.length > 0) {
      return groups[0].id;
    }

    return null;
  } catch (e) {
    console.warn('ensureHkmTagGroup error:', e);
    return null;
  }
}

async function createPcoTag(authHeader, tagGroupId, tagName) {
  try {
    const res = await fetchPCO(`https://api.planningcenteronline.com/people/v2/tag_groups/${tagGroupId}/tags`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Tag',
          attributes: { name: tagName }
        }
      })
    });
    const data = await res.json();
    return data.data;
  } catch (e) {
    console.warn(`createPcoTag error for ${tagName}:`, e);
    return null;
  }
}

async function ensurePcoList(authHeader, listName) {
  if (!listName) return null;
  try {
    const listRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/lists?per_page=100', {
      headers: { Authorization: authHeader }
    });
    const listData = await listRes.json();
    const existingLists = listData.data || [];
    const formattedName = `HKM - ${listName.trim()}`;

    const matchedList = existingLists.find(l => (l.attributes?.name || '').toLowerCase() === formattedName.toLowerCase() || (l.attributes?.name || '').toLowerCase() === listName.trim().toLowerCase());
    if (matchedList) return matchedList.id;

    const createRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/lists', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'List',
          attributes: {
            name: formattedName,
            description: `Automatisk synkronisert fra HKM CRM for etiketten ${listName}`
          }
        }
      })
    });
    const createData = await createRes.json();
    return createData.data?.id;
  } catch (e) {
    console.warn(`ensurePcoList error for ${listName}:`, e);
    return null;
  }
}
