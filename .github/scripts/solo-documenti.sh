#!/usr/bin/env bash
# Le prove pesanti si saltano solo se TUTTI i file cambiati sono documenti (docs/ o file .md).
# Nel dubbio (primo invio, storia mancante) le prove girano.
set -euo pipefail
pesanti=true
if [ -n "${BASE:-}" ] && [ "${BASE}" != "0000000000000000000000000000000000000000" ] &&
  git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  files=$(git diff --name-only "${BASE}...${HEAD}")
  if [ -n "${files}" ] && ! grep -qvE '^docs/|\.md$' <<<"${files}"; then
    pesanti=false
  fi
fi
echo "pesanti=${pesanti}" >>"${GITHUB_OUTPUT}"
echo "Prove pesanti: ${pesanti}"
