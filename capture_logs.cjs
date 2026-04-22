const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    });

    page.on('pageerror', err => {
        console.log('[BROWSER PAGE ERROR]', err.toString());
    });

    await page.goto('http://localhost:5173/arrangementer.html', { waitUntil: 'networkidle2' });
    
    // Wait for a few seconds to let any async tasks finish
    await new Promise(r => setTimeout(r, 5000));
    
    await browser.close();
})();
