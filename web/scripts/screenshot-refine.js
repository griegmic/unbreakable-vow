#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

const WIDTH = 393;
const HEIGHT = 852;
const DPR = 3;
const OUT_DIR = path.join(__dirname, '../renders/pr3k');

async function main() {
  const fs = require('fs');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
  });

  // 1. Mock screenshot
  console.log('Capturing mock...');
  const mockPage = await context.newPage();
  const mockPath = path.resolve(__dirname, '../../design-alignment/v1v2/flow/html/02-refine-nudge.html');
  await mockPage.goto(`file://${mockPath}`);
  await mockPage.waitForTimeout(2000);
  await mockPage.screenshot({ path: path.join(OUT_DIR, 'mock-refine.png') });
  console.log('  → mock-refine.png');

  // 2. Impl screenshot — seed vow flow state via localStorage
  console.log('Capturing impl...');
  const implPage = await context.newPage();
  // First go to home to set localStorage
  await implPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await implPage.evaluate(() => {
    localStorage.setItem('unbreakable-vow-flow', JSON.stringify({
      rawInput: 'be better',
      refinedText: '',
      witnessType: 'self',
      witnessName: '',
      witnessPhone: '',
      deadlineIso: '',
      stake: { amount: 0, consequence: 'charity', destination: '' },
    }));
  });
  await implPage.goto('http://localhost:3000/refine', { waitUntil: 'networkidle' });
  await implPage.waitForTimeout(3000);
  await implPage.screenshot({ path: path.join(OUT_DIR, 'impl-refine.png') });
  console.log('  → impl-refine.png');

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
