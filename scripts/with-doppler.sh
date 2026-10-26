#!/usr/bin/env bash
# Runs a command with secrets injected by Doppler when the current directory is set up for
# it (`doppler setup` from the repo root, see doppler.yaml). Otherwise runs the command
# as-is, and the app falls back to its .env file and built-in defaults.
#
# Before injecting anything it checks that the active Doppler login belongs to the
# workplace named in .doppler-workplace, so secrets never come from the wrong account.
#
# Used by each app's dev/build/start scripts, e.g. `../../scripts/with-doppler.sh next dev`.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)

if command -v doppler >/dev/null 2>&1 &&
  [ -n "$(doppler configure get project --plain 2>/dev/null)" ]; then
  if [ -f "$root/.doppler-workplace" ]; then
    expected=$(grep -v '^#' "$root/.doppler-workplace" | tr -d '[:space:]')
    actual=$(doppler me --json 2>/dev/null |
      python3 -c 'import json, sys; print(json.load(sys.stdin)["workplace"]["slug"])' 2>/dev/null || true)
    if [ "$actual" != "$expected" ]; then
      echo "with-doppler: the Doppler login here is workplace '${actual:-unknown}', but" \
        ".doppler-workplace expects '$expected'. Not injecting secrets. Log in with" \
        "a scoped token, e.g. \`doppler login --scope $(dirname "$root") --yes\`." >&2
      exit 1
    fi
  fi
  exec doppler run -- "$@"
fi

exec "$@"
