import { chromium } from 'playwright';

(async () => {
  const cdpUrl = 'http://127.0.0.1:9222';
  try {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const contexts = browser.contexts();
    console.log(`Contexts found: ${contexts.length}`);
    for (let i = 0; i < contexts.length; i++) {
        const pages = contexts[i].pages();
        console.log(`Pages in context ${i}:`);
        pages.forEach(p => console.log(p.url()));
    }
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();
