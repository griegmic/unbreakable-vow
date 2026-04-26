#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const WIDTH = 393;
const HEIGHT = 852;
const DPR = 3;
const OUT_DIR = path.join(__dirname, '../renders/pr3l');

const VOW_FLOW_STATE = JSON.stringify({
  rawInput: 'go to the gym 4 times this week',
  refinedText: 'Go to the gym 4 times this week.',
  witnessType: 'self',
  witnessName: '',
  witnessPhone: '',
  deadlineIso: new Date(Date.now() + 7 * 86400000).toISOString(),
  stake: { amount: 50, consequence: 'charity', destination: 'ALS Association' },
});

const VOW_FLOW_ZERO = JSON.stringify({
  rawInput: 'go to the gym 4 times this week',
  refinedText: 'Go to the gym 4 times this week.',
  witnessType: 'self',
  witnessName: '',
  witnessPhone: '',
  deadlineIso: new Date(Date.now() + 7 * 86400000).toISOString(),
  stake: { amount: 0, consequence: 'charity', destination: '' },
});

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
  });

  // Helper to seed vow flow
  async function seedAndGo(page, url, flowState) {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.evaluate((state) => {
      localStorage.setItem('unbreakable-vow-flow', state);
    }, flowState);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }

  // 1. /witness — initial render
  console.log('1. /witness initial...');
  const p1 = await context.newPage();
  await seedAndGo(p1, 'http://localhost:3000/witness', VOW_FLOW_STATE);
  await p1.screenshot({ path: path.join(OUT_DIR, 'impl-witness.png') });
  console.log('  → impl-witness.png');

  // 2. /seal unauthed $0
  console.log('2. /seal unauthed $0...');
  const p2 = await context.newPage();
  await seedAndGo(p2, 'http://localhost:3000/seal', VOW_FLOW_ZERO);
  await p2.screenshot({ path: path.join(OUT_DIR, 'impl-seal-unauth-zero.png') });
  console.log('  → impl-seal-unauth-zero.png');

  // 3. /seal unauthed staked
  console.log('3. /seal unauthed staked...');
  const p3 = await context.newPage();
  await seedAndGo(p3, 'http://localhost:3000/seal', VOW_FLOW_STATE);
  await p3.screenshot({ path: path.join(OUT_DIR, 'impl-seal-unauth-staked.png') });
  console.log('  → impl-seal-unauth-staked.png');

  // 4. Mock screenshots
  console.log('4. Mock: witness pick...');
  const pm1 = await context.newPage();
  const witnessPath = path.resolve(__dirname, '../../design-alignment/v1v2/flow/html/04-witness-pick.html');
  await pm1.goto(`file://${witnessPath}`);
  await pm1.waitForTimeout(2000);
  await pm1.screenshot({ path: path.join(OUT_DIR, 'mock-witness.png') });
  console.log('  → mock-witness.png');

  console.log('5. Mock: auth-pay...');
  const pm2 = await context.newPage();
  const sealPath = path.resolve(__dirname, '../../design-alignment/v1v2/flow/html/web-04-auth-pay.html');
  await pm2.goto(`file://${sealPath}`);
  await pm2.waitForTimeout(2000);
  await pm2.screenshot({ path: path.join(OUT_DIR, 'mock-seal.png') });
  console.log('  → mock-seal.png');

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
