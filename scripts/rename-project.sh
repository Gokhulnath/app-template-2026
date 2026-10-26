#!/usr/bin/env bash
# Renames a fresh copy of this template to a new project. Run once, from the repo root:
#   scripts/rename-project.sh acme
#
# The current name is read from the root package.json, so a project created from the
# template can itself be renamed again. docs/setup-log.md and docs/template.md keep the
# old name: they are the history of where the project came from.
set -euo pipefail

new=${1:-}
if [[ ! $new =~ ^[a-z][a-z0-9]*$ ]]; then
  echo "usage: scripts/rename-project.sh <name>" >&2
  echo "  <name> is one lowercase word (letters and digits), e.g. acme. It becomes the" >&2
  echo "  Python package, database role, Cargo crate and CLI command, so no hyphens." >&2
  exit 2
fi
old=$(node -p 'require("./package.json").name')
if [[ $new == "$old" ]]; then
  echo "The project is already named $old." >&2
  exit 2
fi

if [[ -z $(git ls-files | head -n 1) ]]; then
  echo "No tracked files. In a fresh copy, stage everything first: git add -A" >&2
  exit 2
fi

capitalize() { printf '%s%s' "$(printf '%s' "${1:0:1}" | tr '[:lower:]' '[:upper:]')" "${1:1}"; }
upper() { printf '%s' "$1" | tr '[:lower:]' '[:upper:]'; }

# Folders named after the project.
git mv "apps/cli/src/$old" "apps/cli/src/$new"
git mv "skills/$old" "skills/$new"

# Every tracked text file, lockfiles included, except the two history docs.
export OLD_UPPER NEW_UPPER OLD_CAP NEW_CAP OLD_NAME NEW_NAME
OLD_UPPER=$(upper "$old") NEW_UPPER=$(upper "$new")
OLD_CAP=$(capitalize "$old") NEW_CAP=$(capitalize "$new")
OLD_NAME=$old NEW_NAME=$new
changed=()
while IFS= read -r -d '' file; do
  grep -Iq . "$file" || continue # binary (icons)
  grep -qi -- "$old" "$file" || continue
  # Whole tokens only: the name may not touch other letters or digits, but `_`, `-`, `.`
  # and `/` are boundaries, so donna_api, DonnaApp and DONNA_API_URL are renamed while
  # an unrelated word that merely contains the name (Madonna) is left alone.
  perl -pi -e 's/(?<![A-Za-z0-9])\Q$ENV{OLD_UPPER}\E(?![A-Z0-9])/$ENV{NEW_UPPER}/g;
               s/(?<![A-Za-z0-9])\Q$ENV{OLD_CAP}\E(?![a-z0-9])/$ENV{NEW_CAP}/g;
               s/(?<![A-Za-z0-9])\Q$ENV{OLD_NAME}\E(?![a-z0-9])/$ENV{NEW_NAME}/g' "$file"
  changed+=("$file")
done < <(git ls-files -z -- . ':!docs/setup-log.md' ':!docs/template.md')

# A name of a different length shifts Markdown table columns, so re-format what changed.
formatted=no
if [[ -x node_modules/.bin/prettier ]]; then
  node_modules/.bin/prettier --write --ignore-unknown --log-level warn "${changed[@]}"
  formatted=yes
fi

cat >>docs/setup-log.md <<EOF

---

## Renamed from $old to $new

\`scripts/rename-project.sh $new\` renamed every \`$old\` / \`$OLD_CAP\` / \`$OLD_UPPER\` to
\`$new\` / \`$NEW_CAP\` / \`$NEW_UPPER\`, and moved \`apps/cli/src/$old\` and \`skills/$old\`.
The steps above are the template's history and still use its earlier names.
EOF

cat <<EOF
Renamed $old -> $new. Next:
  1. Check the owner-specific values: the bundle identifier in
     apps/desktop/src-tauri/tauri.conf.json (com.<owner>.$new), and "authors" in
     apps/*/pyproject.toml and apps/desktop/src-tauri/Cargo.toml.
  2. pnpm install && pnpm format && pnpm lint && pnpm typecheck && pnpm build && pnpm test
     (pnpm format re-aligns Markdown tables; formatted already: $formatted)
  3. Create the GitHub repo, the Doppler project ($new) and the Supabase
     project (docs/template.md, "After renaming").
EOF
