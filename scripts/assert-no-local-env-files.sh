#!/bin/sh
# POSIX preflight, run *before* `vercel env run`, not a Node-level check:
# `vercel env run` reads local .env* files itself and merges their content
# into the child process's environment before that child (tsx) even starts.
# A NODE_OPTIONS=--require ... line inside one of those files would preload
# before any check written in the seed script itself gets a chance to run --
# see src/lib/local-env-guard.ts and scripts/deploy-seed-topics.ts for the
# in-script guard this is defense-in-depth alongside, not a replacement for.
# A plain shell script has no Node runtime to preload into, so it can safely
# gate `vercel env run` itself rather than the process it eventually spawns.
set -eu

# Newline-separated, not space-separated: an exotic NODE_ENV value
# containing whitespace would otherwise get word-split into the wrong
# filenames below.
files=".env
.env.local
.env.development
.env.development.local
.env.production
.env.production.local
.env.test
.env.test.local"

case "${NODE_ENV:-}" in
  "" | development | production | test) ;;
  *) files="$files
.env.${NODE_ENV}
.env.${NODE_ENV}.local" ;;
esac

found=""
old_ifs=$IFS
IFS='
'
for f in $files; do
  if [ -e "$f" ]; then
    found="$found $f"
  fi
done
IFS=$old_ifs

if [ -n "$found" ]; then
  echo "Refusing to run: local env file(s) present in the working directory:$found" >&2
  echo "vercel env run reads these before spawning the seed script; a NODE_OPTIONS line in any of them would preload before the seed script's own guard could run. Remove them, or run from a clean checkout/worktree, before continuing." >&2
  exit 1
fi

echo "No local env files found in $(pwd); safe to proceed."
