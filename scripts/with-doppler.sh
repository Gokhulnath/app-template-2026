#!/usr/bin/env bash
# Runs a command with secrets injected by Doppler when the current directory is set up for
# it (`doppler setup` from the repo root, see doppler.yaml). Otherwise runs the command
# as-is, and the app falls back to its .env file and built-in defaults.
#
# Before injecting anything it checks that the active Doppler login belongs to the
# workplace named in .doppler-workplace, so secrets never come from the wrong account.
#
# Used by each app's dev/build/start scripts, e.g. `../../scripts/with-doppler.sh next dev`.
#
# WITH_DOPPLER_PRESERVE_ENV: a comma-separated list of secret names for which an
# already-set shell env var wins over Doppler's own value (passed straight through as
# `doppler run --preserve-env`). Every app shares one Doppler config, and
# docs/architecture.md's "Secrets" section says variable names are what keeps them
# apart -- but a name two apps both need, such as `DATABASE_URL`, is deliberately the
# same everywhere. A future app that needs its own value for such a name (connecting as
# a different database role, say) sets this in its own dev/start script rather than
# renaming the shared variable for everyone else.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)

# This Doppler login's own workplace slug, or empty when doppler isn't installed, isn't
# logged in, or the lookup fails for any other reason -- callers below only act on it
# when it's non-empty, so every one of those cases is silently "nothing to offer here".
doppler_login_workplace() {
  doppler me --json 2>/dev/null |
    python3 -c 'import json, sys; print(json.load(sys.stdin)["workplace"]["slug"])' \
      2>/dev/null || true
}

if command -v doppler >/dev/null 2>&1 &&
  [ -n "$(doppler configure get project --plain 2>/dev/null)" ]; then
  if [ -f "$root/.doppler-workplace" ]; then
    expected=$(grep -v '^#' "$root/.doppler-workplace" | tr -d '[:space:]')
    actual=$(doppler_login_workplace)
    if [ "$actual" != "$expected" ]; then
      echo "with-doppler: the Doppler login here is workplace '${actual:-unknown}', but" \
        ".doppler-workplace expects '$expected'. Not injecting secrets. Log in with" \
        "a scoped token, e.g. \`doppler login --scope $(dirname "$root") --yes\`." >&2
      exit 1
    fi
  fi
  # Not an array: macOS ships bash 3.2, where "${arr[@]}" on a zero-element array is an
  # unbound-variable error under `set -u`.
  if [ -n "${WITH_DOPPLER_PRESERVE_ENV:-}" ]; then
    exec doppler run --preserve-env="$WITH_DOPPLER_PRESERVE_ENV" -- "$@"
  fi
  exec doppler run -- "$@"
elif [ -z "${CI:-}" ] && command -v doppler >/dev/null 2>&1 &&
  [ -f "$root/doppler.yaml" ]; then
  # Doppler is installed, but `doppler setup` has never run in this exact folder (a
  # fresh worktree, an app just added to doppler.yaml) -- every secret below silently
  # falls back to .env/built-in defaults instead, which is easy to mistake for "this app
  # just has no secrets" rather than "nobody ran setup here yet". Hinted only once, and
  # only when there is actually something to set up: the current login is this project's
  # own workplace (anything else -- logged out, a different account -- already means
  # Doppler has nothing to offer this folder, so staying quiet is correct) and this exact
  # folder is one doppler.yaml's own `setup:` list names. Never in CI, which intentionally
  # never runs `doppler setup` and already expects the .env/defaults fallback.
  rel_path=$(python3 -c 'import os, sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))' \
    "$PWD" "$root" 2>/dev/null || true)
  if [ -n "$rel_path" ] &&
    grep -qE "^[[:space:]]*path:[[:space:]]*${rel_path}[[:space:]]*\$" \
      "$root/doppler.yaml" 2>/dev/null; then
    expected=""
    [ -f "$root/.doppler-workplace" ] &&
      expected=$(grep -v '^#' "$root/.doppler-workplace" | tr -d '[:space:]')
    actual=$(doppler_login_workplace)
    if [ -n "$actual" ] && [ "$actual" = "$expected" ]; then
      echo "with-doppler: $rel_path is listed in doppler.yaml but has no Doppler" \
        "project configured here yet -- run \`doppler setup --no-interactive\` from the" \
        "repo root. Falling back to .env for now." >&2
    fi
  fi
fi

exec "$@"
