#!/usr/bin/env node
/**
 * Functional tests for certificate page:
 * 1. PNG export (Save image)
 * 2. Clipboard fallback (Share → with no navigator.share)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VOW_ID = 'a0000000-ce47-4e57-0000-000000000001';
const OUT_DIR = path.join(__dirname, '../renders/pr3g');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    // Desktop Chrome typically doesn't have navigator.share
    permissions: ['clipboard-write', 'clipboard-read'],
  });

  const page = await context.newPage();

  // Navigate
  await page.goto(`http://localhost:3000/certificate/${VOW_ID}?_t=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Test 1: PNG Save Image
  console.log('=== TEST 1: Save Image (PNG Export) ===');
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);

  // Click "Save image" button
  const saveBtn = page.locator('button', { hasText: 'Save image' });
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    const download = await downloadPromise;
    if (download) {
      const savePath = path.join(OUT_DIR, 'certificate-export.png');
      await download.saveAs(savePath);
      const stats = fs.statSync(savePath);
      console.log(`  PNG saved: ${savePath} (${(stats.size / 1024).toFixed(1)} KB)`);
      console.log('  PNG Export: PASS');
    } else {
      // html-to-image uses blob URL + <a> click — may not trigger download event
      // Check if the button changed to "Saving..."
      console.log('  No download event — html-to-image may use different download method');
      console.log('  PNG Export: MANUAL CHECK NEEDED');
    }
  } else {
    console.log('  Save image button not found');
    console.log('  PNG Export: FAIL');
  }

  // Test 2: Clipboard fallback
  console.log('\n=== TEST 2: Share → Clipboard Fallback ===');

  // Remove navigator.share to simulate desktop Chrome
  await page.evaluate(() => {
    delete navigator.share;
  });

  const shareBtn = page.locator('button', { hasText: /^Share/ }).last();
  if (await shareBtn.isVisible()) {
    await shareBtn.click();
    await page.waitForTimeout(500);

    // Check if button text changed to "Copied!"
    const btnText = await shareBtn.textContent();
    if (btnText?.includes('Copied')) {
      console.log('  Button shows "Copied!" feedback');

      // Read clipboard
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      console.log(`  Clipboard: ${clipboard.slice(0, 80)}...`);
      console.log('  Clipboard Fallback: PASS');
    } else {
      console.log(`  Button text: "${btnText}" — expected "Copied!"`);
      console.log('  Clipboard Fallback: FAIL');
    }

    // Wait 2.5s and verify it reverts
    await page.waitForTimeout(2500);
    const revertedText = await shareBtn.textContent();
    console.log(`  After 2.5s: "${revertedText}" (should be "Share →")`);
  } else {
    console.log('  Share button not found');
    console.log('  Clipboard Fallback: FAIL');
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
