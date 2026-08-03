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
      const pcoRes = await fetch('https://api.planningcenteronline.com/people/v2/people?per_page=100&include=emails,phone_numbers', {
        headers: { Authorization: authHeader }
      });
      const data = await pcoRes.json();
      if (!pcoRes.ok) {
        return res.status(pcoRes.status).json({ error: data.errors?.[0]?.detail || 'Planning Center API error', details: data });
      }
      return res.status(200).json({ success: true, count: data.meta?.total_count || 0, data: data.data || [], included: data.included || [] });
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
            const syncRes = await createOrSyncPerson(authHeader, {
              firstName: fn,
              lastName: ln,
              email: c.email,
              phone: c.phone,
              createFollowupTask: false
            });
            if (syncRes.success) syncedCount++;
            results.push(syncRes);
          } catch (e) {
            console.warn('Bulk sync error for item:', c, e);
          }
        }
        return res.status(200).json({ success: true, syncedCount, total: body.contacts.length, results });
      }

      // Handle Single Contact Sync
      const { firstName, lastName, email, phone, note, createFollowupTask } = body;
      if (!firstName && !lastName) {
        return res.status(400).json({ error: 'firstName eller lastName er påkrevd.' });
      }

      const syncRes = await createOrSyncPerson(authHeader, { firstName, lastName, email, phone, note, createFollowupTask });
      return res.status(200).json(syncRes);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Planning Center People API Error:', err);
    return res.status(500).json({ error: err.message || 'Serverfeil ved koble mot Planning Center' });
  }
}

async function createOrSyncPerson(authHeader, { firstName, lastName, email, phone, note, createFollowupTask }) {
  const pcoRes = await fetch('https://api.planningcenteronline.com/people/v2/people', {
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
          last_name: lastName || ''
        }
      }
    })
  });

  const data = await pcoRes.json();
  if (!pcoRes.ok) {
    return { success: false, error: data.errors?.[0]?.detail || 'Kunne ikke opprette person i Planning Center', details: data };
  }

  const personId = data.data?.id;

  // Add email if provided
  if (email && personId) {
    await fetch(`https://api.planningcenteronline.com/people/v2/people/${personId}/emails`, {
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

  // Add phone if provided
  if (phone && personId) {
    let cleanPhone = String(phone).trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length === 8) {
      cleanPhone = '+47' + cleanPhone;
    }
    await fetch(`https://api.planningcenteronline.com/people/v2/people/${personId}/phone_numbers`, {
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
  if (createFollowupTask !== false && personId) {
    const workflowId = await ensureWorkflow(authHeader);
    if (workflowId) {
      taskData = await createWorkflowCard(authHeader, workflowId, personId, note || `Ny oppfølgingsoppgave for ${firstName} ${lastName}`.trim());
    }
  }

  return {
    success: true,
    person: data.data,
    taskCreated: !!taskData
  };
}

async function ensureWorkflow(authHeader) {
  try {
    const listRes = await fetch('https://api.planningcenteronline.com/people/v2/workflows', {
      headers: { Authorization: authHeader }
    });
    const listData = await listRes.json();
    let wf = (listData.data || []).find(w => w.attributes?.name === 'Oppfølging fra HKM Nettside');
    
    if (wf) return wf.id;

    const createRes = await fetch('https://api.planningcenteronline.com/people/v2/workflows', {
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
    const cardRes = await fetch(`https://api.planningcenteronline.com/people/v2/workflows/${workflowId}/cards`, {
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
