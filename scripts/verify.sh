#!/usr/bin/env bash
# The pre-merge check, run from the repo root as `pnpm verify` before merging a PR: what CI
# runs (lint, types, tests against the local database, the web build), plus what CI only
# builds for releases: the CLI, MCP and Skill packages, and the desktop apps. On a Mac
# that's the macOS app and the Linux bundles in Docker. Windows has no local build here;
# the release workflow builds it.
#
#   pnpm verify               # everything
#   pnpm verify --no-desktop  # skip the desktop builds, for a change that can't affect them
set -euo pipefail
cd "$(dirname "$0")/.."

desktop=yes
for arg in "$@"; do
  case $arg in
    --no-desktop) desktop=no ;;
    *)
      echo "usage: pnpm verify [--no-desktop]" >&2
      exit 2
      ;;
  esac
done

results=()
summary() {
  echo
  echo "pnpm verify:"
  printf '  %s\n' "${results[@]}"
}
step() {
  local name=$1 start=$SECONDS
  shift
  echo
  echo "==> $name"
  if "$@"; then
    results+=("ok    $name ($((SECONDS - start))s)")
  else
    results+=("FAIL  $name")
    summary
    exit 1
  fi
}

step "lint" pnpm lint
step "type-check" pnpm typecheck
if ! pnpm exec supabase status >/dev/null 2>&1; then
  step "start the local database" pnpm db:start
fi
# As in CI: tests that need the database fail instead of skipping when it's down.
step "test" env MYAPP_REQUIRE_DB=1 pnpm test
step "build" pnpm build
step "release packages" scripts/build-packages.sh

if [[ $desktop == yes ]]; then
  case "$(uname -s)" in
    Darwin)
      step "desktop: macOS app" pnpm build:desktop --bundles app
      step "desktop: Linux bundles (Docker)" scripts/build-desktop-linux.sh
      ;;
    Linux) step "desktop: Linux bundles" pnpm build:desktop ;;
  esac
  results+=("skip  desktop: Windows (the release workflow builds it)")
else
  results+=("skip  desktop builds (--no-desktop)")
fi

summary
