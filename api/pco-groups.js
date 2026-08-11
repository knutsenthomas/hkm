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
      const groupsRes = await fetch('https://api.planningcenteronline.com/groups/v2/groups?include=location,group_type&per_page=100', {
        headers: { Authorization: authHeader }
      });
      const data = await groupsRes.json();

      if (!groupsRes.ok) {
        return res.status(groupsRes.status).json({ 
          error: data.errors?.[0]?.detail || 'Planning Center Groups API error', 
          details: data 
        });
      }

      const locationsMap = {};
      const groupTypesMap = {};

      if (Array.isArray(data.included)) {
        data.included.forEach(inc => {
          if (inc.type === 'Location') {
            locationsMap[inc.id] = inc.attributes;
          } else if (inc.type === 'GroupType') {
            groupTypesMap[inc.id] = inc.attributes;
          }
        });
      }

      const rawGroups = data.data || [];
      const groups = await Promise.all(rawGroups.map(async g => {
        const locRel = g.relationships?.location?.data;
        const typeRel = g.relationships?.group_type?.data;

        let membersCount = g.attributes?.members_count || 0;
        let membersList = [];
        try {
          const memRes = await fetch(`https://api.planningcenteronline.com/groups/v2/groups/${g.id}/memberships?include=person&per_page=100`, {
            headers: { Authorization: authHeader }
          });
          const memData = await memRes.json();
          if (memRes.ok && memData.data) {
            membersCount = memData.meta?.total_count || memData.data.length;
            const personMap = {};
            if (Array.isArray(memData.included)) {
              memData.included.forEach(inc => {
                if (inc.type === 'Person') {
                  personMap[inc.id] = inc.attributes;
                }
              });
            }
            membersList = memData.data.map(m => {
              const pRel = m.relationships?.person?.data;
              const personAttrs = pRel && personMap[pRel.id] ? personMap[pRel.id] : {};
              const role = m.attributes?.role || 'member';
              const firstName = personAttrs.first_name || '';
              const lastName = personAttrs.last_name || '';
              return {
                id: m.id,
                personId: pRel?.id || null,
                name: `${firstName} ${lastName}`.trim() || 'Medlem',
                role: role === 'leader' ? 'Leder' : 'Medlem',
                email: personAttrs.primary_email_address || null
              };
            });
          }
        } catch (memErr) {
          console.warn(`Kunne ikke hente medlemmer for gruppe ${g.id}:`, memErr);
        }

        const isEnrollmentOpen = g.attributes?.enrollment_open === true && g.attributes?.enrollment_display_strategy !== 'closed';

        return {
          id: g.id,
          name: g.attributes?.name || 'Husgruppe',
          description: g.attributes?.description || '',
          schedule: g.attributes?.schedule || '',
          enrollmentOpen: isEnrollmentOpen,
          enrollmentStrategy: g.attributes?.enrollment_display_strategy || (isEnrollmentOpen ? 'open' : 'closed'),
          membersCount,
          members: membersList,
          headerImageUrl: g.attributes?.header_image?.medium || g.attributes?.header_image?.thumbnail || null,
          churchCenterUrl: g.attributes?.public_church_center_web_url || null,
          createdAt: g.attributes?.created_at,
          location: locRel && locationsMap[locRel.id] ? {
            name: locationsMap[locRel.id].name,
            fullAddress: locationsMap[locRel.id].full_formatted_address
          } : null,
          groupType: typeRel && groupTypesMap[typeRel.id] ? groupTypesMap[typeRel.id].name : null
        };
      }));

      return res.status(200).json({
        success: true,
        count: groups.length,
        groups
      });
    }

    if (req.method === 'DELETE' || (req.method === 'POST' && req.body?.action === 'delete')) {
      const membershipId = req.query?.membershipId || req.body?.membershipId;
      const groupId = req.query?.groupId || req.body?.groupId;

      if (!membershipId) {
        return res.status(400).json({ error: 'membershipId er påkrevd for utmelding.' });
      }

      const url = groupId 
        ? `https://api.planningcenteronline.com/groups/v2/groups/${groupId}/memberships/${membershipId}`
        : `https://api.planningcenteronline.com/groups/v2/memberships/${membershipId}`;

      const pcoRes = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: authHeader }
      });

      if (!pcoRes.ok && pcoRes.status !== 404) {
        return res.status(pcoRes.status).json({ error: 'Kunne ikke melde ut bruker fra Planning Center-gruppe.' });
      }

      return res.status(200).json({ success: true, membershipId });
    }

    if (req.method === 'POST') {
      const { groupId, personId, role = 'member' } = req.body || {};
      if (!groupId || !personId) {
        return res.status(400).json({ error: 'groupId og personId er påkrevd for innmelding i husgruppe.' });
      }

      const pcoRes = await fetch(`https://api.planningcenteronline.com/groups/v2/groups/${groupId}/memberships`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'Membership',
            attributes: { role },
            relationships: {
              person: {
                data: { type: 'Person', id: personId }
              }
            }
          }
        })
      });

      const resData = await pcoRes.json();
      if (!pcoRes.ok) {
        return res.status(pcoRes.status).json({ 
          error: resData.errors?.[0]?.detail || 'Kunne ikke melde inn bruker i Planning Center-gruppe.',
          details: resData 
        });
      }

      return res.status(200).json({
        success: true,
        membershipId: resData.data?.id,
        groupId,
        personId
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Planning Center Groups API Error:', err);
    return res.status(500).json({ error: err.message || 'Serverfeil ved koble mot Planning Center Groups' });
  }
}
