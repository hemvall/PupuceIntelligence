#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
trap 'echo; echo "Impossible de démarrer. Relance Installer-Pupuce.command ou consulte le guide Mac."; read -r -p "Entrée pour fermer…"' ERR
source scripts/macos/bootstrap.sh
node scripts/macos/pupuce.mjs start
