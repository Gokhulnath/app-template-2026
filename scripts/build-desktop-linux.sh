#!/usr/bin/env bash
# Builds the desktop app's Linux bundles (.deb, .rpm and .AppImage) in Docker: the local
# pre-merge check for Linux, run by `pnpm verify` or on its own as
# `pnpm build:desktop:linux`. On an Apple Silicon Mac these are arm64 builds. They prove the
# app compiles and bundles on Linux; the x86_64 installers people download come from the
# release workflow.
#
#   scripts/build-desktop-linux.sh          # this machine's architecture, no emulation
#   scripts/build-desktop-linux.sh --amd64  # x86_64, emulated (slower; on Apple Silicon,
#                                           # turn on Docker Desktop's Rosetta setting)
#
# The bundles land in apps/desktop/src-tauri/target/linux-<arch>/. Named Docker volumes
# keep the Rust build, the cargo registry, the pnpm store and Tauri's tool downloads
# between runs, so later runs are much faster than the first.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

case "${1:-}" in
  "") case "$(uname -m)" in arm64 | aarch64) arch=arm64 ;; *) arch=amd64 ;; esac ;;
  --amd64) arch=amd64 ;;
  --arm64) arch=arm64 ;;
  *)
    echo "usage: scripts/build-desktop-linux.sh [--amd64 | --arm64]" >&2
    exit 2
    ;;
esac

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Start Docker Desktop, then try again." >&2
  exit 1
fi

name=$(node -p 'require("./package.json").name')
pnpm_version=$(node -p 'require("./package.json").packageManager.split("@")[1]')
image="$name-desktop-linux:$arch"
out="$root/apps/desktop/src-tauri/target/linux-$arch"

echo "==> Builder image $image (cached after the first run)"
docker build --quiet --platform "linux/$arch" --build-arg "PNPM_VERSION=$pnpm_version" \
  -t "$image" - <apps/desktop/linux.Dockerfile >/dev/null

rm -rf "$out"
mkdir -p "$out"

# Send the working tree (tracked files plus new, unignored ones) instead of mounting the
# repo, so the Mac's node_modules, .venv and target folders never reach Linux. Files
# deleted but not yet staged are skipped.
echo "==> Building the Linux bundles ($arch)"
git ls-files -z --cached --others --exclude-standard |
  perl -0 -ne 'chomp; print "$_\0" if -e' |
  COPYFILE_DISABLE=1 tar --null -T - --no-mac-metadata --no-xattrs -cf - |
  docker run --rm -i --platform "linux/$arch" \
    -e CI=true \
    -v "$name-desktop-linux-target-$arch:/workspace/apps/desktop/src-tauri/target" \
    -v "$name-desktop-linux-cargo:/usr/local/cargo/registry" \
    -v "$name-desktop-linux-pnpm:/pnpm-store" \
    -v "$name-desktop-linux-tauri-cache:/root/.cache/tauri" \
    -v "$out:/out" \
    "$image" bash -euo pipefail -c '
      tar -xf - -C /workspace --no-same-owner --warning=no-unknown-keyword
      git init -q  # the root prepare script installs git hooks, which needs a repo
      pnpm config set store-dir /pnpm-store
      # web... also installs the workspace packages web is built from (packages/*).
      pnpm install --frozen-lockfile --filter "web..." --filter desktop
      pnpm --filter desktop tauri build
      cp apps/desktop/src-tauri/target/release/bundle/deb/*.deb \
        apps/desktop/src-tauri/target/release/bundle/rpm/*.rpm \
        apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage /out/
    '

echo "==> Linux bundles in ${out#"$root"/}:"
for file in "$out"/*; do echo "  ${file##*/}"; done
