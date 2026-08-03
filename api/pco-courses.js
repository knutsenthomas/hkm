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
      // 1. Fetch Groups from Planning Center Groups API
      const groupsRes = await fetchPCO('https://api.planningcenteronline.com/groups/v2/groups', {
        headers: { Authorization: authHeader }
      });
      const groupsData = await groupsRes.json();

      // 2. Fetch Signups from Planning Center Registrations (Signups) API
      const signupsRes = await fetchPCO('https://api.planningcenteronline.com/registrations/v2/signups', {
        headers: { Authorization: authHeader }
      });
      const signupsData = await signupsRes.json();

      return res.status(200).json({
        success: true,
        groups: groupsData.data || [],
        pcoSignups: signupsData.data || []
      });
    }

    if (req.method === 'POST') {
      const { courseName, firstName, lastName, email, phone } = req.body || {};

      if (!courseName || (!firstName && !email)) {
        return res.status(400).json({ error: 'courseName og (firstName eller email) er påkrevd.' });
      }

      // 1. Sync person in Planning Center People
      const personRes = await syncPersonInPCO(authHeader, { firstName, lastName, email, phone });
      const personId = personRes.person?.id;

      if (!personId) {
        return res.status(500).json({ error: 'Kunne ikke opprette/koble person i Planning Center.' });
      }

      // 2. Check / Add to Planning Center Group
      const groupId = await ensureCourseGroup(authHeader, courseName);
      let membershipData = null;
      if (groupId) {
        membershipData = await addPersonToGroup(authHeader, groupId, personId);
      }

      // 3. Create Followup Workflow Task in Planning Center People
      const workflowId = await ensureWorkflow(authHeader);
      let taskData = null;
      if (workflowId) {
        taskData = await createWorkflowCard(authHeader, workflowId, personId, `Påmelding til kurs: "${courseName}"`);
      }

      return res.status(200).json({
        success: true,
        course: courseName,
        personId,
        groupId,
        addedToGroup: !!membershipData,
        taskCreated: !!taskData
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Planning Center Courses API Error:', err);
    return res.status(500).json({ error: err.message || 'Serverfeil ved koble mot Planning Center Courses' });
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

async function syncPersonInPCO(authHeader, { firstName, lastName, email, phone }) {
  const existingPerson = await findExistingPerson(authHeader, firstName, lastName, email);
  let personId = existingPerson?.id;
  let personData = existingPerson;

  if (!personId) {
    const pcoRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/people', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Person',
          attributes: {
            first_name: firstName || 'Kursdeltaker',
            last_name: lastName || ''
          }
        }
      })
    });
    const data = await pcoRes.json();
    if (!pcoRes.ok) return { success: false, error: data.errors?.[0]?.detail };
    personId = data.data?.id;
    personData = data.data;
  }

  if (email && personId && !existingPerson) {
    await fetchPCO(`https://api.planningcenteronline.com/people/v2/people/${personId}/emails`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { type: 'Email', attributes: { address: email, location: 'Home' } }
      })
    }).catch(() => {});
  }

  if (phone && personId && !existingPerson) {
    let cleanPhone = String(phone).trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length === 8) cleanPhone = '+47' + cleanPhone;
    await fetchPCO(`https://api.planningcenteronline.com/people/v2/people/${personId}/phone_numbers`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { type: 'PhoneNumber', attributes: { number: cleanPhone, location: 'Mobile' } }
      })
    }).catch(() => {});
  }

  return { success: true, person: personData };
}

async function ensureCourseGroup(authHeader, courseName) {
  try {
    const listRes = await fetchPCO('https://api.planningcenteronline.com/groups/v2/groups', {
      headers: { Authorization: authHeader }
    });
    const listData = await listRes.json();
    let group = (listData.data || []).find(g => g.attributes?.name?.toLowerCase() === courseName.toLowerCase());
    if (group) return group.id;

    // Get Group Type
    const typeRes = await fetchPCO('https://api.planningcenteronline.com/groups/v2/group_types', {
      headers: { Authorization: authHeader }
    });
    const typeData = await typeRes.json();
    const groupTypeId = typeData.data?.[0]?.id || 'unique';

    // Create Group
    const createRes = await fetchPCO('https://api.planningcenteronline.com/groups/v2/groups', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Group',
          attributes: { name: courseName },
          relationships: {
            group_type: { data: { type: 'GroupType', id: groupTypeId } }
          }
        }
      })
    });
    const createData = await createRes.json();
    return createData.data?.id;
  } catch (err) {
    console.warn('Ensure course group error:', err);
    return null;
  }
}

async function addPersonToGroup(authHeader, groupId, personId) {
  try {
    const res = await fetchPCO(`https://api.planningcenteronline.com/groups/v2/groups/${groupId}/memberships`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Membership',
          attributes: { role: 'member' },
          relationships: {
            person: { data: { type: 'Person', id: personId } }
          }
        }
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('Add person to group error:', err);
    return null;
  }
}

async function ensureWorkflow(authHeader) {
  try {
    const listRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/workflows', {
      headers: { Authorization: authHeader }
    });
    const listData = await listRes.json();
    let wf = (listData.data || []).find(w => w.attributes?.name === 'Kurspåmeldinger');
    if (wf) return wf.id;

    const createRes = await fetchPCO('https://api.planningcenteronline.com/people/v2/workflows', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Workflow',
          attributes: { name: 'Kurspåmeldinger' }
        }
      })
    });
    const createData = await createRes.json();
    return createData.data?.id;
  } catch (err) {
    return null;
  }
}

async function createWorkflowCard(authHeader, workflowId, personId, note = '') {
  try {
    const cardRes = await fetchPCO(`https://api.planningcenteronline.com/people/v2/workflows/${workflowId}/cards`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'WorkflowCard',
          attributes: { note },
          relationships: { person: { data: { type: 'Person', id: personId } } }
        }
      })
    });
    return await cardRes.json();
  } catch (err) {
    return null;
  }
}
