#!/usr/bin/env node
/**
 * Token Parity Verification — V6
 *
 * Compares color tokens in web/src/app/globals.css (CSS custom properties)
 * against expo/lib/uv-tokens.ts (TypeScript constants) to ensure they match.
 *
 * Run: node scripts/verify-token-parity.js
 * Exit code 0 = parity, 1 = drift detected
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSS_PATH = path.join(ROOT, 'web/src/app/globals.css');
const TS_PATH = path.join(ROOT, 'expo/lib/uv-tokens.ts');

// ── Parse CSS custom properties from globals.css ──
function parseCssTokens(cssContent) {
  const tokens = {};
  // Match --uv-<name>: <value>; within @layer base :root
  const layerMatch = cssContent.match(/@layer base\s*\{[\s\S]*?:root\s*\{([\s\S]*?)\}\s*\}/);
  if (!layerMatch) {
    console.error('Could not find @layer base :root block in globals.css');
    process.exit(1);
  }
  const block = layerMatch[1];
  const propRegex = /--uv-([a-z-]+):\s*([^;]+);/g;
  let match;
  while ((match = propRegex.exec(block)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    // Skip var() references and non-color tokens
    if (value.startsWith('var(')) continue;
    tokens[name] = value;
  }
  return tokens;
}

// ── Parse TypeScript color constants from uv-tokens.ts ──
function parseTsTokens(tsContent) {
  const tokens = {};
  // Match key: 'value' or key: "value" within uvColors
  const colorsMatch = tsContent.match(/export const uvColors\s*=\s*\{([\s\S]*?)\}\s*as const/);
  if (!colorsMatch) {
    console.error('Could not find uvColors in uv-tokens.ts');
    process.exit(1);
  }
  const block = colorsMatch[1];
  const propRegex = /(\w+):\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = propRegex.exec(block)) !== null) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

// ── Map CSS property names to TS camelCase ──
// --uv-bg-card → bgCard, --uv-text-muted → textMuted, etc.
function cssNameToTsName(cssName) {
  return cssName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// ── Color normalization for comparison ──
function normalizeColor(value) {
  // Lowercase hex values for comparison
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ── Main ──
const cssContent = fs.readFileSync(CSS_PATH, 'utf8');
const tsContent = fs.readFileSync(TS_PATH, 'utf8');

const cssTokens = parseCssTokens(cssContent);
const tsTokens = parseTsTokens(tsContent);

// Filter CSS tokens to only color-related ones (backgrounds, borders, text, gold, signals, imessage)
const colorPrefixes = ['bg', 'border', 'text', 'gold', 'success', 'danger', 'warn', 'imessage', 'cert', 'info'];
const cssColorTokens = {};
for (const [name, value] of Object.entries(cssTokens)) {
  const isColor = colorPrefixes.some(p => name.startsWith(p));
  if (isColor) cssColorTokens[name] = value;
}

let errors = 0;
let checked = 0;

// Check each CSS color token has a matching TS token
for (const [cssName, cssValue] of Object.entries(cssColorTokens)) {
  const tsName = cssNameToTsName(cssName);
  checked++;

  if (!(tsName in tsTokens)) {
    console.error(`MISSING in Expo: --uv-${cssName} (${cssValue}) has no match for '${tsName}' in uvColors`);
    errors++;
    continue;
  }

  const normalizedCss = normalizeColor(cssValue);
  const normalizedTs = normalizeColor(tsTokens[tsName]);

  if (normalizedCss !== normalizedTs) {
    console.error(`MISMATCH: --uv-${cssName} = "${cssValue}" (web) vs ${tsName} = "${tsTokens[tsName]}" (expo)`);
    errors++;
  }
}

// Check each TS token has a matching CSS token
for (const tsName of Object.keys(tsTokens)) {
  const cssName = tsName.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  if (!(cssName in cssColorTokens)) {
    console.error(`MISSING in web: uvColors.${tsName} has no match for --uv-${cssName} in globals.css`);
    errors++;
  }
}

console.log(`\nToken parity check: ${checked} tokens compared, ${errors} issues found.`);

if (errors > 0) {
  console.error('\nFAILED — fix token drift before merging.');
  process.exit(1);
} else {
  console.log('PASSED — web and Expo tokens are in sync.');
  process.exit(0);
}
