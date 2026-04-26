#!/usr/bin/env node
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../renders/pr3l');
const MASK_BOTTOM = 180; // dev badge at 3x

function runDiff(mockFile, implFile, diffFile, label) {
  const mockPath = path.join(DIR, mockFile);
  const implPath = path.join(DIR, implFile);

  if (!fs.existsSync(mockPath)) { console.log(`${label}: SKIP — mock not found (${mockFile})`); return; }
  if (!fs.existsSync(implPath)) { console.log(`${label}: SKIP — impl not found (${implFile})`); return; }

  const mock = PNG.sync.read(fs.readFileSync(mockPath));
  const impl = PNG.sync.read(fs.readFileSync(implPath));

  console.log(`\n=== ${label} ===`);
  console.log(`Mock: ${mock.width}×${mock.height}`);
  console.log(`Impl: ${impl.width}×${impl.height}`);

  if (mock.width !== impl.width || mock.height !== impl.height) {
    console.log(`SIZE MISMATCH — cannot diff`);
    return;
  }

  const { width, height } = mock;

  // Mask bottom dev badge
  const maskStart = (height - MASK_BOTTOM) * width * 4;
  for (let i = maskStart; i < mock.data.length; i++) {
    mock.data[i] = 0;
    impl.data[i] = 0;
  }

  const diff = new PNG({ width, height });
  const numDiffPixels = pixelmatch(mock.data, impl.data, diff.data, width, height, { threshold: 0.1 });
  const activePixels = width * (height - MASK_BOTTOM);
  const diffPercent = ((numDiffPixels / activePixels) * 100).toFixed(2);

  fs.writeFileSync(path.join(DIR, diffFile), PNG.sync.write(diff));
  console.log(`Diff pixels: ${numDiffPixels} / ${activePixels}`);
  console.log(`Diff: ${diffPercent}%`);
}

// 1. /witness mobile vs mock
runDiff('mock-witness.png', 'impl-witness.png', 'diff-witness-mobile.png', '/witness mobile vs 04-witness-pick.html');

// 2. /seal unauthed $0 vs mock
runDiff('mock-seal.png', 'impl-seal-unauth-zero.png', 'diff-seal-zero.png', '/seal unauth $0 vs web-04-auth-pay.html');

// 3. /seal unauthed staked vs mock
runDiff('mock-seal.png', 'impl-seal-unauth-staked.png', 'diff-seal-staked.png', '/seal unauth staked vs web-04-auth-pay.html');

console.log('\n--- Desktop /witness: No 1:1 mock exists. Designer self-eval only. ---');
