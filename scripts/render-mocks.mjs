/**
 * Render each mock cell from project-perfect-final-build-mocks.html as a standalone PNG.
 *
 * Per STEP_7_VISUAL_DIFF.md §A:
 * - Loads mock HTML via file:// protocol
 * - Waits for web fonts (Fraunces + Inter Tight)
 * - Iterates every <div class="shot">, extracts screen ID from label
 * - Screenshots the <div class="phone"> at 3x device scale factor
 * - Writes to design-alignment/native-perfect/build-plan/mock-renders/<id>.png
 *
 * Run: npx playwright install chromium && node scripts/render-mocks.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MOCK_HTML = path.join(ROOT, 'design-alignment/native-perfect/project-perfect-final-build-mocks.html');
const OUT_DIR = path.join(ROOT, 'design-alignment/native-perfect/build-plan/mock-renders');

await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();
await page.goto(`file://${MOCK_HTML}`);
await page.evaluate(() => document.fonts.ready);

// Wait a bit for fonts to settle
await page.waitForTimeout(1000);

const shots = await page.$$('.shot');
let count = 0;

for (const shot of shots) {
  const labelEl = await shot.$('.label');
  if (!labelEl) continue;

  const labelText = (await labelEl.innerText()).trim();
  // Parse "Approved 02b. Verdict Date Sheet" → "02b"
  // Also handles "Approved 13B. Project Perfect Menu" → "13B"
  const idMatch = labelText.match(/Approved\s+([0-9]+[a-zA-Z]*)\./i);
  if (!idMatch) {
    console.warn(`Skipping label: ${labelText}`);
    continue;
  }
  const id = idMatch[1];

  const phoneEl = await shot.$('.phone');
  if (!phoneEl) {
    console.warn(`No .phone element for screen ${id}`);
    continue;
  }

  const buf = await phoneEl.screenshot({ omitBackground: false });
  await fs.writeFile(path.join(OUT_DIR, `${id}.png`), buf);
  console.log(`Rendered ${id}.png`);
  count++;
}

await browser.close();
console.log(`\nDone: ${count} mock PNGs rendered to ${OUT_DIR}`);
