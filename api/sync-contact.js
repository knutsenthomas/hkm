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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contacts } = req.body || {};

  // Support single contact or array of contacts
  let contactList = [];
  if (Array.isArray(contacts)) {
    contactList = contacts;
  } else if (req.body && (req.body.phone || req.body.phoneNumber)) {
    contactList = [req.body];
  }

  if (contactList.length === 0) {
    return res.status(400).json({ error: 'Mangler kontakter å synkronisere (phone/phoneNumber er påkrevd).' });
  }

  const username = process.env.TEXTMAGIC_USERNAME || 'HKMmelding';
  const apiKey = process.env.TEXTMAGIC_API_KEY || 'qyaL8YBWbcb3PC9rP4xerf5GmBIHpa';

  if (!username || !apiKey) {
    return res.status(500).json({ error: 'TextMagic API-nøkler er ikke konfigurert.' });
  }

  const results = [];
  const errors = [];

  for (const c of contactList) {
    const rawPhone = c.phone || c.phoneNumber || '';
    if (!rawPhone) continue;

    let cleanPhone = String(rawPhone).trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.length === 8) {
        cleanPhone = '+47' + cleanPhone;
      } else if (cleanPhone.startsWith('47') && cleanPhone.length === 10) {
        cleanPhone = '+' + cleanPhone;
      }
    }

    const fullName = (c.name || c.displayName || `${c.firstName || ''} ${c.lastName || ''}`).trim();
    const nameParts = fullName.split(' ');
    const firstName = c.firstName || nameParts[0] || 'Medlem';
    const lastName = c.lastName || nameParts.slice(1).join(' ') || '';

    try {
      const tmResponse = await fetch('https://rest.textmagic.com/api/v2/contacts', {
        method: 'POST',
        headers: {
          'X-TM-Username': username,
          'X-TM-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: cleanPhone,
          email: c.email || ''
        })
      });

      const data = await tmResponse.json();
      if (tmResponse.ok) {
        results.push({ phone: cleanPhone, id: data.id, name: fullName });
      } else {
        errors.push({ phone: cleanPhone, error: data.message || 'Feil fra TextMagic', details: data });
      }
    } catch (err) {
      errors.push({ phone: cleanPhone, error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    syncedCount: results.length,
    errorCount: errors.length,
    results,
    errors
  });
}
