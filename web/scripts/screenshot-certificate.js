#!/usr/bin/env node
/**
 * Capture certificate screenshots for pixel diff.
 * Captures:
 *   1. Live impl at /certificate/[vowId]
 *   2. Mock HTML from flow/html/certificate.html
 * Both at 393×852 dpr=3.
 */

const { chromium } = require('playwright');
const path = require('path');

const VOW_ID = 'a0000000-ce47-4e57-0000-000000000001';
const WIDTH = 393;
const HEIGHT = 852;
const DPR = 3;
const OUT_DIR = path.join(__dirname, '../renders/pr3g');

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
  });

  // 1. Mock screenshot
  console.log('Capturing mock...');
  const mockPage = await context.newPage();
  const mockPath = path.resolve(__dirname, '../../design-alignment/v1v2/flow/html/certificate.html');
  await mockPage.goto(`file://${mockPath}`);
  await mockPage.waitForTimeout(2000);
  await mockPage.screenshot({ path: path.join(OUT_DIR, 'mock-certificate.png') });
  console.log('  → mock-certificate.png');

  // 2. Impl screenshot — bust cache with timestamp
  console.log('Capturing impl...');
  const implPage = await context.newPage();
  await implPage.goto(`http://localhost:3000/certificate/${VOW_ID}?_t=${Date.now()}`, { waitUntil: 'networkidle' });
  await implPage.waitForTimeout(3000);
  await implPage.screenshot({ path: path.join(OUT_DIR, 'impl-certificate.png') });
  console.log('  → impl-certificate.png');

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
