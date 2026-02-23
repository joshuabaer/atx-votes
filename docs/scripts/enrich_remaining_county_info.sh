#!/bin/bash
#
# enrich_remaining_county_info.sh — Wrapper script for county info enrichment
#
# Usage:
#   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Xcode/ATXVotes
#   bash docs/scripts/enrich_remaining_county_info.sh [options]
#
# Options (passed through to the Node.js script):
#   --dry-run         Preview what would be written without touching KV
#   --check-only      Just list which counties need enrichment
#   --county=48001    Enrich only one county (by FIPS)
#   --skip-check      Skip KV reads, use progress file only (fast for re-runs)
#   --force           Re-enrich even already-enriched counties
#   --reset           Clear progress and start fresh
#   --batch=20        Process at most N counties per run
#   --reverse         Process in reverse order
#
# Examples:
#   # Check which counties need enrichment (no API calls, just reads KV):
#   bash docs/scripts/enrich_remaining_county_info.sh --check-only
#
#   # Dry run to preview what would happen:
#   bash docs/scripts/enrich_remaining_county_info.sh --dry-run --batch=5
#
#   # Enrich a single county to test:
#   bash docs/scripts/enrich_remaining_county_info.sh --county=48001
#
#   # Process 20 counties at a time:
#   bash docs/scripts/enrich_remaining_county_info.sh --batch=20
#
#   # Run all remaining counties:
#   bash docs/scripts/enrich_remaining_county_info.sh
#
# The script saves progress to /tmp/enrich_county_info_progress.json,
# so it can be safely interrupted (Ctrl+C) and resumed.
#
# Estimated cost: ~$0.08 per county (Claude Sonnet + 5 web searches)
# Estimated time: ~12-15 seconds per county
# For ~120 counties: ~$10, ~30 minutes
# KV writes: 1 per county = ~120 total (well within 1M/month limit)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check for API key
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  # Try to read from .dev.vars
  DEV_VARS="$PROJECT_DIR/worker/.dev.vars"
  if [ -f "$DEV_VARS" ]; then
    export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY "$DEV_VARS" | cut -d= -f2-)
    echo "Loaded ANTHROPIC_API_KEY from $DEV_VARS"
  else
    echo "ERROR: Set ANTHROPIC_API_KEY environment variable or create worker/.dev.vars"
    exit 1
  fi
fi

# Check Node.js version
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

echo "=== County Info Enrichment ==="
echo "Project: $PROJECT_DIR"
echo ""

# Run the Node.js script
node "$SCRIPT_DIR/enrich_remaining_county_info.js" "$@"
