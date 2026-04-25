#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const WIDTH = 393;
const HEIGHT = 852;
const DPR = 3;
const OUT_DIR = path.join(__dirname, '../renders/pr3ac');

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
  });
  const page = await context.newPage();

  // Set ceremony as seen so we skip it
  await page.addInitScript(() => {
    localStorage.setItem('uv_ceremony_seen', '1');
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const outPath = path.join(OUT_DIR, 'home-empty.png');
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved:', outPath);

  // Now type something to show the date pill
  const input = page.locator('input[type="text"]');
  await input.fill('Gym 3x this week');
  await page.waitForTimeout(400);

  const outPath2 = path.join(OUT_DIR, 'home-typed.png');
  await page.screenshot({ path: outPath2, fullPage: false });
  console.log('Saved:', outPath2);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
