/**
 * Compute visual diff between mock render and built screen.
 *
 * Per STEP_7_VISUAL_DIFF.md §C:
 * - Reads mock PNG and built PNG
 * - Computes pixelmatch diff
 * - Outputs diff overlay + metrics JSON
 *
 * Run: node scripts/diff-screen.mjs <screen-id>
 */
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const screenId = process.argv[2];
if (!screenId) {
  console.error('Usage: node scripts/diff-screen.mjs <screen-id>');
  process.exit(1);
}

const mockPath = path.join(ROOT, `design-alignment/native-perfect/build-plan/mock-renders/${screenId}.png`);
const builtPath = path.join(ROOT, `design-alignment/native-perfect/build-plan/built-renders/${screenId}.png`);
const outDir = path.join(ROOT, 'design-alignment/native-perfect/build-plan/diffs');

fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(mockPath)) {
  console.error(`Mock not found: ${mockPath}`);
  process.exit(1);
}
if (!fs.existsSync(builtPath)) {
  console.error(`Built screenshot not found: ${builtPath}`);
  process.exit(1);
}

const mock = PNG.sync.read(fs.readFileSync(mockPath));
const built = PNG.sync.read(fs.readFileSync(builtPath));

if (mock.width !== built.width || mock.height !== built.height) {
  console.error(`Size mismatch: mock=${mock.width}x${mock.height}, built=${built.width}x${built.height}`);
  console.error('Resize the built screenshot to match mock dimensions (use sharp).');
  // Write a report noting the mismatch
  const report = {
    screenId,
    error: 'size_mismatch',
    mockSize: `${mock.width}x${mock.height}`,
    builtSize: `${built.width}x${built.height}`,
    pass: false,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const diff = new PNG({ width: mock.width, height: mock.height });
const numDiffPixels = pixelmatch(
  mock.data, built.data, diff.data,
  mock.width, mock.height,
  { threshold: 0.05, includeAA: true, alpha: 0.3 },
);
const totalPixels = mock.width * mock.height;
const percentDiff = (numDiffPixels / totalPixels) * 100;

const diffPath = path.join(outDir, `${screenId}-diff.png`);
fs.writeFileSync(diffPath, PNG.sync.write(diff));

const report = {
  screenId,
  totalPixels,
  numDiffPixels,
  percentDiff: percentDiff.toFixed(3),
  pass: percentDiff < 1.5,
  mockPath: path.relative(ROOT, mockPath),
  builtPath: path.relative(ROOT, builtPath),
  diffPath: path.relative(ROOT, diffPath),
};

// Write report markdown
const reportMd = `# Visual Diff — Screen ${screenId}

**Mock:** ${report.mockPath}
**Built:** ${report.builtPath}
**Diff overlay:** ${report.diffPath}

**Total pixels:** ${totalPixels.toLocaleString()}
**Changed pixels:** ${numDiffPixels.toLocaleString()} (${report.percentDiff}%)
**Threshold:** 1.5%
**Pixel pass:** ${report.pass ? 'YES' : 'NO'}
`;

fs.writeFileSync(path.join(outDir, `${screenId}-report.md`), reportMd);

console.log(JSON.stringify(report, null, 2));
