const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/bibelstudier.html', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    const countText = await page.$eval('.section-title', el => el.textContent);
    console.log('[BROWSER] section-title text:', countText);

    await browser.close();
})();
