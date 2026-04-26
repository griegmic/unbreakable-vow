import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '../renders/pr3q-audit';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// Home page — bypass ceremony
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  // Set localStorage to skip ceremony before navigating
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('uv_ceremony_seen', '1');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/home-v2.png`, fullPage: false });
  console.log('✓ home (ceremony bypassed)');
  await context.close();
}

// vow-kept page
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/vow-kept?amount=50&consequence=charity&destination=NRA`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/vow-kept-v2.png`, fullPage: false });
  console.log('✓ vow-kept');
  await context.close();
}

// vow-broken page
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/vow-broken?amount=50&consequence=charity&destination=NRA`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/vow-broken-v2.png`, fullPage: false });
  console.log('✓ vow-broken');
  await context.close();
}

// quick-vow — needs auth, but may render UI
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/quick-vow`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/quick-vow-v2.png`, fullPage: false });
  const url = page.url();
  console.log(`✓ quick-vow → ${url.includes('/quick-vow') ? 'rendered' : 'REDIRECTED to ' + url}`);
  await context.close();
}

// cast
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/cast`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/cast-v2.png`, fullPage: false });
  const url = page.url();
  console.log(`✓ cast → ${url.includes('/cast') ? 'rendered' : 'REDIRECTED to ' + url}`);
  await context.close();
}

// settings
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/settings`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/settings-v2.png`, fullPage: false });
  const url = page.url();
  console.log(`✓ settings → ${url.includes('/settings') ? 'rendered' : 'REDIRECTED to ' + url}`);
  await context.close();
}

// dev/primitives
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/_dev/primitives`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/dev-primitives.png`, fullPage: true });
  console.log('✓ dev/primitives (full page)');
  await context.close();
}

await browser.close();
console.log('\nDone.');
