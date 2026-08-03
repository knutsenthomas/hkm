export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appId = process.env.PLANNING_CENTER_APP_ID;
  const secret = process.env.PLANNING_CENTER_SECRET;

  if (!appId || !secret) {
    return res.status(500).json({ error: 'Planning Center credentials are not configured.' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${appId}:${secret}`).toString('base64');

  try {
    // 1. Fetch Service Types
    const serviceTypesRes = await fetch('https://api.planningcenteronline.com/services/v2/service_types', {
      headers: { Authorization: authHeader }
    });
    const serviceTypesData = await serviceTypesRes.json();

    if (!serviceTypesRes.ok) {
      return res.status(serviceTypesRes.status).json({ error: serviceTypesData.errors?.[0]?.detail || 'Planning Center Services API error', details: serviceTypesData });
    }

    const serviceTypes = serviceTypesData.data || [];
    const allPlans = [];

    // 2. Fetch plans for each service type
    for (const st of serviceTypes) {
      const plansRes = await fetch(`https://api.planningcenteronline.com/services/v2/service_types/${st.id}/plans?per_page=10`, {
        headers: { Authorization: authHeader }
      });
      const plansData = await plansRes.json();
      if (plansRes.ok && plansData.data) {
        plansData.data.forEach(p => {
          allPlans.push({
            id: p.id,
            serviceTypeId: st.id,
            serviceTypeName: st.attributes?.name,
            dates: p.attributes?.dates,
            shortDates: p.attributes?.short_dates,
            sortDate: p.attributes?.sort_date,
            itemsCount: p.attributes?.items_count,
            url: p.attributes?.planning_center_url,
            title: p.attributes?.title || st.attributes?.name
          });
        });
      }
    }

    return res.status(200).json({
      success: true,
      serviceTypesCount: serviceTypes.length,
      plansCount: allPlans.length,
      serviceTypes: serviceTypes.map(st => ({ id: st.id, name: st.attributes?.name, frequency: st.attributes?.frequency })),
      plans: allPlans
    });
  } catch (err) {
    console.error('Planning Center Services API Error:', err);
    return res.status(500).json({ error: err.message || 'Serverfeil ved koble mot Planning Center Services' });
  }
}
