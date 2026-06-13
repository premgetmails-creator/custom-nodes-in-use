import { chromium } from 'playwright';

(async () => {
  const cdpUrl = 'http://127.0.0.1:9222';
  const targetUrl = 'http://localhost:8188';
  try {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0];
    const pages = context.pages();
    
    const search = targetUrl.replace(/^https?:\/\//, "");
    console.log(`Searching for: ${search}`);
    
    const page = pages.find((p) => p.url().includes(search));
    console.log(`Found page: ${!!page}`);
    if (page) {
        console.log(`Page URL: ${page.url()}`);
    } else {
        pages.forEach(p => console.log(`Not matching: ${p.url()}`));
    }
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();
