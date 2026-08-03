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

  const { phone, text, phones } = req.body || {};

  // Support single phone string or array of phones
  let targetPhones = [];
  if (Array.isArray(phones) && phones.length > 0) {
    targetPhones = phones;
  } else if (phone) {
    targetPhones = [phone];
  }

  if (targetPhones.length === 0 || !text) {
    return res.status(400).json({ error: 'Mangler mottakertelefon (phone/phones) eller meldingstekst (text).' });
  }

  const username = process.env.TEXTMAGIC_USERNAME || 'HKMmelding';
  const apiKey = process.env.TEXTMAGIC_API_KEY || 'qyaL8YBWbcb3PC9rP4xerf5GmBIHpa';

  if (!username || !apiKey) {
    return res.status(500).json({ error: 'TextMagic API-nøkler er ikke konfigurert.' });
  }

  // Format phone numbers to E.164 (ensure +47 prefix for Norwegian numbers if missing)
  const formattedPhones = targetPhones.map(p => {
    let clean = String(p).trim().replace(/[^0-9+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.length === 8) {
        clean = '+47' + clean;
      } else if (clean.startsWith('47') && clean.length === 10) {
        clean = '+' + clean;
      }
    }
    return clean;
  }).join(',');

  try {
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('phones', formattedPhones);

    const tmResponse = await fetch('https://rest.textmagic.com/api/v2/messages', {
      method: 'POST',
      headers: {
        'X-TM-Username': username,
        'X-TM-Key': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await tmResponse.json();

    if (!tmResponse.ok) {
      return res.status(tmResponse.status).json({
        error: data.message || 'Feil ved sending av SMS via TextMagic',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data.id,
      recipientsCount: data.recipientsCount || targetPhones.length,
      partsCount: data.partsCount || 1,
      totalCost: data.totalCost || 0,
      data
    });
  } catch (err) {
    console.error('TextMagic SMS Error:', err);
    return res.status(500).json({ error: err.message || 'Kunne ikke kontakte TextMagic API' });
  }
}
