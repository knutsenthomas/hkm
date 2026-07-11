import fs from 'fs';
import path from 'path';

// Firebase Firestore REST API configuration
const PROJECT_ID = 'his-kingdom-ministry';
const API_KEY = process.env.FIREBASE_API_KEY;
if (!API_KEY) {
  console.warn("Warning: FIREBASE_API_KEY is not defined in the environment variables.");
}
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper to decode Firestore REST fields to standard JSON objects
function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;

  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('geoPointValue' in value) {
    const gp = value.geoPointValue || {};
    return {
      latitude: Number(gp.latitude),
      longitude: Number(gp.longitude)
    };
  }
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

function decodeFirestoreFields(fields = {}) {
  const out = {};
  for (const key of Object.keys(fields)) {
    out[key] = decodeFirestoreValue(fields[key]);
  }
  return out;
}

function getContentItemStableId(item) {
  if (!item || typeof item !== 'object') return '';
  return item.id
      || item._id
      || item.externalGuid
      || item.wixGuid
      || item.postId
      || item.legacyId
      || item.slug
      || item.title
      || '';
}

function findContentItemById(items = [], itemId) {
  if (!itemId) return null;
  const targetId = String(itemId).trim().toLowerCase();
  
  const found = items.find(item => {
    const stableId = getContentItemStableId(item);
    if (stableId && stableId.trim().toLowerCase() === targetId) return true;
    
    const possibleKeys = [
      item.id,
      item.postId,
      item.wixGuid,
      item.externalGuid,
      item.slug,
      item.title
    ];
    return possibleKeys.some(val => val && String(val).trim().toLowerCase() === targetId);
  });
  
  return found;
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

  const id = req.query.id || req.query.courseId || req.query.course;
  const { lang = 'no', type = 'plan' } = req.query;

  // Resolve the HTML template file name based on type and lang
  let templatePath = 'dist/leseplan-detaljer-template.html';
  
  if (type === 'plan') {
    if (lang === 'en') {
      templatePath = 'dist/en/reading-plan-details-template.html';
    } else if (lang === 'es') {
      templatePath = 'dist/es/detalles-plan-lectura-template.html';
    } else {
      templatePath = 'dist/leseplan-detaljer-template.html';
    }
  } else if (type === 'blog') {
    if (lang === 'en') {
      templatePath = 'dist/en/blog-post-template.html';
    } else if (lang === 'es') {
      templatePath = 'dist/es/blog-post-template.html';
    } else {
      templatePath = 'dist/blogg-post-template.html';
    }
  } else if (type === 'event') {
    if (lang === 'en') {
      templatePath = 'dist/en/event-details-template.html';
    } else if (lang === 'es') {
      templatePath = 'dist/es/detalles-evento-template.html';
    } else {
      templatePath = 'dist/arrangement-detaljer-template.html';
    }
  } else if (type === 'course') {
    if (lang === 'en') {
      templatePath = 'dist/en/courses-template.html';
    } else if (lang === 'es') {
      templatePath = 'dist/es/cursos-template.html';
    } else {
      templatePath = 'dist/kurs-template.html';
    }
  }

  // Load the HTML file
  let html = '';
  try {
    const filePath = path.join(process.cwd(), templatePath);
    html = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Failed to read HTML template ${templatePath}:`, err);
    res.status(500).send(`Internal Server Error: Missing HTML template (${templatePath})`);
    return;
  }

  // If no ID is provided (and type is not 'course'), just return the template as-is
  if (!id && type !== 'course') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
    return;
  }

  try {
    let title = 'His Kingdom Ministry';
    let description = 'Deling fra His Kingdom Ministry';
    let imageUrl = 'https://www.hiskingdomministry.no/img/logo-hkm.png';

    if (type === 'plan') {
      // Fetch plan details from Firestore via REST API
      const url = `${BASE_URL}/reading_plans/${encodeURIComponent(id)}?key=${API_KEY}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.fields) {
          const plan = decodeFirestoreFields(payload.fields);
          title = plan.title || 'Leseplan';
          description = plan.description || plan.subtitle || 'Bibeleseplan fra His Kingdom Ministry';
          imageUrl = plan.imageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=600&q=80';
        }
      }
    } else if (type === 'blog') {
      // Fetch blog posts and teaching series in parallel
      const [blogRes, teachingRes] = await Promise.all([
        fetch(`${BASE_URL}/content/collection_blog?key=${API_KEY}`),
        fetch(`${BASE_URL}/content/collection_teaching?key=${API_KEY}`)
      ]);

      let blogItems = [];
      if (blogRes.ok) {
        const payload = await blogRes.json();
        const doc = decodeFirestoreFields(payload.fields);
        blogItems = Array.isArray(doc.items) ? doc.items : (doc.items ? Object.values(doc.items) : []);
      }

      let teachingItems = [];
      if (teachingRes.ok) {
        const payload = await teachingRes.json();
        const doc = decodeFirestoreFields(payload.fields);
        teachingItems = Array.isArray(doc.items) ? doc.items : (doc.items ? Object.values(doc.items) : []);
      }

      const allItems = [...blogItems, ...teachingItems];
      const post = findContentItemById(allItems, id);

      if (post) {
        title = post.title || 'Blogginnlegg';
        description = post.seoDescription || post.description || 'Les mer på His Kingdom Ministry';
        imageUrl = post.imageUrl || post.image || 'https://images.unsplash.com/photo-1499750310159-5b600aaf0320?auto=format&fit=crop&w=600&q=80';

        // Translate if lang !== 'no'
        if (lang !== 'no' && post.translations && post.translations[lang]) {
          const t = post.translations[lang];
          title = t.seoTitle || t.title || title;
          description = t.seoDescription || t.description || description;
          if (t.imageUrl || t.image) {
            imageUrl = t.imageUrl || t.image;
          }
        }
      }
    } else if (type === 'event') {
      // Check if it's a static/local event containing a pipe
      if (id.includes('|')) {
        const parts = id.split('|');
        title = parts[0].trim();
        const dateStr = parts[1]?.trim();
        description = dateStr ? `Arrangement den ${dateStr} med His Kingdom Ministry` : 'Bli med på arrangement med His Kingdom Ministry';
        imageUrl = 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80';
      } else {
        // Fetch settings_integrations and collection_events overrides
        const [integrationsRes, overridesRes] = await Promise.all([
          fetch(`${BASE_URL}/content/settings_integrations?key=${API_KEY}`),
          fetch(`${BASE_URL}/content/collection_events?key=${API_KEY}`)
        ]);

        let apiKey = '';
        let calendars = [];
        if (integrationsRes.ok) {
          const payload = await integrationsRes.json();
          const integrations = decodeFirestoreFields(payload.fields);
          const gcal = integrations.googleCalendar || {};
          apiKey = gcal.apiKey || '';
          const calendarListRaw = Array.isArray(integrations.googleCalendars) ? integrations.googleCalendars : [];
          calendars = calendarListRaw
            .filter(item => item && typeof item === 'object')
            .map(item => item.id || item.calendarId || '')
            .filter(Boolean);
          if (calendars.length === 0 && gcal.calendarId) {
            calendars.push(gcal.calendarId);
          }
        }

        let overrides = {};
        if (overridesRes.ok) {
          const payload = await overridesRes.json();
          const doc = decodeFirestoreFields(payload.fields);
          overrides = doc.items || {};
        }

        title = 'Arrangement';
        description = 'Arrangement hos His Kingdom Ministry';
        imageUrl = 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80';

        // Try to fetch from Google Calendar
        if (apiKey && calendars.length > 0) {
          for (const calendarId of calendars) {
            try {
              const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}?key=${apiKey}`;
              const gcalRes = await fetch(gcalUrl);
              if (gcalRes.ok) {
                const eventData = await gcalRes.json();
                title = eventData.summary || title;
                description = eventData.description || description;
                break;
              }
            } catch (e) {
              console.warn(`Failed to fetch event ${id} from calendar ${calendarId}`, e);
            }
          }
        }

        // Apply overrides if any
        const override = overrides[id] || overrides[encodeURIComponent(id)];
        if (override) {
          title = override.title || title;
          description = override.description || description;
          imageUrl = override.imageUrl || override.image || imageUrl;
        }
      }
    } else if (type === 'course') {
      const response = await fetch(`${BASE_URL}/siteContent/collection_courses?key=${API_KEY}`);
      if (response.ok) {
        const payload = await response.json();
        const doc = decodeFirestoreFields(payload.fields);
        const courses = Array.isArray(doc.items) ? doc.items : (doc.items ? Object.values(doc.items) : []);
        const targetId = id || (courses[0] ? courses[0].id : null);
        const course = courses.find(c => String(c.id) === String(targetId));
        if (course) {
          title = course.title || 'Kurs';
          description = course.description || 'Nettkurs fra His Kingdom Ministry';
          imageUrl = course.imageUrl || 'https://www.hiskingdomministry.no/img/logo-hkm.png';
        }
      }
    }

    // Get the request host to format absolute page & image URLs
    const host = req.headers.host || 'hiskingdomministry.no';
    const protocol = req.headers['x-forwarded-proto'] || 'https';

    // Construct clean user-facing canonical page URL
    let cleanPath = '';
    if (type === 'plan') {
      cleanPath = lang === 'en' 
        ? `/en/reading-plan-details?id=${id}` 
        : (lang === 'es' ? `/es/detalles-plan-lectura?id=${id}` : `/leseplan-detaljer?id=${id}`);
    } else if (type === 'blog') {
      cleanPath = lang === 'en'
        ? `/en/blog-post?id=${id}`
        : (lang === 'es' ? `/es/blog-post?id=${id}` : `/blogg-post?id=${id}`);
    } else if (type === 'event') {
      cleanPath = lang === 'en'
        ? `/en/event-details?id=${id}`
        : (lang === 'es' ? `/es/detalles-evento?id=${id}` : `/arrangement-detaljer?id=${id}`);
    } else if (type === 'course') {
      if (lang === 'en') {
        cleanPath = id ? `/en/courses.html?courseId=${id}` : `/en/courses`;
      } else if (lang === 'es') {
        cleanPath = id ? `/es/cursos.html?courseId=${id}` : `/es/cursos`;
      } else {
        cleanPath = id ? `/kurs.html?courseId=${id}` : `/kurs`;
      }
    }
    const absolutePageUrl = `${protocol}://${host}${cleanPath}`;

    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      const cleanImgPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      imageUrl = `${protocol}://${host}${cleanImgPath}`;
    }

    // Strip HTML tags from description if any
    const cleanDesc = typeof description === 'string' ? description.replace(/<[^>]*>?/gm, '').trim() : '';
    // Limit description length for social composer
    const limitDesc = cleanDesc.length > 250 ? cleanDesc.slice(0, 247) + '...' : cleanDesc;

    // Inject meta tags
    const ogTags = `
    <!-- Dynamic Open Graph / Social Sharing Meta Tags -->
    <title>${escapeHtml(title)} | His Kingdom Ministry</title>
    <meta name="description" content="${escapeHtml(limitDesc)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(limitDesc)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:url" content="${escapeHtml(absolutePageUrl)}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(limitDesc)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    `;

    // 1. Remove existing title tag
    html = html.replace(/<title>[\s\S]*?<\/title>/gi, '');
    // 2. Remove existing meta description tag
    html = html.replace(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/gi, '');
    html = html.replace(/<meta\s+content="[\s\S]*?"\s+name="description"\s*\/?>/gi, '');

    // 3. Remove existing og:* tags
    html = html.replace(/<meta\s+(?:property|name)="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
    html = html.replace(/<meta\s+content="[^"]*"\s+(?:property|name)="og:[^"]*"\s*\/?>/gi, '');

    // 4. Remove existing twitter:* tags
    html = html.replace(/<meta\s+(?:property|name)="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
    html = html.replace(/<meta\s+content="[^"]*"\s+(?:property|name)="twitter:[^"]*"\s*\/?>/gi, '');

    // 5. Inject new tags right before </head>
    html = html.replace('</head>', `${ogTags}\n</head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error(`Error processing sharing preview for type ${type}, id ${id}:`, error);
    // Return original HTML if anything goes wrong
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
