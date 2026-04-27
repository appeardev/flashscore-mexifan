#!/usr/bin/env bash
# Install the weekly Flashscore Liga MX scrape on macOS via launchd.
# Runs every Monday at 9:00am local time.
set -euo pipefail

REPO_DIR="$HOME/Projects/flashscore-mexifan"
PLIST_NAME="com.appeardev.flashscore-liga-mx"
PLIST_SRC="$REPO_DIR/launchd/${PLIST_NAME}.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

if [[ ! -d "$REPO_DIR" ]]; then
  echo "❌ Repo not found at $REPO_DIR"
  echo "   Clone it first: git clone https://github.com/appeardev/FlashscoreScraping ~/Projects/flashscore-mexifan"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node not found. Install via: brew install node"
  exit 1
fi

cd "$REPO_DIR"
echo "→ Installing npm deps..."
npm install --silent

echo "→ Installing Playwright Chromium..."
npx playwright install chromium

echo "→ Linking plist to LaunchAgents..."
mkdir -p "$HOME/Library/LaunchAgents"
cp "$PLIST_SRC" "$PLIST_DEST"

echo "→ Loading via launchctl..."
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"

echo ""
echo "✅ Installed. Will run every Monday at 9:00am."
echo ""
echo "Manual commands:"
echo "  Run now:      launchctl start ${PLIST_NAME}"
echo "  View status:  launchctl list | grep ${PLIST_NAME}"
echo "  Tail logs:    tail -f \$HOME/Library/Logs/flashscore-liga-mx.log"
echo "  Uninstall:    launchctl unload \$HOME/Library/LaunchAgents/${PLIST_NAME}.plist && rm \$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
echo ""
echo "Optional: seed historical data once (3 seasons, ~30min):"
echo "  bash src/scrape-history.sh"
