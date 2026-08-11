export const maxDuration = 60;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
      const calRes = await fetch('https://api.planningcenteronline.com/calendar/v2/event_instances?include=event,tags&per_page=100', {
        headers: { Authorization: authHeader }
      });
      const data = await calRes.json();

      if (!calRes.ok) {
        return res.status(calRes.status).json({ 
          error: data.errors?.[0]?.detail || 'Planning Center Calendar API error', 
          details: data 
        });
      }

      const eventsMap = {};
      const tagsMap = {};

      if (Array.isArray(data.included)) {
        data.included.forEach(inc => {
          if (inc.type === 'Event') {
            eventsMap[inc.id] = inc.attributes;
          } else if (inc.type === 'Tag') {
            tagsMap[inc.id] = inc.attributes?.name;
          }
        });
      }

      const eventInstances = (data.data || []).map(ei => {
        const evRel = ei.relationships?.event?.data;
        const parentEvent = evRel && eventsMap[evRel.id] ? eventsMap[evRel.id] : {};

        return {
          id: ei.id,
          eventId: evRel?.id || null,
          name: ei.attributes?.summary || parentEvent.name || 'Menighetsarrangement',
          description: parentEvent.description || ei.attributes?.description || '',
          startAt: ei.attributes?.starts_at,
          endAt: ei.attributes?.ends_at,
          allDay: ei.attributes?.all_day || false,
          locationName: ei.attributes?.location || parentEvent.location || 'Håp for Alle / HKM',
          registrationUrl: parentEvent.registration_url || null,
          imageUrl: parentEvent.image_url || null,
          churchCenterUrl: parentEvent.church_center_url || null
        };
      });

      return res.status(200).json({
        success: true,
        count: eventInstances.length,
        events: eventInstances
      });
    }

    if (req.method === 'POST') {
      const { name, description, startAt, endAt, location } = req.body || {};
      if (!name || !startAt) {
        return res.status(400).json({ error: 'name og startAt er påkrevd for å opprette et arrangement i kalenderen.' });
      }

      const pcoRes = await fetch('https://api.planningcenteronline.com/calendar/v2/events', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'Event',
            attributes: {
              name,
              description: description || '',
              visible_in_church_center: true
            }
          }
        })
      });

      const resData = await pcoRes.json();
      if (!pcoRes.ok) {
        return res.status(pcoRes.status).json({ 
          error: resData.errors?.[0]?.detail || 'Kunne ikke opprette arrangement i Planning Center Calendar.',
          details: resData 
        });
      }

      return res.status(200).json({
        success: true,
        eventId: resData.data?.id,
        name: resData.data?.attributes?.name
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Planning Center Calendar API Error:', err);
    return res.status(500).json({ error: err.message || 'Serverfeil ved koble mot Planning Center Calendar' });
  }
}
