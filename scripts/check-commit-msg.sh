#!/usr/bin/env bash
# commit-msg hook: the subject line must be a Conventional Commit of at most 72 characters
# (see CLAUDE.md). Merge, revert, fixup! and squash! subjects pass as git writes them.
set -euo pipefail

subject=$(head -n 1 "$1")
pattern='^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9-]+\))?!?: [^ ].*'

if [[ $subject =~ ^(Merge |Revert |fixup! |squash! ) ]]; then
  exit 0
fi
if [[ ! $subject =~ $pattern ]]; then
  echo "Commit subject must be a Conventional Commit, e.g. 'feat(api): add the items endpoint'." >&2
  echo "Got: $subject" >&2
  exit 1
fi
if ((${#subject} > 72)); then
  echo "Commit subject is ${#subject} characters; keep it to 72 or fewer." >&2
  exit 1
fi
