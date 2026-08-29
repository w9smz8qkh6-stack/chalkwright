#!/usr/bin/env bash
set -euo pipefail
umask 077

reject() { echo "{\"status\":\"rejected\",\"code\":\"$1\"}" >&2; exit 1; }
[[ ${EUID} -eq 0 ]] || reject production-powerschool-auto-repair-install-root-required
[[ $# -eq 0 ]] || reject production-powerschool-auto-repair-install-usage-invalid

release=/opt/chalkwright/current
unit_root=/etc/systemd/system
plan=chalkwright-plan-refresh.service
auto=chalkwright-powerschool-auto-repair.service
plan_candidate="$unit_root/.$plan.candidate"
auto_candidate="$unit_root/.$auto.candidate"
[[ -L $release && -f "$release/systemd/production/$plan.in" && ! -L "$release/systemd/production/$plan.in" && -f "$release/systemd/production/$auto.in" && ! -L "$release/systemd/production/$auto.in" && -f "$release/scripts/operations/auto-repair-production-powerschool.mjs" && ! -L "$release/scripts/operations/auto-repair-production-powerschool.mjs" ]] || reject production-powerschool-auto-repair-install-release-invalid
[[ -f "$unit_root/$plan" && ! -L "$unit_root/$plan" && $(/usr/bin/stat -c %U:%G:%a:%h "$unit_root/$plan") == root:root:644:1 ]] || reject production-powerschool-auto-repair-install-plan-target-invalid
if [[ -e "$unit_root/$auto" || -L "$unit_root/$auto" ]]; then
  [[ -f "$unit_root/$auto" && ! -L "$unit_root/$auto" && $(/usr/bin/stat -c %U:%G:%a:%h "$unit_root/$auto") == root:root:644:1 ]] || reject production-powerschool-auto-repair-install-auto-target-invalid
  auto_existed=1
else
  auto_existed=0
fi
for candidate in "$plan_candidate" "$auto_candidate"; do
  [[ ! -e $candidate && ! -L $candidate ]] || reject production-powerschool-auto-repair-install-candidate-exists
done

work=$(/usr/bin/mktemp -d "$unit_root/.chalkwright-powerschool-auto-repair.XXXXXXXX")
cleanup() { /usr/bin/rm -f -- "$plan_candidate" "$auto_candidate"; /usr/bin/rm -rf -- "$work"; }
trap cleanup EXIT INT TERM
/usr/bin/install -o root -g root -m 0644 "$release/systemd/production/$plan.in" "$work/$plan"
/usr/bin/install -o root -g root -m 0644 "$release/systemd/production/$auto.in" "$work/$auto"
/usr/bin/systemd-analyze verify "$work/$plan" "$work/$auto" >/dev/null || reject production-powerschool-auto-repair-install-unit-invalid
/usr/bin/cp --preserve=mode,ownership,timestamps -- "$unit_root/$plan" "$work/$plan.previous"
if [[ $auto_existed -eq 1 ]]; then
  /usr/bin/cp --preserve=mode,ownership,timestamps -- "$unit_root/$auto" "$work/$auto.previous"
fi

restore() {
  /usr/bin/install -o root -g root -m 0644 "$work/$plan.previous" "$unit_root/$plan"
  if [[ $auto_existed -eq 1 ]]; then
    /usr/bin/install -o root -g root -m 0644 "$work/$auto.previous" "$unit_root/$auto"
  else
    /usr/bin/rm -f -- "$unit_root/$auto"
  fi
  /usr/bin/systemctl daemon-reload || true
}

/usr/bin/install -o root -g root -m 0644 "$work/$plan" "$plan_candidate"
/usr/bin/install -o root -g root -m 0644 "$work/$auto" "$auto_candidate"
if ! /usr/bin/mv -T "$plan_candidate" "$unit_root/$plan" ||
   ! /usr/bin/mv -T "$auto_candidate" "$unit_root/$auto" ||
   ! /usr/bin/systemctl daemon-reload; then
  restore
  reject production-powerschool-auto-repair-install-commit-failed
fi
/usr/bin/systemctl reset-failed "$auto" >/dev/null 2>&1 || true
echo '{"status":"production-powerschool-auto-repair-installed","unitsInstalled":2,"unitsStarted":0,"providerRequests":0,"providerWrites":0}'
