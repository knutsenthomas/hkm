export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET request used for testing or verifying webhook status
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'active', message: 'HKM Planning Center Webhook Listener is ready.' });
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const { data, meta } = payload;
      
      console.log('Received Planning Center Webhook event:', meta?.name || data?.type, payload);

      // Respond immediately to PCO to confirm receipt (HTTP 200)
      res.status(200).json({ received: true });

      // Process event asynchronously if needed
      // Supported events: person.created, person.updated, group_membership.created, etc.
      return;
    } catch (err) {
      console.error('PCO Webhook processing error:', err);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
