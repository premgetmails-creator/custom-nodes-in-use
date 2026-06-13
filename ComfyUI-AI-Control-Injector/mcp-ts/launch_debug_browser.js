import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--remote-debugging-port=9222']
  });
  console.log('Browser launched with remote debugging on port 9222.');
  console.log('Press Ctrl+C to close.');
  
  // Keep the process alive
  await new Promise(() => {});
})();
