import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { meetingNumber, role } = req.body || {};

  if (!meetingNumber) {
    return res.status(400).json({ error: 'meetingNumber is required' });
  }

  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    return res.status(500).json({ 
      error: 'Zoom SDK credentials are not configured on the server. Please set ZOOM_SDK_KEY and ZOOM_SDK_SECRET.' 
    });
  }

  try {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sdkKey: sdkKey,
      mn: String(meetingNumber),
      role: parseInt(role || 0, 10),
      iat: iat,
      exp: exp,
      tokenExp: exp
    })).toString('base64url');

    const signature = crypto
      .createHmac('sha256', sdkSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const token = `${header}.${payload}.${signature}`;

    return res.status(200).json({ signature: token, sdkKey });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
