#!/usr/bin/env bash
# Builds @privos_ai/app-server and @privos_ai/app-react from the local,
# unpublished checkout at ~/projects/privos-app-packages and packs them into
# ./vendor/*.tgz for local development against a version that is not on the
# npm registry yet (see README § Local development against the unpublished SDK).
#
# Builds happen in an isolated /tmp copy — never inside
# privos-app-packages itself, which this app must never write to. The copy
# also drops `vitest` from devDependencies before installing: at the time
# this script was written, `vitest@^4.1.10` triggers a known npm arborist bug
# (`Cannot read properties of null (reading 'edgesOut')`) during
# `npm install`, and building these two packages needs only `tsup`/`tsc`.
set -euo pipefail

SOURCE_REPO="${PRIVOS_APP_PACKAGES_REPO:-$HOME/projects/privos-app-packages}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$APP_DIR/vendor"

build_package() {
	local name="$1"
	local dir="$WORK/$name"
	rsync -a --exclude node_modules --exclude dist --exclude package-lock.json "$SOURCE_REPO/$name/" "$dir/"
	python3 - "$dir/package.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
dev = data.get("devDependencies", {})
dev.pop("vitest", None)
dev.pop("jsdom", None)
dev.pop("@testing-library/react", None)
data["devDependencies"] = dev
with open(path, "w") as f:
    json.dump(data, f, indent=2)
PY
	(cd "$dir" && NODE_ENV=test npm install --include=dev --no-audit --no-fund && NODE_ENV=test npm run build)
	(cd "$dir" && npm pack --pack-destination "$APP_DIR/vendor")
}

build_package app-react
build_package app-server

echo "Vendor tarballs written to $APP_DIR/vendor/"
