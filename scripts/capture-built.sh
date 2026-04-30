#!/usr/bin/env bash
# Usage: ./scripts/capture-built.sh <screen-id>
# Captures the current state of the booted iOS Simulator and saves to:
# design-alignment/native-perfect/build-plan/built-renders/<screen-id>.png
#
# Prerequisite: iPhone 15 Pro simulator booted with Expo dev client running
# the screen of interest.

set -euo pipefail

SCREEN_ID="${1:?Usage: ./scripts/capture-built.sh <screen-id>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$ROOT_DIR/design-alignment/native-perfect/build-plan/built-renders"

mkdir -p "$OUT_DIR"

xcrun simctl io booted screenshot "$OUT_DIR/$SCREEN_ID.png"
echo "Captured $OUT_DIR/$SCREEN_ID.png"
