// Videoene fra YouTube-kanalen «Hilde Karin Knutsen» (@HisKingdomMinistry) til appen.
// Henter alle offentlige videoer fra kanalens opplastingsliste med YouTube Data API og
// lagrer en kort liste i content/youtube_videos, som alle kan lese.
// Kvoten er liten: ca. 10 sider med opplastinger og 10 sider med varighet, ca. 20 enheter per kjøring.

const CHANNEL_ID = 'UCFbX-Mf7NqDm2a07hk6hveg';
const UPLOADS_PLAYLIST = 'UU' + CHANNEL_ID.slice(2);
const API = 'https://www.googleapis.com/youtube/v3';

/** ISO 8601-varighet (PT1H2M3S) til sekunder. */
function parseDuration(value) {
  const m = String(value || '').match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map(x => Number(x) || 0);
  return d * 86400 + h * 3600 + min * 60 + s;
}

function bestThumbnail(thumbnails = {}) {
  const t = thumbnails.maxres || thumbnails.standard || thumbnails.high || thumbnails.medium || thumbnails.default;
  return t ? t.url : '';
}

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`YouTube ${res.status}: ${body?.error?.message || 'ukjent feil'}`);
    error.status = res.status;
    throw error;
  }
  return body;
}

async function fetchChannelVideos({ apiKey, fetchImpl = fetch, maxPages = 40 }) {
  const items = [];
  let pageToken = '';
  for (let page = 0; page < maxPages; page++) {
    const url = `${API}/playlistItems?part=snippet,contentDetails,status&maxResults=50&playlistId=${UPLOADS_PLAYLIST}&key=${encodeURIComponent(apiKey)}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data = await getJson(fetchImpl, url);
    for (const it of data.items || []) {
      const id = it.contentDetails?.videoId;
      if (!id || it.status?.privacyStatus !== 'public') continue;
      items.push({
        id,
        title: String(it.snippet?.title || '').slice(0, 300),
        description: String(it.snippet?.description || '').slice(0, 1200),
        publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || null,
        thumbnail: bestThumbnail(it.snippet?.thumbnails),
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  // Varighet: skiller korte Shorts fra vanlige videoer, og viser lengden.
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const data = await getJson(fetchImpl, `${API}/videos?part=contentDetails,status&id=${batch.map(v => v.id).join(',')}&key=${encodeURIComponent(apiKey)}`);
    const byId = new Map((data.items || []).map(v => [v.id, v]));
    for (const v of batch) {
      const info = byId.get(v.id);
      v.seconds = parseDuration(info?.contentDetails?.duration);
      v.embeddable = info?.status?.embeddable !== false;
    }
  }

  return items
    .filter(v => v.embeddable !== false && v.seconds > 0)
    .map(v => ({
      id: v.id, title: v.title, description: v.description, publishedAt: v.publishedAt,
      thumbnail: v.thumbnail, seconds: v.seconds,
      // Shorts er inntil 3 minutter; kortere klipp med #shorts regnes også som Shorts.
      short: v.seconds <= 60 || (v.seconds <= 180 && /#shorts?\b/i.test(`${v.title} ${v.description}`)),
    }))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
}

async function syncYoutubeVideos({ db, apiKey, Timestamp, fetchImpl }) {
  const videos = await fetchChannelVideos({ apiKey, fetchImpl });
  // Dokumentet holdes under 1 MB: beskrivelsene kortes ned ved behov.
  let payload = videos;
  if (JSON.stringify(payload).length > 850000) payload = videos.map(v => ({ ...v, description: v.description.slice(0, 300) }));
  await db.collection('content').doc('youtube_videos').set({
    channelId: CHANNEL_ID,
    channelTitle: 'Hilde Karin Knutsen',
    items: payload,
    count: payload.length,
    updatedAt: Timestamp.now(),
  });
  return payload.length;
}

module.exports = { CHANNEL_ID, parseDuration, fetchChannelVideos, syncYoutubeVideos };
