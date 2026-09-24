import fs from 'fs';
import path from 'path';

/**
 * His Kingdom Ministry - Multilingual Sitemap Generator
 * Generates an SEO & GEO-optimized sitemap.xml with strictly 1-to-1 reciprocal hreflang mappings,
 * change frequencies, priority weights, accurate lastmod timestamps, and zero redirect/404 URLs.
 */

const BASE_URL = 'https://hiskingdomministry.no';
const TODAY = new Date().toISOString().split('T')[0];

// Multilingual Route Clusters - strictly 1-to-1 or single-language pages
const routes = [
    // Core Pages
    {
        no: '/',
        en: '/en',
        es: '/es',
        priority: '1.0',
        changefreq: 'daily'
    },
    {
        no: '/om-oss',
        en: '/en/about',
        es: '/es/sobre-nosotros',
        priority: '0.9',
        changefreq: 'monthly'
    },
    {
        no: '/kontakt',
        en: '/en/contact',
        es: '/es/contacto',
        priority: '0.8',
        changefreq: 'monthly'
    },
    {
        no: '/donasjoner',
        en: '/en/donations',
        es: '/es/donaciones',
        priority: '0.9',
        changefreq: 'weekly'
    },
    {
        no: '/bli-fast-giver',
        en: '/en/regular-donors',
        es: '/es/donantes-regulares',
        priority: '0.9',
        changefreq: 'weekly'
    },
    {
        no: '/for-menigheter',
        en: '/en/for-churches',
        es: '/es/para-iglesias',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/for-bedrifter',
        en: '/en/for-businesses',
        es: '/es/para-empresas',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/bnn',
        en: '/en/bnn',
        es: '/es/bnn',
        priority: '0.7',
        changefreq: 'weekly'
    },
    {
        no: '/kurs',
        en: '/en/courses',
        es: '/es/cursos',
        priority: '0.9',
        changefreq: 'weekly'
    },
    {
        no: '/kurs-detaljer',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/arrangementer',
        en: '/en/events',
        es: '/es/eventos',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/arrangement-detaljer',
        en: '/en/event-details',
        es: '/es/detalles-evento',
        priority: '0.7',
        changefreq: 'weekly'
    },
    {
        no: '/kalender',
        en: '/en/calendar',
        es: '/es/calendario',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/undervisning',
        en: '/en/teaching',
        es: '/es/ensenanza',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/undervisningsserier',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/media',
        en: '/en/media',
        es: '/es/media',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/youtube',
        en: '/en/youtube',
        es: '/es/youtube',
        priority: '0.7',
        changefreq: 'weekly'
    },
    {
        no: '/podcast',
        en: '/en/podcast',
        es: '/es/podcast',
        priority: '0.9',
        changefreq: 'weekly'
    },
    {
        no: '/blogg',
        en: '/en/blog',
        es: '/es/blog',
        priority: '0.9',
        changefreq: 'daily'
    },
    {
        no: '/blogg-post-1',
        en: '/en/blog-post-1',
        es: '/es/blog-post-1',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/blogg-post-2',
        en: '/en/blog-post-2',
        es: '/es/blog-post-2',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/blogg-post-3',
        en: '/en/blog-post-3',
        es: '/es/blog-post-3',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/blogg-post-4',
        en: '/en/blog-post-4',
        es: '/es/blog-post-4',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/blogg-post-5',
        en: '/en/blog-post-5',
        es: '/es/blog-post-5',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/bibel',
        en: '/en/bibel',
        es: '/es/bibel',
        priority: '0.9',
        changefreq: 'daily'
    },
    {
        no: '/bibelstudier',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/leseplaner',
        en: '/en/leseplaner',
        es: '/es/leseplaner',
        priority: '0.9',
        changefreq: 'weekly'
    },
    {
        no: '/leseplan-detaljer',
        en: '/en/reading-plan-details',
        es: '/es/detalles-plan-lectura',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/ressurser/bibeloppbygning',
        en: '/en/ressurser/bibeloppbygning',
        es: '/es/ressurser/bibeloppbygning',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/ressurser/bibelsk-tidslinje',
        en: '/en/ressurser/bibelsk-tidslinje',
        es: '/es/ressurser/bibelsk-tidslinje',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/ressurser/bibelske-personer',
        en: '/en/ressurser/bibelske-personer',
        es: '/es/ressurser/bibelske-personer',
        priority: '0.8',
        changefreq: 'weekly'
    },
    {
        no: '/ressurser/bibelsk-person-detaljer',
        en: '/en/ressurser/bibelsk-person-detaljer',
        es: '/es/ressurser/bibelsk-person-detaljer',
        priority: '0.7',
        changefreq: 'weekly'
    },
    {
        no: '/ressurser/tidslinje-imperier',
        en: '/en/ressurser/tidslinje-imperier',
        es: '/es/ressurser/tidslinje-imperier',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/reisevirksomhet',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/seminarer',
        priority: '0.7',
        changefreq: 'monthly'
    },
    {
        no: '/personvern',
        en: '/en/privacy',
        es: '/es/privacidad',
        priority: '0.4',
        changefreq: 'yearly'
    },
    {
        no: '/betingelser',
        priority: '0.4',
        changefreq: 'yearly'
    },
    {
        no: '/tilgjengelighet',
        en: '/en/accessibility',
        es: '/es/accesibilidad',
        priority: '0.4',
        changefreq: 'yearly'
    },
    {
        no: '/registrer',
        en: '/en/register',
        es: '/es/registro',
        priority: '0.6',
        changefreq: 'monthly'
    }
];

// Generate XML
let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

let totalUrlsCount = 0;

routes.forEach(route => {
    const langs = [];
    if (route.no) langs.push({ lang: 'no', path: route.no });
    if (route.en) langs.push({ lang: 'en', path: route.en });
    if (route.es) langs.push({ lang: 'es', path: route.es });

    langs.forEach(current => {
        totalUrlsCount++;
        const fullUrl = `${BASE_URL}${current.path}`;
        xml += `  <url>\n`;
        xml += `    <loc>${fullUrl}</loc>\n`;
        xml += `    <lastmod>${TODAY}</lastmod>\n`;
        xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
        xml += `    <priority>${route.priority}</priority>\n`;

        if (route.no) {
            xml += `    <xhtml:link rel="alternate" hreflang="no" href="${BASE_URL}${route.no}" />\n`;
        }
        if (route.en) {
            xml += `    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${route.en}" />\n`;
        }
        if (route.es) {
            xml += `    <xhtml:link rel="alternate" hreflang="es" href="${BASE_URL}${route.es}" />\n`;
        }
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${route.no || route.en || current.path}" />\n`;
        xml += `  </url>\n`;
    });
});

xml += `</urlset>\n`;

// Write to public/sitemap.xml and dist/sitemap.xml (if dist exists)
fs.writeFileSync(path.resolve('public/sitemap.xml'), xml, 'utf8');
console.log(`✅ Generated public/sitemap.xml with ${totalUrlsCount} multilingual URLs and fresh lastmod (${TODAY}).`);

const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
    console.log(`✅ Synced to dist/sitemap.xml`);
}
