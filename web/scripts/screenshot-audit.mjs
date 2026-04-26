import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '../renders/pr3q-audit';

mkdirSync(OUT, { recursive: true });

const routes = [
  { path: '/', name: 'home', mock: '01-home.html' },
  { path: '/refine', name: 'refine', mock: '02-refine-nudge.html', needsState: true },
  { path: '/stake', name: 'stake', mock: '03-pitch.html', needsState: true },
  { path: '/witness', name: 'witness', mock: '05-witness-pick.html', needsState: true },
  { path: '/seal', name: 'seal', mock: '05a-auth-pay-revised.html', needsState: true },
  { path: '/sent', name: 'sent', mock: '05g-sealed-sent.html', needsState: true },
  { path: '/quick-vow', name: 'quick-vow', mock: '08-quick-vow.html', needsAuth: true },
  { path: '/cast', name: 'cast', mock: 'n/a', needsAuth: true },
  { path: '/vow-kept', name: 'vow-kept', mock: 'm11-vow-kept-charity.html', needsState: true },
  { path: '/vow-broken', name: 'vow-broken', mock: 'vow-broken-charity.html', needsState: true },
  { path: '/history', name: 'history', mock: 's20-witnessing-all.html', needsAuth: true },
  { path: '/settings', name: 'settings', mock: 'n/a', needsAuth: true },
];

const browser = await chromium.launch();

for (const route of routes) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  try {
    const resp = await page.goto(`${BASE}${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    // Wait a moment for fonts + animations
    await page.waitForTimeout(1500);

    // Check if we got redirected
    const finalUrl = page.url();
    const redirected = !finalUrl.includes(route.path) && route.path !== '/';

    await page.screenshot({
      path: `${OUT}/${route.name}.png`,
      fullPage: false,
    });

    console.log(`✓ ${route.name} → ${redirected ? `REDIRECTED to ${finalUrl}` : 'OK'} (${resp?.status()})`);
  } catch (e) {
    console.log(`✗ ${route.name} → ${e.message.slice(0, 80)}`);
  }

  await context.close();
}

// Also screenshot the HTML mocks for side-by-side comparison
const mocks = [
  '01-home.html',
  '02-refine-nudge.html',
  '03-pitch.html',
  '05-witness-pick.html',
  '05g-sealed-sent.html',
  '08-quick-vow.html',
  'm11-vow-kept-charity.html',
  'vow-broken-charity.html',
  's20-witnessing-all.html',
  '09-witness-landing.html',
  '10-witness-accepted.html',
  's19-outcome-resolved.html',
];

for (const mock of mocks) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  try {
    await page.goto(`file:///Users/joey/rork-unbreakable-vow/design-alignment/v1v2/flow/html/${mock}`, {
      waitUntil: 'load',
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${OUT}/mock-${mock.replace('.html', '')}.png`,
      fullPage: false,
    });
    console.log(`✓ mock: ${mock}`);
  } catch (e) {
    console.log(`✗ mock: ${mock} → ${e.message.slice(0, 80)}`);
  }
  await context.close();
}

await browser.close();
console.log(`\nScreenshots saved to ${OUT}/`);
