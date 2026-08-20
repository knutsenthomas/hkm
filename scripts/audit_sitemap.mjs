import fs from 'fs';
import path from 'path';

const sitemapPath = path.resolve('public/sitemap.xml');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

// Simple regex parser for <url> blocks
const urlBlockRegex = /<url>([\s\S]*?)<\/url>/g;
let match;
let count = 0;
let errors = 0;
const urls = [];

while ((match = urlBlockRegex.exec(sitemapContent)) !== null) {
    count++;
    const block = match[1];
    const locMatch = /<loc>(.*?)<\/loc>/.exec(block);
    if (!locMatch) {
        console.error(`Block ${count} has no <loc>`);
        errors++;
        continue;
    }
    const loc = locMatch[1].trim();
    
    // Check hreflang links
    const hreflangRegex = /<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g;
    let linkMatch;
    const links = {};
    while ((linkMatch = hreflangRegex.exec(block)) !== null) {
        links[linkMatch[1]] = linkMatch[2];
    }
    
    urls.push({ loc, links });
}

console.log(`Total URLs in sitemap: ${urls.length}`);
console.log(`Checking hreflangs...`);

const missingHreflang = urls.filter(u => !u.links.no || !u.links.en || !u.links.es || !u.links['x-default']);
console.log(`URLs missing complete hreflang set (no, en, es, x-default): ${missingHreflang.length}`);
if (missingHreflang.length > 0) {
    console.log(`Sample missing:`, missingHreflang.slice(0, 5));
}
