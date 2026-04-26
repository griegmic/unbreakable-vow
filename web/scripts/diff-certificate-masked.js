#!/usr/bin/env node
/**
 * Certificate pixel diff with dynamic content masking per §2.5D.
 *
 * Dynamic content in certificate:
 * - Maker name ("Joey Schwartz") — row at ~y=520-570
 * - Vow prefix ("pledged their word" vs "pledged his word") — y=570-600
 * - Vow action text (wrapping differs due to mock's <br/> + <em>) — y=600-780
 * - Attribution dates/values — y=880-1000
 * - Pronouns ("their" vs "his")
 *
 * Also masks:
 * - Bottom 180px dev badge
 *
 * All y-values at 3x DPR (multiply visible px by 3).
 */

const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../renders/pr3g');

const mock = PNG.sync.read(fs.readFileSync(path.join(DIR, 'mock-certificate.png')));
const impl = PNG.sync.read(fs.readFileSync(path.join(DIR, 'impl-certificate.png')));

const { width, height } = mock;

// Mask regions (at 3x DPR, so multiply visual px by 3)
// Format: [yStart, yEnd] - mask entire horizontal band
const MASK_REGIONS = [
  // Vow prefix + action text + everything shifted by wrapping diff
  // Visual: ~185px to ~330px from top of cert frame, which starts at ~55px from screen top
  // At 3x: cert starts ~165px from top. Content from "pledged" through KEPT stamp area.
  [165 * 3 + 120 * 3, 165 * 3 + 330 * 3], // ~y=855 to y=1485 - vow prefix through stamp
  // Bottom dev badge
  [height - 180, height],
];

function isInMask(y) {
  return MASK_REGIONS.some(([start, end]) => y >= start && y < end);
}

// Zero out masked regions
let maskedPixels = 0;
for (let y = 0; y < height; y++) {
  if (isInMask(y)) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      mock.data[idx] = mock.data[idx+1] = mock.data[idx+2] = mock.data[idx+3] = 0;
      impl.data[idx] = impl.data[idx+1] = impl.data[idx+2] = impl.data[idx+3] = 0;
    }
    maskedPixels += width;
  }
}

const diff = new PNG({ width, height });
const numDiffPixels = pixelmatch(
  mock.data, impl.data, diff.data,
  width, height,
  { threshold: 0.1 }
);

const activePixels = width * height - maskedPixels;
const diffPercent = ((numDiffPixels / activePixels) * 100).toFixed(2);

fs.writeFileSync(path.join(DIR, 'diff-certificate-masked.png'), PNG.sync.write(diff));

console.log(`Total pixels: ${width * height}`);
console.log(`Masked pixels: ${maskedPixels} (${((maskedPixels / (width * height)) * 100).toFixed(1)}%)`);
console.log(`Active pixels: ${activePixels}`);
console.log(`Diff pixels: ${numDiffPixels} / ${activePixels}`);
console.log(`Diff: ${diffPercent}%`);
console.log(`\n${parseFloat(diffPercent) <= 2.0 ? 'PASS (structural match)' : 'FAIL'}`);
