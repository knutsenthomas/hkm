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

  const { title, body, phone, text, type } = req.body || {};
  const token = process.env.PUSHBULLET_ACCESS_TOKEN || req.body?.token;

  if (!token) {
    return res.status(400).json({ error: 'PUSHBULLET_ACCESS_TOKEN er ikke oppgitt.' });
  }

  try {
    // If phone is provided, send SMS via Pushbullet texts API
    if (phone || text) {
      const smsMessage = text || body || '';
      const targetPhone = phone || '+4793094615';

      let cleanPhone = String(targetPhone).trim().replace(/[^0-9+]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.length === 8) {
          cleanPhone = '+47' + cleanPhone;
        } else if (cleanPhone.startsWith('47') && cleanPhone.length === 10) {
          cleanPhone = '+' + cleanPhone;
        }
      }

      // First fetch target device iden if not cached
      const devicesRes = await fetch('https://api.pushbullet.com/v2/devices', {
        headers: { 'Access-Token': token }
      });
      const devicesData = await devicesRes.json();
      const smsDevice = (devicesData.devices || []).find(d => d.has_sms && d.active);

      if (!smsDevice) {
        // Fallback: send as push note to phone
        const pushRes = await fetch('https://api.pushbullet.com/v2/pushes', {
          method: 'POST',
          headers: {
            'Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'note',
            title: title || 'HKM Varsel',
            body: `[SMS til ${cleanPhone}]\n${smsMessage}`
          })
        });
        const pushData = await pushRes.json();
        return res.status(200).json({ success: true, mode: 'push_note_fallback', data: pushData });
      }

      const pbSmsRes = await fetch('https://api.pushbullet.com/v2/texts', {
        method: 'POST',
        headers: {
          'Access-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            target_device_iden: smsDevice.iden,
            addresses: [cleanPhone],
            message: smsMessage
          }
        })
      });

      const pbSmsData = await pbSmsRes.json();
      return res.status(200).json({ success: true, mode: 'sms', device: smsDevice.model || smsDevice.nickname, data: pbSmsData });
    }

    // Default: Send direct Push Note to phone
    const pbRes = await fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'note',
        title: title || '💬 HKM Varsel',
        body: body || 'Ny henvendelse mottatt'
      })
    });

    const pbData = await pbRes.json();
    return res.status(200).json({ success: true, mode: 'push_note', data: pbData });
  } catch (err) {
    console.error('Pushbullet API Error:', err);
    return res.status(500).json({ error: err.message || 'Feil ved sending via Pushbullet API' });
  }
}
