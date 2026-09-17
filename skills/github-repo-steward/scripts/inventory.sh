#!/usr/bin/env bash
# Read-only inventory of the authenticated GitHub user's repos and optional stars.
set -euo pipefail

usage() {
  echo "usage: inventory.sh [--stars] [--user LOGIN]" >&2
  exit 2
}

STARS=0
USER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stars) STARS=1; shift ;;
    --user) USER="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

if [[ -z "$USER" ]]; then
  USER=$(gh api user --jq .login)
fi

echo "# owner=$USER"
echo "# repos"
printf '%s\n' "name	visibility	archived	fork	empty	pushed	stars	lang	url	description"
gh repo list "$USER" --limit 200 --json \
  name,visibility,isArchived,isFork,isEmpty,pushedAt,stargazerCount,primaryLanguage,url,description \
  --jq '.[] | [
      .name,
      .visibility,
      (if .isArchived then "archived" else "active" end),
      (if .isFork then "fork" else "orig" end),
      (if .isEmpty then "empty" else "has-code" end),
      (.pushedAt // "-"),
      (.stargazerCount|tostring),
      ((.primaryLanguage.name) // "-"),
      .url,
      ((.description // "") | gsub("\t";" ") | gsub("\n";" "))
    ] | @tsv'

if [[ "$STARS" -eq 1 ]]; then
  echo
  echo "# stars"
  printf '%s\n' "starred_at	full_name	stars	lang	archived	fork	description"
  gh api --paginate -H "Accept: application/vnd.github.star+json" user/starred \
    --jq '.[] | [
        .starred_at,
        .repo.full_name,
        (.repo.stargazers_count|tostring),
        (.repo.language // "-"),
        (if .repo.archived then "archived" else "active" end),
        (if .repo.fork then "fork" else "orig" end),
        ((.repo.description // "") | gsub("\t";" ") | gsub("\n";" "))
      ] | @tsv'
fi
