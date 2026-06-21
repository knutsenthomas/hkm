import fs from 'fs';
import path from 'path';

// Firebase Firestore REST API configuration
const PROJECT_ID = 'his-kingdom-ministry';
const API_KEY = 'AIzaSyAelVsZnTU5xjQsjewWG7RjYEsQSHH-bkE';
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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
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

  const { id, lang = 'no' } = req.query;

  // Resolve the HTML template file name based on lang
  let templatePath = 'dist/leseplan-detaljer-template.html';
  if (lang === 'en') {
    templatePath = 'dist/en/reading-plan-details-template.html';
  } else if (lang === 'es') {
    templatePath = 'dist/es/detalles-plan-lectura-template.html';
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

  // If no ID is provided, just return the template as-is
  if (!id) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
    return;
  }

  try {
    // Fetch plan details from Firestore via REST API
    const url = `${BASE_URL}/reading_plans/${encodeURIComponent(id)}?key=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Reading plan not found: ${id}`);
        // Return original HTML if plan is not found
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
        return;
      }
      throw new Error(`Firestore REST API returned status ${response.status}`);
    }

    const payload = await response.json();
    if (!payload || !payload.fields) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
      return;
    }

    const plan = decodeFirestoreFields(payload.fields);
    
    // Fallback values if fields are missing
    const title = plan.title || 'Leseplan';
    const description = plan.description || plan.subtitle || 'Bibeleseplan fra His Kingdom Ministry';
    let imageUrl = plan.imageUrl || 'https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=600&q=80';

    // Get the request host to format absolute image URL if it's relative
    const host = req.headers.host || 'hiskingdomministry.no';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const absolutePageUrl = `${protocol}://${host}${req.url}`;

    if (imageUrl.startsWith('/')) {
      imageUrl = `${protocol}://${host}${imageUrl}`;
    }

    // Inject meta tags
    const ogTags = `
    <!-- Dynamic Open Graph / Social Sharing Meta Tags -->
    <title>${escapeHtml(title)} | His Kingdom Ministry</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:url" content="${escapeHtml(absolutePageUrl)}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    `;

    // 1. Remove existing title tag
    html = html.replace(/<title>[\s\S]*?<\/title>/gi, '');
    // 2. Remove existing meta description tag
    html = html.replace(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/gi, '');
    html = html.replace(/<meta\s+content="[\s\S]*?"\s+name="description"\s*\/?>/gi, '');

    // 3. Inject new tags right before </head>
    html = html.replace('</head>', `${ogTags}\n</head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error(`Error processing sharing preview for plan ${id}:`, error);
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
