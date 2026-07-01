export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, playlistId, channelId, pageToken } = req.query;

  // Retrieve API Key from query params or env variables
  const apiKey = req.query.key || process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    res.status(200).json({ error: { message: "YouTube API Key is missing. Please set YOUTUBE_API_KEY environment variable." }, success: false });
    return;
  }

  try {
    let url = '';
    if (action === 'playlist' && playlistId) {
      url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${apiKey}`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    } else if (action === 'channel' && channelId) {
      const qParam = req.query.q ? `&q=${encodeURIComponent(req.query.q)}` : '';
      const orderParam = req.query.q ? '' : '&order=date';
      const maxRes = req.query.maxResults || 50;
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}${orderParam}&maxResults=${maxRes}&type=video&key=${apiKey}${qParam}`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    } else if (action === 'stats' && channelId) {
      url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
    } else {
      res.status(200).json({ error: { message: "Invalid action or missing required parameters (playlistId / channelId)." }, success: false });
      return;
    }

    const referer = req.headers.referer || req.headers.referrer;
    const fetchHeaders = {};
    if (referer) {
      fetchHeaders['Referer'] = referer;
    }

    const response = await fetch(url, { headers: fetchHeaders });
    const data = await response.json();

    if (!response.ok) {
      console.error(`[YouTube API Proxy] Error calling Google APIs:`, data);
      res.status(200).json({ error: data.error || data, success: false });
      return;
    }

    // Cache-Control header: Vercel edge CDN caches it for 1 hour to reduce YouTube quota hits
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.status(200).json(data);
  } catch (error) {
    console.error("[YouTube API Proxy] Internal Server Error:", error);
    res.status(200).json({ error: { message: "Internal Server Error in YouTube proxy." }, success: false });
  }
}
