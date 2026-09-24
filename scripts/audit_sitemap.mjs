import fs from 'fs';
import path from 'path';

/**
 * Audit script for His Kingdom Ministry sitemap.xml.
 * Validates:
 * 1. Non-www canonical domain (https://hiskingdomministry.no)
 * 2. No duplicate <loc> tags
 * 3. Valid ISO format for <lastmod> if present
 * 4. Reciprocal hreflang links only for languages that actually exist in each route cluster
 * 5. Presence and validity of x-default
 * 6. That single-language pages pass cleanly without requiring non-existent translations
 */

const sitemapPath = path.resolve('public/sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
    console.error('❌ Error: public/sitemap.xml does not exist.');
    process.exit(1);
}

const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

// Parse <url> blocks
const urlBlockRegex = /<url>([\s\S]*?)<\/url>/g;
let match;
let count = 0;
let errors = [];
const urlsMap = new Map();

while ((match = urlBlockRegex.exec(sitemapContent)) !== null) {
    count++;
    const block = match[1];
    const locMatch = /<loc>(.*?)<\/loc>/.exec(block);
    if (!locMatch) {
        errors.push(`Block #${count} is missing <loc>`);
        continue;
    }
    const loc = locMatch[1].trim();

    if (urlsMap.has(loc)) {
        errors.push(`Duplicate <loc> found in sitemap: ${loc}`);
    }

    if (loc.includes('www.hiskingdomministry.no')) {
        errors.push(`URL contains forbidden 'www.' domain: ${loc}`);
    }

    // Check lastmod if present
    const lastmodMatch = /<lastmod>(.*?)<\/lastmod>/.exec(block);
    if (lastmodMatch) {
        const lastmod = lastmodMatch[1].trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
            errors.push(`Invalid <lastmod> date format for ${loc}: "${lastmod}"`);
        }
    }

    // Parse hreflang links
    const hreflangRegex = /<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g;
    let linkMatch;
    const links = {};
    while ((linkMatch = hreflangRegex.exec(block)) !== null) {
        const lang = linkMatch[1].trim();
        const href = linkMatch[2].trim();
        links[lang] = href;
    }

    urlsMap.set(loc, { loc, links, lastmod: lastmodMatch ? lastmodMatch[1].trim() : null });
}

console.log(`Auditing sitemap.xml: found ${urlsMap.size} URLs across ${count} blocks.`);

// Validate hreflang reciprocity and cluster integrity
for (const [loc, entry] of urlsMap.entries()) {
    const { links } = entry;

    // Check x-default
    if (!links['x-default']) {
        errors.push(`Missing x-default hreflang on: ${loc}`);
    } else {
        const xDefaultUrl = links['x-default'];
        if (!urlsMap.has(xDefaultUrl)) {
            errors.push(`x-default target "${xDefaultUrl}" on ${loc} does not exist in sitemap.`);
        }
    }

    // Verify reciprocal mapping for all declared language alternates
    for (const [lang, altUrl] of Object.entries(links)) {
        if (lang === 'x-default') continue;

        const targetEntry = urlsMap.get(altUrl);
        if (!targetEntry) {
            errors.push(`Alternate ${lang} URL "${altUrl}" declared on ${loc} does not exist in sitemap.`);
            continue;
        }

        // The target entry must also link back to the current URL under its own language
        // Find which language 'loc' represents in targetEntry.links
        const pointsBack = Object.entries(targetEntry.links).some(([tLang, tUrl]) => {
            return tLang !== 'x-default' && tUrl === loc;
        });

        if (!pointsBack) {
            errors.push(`Missing reciprocal hreflang: "${altUrl}" (${lang}) does not link back to "${loc}".`);
        }
    }
}

if (errors.length > 0) {
    console.error(`❌ Sitemap Audit FAILED with ${errors.length} issue(s):`);
    errors.slice(0, 20).forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
    if (errors.length > 20) {
        console.error(`  ... and ${errors.length - 20} more errors.`);
    }
    process.exit(1);
} else {
    console.log(`✅ Sitemap Audit PASSED! All ${urlsMap.size} URLs verified with valid reciprocal hreflangs, valid lastmod formats, and non-www canonical domains.`);
}
