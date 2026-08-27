#!/usr/bin/env bash
set -euo pipefail
umask 077

reject() { echo "{\"status\":\"rejected\",\"code\":\"$1\"}" >&2; exit 1; }
[[ ${EUID} -eq 0 ]] || reject production-activate-root-required
[[ $# -eq 0 ]] || reject production-activate-usage-invalid
release=/opt/chalkwright/current
config=/etc/chalkwright/production/server.json
for path in "$config" /etc/chalkwright/production/calendar.json /etc/chalkwright/production/glossary.json /etc/chalkwright/production/jobs/plan-refresh.env /etc/chalkwright/production/jobs/classroom-refresh.env /etc/chalkwright/production/jobs/glossary-refresh.env /etc/chalkwright/production/jobs/maintenance.env; do
  [[ -f $path && ! -L $path ]] || reject production-activate-config-missing
done
[[ -L $release && -x "$release/scripts/operations/activate-production.sh" && -f "$release/dist/entrypoints/production-server.js" && -f "$release/dist/entrypoints/production-glossary-refresh.js" && -f "$release/systemd/production/chalkwright-glossary-refresh.service.in" && -f "$release/systemd/production/chalkwright-glossary-refresh.timer.in" && -f "$release/systemd/production/chalkwright-production-start.service.in" ]] || reject production-activate-release-invalid
site_media=not-requested
if [[ -e /tmp/chalkwright-site-profile.json || -L /tmp/chalkwright-site-profile.json ]]; then
  /usr/bin/node "$release/scripts/operations/provision-production-site-media.mjs" || reject production-activate-site-media-failed
  site_media=applied
fi
/usr/bin/install -o root -g root -m 0644 "$release/systemd/production/chalkwright-glossary-refresh.service.in" /etc/systemd/system/chalkwright-glossary-refresh.service
/usr/bin/install -o root -g root -m 0644 "$release/systemd/production/chalkwright-glossary-refresh.timer.in" /etc/systemd/system/chalkwright-glossary-refresh.timer
/usr/bin/install -o root -g root -m 0644 "$release/systemd/production/chalkwright-production-start.service.in" /etc/systemd/system/chalkwright-production-start.service
/usr/bin/systemctl daemon-reload
for unit in chalkwright.service chalkwright-backup.service chalkwright-calendar-sync.service chalkwright-classroom-refresh.service chalkwright-deploy.service chalkwright-glossary-refresh.service chalkwright-integrity.service chalkwright-plan-refresh.service chalkwright-production-start.service; do
  [[ -f "/etc/systemd/system/$unit" && ! -L "/etc/systemd/system/$unit" ]] || reject production-activate-unit-missing
done

health_url=$(/usr/bin/node --input-type=module - "$config" <<'NODE'
import { readFileSync } from 'node:fs';
const value = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (value.host !== '127.0.0.1' || !Number.isInteger(value.port) || value.port < 1 || value.port > 65535) process.exit(1);
process.stdout.write(`http://127.0.0.1:${value.port}/classroom-screen`);
NODE
) || reject production-activate-health-config-invalid
timers=(
  chalkwright-plan-refresh.timer
  chalkwright-glossary-refresh.timer
  chalkwright-classroom-refresh.timer
  chalkwright-calendar-sync.timer
  chalkwright-integrity.timer
  chalkwright-backup.timer
  chalkwright-deploy.timer
)
if [[ $site_media == applied ]]; then
  /usr/bin/systemctl restart chalkwright.service || reject production-activate-server-failed
else
  /usr/bin/systemctl start chalkwright.service || reject production-activate-server-failed
fi
for _ in {1..20}; do
  if /usr/bin/curl --fail --silent --show-error --max-time 2 --output /dev/null "$health_url/health" && /usr/bin/curl --fail --silent --show-error --max-time 2 --output /dev/null "$health_url/ready"; then break; fi
  /usr/bin/sleep 0.25
done
/usr/bin/curl --fail --silent --show-error --max-time 2 --output /dev/null "$health_url/health" && /usr/bin/curl --fail --silent --show-error --max-time 2 --output /dev/null "$health_url/ready" || reject production-activate-server-unready
degraded=()
start_optional() {
  local unit=$1
  local code=$2
  /usr/bin/systemctl start "$unit" || degraded+=("$code")
}
start_optional chalkwright-integrity.service integrity-failed
start_optional chalkwright-backup.service backup-failed
plan_refreshed=true
if ! /usr/bin/systemctl start chalkwright-plan-refresh.service; then
  plan_refreshed=false
  degraded+=(plan-refresh-failed)
fi
start_optional chalkwright-glossary-refresh.service glossary-refresh-failed
start_optional chalkwright-classroom-refresh.service classroom-refresh-failed
if [[ $plan_refreshed == true ]]; then
  start_optional chalkwright-calendar-sync.service calendar-sync-failed
else
  degraded+=(calendar-sync-skipped-plan-refresh-failed)
fi
for timer in "${timers[@]}"; do
  /usr/bin/systemctl add-wants multi-user.target "$timer" || reject production-activate-timer-enable-failed
  /usr/bin/systemctl start "$timer" || degraded+=("${timer%.timer}-timer-failed")
done
/usr/bin/systemctl add-wants multi-user.target chalkwright-production-start.service || reject production-activate-startup-enable-failed
if [[ ${#degraded[@]} -eq 0 ]]; then status=active-internal; else status=active-degraded; fi
joined=$(IFS=,; echo "${degraded[*]}")
echo "{\"status\":\"$status\",\"displayHealth\":true,\"siteMedia\":\"$site_media\",\"planRefresh\":\"$([[ $plan_refreshed == true ]] && echo started || echo failed)\",\"classroomRefresh\":\"attempted\",\"calendarSync\":\"$([[ $plan_refreshed == true ]] && echo attempted || echo skipped-plan-refresh-failed)\",\"glossaryRefresh\":\"attempted\",\"timersStarted\":7,\"bootStartupEnabled\":true,\"degraded\":[${joined:+\"${joined//,/\",\"}\"}],\"routeChanges\":0,\"legacyServicesStopped\":0}"
