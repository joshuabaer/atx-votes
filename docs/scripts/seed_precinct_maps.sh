#!/bin/bash
#
# seed_precinct_maps.sh — Wrapper script for precinct map seeding
#
# Seeds ZIP-to-commissioner-precinct mappings for Texas counties using
# Claude API + web_search. Writes results to Cloudflare KV.
#
# Usage:
#   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Xcode/ATXVotes
#   bash docs/scripts/seed_precinct_maps.sh [options]
#
# Options (passed through to the Node.js script):
#   --check-only      List which counties need precinct maps, don't seed
#   --batch=N         Process at most N counties per run (default: all remaining)
#   --county=48201    Seed only one county (by FIPS)
#   --dry-run         Print what would be written, don't touch KV
#   --reset           Clear progress and start fresh
#   --force           Re-seed even counties that already have precinct maps
#   --reverse         Process counties in reverse order
#
# Examples:
#   # Check which counties need precinct maps (reads KV keys, no API calls):
#   bash docs/scripts/seed_precinct_maps.sh --check-only
#
#   # Dry run to preview what would happen:
#   bash docs/scripts/seed_precinct_maps.sh --dry-run --batch=3
#
#   # Seed a single county to test:
#   bash docs/scripts/seed_precinct_maps.sh --county=48339
#
#   # Seed 10 counties at a time:
#   bash docs/scripts/seed_precinct_maps.sh --batch=10
#
#   # Seed all remaining counties in the top 30:
#   bash docs/scripts/seed_precinct_maps.sh
#
# The script saves progress to /tmp/seed_precinct_maps_progress.json,
# so it can be safely interrupted (Ctrl+C) and resumed.
#
# Estimated cost: ~$0.10 per county (Claude Sonnet + up to 10 web searches)
# Estimated time: ~15-20 seconds per county
# For 20 counties: ~$2, ~6 minutes
# KV writes: 1 per county (well within 1M/month limit)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check for API key — auto-load from .dev.vars if not set
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  DEV_VARS="$PROJECT_DIR/worker/.dev.vars"
  if [ -f "$DEV_VARS" ]; then
    export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY "$DEV_VARS" | cut -d= -f2-)
    echo "Loaded ANTHROPIC_API_KEY from $DEV_VARS"
  else
    echo "ERROR: Set ANTHROPIC_API_KEY environment variable or create worker/.dev.vars"
    exit 1
  fi
fi

# Check Node.js version (need 18+ for native fetch)
NODE_VERSION=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ] 2>/dev/null; then
  echo "ERROR: Node.js 18+ required (found v$NODE_VERSION)"
  exit 1
fi

# Check wrangler is available
if ! command -v npx &>/dev/null; then
  echo "ERROR: npx not found. Install Node.js and npm."
  exit 1
fi

echo "=== Precinct Map Seeder ==="
echo "Project: $PROJECT_DIR"
echo ""

# Run the Node.js script
node "$SCRIPT_DIR/seed_precinct_maps.js" "$@"
