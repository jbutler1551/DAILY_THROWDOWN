const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pages = [
    { url: 'http://localhost:3000', name: 'home' },
    { url: 'http://localhost:3000/lobby', name: 'lobby' },
    { url: 'http://localhost:3000/match', name: 'match' },
    { url: 'http://localhost:3000/broadcast', name: 'broadcast' },
    { url: 'http://localhost:3000/results', name: 'results' },
    { url: 'http://localhost:3000/profile', name: 'profile' },
  ];

  for (const p of pages) {
    const page = await context.newPage();
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `/home/ubuntu/.openclaw/workspace/rps-tournament/screenshots/${p.name}.png`, fullPage: true });
    console.log(`✓ ${p.name}`);
    await page.close();
  }

  await browser.close();
  console.log('Done.');
})();
