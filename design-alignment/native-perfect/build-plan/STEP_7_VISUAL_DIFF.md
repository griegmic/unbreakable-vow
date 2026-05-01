# STEP 7 — Visual Diff Tooling Spec

This document specifies the tooling Layer 0 (Claude Code) uses to produce the screenshot diff that the design reviewer reads.

The tooling is local-only (not CI). Joey is hands-on; CI complexity is a tax we don't need.

---

## A. Mock-cell rendering

**Goal:** Each `<div class="shot">` in `project-perfect-final-build-mocks.html` is rendered as a standalone PNG at exact iPhone 15 Pro dimensions (393×852).

**Tool:** Playwright (Node, headless Chromium). Playwright is the right choice in late April 2026 — better Chromium fidelity than Puppeteer, better element-screenshot API, well-maintained.

**Script:** `scripts/render-mocks.mjs` at the repo root. Run once after token reconciliation, then on demand if mocks change.

**Behavior:**
1. Load `design-alignment/native-perfect/project-perfect-final-build-mocks.html` via `file://` protocol.
2. Wait for `Fraunces` and `Inter Tight` web fonts to load (use `document.fonts.ready`).
3. Iterate every `<div class="shot">`:
   - Extract the screen ID from the label (parse "Approved 02b. Verdict Date Sheet" → `02b`).
   - Find the `<div class="phone">` inside.
   - Use Playwright's `elementHandle.screenshot({ omitBackground: false, scale: 'device' })`.
   - Write PNG to `design-alignment/native-perfect/build-plan/mock-renders/<screen-id>.png`.
4. Outputs: 32 PNGs, one per mock screen.

**Implementation outline:**

```javascript
// scripts/render-mocks.mjs
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const MOCK_HTML = path.resolve('design-alignment/native-perfect/project-perfect-final-build-mocks.html');
const OUT_DIR = path.resolve('design-alignment/native-perfect/build-plan/mock-renders');

await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 3, // retina-quality
});
const page = await ctx.newPage();
await page.goto(`file://${MOCK_HTML}`);
await page.evaluate(() => document.fonts.ready);

const shots = await page.$$('.shot');
for (const shot of shots) {
  const labelEl = await shot.$('.label');
  const labelText = (await labelEl.innerText()).trim();
  // Parse "Approved 02b. ..." → "02b"
  const idMatch = labelText.match(/Approved\s+([0-9]+[a-zA-Z]*)\./);
  if (!idMatch) continue;
  const id = idMatch[1];
  
  const phoneEl = await shot.$('.phone');
  const buf = await phoneEl.screenshot({ omitBackground: false });
  await fs.writeFile(path.join(OUT_DIR, `${id}.png`), buf);
  console.log(`Rendered ${id}.png`);
}

await browser.close();
```

**Notes:**
- `deviceScaleFactor: 3` produces ~1179×2556 image (3x of 393×852). This matches iPhone 15 Pro's actual screen pixel density. The diff tool downscales the simulator screenshot to match if needed.
- For derived screens (D1-D20) that don't have HTML mocks: no PNG exists. The reviewer is told "no mock available, score against the screen spec text only." Mock fidelity criterion is N/A for these (replaced with "spec fidelity" — does the screen match what's in the screen spec).

**Run:** `cd /Users/joey/rork-unbreakable-vow && npx playwright install chromium && node scripts/render-mocks.mjs`.

---

## B. Built-screen screenshot capture

**Goal:** Capture the current screen of a running Expo iOS Simulator at iPhone 15 Pro size, as a PNG.

**Tool:** `xcrun simctl io booted screenshot` — Apple's official simulator screenshot CLI. Reliable, no third-party dependency, fastest path.

**Script:** `scripts/capture-built.sh`:

```bash
#!/usr/bin/env bash
# Usage: ./scripts/capture-built.sh <screen-id>
# Captures the current state of the booted iOS Simulator and saves to:
# design-alignment/native-perfect/build-plan/built-renders/<screen-id>.png
#
# Prerequisite: iPhone 15 Pro simulator booted with Expo dev client running
# the screen of interest.

