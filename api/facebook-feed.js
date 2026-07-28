// Vercel Serverless Function: Proxy Meta Graph API to fetch Facebook Page Posts securely
import fetch from 'node-fetch';

const PROJECT_ID = 'his-kingdom-ministry';
const API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyAelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE";
const DEFAULT_PAGE_ID = 'hiskingdomministry777';
const DEFAULT_PAGE_URL = 'https://www.facebook.com/hiskingdomministry777?locale=nb_NO';

// Helper to decode Firestore REST fields to standard JSON objects
function decodeFirestoreValue(value) {
    if (!value || typeof value !== 'object') return null;
    if ('nullValue' in value) return null;
    if ('stringValue' in value) return value.stringValue;
    if ('booleanValue' in value) return Boolean(value.booleanValue);
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('timestampValue' in value) return value.timestampValue;
    if ('mapValue' in value) {
        const fields = (value.mapValue && value.mapValue.fields) || {};
        const out = {};
        for (const key of Object.keys(fields)) {
            out[key] = decodeFirestoreValue(fields[key]);
        }
        return out;
    }
    if ('arrayValue' in value) {
        const values = (value.arrayValue && value.arrayValue.values) || [];
        return values.map(v => decodeFirestoreValue(v));
    }
    return value;
}

function trimText(value, maxLength = 180) {
    if (typeof value !== "string") return "";
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatFacebookPostDate(dateValue) {
    if (!dateValue) return "";
    try {
        return new Date(dateValue).toLocaleDateString("nb-NO", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch (error) {
        return "";
    }
}

function resolveFacebookPostImage(post) {
    const pickFirstString = (...values) => {
        for (const value of values) {
            if (typeof value === "string" && value.trim()) return value.trim();
        }
        return "";
    };

    const walkAttachment = (attachment) => {
        if (!attachment || typeof attachment !== "object") return "";
        const directImage = pickFirstString(
            attachment.media && attachment.media.image && attachment.media.image.src,
            attachment.media && attachment.media.source,
            attachment.media && attachment.media.src,
            attachment.url
        );
        if (directImage) return directImage;

        const subattachments = Array.isArray(attachment.subattachments && attachment.subattachments.data)
            ? attachment.subattachments.data
            : [];

        for (const item of subattachments) {
            const nested = walkAttachment(item);
            if (nested) return nested;
        }
        return "";
    };

    const attachments = Array.isArray(post && post.attachments && post.attachments.data)
        ? post.attachments.data
        : [];

    return pickFirstString(
        post && post.full_picture,
        ...attachments.map((attachment) => walkAttachment(attachment))
    );
}

function getFallbackImageByContent(text) {
    if (!text || typeof text !== 'string') return '/img/fb_fallback_bible.jpg';
    const norm = text.toLowerCase();
    
    // Bazaar / summer bazaar / gifts
    if (/basar|bazaar|sommerbasar|gave|butikk|design|kjøp|vipps/i.test(norm)) {
        return '/img/fb_fallback_bazaar.jpg';
    }
    // Worship / music / podcast
    if (/lovsang|worship|lovsynge|podcast|spotify|youtube|episode|sang|musikk|lytt/i.test(norm)) {
        return '/img/fb_fallback_worship.jpg';
    }
    // Bible / study / reading / teaching
    if (/bibel|bible|tidslinje|leseplan|undervisning|studie|skrift|ordet/i.test(norm)) {
        return '/img/fb_fallback_bible.jpg';
    }
    // Church / prophetic / gathering
    if (/kirke|church|dallas|walls|shake|prophetic|samling|møte|fellesskap/i.test(norm)) {
        return '/img/fb_fallback_church.jpg';
    }
    // Prayer / faith
    if (/bønn|pray|gud|jesus|lord|tro|hjerte|faith|åndelig/i.test(norm)) {
        return '/img/fb_fallback_prayer.jpg';
    }
    
    return '/img/fb_fallback_bible.jpg';
}

function normalizeFacebookPost(post, index, fallbackPageUrl) {
    const message = typeof post.message === "string" ? post.message.trim() : "";
    
    // Extract attachment title or description if message text is empty (e.g. photo uploads)
    let attachmentText = "";
    if (post.attachments && Array.isArray(post.attachments.data) && post.attachments.data[0]) {
        const att = post.attachments.data[0];
        attachmentText = att.title || att.description || "";
    }

    const effectiveText = message || attachmentText || "";
    const lines = effectiveText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const rawTitle = lines[0] || "Nytt bilde / oppdatering fra Facebook";
    const title = trimText(rawTitle, 78);
    const excerptSource = lines.length > 1 ? lines.slice(1).join(" ") : effectiveText;
    const excerpt = trimText(
        excerptSource || "Se nyeste bilde og oppdatering direkte på Facebook-siden vår.",
        180
    );

    return {
        id: post.id || `facebook-${index}`,
        title,
        excerpt,
        date: formatFacebookPostDate(post.created_time),
        cta: "Les på Facebook",
        link: (typeof post.permalink_url === "string" && post.permalink_url.trim())
            ? post.permalink_url.trim()
            : fallbackPageUrl,
        image: resolveFacebookPostImage(post) || getFallbackImageByContent(message + " " + title),
        source: 'Facebook'
    };
}

async function fetchOpenGraphImage(url) {
    if (!url || typeof url !== 'string') return '';
    const isFetchable = /spotify|youtube|youtu\.be|wix|hiskingdomministry/i.test(url);
    if (!isFetchable) return '';

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            },
            timeout: 2500
        });
        if (!response.ok) return '';
        const html = await response.text();
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                             html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
                             
        if (ogImageMatch && ogImageMatch[1]) {
            let imgUrl = ogImageMatch[1].trim();
            if (imgUrl.startsWith('//')) {
                imgUrl = 'https:' + imgUrl;
            }
            return imgUrl.replace(/&amp;/g, '&');
        }
    } catch (e) {
        console.warn(`[OG Scraper] Failed to fetch OG image from ${url}:`, e.message);
    }
    return '';
}

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

    const limit = Math.min(Math.max(Number(req.query.limit) || 3, 1), 6);
    let pageId = typeof req.query.pageId === 'string' ? req.query.pageId.trim() : '';
    let pageUrl = typeof req.query.pageUrl === 'string' ? req.query.pageUrl.trim() : '';

    let accessToken = process.env.META_FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
    
    // Load config from Firestore to get token/pageId fallback if missing
    try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/content/settings_facebook_feed?key=${API_KEY}`;
        const fsRes = await fetch(firestoreUrl);
        if (fsRes.ok) {
            const fsData = await fsRes.json();
            const fields = fsData.fields || {};
            const facebookFeed = decodeFirestoreValue(fields.facebookFeed) || {};
            
            if (!accessToken && facebookFeed.accessToken) {
                accessToken = facebookFeed.accessToken;
            }
            if (!pageId && facebookFeed.pageId) {
                pageId = facebookFeed.pageId;
            }
            if (!pageUrl && facebookFeed.pageUrl) {
                pageUrl = facebookFeed.pageUrl;
            }
        }
    } catch (fsErr) {
        console.warn('[Facebook API Proxy] Failed to fetch fallback config from Firestore:', fsErr);
    }

    if (!pageId) pageId = DEFAULT_PAGE_ID;
    if (!pageUrl) pageUrl = DEFAULT_PAGE_URL;

    if (!accessToken) {
        res.status(200).json({
            ok: false,
            error: "Facebook Page Access Token is missing. Please set it in Settings or as an Environment Variable.",
            pageUrl: pageUrl,
            items: []
        });
        return;
    }

    try {
        const fields = [
            "message",
            "permalink_url",
            "created_time",
            "full_picture",
            "attachments{media,media_type,subattachments,url}"
        ].join(",");

        const metaUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/posts?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
        const metaRes = await fetch(metaUrl);
        const payload = await metaRes.json();

        if (!metaRes.ok || payload.error) {
            const errMsg = payload?.error?.message || `Meta Graph API responded with status ${metaRes.status}`;
            console.error(`[Facebook API Proxy] Meta API Error:`, errMsg);
            res.status(200).json({
                ok: false,
                error: errMsg,
                pageUrl: pageUrl,
                items: []
            });
            return;
        }

        const rawItems = Array.isArray(payload.data) ? payload.data : [];
        const items = await Promise.all(rawItems.map(async (post, idx) => {
            const item = normalizeFacebookPost(post, idx, pageUrl);
            if (item && !item.image && item.link) {
                const ogImage = await fetchOpenGraphImage(item.link);
                if (ogImage) {
                    item.image = ogImage;
                }
            }
            return item;
        }));
        const filteredItems = items.filter(item => item && (item.link || item.title || item.excerpt));

        // Cache-Control header: Cache at the Edge for 60 seconds, serve stale up to 30s while revalidating
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        res.status(200).json({
            ok: true,
            pageUrl: pageUrl,
            resolvedPageId: pageId,
            count: filteredItems.length,
            items: filteredItems
        });
    } catch (err) {
        console.error('[Facebook API Proxy] Internal Server Error:', err);
        res.status(500).json({
            ok: false,
            error: err.message || String(err),
            pageUrl: pageUrl,
            items: []
        });
    }
}
