import { chromium } from 'playwright';

(async () => {
  const cdpUrl = 'http://127.0.0.1:9222';
  try {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0];
    const pages = context.pages();
    console.log('Pages found:');
    pages.forEach(p => console.log(p.url()));
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();
