#!/usr/bin/env bash
#
# Creates a GitHub issue for each ticket in Features.csv listed in
# scripts/new-tickets.txt, and adds it to the project board.
#
# Two independent safety nets against duplicating the tickets a teammate
# already created:
#
#   1. The allowlist. Only IDs in scripts/new-tickets.txt are considered.
#      That file was generated from the git diff of Features.csv, so it
#      contains exactly the tickets this branch added.
#   2. Title dedupe. Any ticket whose ID already appears in an existing issue
#      title (open or closed, any format) is skipped anyway.
#
# Usage:
#   ./scripts/sync-issues.sh --dry-run                 # print what would happen
#   PROJECT_NUMBER=1 ./scripts/sync-issues.sh          # create them
#   ./scripts/sync-issues.sh --all                     # ignore the allowlist,
#                                                      # rely on title dedupe only
#
# Requires: gh, authenticated.

set -euo pipefail

REPO="SaskiaSteyn/tasktails"
OWNER="SaskiaSteyn"
PROJECT_NUMBER="${PROJECT_NUMBER:-7}"   # github.com/users/SaskiaSteyn/projects/7

HERE="$(cd "$(dirname "$0")" && pwd)"
CSV="$HERE/../Features.csv"
ALLOWLIST="$HERE/new-tickets.txt"
# Issues that were created but could not be added to the board — replay with:
#   xargs -n1 -I{} gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url {} < scripts/orphaned-issues.txt
ORPHANS="$HERE/orphaned-issues.txt"

DRY_RUN=false
USE_ALLOWLIST=true
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --all)     USE_ALLOWLIST=false ;;
    *) echo "unknown flag: $arg"; exit 1 ;;
  esac
done

command -v gh >/dev/null || { echo "gh is not installed: brew install gh && gh auth login"; exit 1; }

echo "Fetching existing issue titles from $REPO ..."
EXISTING="$(mktemp)"
trap 'rm -f "$EXISTING"' EXIT
gh issue list --repo "$REPO" --state all --limit 1000 --json title --jq '.[].title' > "$EXISTING"
echo "  $(grep -c . "$EXISTING" || true) issues already on the repo."

if $USE_ALLOWLIST; then
  [[ -f "$ALLOWLIST" ]] || { echo "missing $ALLOWLIST"; exit 1; }
  echo "  restricting to the $(grep -c . "$ALLOWLIST") ids in new-tickets.txt"
fi

created=0
skipped_existing=0
skipped_allowlist=0

# Fields are unquoted and contain no commas — verified with:
#   awk -F',' 'NF!=5 && NF>0 {print NR}' Features.csv
while IFS=',' read -r id title module type status; do
  [[ -z "${id// }" ]] && continue

  if $USE_ALLOWLIST && ! grep -qx "$id" "$ALLOWLIST"; then
    skipped_allowlist=$((skipped_allowlist + 1))
    continue
  fi

  # Match the id anywhere in an existing title, case-insensitively, on a word
  # boundary — so "AUTH-08 — Foo", "[AUTH-08] Foo" and "Foo (AUTH-08)" all
  # count as already-created, whatever convention your teammate used.
  # The boundary stops INF-1 matching INF-18.
  if grep -qiE "(^|[^A-Za-z0-9-])${id}([^A-Za-z0-9-]|$)" "$EXISTING"; then
    echo "skip (exists): $id"
    skipped_existing=$((skipped_existing + 1))
    continue
  fi

  # "INF-11: NextAuth configuration (...)" — matches the convention already on
  # the board. Colon, not an em-dash.
  issue_title="${id}: ${title}"
  issue_body="$(cat <<EOF
**Module:** ${module}
**Type:** ${type}
**Status at import:** ${status}

Ticket list: \`Features.md\` · Spec: \`Requirements.md\`
Designs: \`design_handoff/TaskTails Screens.dc.html\` — match the frame before building (see \`AGENTS.md\`).
EOF
)"

  if $DRY_RUN; then
    echo "WOULD CREATE: ${issue_title}"
    created=$((created + 1))
    continue
  fi

  url="$(gh issue create \
    --repo "$REPO" \
    --title "$issue_title" \
    --body "$issue_body" \
    --label "module: ${module}" \
    --label "type: ${type}")"

  echo "created: $url"

  # Never fatal: the issue already exists at this point, so aborting here would
  # strand it off the board and a re-run would skip it as "already exists".
  # Orphans are logged to $ORPHANS for a follow-up pass.
  if [[ -n "$PROJECT_NUMBER" ]]; then
    if ! gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$url" >/dev/null 2>&1; then
      echo "  WARN: created but not added to project $PROJECT_NUMBER — logged to $ORPHANS"
      echo "$url" >> "$ORPHANS"
    fi
  fi

  created=$((created + 1))
  sleep 1   # stay under the secondary rate limit
# Redirect rather than pipe, so the counters survive into the summary below.
done < <(tail -n +2 "$CSV")

echo
$DRY_RUN && echo "DRY RUN — nothing was created."
echo "to create:        $created"
echo "already existed:  $skipped_existing"
$USE_ALLOWLIST && echo "not in allowlist: $skipped_allowlist"
