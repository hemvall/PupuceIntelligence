#!/bin/bash
set -euo pipefail
if [ "$(uname -s)" != Darwin ]; then
  echo 'Ce lanceur est prévu pour macOS.' >&2; exit 1
fi
PUPUCE_DATA="$HOME/Library/Application Support/PupuceIntelligence"
mkdir -p "$PUPUCE_DATA"
chmod 700 "$PUPUCE_DATA"
export PUPUCE_DATA
export PATH="$PUPUCE_DATA/runtime/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null || ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major >= 24 || (major === 22 && minor >= 13) ? 0 : 1)'; then
  echo 'Installation privée de Node.js 22 (sans sudo)…'
  PUPUCE_ARCH="$(uname -m)"
  case "$PUPUCE_ARCH" in arm64) ;; x86_64) PUPUCE_ARCH=x64 ;; *) echo 'Architecture non prise en charge'; exit 1 ;; esac
  PUPUCE_TMP="$(mktemp -d)"
  trap 'rm -rf "$PUPUCE_TMP"' EXIT
  curl --fail --location --silent --show-error https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$PUPUCE_TMP/SHASUMS256.txt"
  PUPUCE_ARCHIVE="$(awk -v arch="$PUPUCE_ARCH" '$2 ~ ("^node-v22\\.[0-9]+\\.[0-9]+-darwin-" arch "\\.tar\\.gz$") {print $2}' "$PUPUCE_TMP/SHASUMS256.txt")"
  [ -n "$PUPUCE_ARCHIVE" ] && [ "$(printf '%s\n' "$PUPUCE_ARCHIVE" | wc -l | tr -d ' ')" = 1 ]
  curl --fail --location --silent --show-error "https://nodejs.org/dist/latest-v22.x/$PUPUCE_ARCHIVE" -o "$PUPUCE_TMP/$PUPUCE_ARCHIVE"
  (cd "$PUPUCE_TMP"; awk -v name="$PUPUCE_ARCHIVE" '$2 == name' SHASUMS256.txt | shasum -a 256 -c -)
  mkdir -p "$PUPUCE_TMP/runtime"
  tar -xzf "$PUPUCE_TMP/$PUPUCE_ARCHIVE" -C "$PUPUCE_TMP/runtime" --strip-components=1
  rm -rf "$PUPUCE_DATA/runtime"
  mv "$PUPUCE_TMP/runtime" "$PUPUCE_DATA/runtime"
fi
