#!/usr/bin/env bash
# Scrape multiple Liga MX seasons sequentially.
# Usage: bash src/scrape-history.sh
set -euo pipefail

SEASONS=(
  "liga-mx|current"
  "liga-mx-2024-2025|2024-2025"
  "liga-mx-2023-2024|2023-2024"
)

for entry in "${SEASONS[@]}"; do
  slug="${entry%%|*}"
  label="${entry##*|}"
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "  Scraping ${label} (${slug})"
  echo "═══════════════════════════════════════════════"
  SEASON_SLUG="${slug}" SEASON_LABEL="${label}" CONCURRENCY="${CONCURRENCY:-3}" \
    node src/liga-mx.js --results-only
done

echo ""
echo "✅ Historical scrape complete."