SCREEN_ID=$1
OUT_DIR="design-alignment/native-perfect/build-plan/built-renders"
mkdir -p "$OUT_DIR"

xcrun simctl io booted screenshot "$OUT_DIR/$SCREEN_ID.png"
echo "Captured $OUT_DIR/$SCREEN_ID.png"
```

**Workflow:**
1. Start Expo dev client (`expo start` then run on iPhone 15 Pro simulator).
2. Navigate to the screen of interest (the build agent does this programmatically via deep link or UI navigation).
3. Run `./scripts/capture-built.sh 02b` (or whichever ID).
4. PNG written to `built-renders/02b.png`.

**Note for the build agent:** Claude Code can run this as part of the graduation script. The agent navigates the app via the iOS Simulator (or tells Joey "now navigate to screen 02b in the simulator and let me know when ready" if direct control isn't viable — though Claude Code can drive the simulator via `xcrun simctl` and Maestro for some flows).

---

## C. Diff computation

**Goal:** Given mock PNG and built PNG, produce a side-by-side image, an overlay diff highlighting differences, and a metric the reviewer reads.

**Tool:** `pixelmatch` (npm) — well-maintained, fast, used by industry. Threshold: 0.05 sensitivity. Max 1.5% changed pixels for graduation pass on Mock Fidelity criterion.

**Plus:** Structural diff (Sharp library or canvas-based color extraction) for typography baseline + color palette deltas. Catches semantic deviations even when pixels barely match.

**Script:** `scripts/diff-screen.mjs`:

```javascript
// scripts/diff-screen.mjs
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const screenId = process.argv[2];
const mockPath = `design-alignment/native-perfect/build-plan/mock-renders/${screenId}.png`;
const builtPath = `design-alignment/native-perfect/build-plan/built-renders/${screenId}.png`;
const outDir = `design-alignment/native-perfect/build-plan/diffs`;
fs.mkdirSync(outDir, { recursive: true });

const mock = PNG.sync.read(fs.readFileSync(mockPath));
const built = PNG.sync.read(fs.readFileSync(builtPath));

// Resize built to match mock dimensions if needed
// (built simulator capture may be at 3x; mock at 3x deviceScaleFactor too)
// For simplicity, both should be 1179×2556. Verify or downscale.

if (mock.width !== built.width || mock.height !== built.height) {
  console.error(`Size mismatch: mock=${mock.width}x${mock.height}, built=${built.width}x${built.height}`);
  // TODO: resize built to mock size using sharp
  process.exit(1);
}

const diff = new PNG({ width: mock.width, height: mock.height });
const numDiffPixels = pixelmatch(
  mock.data, built.data, diff.data,
  mock.width, mock.height,
  { threshold: 0.05, includeAA: true, alpha: 0.3 }
);
const totalPixels = mock.width * mock.height;
const percentDiff = (numDiffPixels / totalPixels) * 100;

fs.writeFileSync(`${outDir}/${screenId}-diff.png`, PNG.sync.write(diff));

// Side-by-side composite (mock | built | diff)
// Using a simple canvas-based composite via sharp:
// Output: design-alignment/native-perfect/build-plan/diffs/{id}-side-by-side.png

console.log(JSON.stringify({
  screenId,
  totalPixels,
  numDiffPixels,
  percentDiff: percentDiff.toFixed(3),
  pass: percentDiff < 1.5,
  mockPath,
  builtPath,
  diffPath: `${outDir}/${screenId}-diff.png`,
}, null, 2));
```

**Run:** `node scripts/diff-screen.mjs 02b`.

**Output:**
- `diffs/<id>-diff.png` — overlay highlighting differences in red.
- `diffs/<id>-side-by-side.png` — three-panel composite (mock | built | diff).
- JSON to stdout with metrics.

**Threshold:** The 1.5% changed-pixels threshold accounts for sub-pixel rendering differences between Chromium (mock render) and iOS Core Animation (built render). Real fidelity issues produce much higher diffs (typically >5%).

**For derived screens (D1-D20):** No mock PNG exists. The reviewer scores against the spec only. Visual diff is N/A.

---

## D. Diff report format (what the design reviewer reads)

A markdown file generated per screen, written to `design-alignment/native-perfect/build-plan/diffs/<screen-id>-report.md`:

```markdown
# Visual Diff — Screen <id>

