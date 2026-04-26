#!/usr/bin/env node
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../renders/pr3m');
const MASK_BOTTOM = 180;

const mock = PNG.sync.read(fs.readFileSync(path.join(DIR, 'mock-stake.png')));
const impl = PNG.sync.read(fs.readFileSync(path.join(DIR, 'impl-stake-50-charity.png')));

console.log(`Mock: ${mock.width}×${mock.height}`);
console.log(`Impl: ${impl.width}×${impl.height}`);

if (mock.width !== impl.width || mock.height !== impl.height) {
  console.error('Size mismatch'); process.exit(1);
}

const { width, height } = mock;
const maskStart = (height - MASK_BOTTOM) * width * 4;
for (let i = maskStart; i < mock.data.length; i++) {
  mock.data[i] = 0; impl.data[i] = 0;
}

const diff = new PNG({ width, height });
const numDiffPixels = pixelmatch(mock.data, impl.data, diff.data, width, height, { threshold: 0.1 });
const activePixels = width * (height - MASK_BOTTOM);
const diffPercent = ((numDiffPixels / activePixels) * 100).toFixed(2);

fs.writeFileSync(path.join(DIR, 'diff-stake.png'), PNG.sync.write(diff));

console.log(`\nActive pixels (masked ${MASK_BOTTOM}px bottom): ${activePixels}`);
console.log(`Diff pixels: ${numDiffPixels} / ${activePixels}`);
console.log(`Diff: ${diffPercent}%`);
