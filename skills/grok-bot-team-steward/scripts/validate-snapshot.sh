#!/usr/bin/env bash
# Exit 0 if a dated snapshot looks structurally complete enough to restore.
set -euo pipefail
ROOT="${1:-}"
if [[ -z "$ROOT" || ! -d "$ROOT" ]]; then
  echo "usage: validate-snapshot.sh /workspace/grok-bot-team-YYYY-MM-DD" >&2
  exit 2
fi
base="$(basename "$ROOT")"
if [[ ! "$base" =~ ^grok-bot-team-[0-9]{4}-[0-9]{2}-[0-9]{2}(-[0-9]{4}(-[0-9]+)?)?$ ]]; then
  echo "FAIL name: $base" >&2
  exit 1
fi
fail=0
for f in README.md MANIFEST.md ROSTER.md CHARTER.md DROP-LIST.md GAPS.md connectors.md; do
  if [[ ! -f "$ROOT/$f" ]]; then
    echo "FAIL missing $f"
    fail=1
  fi
done
if [[ ! -d "$ROOT/bots" ]]; then
  echo "FAIL missing bots/"
  fail=1
fi
shopt -s nullglob
bots=("$ROOT"/bots/*)
if [[ ${#bots[@]} -eq 0 ]]; then
  echo "FAIL no bot slugs"
  fail=1
fi
for d in "${bots[@]}"; do
  [[ -d "$d" ]] || continue
  slug="$(basename "$d")"
  [[ "$slug" == _* ]] && continue
  for f in PROFILE.md MEMORY.md routines.md skills.md GAPS.md; do
    if [[ ! -f "$d/$f" ]]; then
      echo "FAIL $slug missing $f"
      fail=1
    fi
  done
done
if [[ -f "$ROOT/meta/IN_PROGRESS.md" ]]; then
  echo "FAIL export still in progress"
  fail=1
fi
if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
echo "OK $ROOT"
