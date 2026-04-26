#!/usr/bin/env node
/**
 * Pixel diff for certificate page.
 * Compares mock vs impl at 393×852 dpr=3.
 * Masks bottom 180px (dev badge at 3x) per §2.5D.
 */

const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../renders/pr3g');
const mockPath = path.join(DIR, 'mock-certificate.png');
const implPath = path.join(DIR, 'impl-certificate.png');
const diffPath = path.join(DIR, 'diff-certificate.png');

const mock = PNG.sync.read(fs.readFileSync(mockPath));
const impl = PNG.sync.read(fs.readFileSync(implPath));

console.log(`Mock: ${mock.width}×${mock.height}`);
console.log(`Impl: ${impl.width}×${impl.height}`);

if (mock.width !== impl.width || mock.height !== impl.height) {
  console.error('Size mismatch — cannot diff');
  process.exit(1);
}

const { width, height } = mock;

// Mask bottom 180px (dev badge at 3x dpr) by zeroing both images in that region
const MASK_BOTTOM = 180;
const maskStart = (height - MASK_BOTTOM) * width * 4;
for (let i = maskStart; i < mock.data.length; i++) {
  mock.data[i] = 0;
  impl.data[i] = 0;
}

const diff = new PNG({ width, height });

const numDiffPixels = pixelmatch(
  mock.data, impl.data, diff.data,
  width, height,
  { threshold: 0.1 }
);

// Only count non-masked pixels
const activePixels = width * (height - MASK_BOTTOM);
const diffPercent = ((numDiffPixels / activePixels) * 100).toFixed(2);

fs.writeFileSync(diffPath, PNG.sync.write(diff));

console.log(`\nActive pixels (masked ${MASK_BOTTOM}px bottom): ${activePixels}`);
console.log(`Diff pixels: ${numDiffPixels} / ${activePixels}`);
console.log(`Diff: ${diffPercent}%`);
console.log(`Threshold: ≤2.00%`);
console.log(parseFloat(diffPercent) <= 2.0 ? 'PASS' : 'FAIL');
