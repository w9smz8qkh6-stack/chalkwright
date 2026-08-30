#!/usr/bin/env bash
set -euo pipefail
umask 077

reject() { echo "{\"status\":\"rejected\",\"code\":\"$1\"}" >&2; exit 1; }
[[ $# -eq 2 ]] || reject production-release-build-usage-invalid
source_root=$1
archive=$2
npm=/usr/local/bin/npm
[[ -d $source_root && ! -L $source_root && -d $source_root/.git ]] || reject production-release-source-invalid
[[ $archive == /var/lib/chalkwright/deploy/archives/chalkwright-production-*.tar.gz ]] || reject production-release-archive-path-invalid
[[ ! -e $archive && ! -L $archive ]] || reject production-release-archive-exists
[[ -x $npm ]] || reject production-release-npm-missing
commit=$(/usr/bin/git -C "$source_root" rev-parse --verify HEAD) || reject production-release-commit-invalid
[[ $commit =~ ^[a-f0-9]{40}$ ]] || reject production-release-commit-invalid

stage=$(/usr/bin/mktemp -d /var/lib/chalkwright/deploy/.build.XXXXXXXX)
cleanup() { /usr/bin/rm -rf -- "$stage"; }
trap cleanup EXIT INT TERM
npm_cache=/var/lib/chalkwright/deploy/npm-cache
if [[ -e $npm_cache || -L $npm_cache ]]; then
  [[ -d $npm_cache && ! -L $npm_cache && $(/usr/bin/stat -c %U:%G:%a "$npm_cache") == root:root:700 ]] || reject production-release-npm-cache-unsafe
else
  /usr/bin/install -d -o root -g root -m 0700 "$npm_cache"
fi

if ! (
  cd "$source_root"
  NPM_CONFIG_CACHE="$npm_cache" "$npm" ci --ignore-scripts --no-audit --no-fund --prefer-offline --silent
  NPM_CONFIG_CACHE="$npm_cache" "$npm" run build --silent
); then
  reject production-release-build-failed
fi
/usr/bin/install -d -m 0755 "$stage/runtime" "$stage/runtime/systemd" "$stage/runtime/scripts/operations"
/usr/bin/cp -a "$source_root"/dist "$source_root"/public "$source_root"/package.json "$source_root"/package-lock.json "$stage/runtime/"
/usr/bin/cp -a "$source_root"/systemd/production "$stage/runtime/systemd/"
/usr/bin/install -m 0755 "$source_root/scripts/operations/activate-production.sh" "$stage/runtime/scripts/operations/activate-production.sh"
/usr/bin/install -m 0644 "$source_root/scripts/setup-site-media.mjs" "$stage/runtime/scripts/setup-site-media.mjs"
/usr/bin/install -m 0644 "$source_root/scripts/operations/provision-production-site-media.mjs" "$stage/runtime/scripts/operations/provision-production-site-media.mjs"
/usr/bin/install -m 0644 "$source_root/scripts/operations/auto-repair-production-powerschool.mjs" "$stage/runtime/scripts/operations/auto-repair-production-powerschool.mjs"
/usr/bin/install -m 0755 "$source_root/scripts/operations/install-production-powerschool-auto-repair.sh" "$stage/runtime/scripts/operations/install-production-powerschool-auto-repair.sh"
/usr/bin/cp -a "$source_root"/scripts/operations/cutover-production-tailscale-route.sh "$source_root"/scripts/operations/migrate-production-plan-state.sh "$source_root"/scripts/operations/install-production-release.sh "$source_root"/scripts/operations/switch-production-release.sh "$source_root"/scripts/operations/deploy-production-from-main.sh "$source_root"/scripts/operations/provision-production-inert.sh "$stage/runtime/scripts/operations/"
/usr/bin/printf '{"version":1,"commit":"%s"}\n' "$commit" > "$stage/runtime/.chalkwright-release.json"
if ! (
  cd "$stage/runtime"
  NPM_CONFIG_CACHE="$npm_cache" "$npm" ci --omit=dev --ignore-scripts --no-audit --no-fund --prefer-offline --silent
); then
  reject production-release-runtime-dependencies-failed
fi
/usr/bin/tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -cf - -C "$stage/runtime" . | /usr/bin/gzip -n -9 > "$archive"
/usr/bin/chmod 0600 "$archive"
digest=$(/usr/bin/sha256sum "$archive" | /usr/bin/cut -d ' ' -f 1)
bytes=$(/usr/bin/stat -c %s "$archive")
echo "{\"status\":\"built\",\"commit\":\"$commit\",\"sha256\":\"$digest\",\"bytes\":$bytes,\"providerRequests\":0,\"servicesStarted\":0}"
