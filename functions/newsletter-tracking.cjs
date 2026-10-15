const { randomBytes } = require('node:crypto');
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const TRACKING_BASE = 'https://us-central1-his-kingdom-ministry.cloudfunctions.net/newsletterTracking';
function trackableUrl(value) {
  const decoded = value.replace(/&amp;/gi, '&').replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  try {
    const url = new URL(decoded);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (/avmeld|unsubscribe|newsletterTracking/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
function instrumentNewsletter(html, token, base = TRACKING_BASE) {
  const links = [];
  const rewritten = html.replace(/<a\b[^>]*>/gi, tag => tag.replace(/\bhref\s*=\s*(["'])(.*?)\1/i, (attribute, quote, href) => {
    const url = trackableUrl(href);
    if (!url || links.length >= 100) return attribute;
    let index = links.indexOf(url);
    if (index < 0) { index = links.length; links.push(url); }
    return `href=${quote}${base}?t=${token}&amp;k=click&amp;l=${index}${quote}`;
  }));
  const pixel = `<img src="${base}?t=${token}&amp;k=open" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`;
  return { html: /<\/body>/i.test(rewritten) ? rewritten.replace(/<\/body>/i, pixel + '</body>') : rewritten + pixel, links };
}
async function prepareTracking(db, campaignId, html, now = Date.now()) {
  const token = randomBytes(24).toString('hex');
  const result = instrumentNewsletter(html, token);
  await db.collection('newsletter_tracking').doc(token).set({
    campaignId, links: result.links, createdAt: now, expiresAt: now + 180 * 86400000,
    opened: false, clicked: false, clickedLinks: []
  });
  return result.html;
}
function trackingHandler(db, increment) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, private, max-age=0');
    res.set('Referrer-Policy', 'no-referrer');
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
    const token = req.query.t;
    const kind = req.query.k;
    if (typeof token !== 'string' || !/^[a-f0-9]{48}$/.test(token) || !['open','click'].includes(kind)) return res.status(404).end();
    const ref = db.collection('newsletter_tracking').doc(token);
    let destination;
    try {
      await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return;
        const data = snapshot.data();
        const linkIndex = typeof req.query.l === 'string' && /^\d{1,2}$/.test(req.query.l) ? Number(req.query.l) : -1;
        if (kind === 'click') destination = data.links?.[linkIndex];
        if (kind === 'click' && (!destination || !trackableUrl(destination))) { destination = undefined; return; }
        // Keep old links working after measurement expires, without recording activity.
        if (data.expiresAt < Date.now() || req.method !== 'GET') return;
        const campaign = db.collection('newsletter_campaigns').doc(data.campaignId);
        const campaignSnapshot = await tx.get(campaign);
        if (!campaignSnapshot.exists || campaignSnapshot.data().trackingEnabled !== true) return;
        const update = {};
        if (kind === 'open' && !data.opened) {
          tx.update(ref, { opened:true }); update['engagement.uniqueOpens'] = increment(1);
        }
        if (kind === 'click') {
          const clickedLinks = Array.isArray(data.clickedLinks) ? data.clickedLinks : [];
          if (!data.clicked) update['engagement.uniqueClicks'] = increment(1);
          if (!clickedLinks.includes(linkIndex)) {
            tx.update(ref, { clicked:true, clickedLinks:[...clickedLinks, linkIndex] });
            const linkId = require('node:crypto').createHash('sha256').update(destination).digest('hex').slice(0,24);
            update[`engagement.links.${linkId}.uniqueClicks`] = increment(1);
            update[`engagement.links.${linkId}.url`] = destination;
          }
        }
        if (Object.keys(update).length) tx.update(campaign, update);
      });
    } catch (error) {
      // A reporting outage must never break an email link.
      console.error('Newsletter tracking unavailable:', error.code || 'unknown');
      if (kind === 'click' && !destination) {
        try { const saved = await ref.get(); destination = saved.exists ? saved.data().links?.[Number(req.query.l)] : undefined; } catch (_) {}
      }
    }
    if (kind === 'click') return destination && trackableUrl(destination) ? res.redirect(302, destination) : res.status(404).end();
    res.set('Content-Type', 'image/gif'); return res.status(200).send(PIXEL);
  };
}
module.exports = { instrumentNewsletter, prepareTracking, trackingHandler, trackableUrl };