**Mock:** ./mock-renders/<id>.png
**Built:** ./built-renders/<id>.png
**Diff overlay:** ./diffs/<id>-diff.png
**Side-by-side:** ./diffs/<id>-side-by-side.png

**Total pixels:** 3,015,924
**Changed pixels:** 12,341 (0.41%)
**Threshold:** 1.5%
**Pixel pass:** YES

## Structural notes

- Typography: Fraunces 600/40 confirmed at title position (matches mock ±0px).
- Colors: gold accent at expected position, `#d6a83c` matches.
- Layout: card position matches mock within 1px tolerance.

## Visual differences detected

[Auto-generated annotations from the diff overlay, e.g.:]
- Region (x:120, y:380, w:60, h:40): minor color shift, likely sub-pixel rendering.
- (none flagged as semantic)
```

The design reviewer reads this report alongside the screenshot and the spec. The pixel-pass metric goes into criterion 11 (Mock fidelity).

---

## E. Tooling installation + setup

Phase 0 task. Layer 0 runs once:

```bash
cd /Users/joey/rork-unbreakable-vow
npm install --save-dev playwright pixelmatch pngjs sharp
npx playwright install chromium
chmod +x scripts/capture-built.sh
mkdir -p design-alignment/native-perfect/build-plan/mock-renders
mkdir -p design-alignment/native-perfect/build-plan/built-renders
mkdir -p design-alignment/native-perfect/build-plan/diffs
node scripts/render-mocks.mjs  # generates 32 mock PNGs
```

After this, every screen graduation runs:

```bash
./scripts/capture-built.sh <screen-id>  # capture from booted simulator
node scripts/diff-screen.mjs <screen-id>  # compute diff, write report
```

The reports + screenshots are then fed to the design reviewer subagent.

### Booting the simulator and navigating to the target screen

Before any capture, the agent ensures the simulator is at the target screen state.

```bash
# One-time setup per Phase 0:
xcrun simctl boot 'iPhone 15 Pro'
open -a Simulator

# Per session:
cd expo && npx expo run:ios

# To navigate to a specific screen via deep link (URL scheme configured in expo/app.json):
xcrun simctl openurl booted unbreakable-vow://native-perfect/create/stake
```

If deep linking isn't configured for a screen, the agent navigates manually by tapping through the app in the simulator (xdotool-style automation is overkill for this scale).

### Image-size resize logic

If mock render and simulator capture sizes don't match (sub-pixel rounding can cause this), resize using sharp:

```javascript
import sharp from 'sharp';
await sharp(builtPath)
  .resize(1179, 2556, { fit: 'contain', background: { r: 8, g: 7, b: 6, alpha: 1 }})
  .toFile(builtResizedPath);
// Then run pixelmatch on the resized image.
```

Both mock render and simulator capture should produce 1179×2556 PNGs (iPhone 15 Pro at 3x device scale factor). The `bg: #080706` matches the dark phone gradient endpoint, so any padding around the resize doesn't pollute the diff.

---

## F. Limitations & non-goals

**Not in scope:**
- CI integration. Runs locally on Joey's machine.
- Automated simulator navigation. The build agent navigates manually or via Maestro/Detox if they decide it's worth the setup.
- Real-device screenshots. Simulator only for v1. (Real-device fidelity is checked at Phase 10 final.)
- Cross-platform diff (Android). Native build is iOS-only for v1.

**Known limitations:**
- Sub-pixel rendering differences between Chromium and Core Animation will produce ~0.3-0.8% baseline diff even on perfectly matched screens. The 1.5% threshold accommodates this.
- Animations are not captured by static screenshot. Motion fidelity is reviewed separately by the design reviewer based on the spec, not the diff.
- Custom fonts: if the simulator's Fraunces/Inter Tight are subtly different from Chromium's web-fonts version, expect some baseline diff. Acceptable for v1; revisit if it's a graduation blocker.

---

End of Step 7.
