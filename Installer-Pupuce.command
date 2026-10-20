#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
trap 'echo; echo "Installation interrompue. Lis le message ci-dessus puis relance ce fichier."; read -r -p "Entrée pour fermer…"' ERR
source scripts/macos/bootstrap.sh
node scripts/macos/pupuce.mjs install
read -r -p 'Entrée pour fermer…'
