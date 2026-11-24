#!/usr/bin/env bash
# Usage: scripts/publish-package.sh <package dir>
set -euo pipefail

DIR="$1"
ROOT_VERSION=$(bun -p "require('./package.json').version")
NAME=$(bun -p "require('./$DIR/package.json').name")
VERSION=$(bun -p "require('./$DIR/package.json').version")

if [ "$VERSION" != "$ROOT_VERSION" ]; then
  echo "$NAME is $VERSION but lusiajs is $ROOT_VERSION" >&2
  exit 1
fi

TAG=latest
case "$VERSION" in *-*) TAG=beta ;; esac
(cd "$DIR" && bun publish --access public --tag "$TAG")

# Keep latest on the newest beta while no stable version exists. A first publish can take a minute to show up.
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
LATEST=""
for attempt in 1 2 3 4 5 6; do
  LATEST=$(npm view "$NAME" dist-tags.latest 2>/dev/null) && break
  sleep 10
done
case "$LATEST" in
  ""|0.0.0*|*-*) npm dist-tag add "$NAME@$VERSION" latest ;;
esac
