const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    });

    await page.goto('http://localhost:5173/media.html', { waitUntil: 'networkidle2' });
    
    await page.evaluate(async () => {
        let count = 0;
        while (!window.firebaseService || !window.firebaseService.isInitialized) {
            await new Promise(r => setTimeout(r, 50));
            if (++count > 40) break;
        }
        if (window.firebaseService) {
            const data = await window.firebaseService.getPageContent('collection_teaching');
            if (data && data.items) {
                console.log('--- TEACHING CATEGORIES ---');
                data.items.forEach(item => {
                    console.log(`Title: ${item.title}, Category: ${item.category}, Type: ${item.teachingType}`);
                });
            } else {
                console.log('No teaching items found.');
            }
        }
    });

    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
