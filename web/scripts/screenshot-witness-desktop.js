#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  // Desktop context — no navigator.share (headless Chrome doesn't have it)
  const desktopCtx = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    hasTouch: false,
  });

  // 1. Desktop pre-copy
  console.log('1. Desktop /witness pre-copy...');
  const p1 = await desktopCtx.newPage();
  await p1.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await p1.evaluate((state) => {
    localStorage.setItem('unbreakable-vow-flow', state);
  }, VOW_FLOW_STATE);
  await p1.goto('http://localhost:3000/witness', { waitUntil: 'networkidle' });
  await p1.waitForTimeout(2000);

  // Verify it detected desktop (no share API)
  const hasShare = await p1.evaluate(() => typeof navigator.share === 'function');
  console.log(`  navigator.share available: ${hasShare}`);

  await p1.screenshot({ path: path.join(OUT_DIR, 'impl-witness-desktop-precopy.png') });
  console.log('  → impl-witness-desktop-precopy.png');

  // 2. Desktop post-copy — click the "Copy invite link" card
  console.log('2. Desktop /witness post-copy...');
  // Grant clipboard permissions
  await desktopCtx.grantPermissions(['clipboard-write', 'clipboard-read']);

  const copyBtn = p1.locator('button', { hasText: 'Copy invite link' });
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await p1.waitForTimeout(500);
    await p1.screenshot({ path: path.join(OUT_DIR, 'impl-witness-desktop-postcopy.png') });
    console.log('  → impl-witness-desktop-postcopy.png');
  } else {
    console.log('  WARNING: "Copy invite link" button not found');
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
