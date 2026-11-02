#!/usr/bin/env bash
# The pre-merge check, run from the repo root as `pnpm verify` before merging a PR: what CI
# runs (lint, types, tests against the local database, the web build), plus what CI only
# builds for releases: the CLI, MCP and Skill packages, and the desktop apps. On a Mac
# that's the macOS app and the Linux bundles in Docker. Windows has no local build here;
# the release workflow builds it.
#
#   pnpm verify               # everything
#   pnpm verify --affected    # only the packages this branch's changes can affect (vs
#                             # origin/main, uncommitted and untracked files included):
#                             # what CI checks on a pull request
#   pnpm verify --no-desktop  # skip the desktop builds, for a change that can't affect them
#   pnpm verify --e2e         # also run packages/e2e (off by default -- see docs/testing.md)
#
# Lint always runs in full. scripts/affected.mjs decides what "affected" means.
set -euo pipefail
cd "$(dirname "$0")/.."

desktop=yes
e2e=no
affected=no
for arg in "$@"; do
  case $arg in
    --affected) affected=yes ;;
    --no-desktop) desktop=no ;;
    --e2e) e2e=yes ;;
    *)
      echo "usage: pnpm verify [--affected] [--no-desktop] [--e2e]" >&2
      exit 2
      ;;
  esac
done

if [[ $affected == yes ]]; then
  # Sets AFFECTED_FILTER (pnpm --filter flags, empty when nothing is affected),
  # AFFECTED_DB_FILTER, AFFECTED_DESKTOP and AFFECTED_RELEASE_PACKAGES.
  eval "$(node scripts/affected.mjs --base origin/main --local --shell)"
else
  AFFECTED_FILTER=--recursive
  AFFECTED_DB_FILTER=--recursive
  AFFECTED_DESKTOP=true
  AFFECTED_RELEASE_PACKAGES=true
fi

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
if [[ -n $AFFECTED_FILTER ]]; then
  # Unquoted on purpose: the filter is several flags.
  # shellcheck disable=SC2086
  step "type-check" pnpm $AFFECTED_FILTER --if-present typecheck
  if [[ -n $AFFECTED_DB_FILTER ]] && ! pnpm exec supabase status >/dev/null 2>&1; then
    step "start the local database" pnpm db:start
  fi
  # As in CI: tests that need the database fail instead of skipping when it's down.
  # shellcheck disable=SC2086
  step "test" env MYAPP_REQUIRE_DB=1 pnpm $AFFECTED_FILTER --if-present test
  # shellcheck disable=SC2086
  step "build" pnpm $AFFECTED_FILTER --if-present build
else
  results+=("skip  type-check, test, build (no package affected)")
fi
if [[ $AFFECTED_RELEASE_PACKAGES == true ]]; then
  step "release packages" scripts/build-packages.sh
else
  results+=("skip  release packages (the CLI isn't affected)")
fi

if [[ $e2e == yes ]]; then
  # packages/e2e starts its own API and web app on 8580/3580 -- never the dev servers
  # `pnpm dev` starts (see docs/testing.md).
  step "e2e" pnpm e2e
else
  results+=("skip  e2e (pass --e2e to run it; see docs/testing.md)")
fi

if [[ $desktop == no ]]; then
  results+=("skip  desktop builds (--no-desktop)")
elif [[ $AFFECTED_DESKTOP != true ]]; then
  results+=("skip  desktop builds (the desktop app isn't affected)")
else
  case "$(uname -s)" in
    Darwin)
      step "desktop: macOS app" pnpm build:desktop --bundles app
      step "desktop: Linux bundles (Docker)" scripts/build-desktop-linux.sh
      ;;
    Linux) step "desktop: Linux bundles" pnpm build:desktop ;;
  esac
  results+=("skip  desktop: Windows (the release workflow builds it)")
fi

summary
