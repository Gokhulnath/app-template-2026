#!/usr/bin/env bash
# Builds what a release ships besides the desktop installers, into dist/release/:
#
#   myapp-<version>-py3-none-any.whl, .tar.gz   the CLI, its terminal UI and the MCP server
#   myapp-<version>.mcpb                         the MCP server as a Claude Desktop bundle
#   myapp-skill-<version>.zip                    the Agent Skill, for Claude's skill upload
#   SHA256SUMS
#
# The release workflow (.github/workflows/packages.yml) runs it and uploads the files.
# Locally, `pnpm build:packages` (also part of `pnpm verify`) checks the packaging.
#
#   scripts/build-packages.sh                   # default API: http://localhost:8000
#   scripts/build-packages.sh --api-url <url>   # bake <url> in as the default API
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

api_url=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --api-url)
      api_url=${2:?--api-url needs a URL}
      shift 2
      ;;
    *)
      echo "usage: scripts/build-packages.sh [--api-url <url>]" >&2
      exit 2
      ;;
  esac
done

name=$(node -p 'require("./package.json").name')
version=$(sed -n 's/^version = "\(.*\)"/\1/p' apps/cli/pyproject.toml | head -n 1)
out="$root/dist/release"
baked="apps/cli/src/$name/release_api_url.txt"
stage=$(mktemp -d)
cleanup() {
  rm -rf "$stage"
  rm -f "$baked"
}
trap cleanup EXIT

rm -rf "$out"
mkdir -p "$out"

# A release build's default API. --api-url and MYAPP_API_URL still override it.
if [[ -n $api_url ]]; then
  printf '%s\n' "$api_url" >"$baked"
fi

echo "==> CLI and MCP server: wheel and sdist"
uv build --project apps/cli --out-dir "$out" --quiet

echo "==> Agent Skill: zip with the skill's folder at the root, without the dev-only evals"
(cd skills && zip -qr "$out/$name-skill-$version.zip" "$name" -x "$name/evals/*")

echo "==> MCP bundle (.mcpb)"
# The bundle carries source, not wheels: Claude Desktop runs it with uv, which installs the
# dependencies (pydantic-core among them) for the user's own OS from uv.lock.
cp apps/cli/pyproject.toml apps/cli/uv.lock apps/cli/README.md "$stage/"
cp -R apps/cli/src "$stage/src"
find "$stage/src" -name __pycache__ -type d -prune -exec rm -rf {} +
cp apps/desktop/src-tauri/icons/128x128.png "$stage/icon.png"
node -e '
  const fs = require("fs");
  const [from, to, url] = process.argv.slice(1);
  const manifest = JSON.parse(fs.readFileSync(from, "utf8"));
  if (url) manifest.user_config.api_url.default = url;
  fs.writeFileSync(to, JSON.stringify(manifest, null, 2) + "\n");
' apps/cli/mcpb/manifest.json "$stage/manifest.json" "$api_url"
npx --yes @anthropic-ai/mcpb@2.1.2 pack "$stage" "$out/$name-$version.mcpb" >/dev/null

(
  cd "$out"
  if command -v sha256sum >/dev/null; then sha256sum -- * >SHA256SUMS; else shasum -a 256 -- * >SHA256SUMS; fi
)

echo "==> Release packages in dist/release:"
for file in "$out"/*; do echo "  ${file##*/}"; done
