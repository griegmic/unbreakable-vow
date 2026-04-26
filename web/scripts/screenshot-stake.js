#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const WIDTH = 393;
const HEIGHT = 852;
const DPR = 3;
const OUT_DIR = path.join(__dirname, '../renders/pr3m');

function makeFlowState(overrides = {}) {
  return JSON.stringify({
    rawInput: 'go to the gym 4 times this week',
    refinedText: 'Go to the gym 4 times this week.',
    witnessType: 'self',
    witnessName: '',
    witnessPhone: '',
    deadlineIso: '',
    stake: { amount: 0, consequence: 'charity', destination: '' },
    ...overrides,
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
  });

  async function seedAndCapture(name, flowState) {
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.evaluate((state) => {
      localStorage.setItem('unbreakable-vow-flow', state);
    }, flowState);
    await page.goto('http://localhost:3000/stake', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
    console.log(`  → ${name}.png`);
    return page;
  }

  // 1. Initial (no selections)
  console.log('1. Initial (no selections)...');
  await seedAndCapture('impl-stake-initial', makeFlowState());

  // 2. $50 selected + charity + destination
  console.log('2. $50 + charity + ALS...');
  await seedAndCapture('impl-stake-50-charity', makeFlowState({
    stake: { amount: 50, consequence: 'charity', destination: 'ALS Association' },
  }));

  // 3. $100 selected + anti consequence
  console.log('3. $100 + anti...');
  await seedAndCapture('impl-stake-100-anti', makeFlowState({
    stake: { amount: 100, consequence: 'anti', destination: 'Donald Trump campaign' },
  }));

  // 4. Mock
  console.log('4. Mock: 03b-pitch-cheeky...');
  const mockPage = await context.newPage();
  const mockPath = path.resolve(__dirname, '../../design-alignment/v1v2/flow/html/03b-pitch-cheeky.html');
  await mockPage.goto(`file://${mockPath}`);
  await mockPage.waitForTimeout(2000);
  await mockPage.screenshot({ path: path.join(OUT_DIR, 'mock-stake.png') });
  console.log('  → mock-stake.png');

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
