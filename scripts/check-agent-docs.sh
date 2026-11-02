#!/usr/bin/env bash
# Every app and package needs its own AGENTS.md (commands and conventions specific to
# it) plus a CLAUDE.md that imports it, so an agent reads one before working in that
# directory (see CLAUDE.md, "Per-directory instructions"). Wired into `pnpm lint`, so CI
# and lefthook both enforce it.
#
#   scripts/check-agent-docs.sh
set -euo pipefail
cd "$(dirname "$0")/.."

status=0

for dir in apps/*/ packages/*/; do
  [[ -d "$dir" ]] || continue
  dir=${dir%/}

  if [[ ! -f "$dir/AGENTS.md" ]]; then
    echo "error: $dir is missing AGENTS.md (every apps/*/ and packages/*/ directory needs one)" >&2
    status=1
  fi

  claude_md="$dir/CLAUDE.md"
  if [[ ! -f "$claude_md" ]]; then
    echo "error: $dir is missing CLAUDE.md (it must import AGENTS.md: add a line '@AGENTS.md')" >&2
    status=1
  elif ! grep -qF '@AGENTS.md' "$claude_md"; then
    echo "error: $dir/CLAUDE.md doesn't contain the line '@AGENTS.md'" >&2
    status=1
  fi
done

if ((status != 0)); then
  echo >&2
  echo "Add the missing file(s) above. A new app or package gets both files in the" >&2
  echo "same PR that creates it (CLAUDE.md, \"Per-directory instructions\")." >&2
fi

exit "$status"
