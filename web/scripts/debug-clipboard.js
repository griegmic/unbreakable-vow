const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    permissions: ['clipboard-write', 'clipboard-read'],
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000/certificate/a0000000-ce47-4e57-0000-000000000001', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Check navigator.share
  const hasShare = await page.evaluate(() => typeof navigator.share);
  console.log('navigator.share:', hasShare);

  // Find all buttons
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent();
    console.log('Button:', JSON.stringify(text?.trim()));
  }

  // Click the bottom "Share →" button
  const shareBtn = page.locator('button').filter({ hasText: /Share →/ });
  const count = await shareBtn.count();
  console.log('Share → buttons:', count);

  if (count > 0) {
    // Try clicking and check for clipboard write
    const result = await page.evaluate(async () => {
      // Find the bottom share button
      const buttons = document.querySelectorAll('button');
      let targetBtn = null;
      for (const btn of buttons) {
        if (btn.textContent?.includes('Share →') || btn.textContent?.includes('Share \u2192')) {
          targetBtn = btn;
        }
      }
      if (!targetBtn) return 'no button found';

      // Click it
      targetBtn.click();

      // Wait a bit
      await new Promise(r => setTimeout(r, 500));

      // Check button text
      return targetBtn.textContent;
    });
    console.log('After click:', result);

    // Check clipboard
    try {
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      console.log('Clipboard:', clip?.slice(0, 100));
    } catch (e) {
      console.log('Clipboard read error:', e.message);
    }
  }

  await browser.close();
})().catch(console.error);
