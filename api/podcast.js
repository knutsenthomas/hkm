export default async function handler(req, res) {
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

  const rssUrl = (req.query && req.query.rssUrl) || 'https://anchor.fm/s/f7a13dec/podcast/rss';

  try {
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.statusText}`);
    }
    const xmlText = await response.text();

    const parseTag = (xml, tag) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? match[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : '';
    };

    const parseAttr = (xml, tag, attr) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']*)["'][^>]*>`, 'i'));
      return match ? match[1] : '';
    };

    const channelXml = parseTag(xmlText, 'channel') || xmlText;
    const channelTitle = parseTag(channelXml, 'title');
    const channelDesc = parseTag(channelXml, 'description');
    const channelImage = parseAttr(channelXml, 'itunes:image', 'href') || parseTag(parseTag(channelXml, 'image'), 'url');

    const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

    const items = itemMatches.map(itemXml => {
      const title = parseTag(itemXml, 'title');
      const pubDate = parseTag(itemXml, 'pubDate');
      const link = parseTag(itemXml, 'link');
      const description = parseTag(itemXml, 'description') || parseTag(itemXml, 'itunes:summary');
      const duration = parseTag(itemXml, 'itunes:duration');
      const author = parseTag(itemXml, 'itunes:author') || 'His Kingdom Ministry';
      const audioUrl = parseAttr(itemXml, 'enclosure', 'url');
      const thumbnail = parseAttr(itemXml, 'itunes:image', 'href') || channelImage;

      return {
        title,
        pubDate,
        link,
        description,
        author,
        duration,
        thumbnail,
        enclosure: audioUrl ? { $: { url: audioUrl } } : null
      };
    });

    const jsonResult = {
      rss: {
        channel: {
          title: channelTitle,
          description: channelDesc,
          image: { url: channelImage },
          item: items
        }
      }
    };

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.status(200).json(jsonResult);
  } catch (error) {
    console.error('[Podcast Proxy API Error]:', error);
    res.status(500).json({ error: 'Kunne ikke hente podcast-feeden.' });
  }
}
