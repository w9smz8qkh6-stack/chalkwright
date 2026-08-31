import {
  operatorDeliveryAcceptance,
  operatorPageCatalog,
  type OperatorFeatureRegionModel,
  type OperatorPageKey,
} from '../contracts/v1/index.js';
import type { CoreOperatorCapability } from '../application/operator-panel/core-operator-shell-service.js';
import { renderOperatorFeatureRegion } from './operator-panel-region.js';

export const coreOperatorPagePaths = {
  overview: '/overview',
  displays: '/displays',
  sources: '/sources',
  'planned-display': '/planned-display',
  presentation: '/presentation',
  configuration: '/configuration',
  'diagnostics-recovery': '/diagnostics-recovery',
} as const satisfies Record<OperatorPageKey, string>;

export const coreOperatorShellStyles = `
:root{color-scheme:dark;--canvas:#0f172a;--deep:#020617;--panel:#172033;--ink:#f8fafc;--muted:#cbd5e1;--line:rgb(226 232 240 / 24%);--calm:#38bdf8;--warm:#fb923c;--bright:#facc15;--focus:#fef08a;--danger:#fca5a5;--success:#86efac;font-family:ui-rounded,"Segoe UI",system-ui,sans-serif;font-synthesis:none}
*{box-sizing:border-box}html,body{min-width:0;min-height:100%;margin:0;background:var(--canvas);color:var(--ink)}body{background:radial-gradient(circle at 82% 8%,rgb(56 189 248 / 12%),transparent 26rem),radial-gradient(circle at 12% 92%,rgb(251 146 60 / 9%),transparent 30rem),var(--canvas)}a,button{color:inherit;font:inherit}a:focus-visible,button:focus-visible{outline:.25rem solid var(--focus);outline-offset:.2rem}.skip-link{position:fixed;z-index:100;top:.75rem;left:.75rem;padding:.75rem 1rem;border-radius:.5rem;color:var(--deep);background:var(--focus);transform:translateY(-200%)}.skip-link:focus{transform:none}.operator-shell{min-height:100vh;display:grid;grid-template-columns:minmax(15rem,18rem) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}.shell-rail{grid-row:1/-1;display:flex;flex-direction:column;gap:1.25rem;padding:1.25rem;border-right:1px solid var(--line);background:rgb(2 6 23 / 84%)}.shell-brand strong,.shell-brand span{display:block}.shell-brand strong{font-size:1.15rem}.shell-brand span,.shell-note,.shell-context span{color:var(--muted);font-size:.82rem}.shell-navigation{display:grid;gap:.4rem}.shell-navigation a{display:grid;grid-template-columns:2rem minmax(0,1fr) auto;align-items:center;gap:.5rem;min-height:2.75rem;padding:.7rem;border:1px solid transparent;border-radius:.65rem;text-decoration:none}.shell-navigation a:hover,.shell-navigation a[aria-current="page"]{border-color:rgb(56 189 248 / 50%);background:rgb(12 74 110 / 55%)}.shell-navigation .order{color:var(--muted);font-variant-numeric:tabular-nums}.capability-status{padding:.18rem .4rem;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:.68rem;text-transform:uppercase}.capability-status.available{color:var(--success)}.shell-note{margin-top:auto;padding:.85rem;border:1px solid var(--line);border-radius:.65rem;line-height:1.5}.shell-header{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.85rem clamp(1rem,2.4vw,2rem);border-bottom:1px solid var(--line);background:rgb(15 23 42 / 84%)}.shell-context{min-width:0;display:flex;flex-wrap:wrap;gap:.75rem clamp(1rem,3vw,3rem)}.shell-context span,.shell-context strong{display:block}.shell-context strong{margin-top:.15rem;overflow-wrap:anywhere;font-size:.92rem}.shell-authority-warning{max-width:34rem;margin:0;padding:.65rem .8rem;border:1px solid rgb(250 204 21 / 55%);border-radius:.65rem;color:#fef9c3;background:rgb(113 63 18 / 32%);font-size:.84rem;line-height:1.4}main{min-width:0;padding:clamp(1rem,2.4vw,2rem)}.core-feature-region{width:min(92rem,100%);margin-inline:auto}.core-region-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.core-region-kicker{margin:0 0 .25rem;color:var(--calm);font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.core-region-header h1{margin:0;font-size:clamp(1.8rem,4vw,3rem);line-height:1.05}.core-region-guidance{max-width:66rem;margin:.55rem 0 0;color:var(--muted);line-height:1.55}.core-boundary-badge{flex:0 0 auto;padding:.45rem .75rem;border:1px solid rgb(250 204 21 / 52%);border-radius:999px;color:var(--bright);background:rgb(113 63 18 / 38%);font-size:.78rem;font-weight:800;text-transform:uppercase}.core-region-announcement{padding:.75rem 1rem;border-left:.3rem solid var(--calm);background:rgb(12 74 110 / 38%)}.core-readiness-panel,.core-panel{min-width:0;border:1px solid var(--line);border-radius:.9rem;background:rgb(30 41 59 / 86%);box-shadow:0 1rem 3rem rgb(2 6 23 / 18%)}.core-readiness-panel{margin-block:1rem;padding:1rem}.core-readiness-panel h2,.core-panel h2{margin:0;font-size:1.15rem}.core-readiness-panel ul,.core-item-list{padding:0;margin:.85rem 0 0;list-style:none}.core-readiness-panel ul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.core-readiness{min-width:0;display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.65rem;padding:.8rem;border:1px solid var(--line);border-radius:.7rem;background:rgb(2 6 23 / 42%)}.core-readiness p,.core-status-label{margin:.25rem 0 0;color:var(--muted);line-height:1.4}.core-status-label{display:inline-block;font-size:.75rem;font-weight:750;text-transform:uppercase}.core-status-icon{width:1.8rem;height:1.8rem;display:inline-grid;place-items:center;border:2px solid currentColor;border-radius:50%;font-weight:900}.level-blocker,.state-validation,.state-conflict,.state-destructive,.state-unavailable{border-color:rgb(252 165 165 / 52%)}.level-blocker .core-status-icon,.state-destructive .core-status-icon{color:var(--danger)}.level-warning,.state-partial,.state-degraded,.state-stale,.state-recovery{border-color:rgb(250 204 21 / 46%)}.level-warning .core-status-icon{color:var(--bright)}.level-information .core-status-icon{color:var(--calm)}.level-ready .core-status-icon{color:var(--success)}.core-panel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.core-panel{padding:1rem}.core-panel>header p{margin:.35rem 0 0;color:var(--muted);line-height:1.45}.core-item-list{display:grid;gap:.55rem}.core-item{min-width:0;padding:.75rem;border:1px solid var(--line);border-radius:.65rem;background:rgb(2 6 23 / 38%)}.core-item-heading{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.35rem .8rem}.core-item-heading strong{overflow-wrap:anywhere}.core-item-detail,.core-empty,.core-action-reason{margin:.35rem 0 0;color:var(--muted);line-height:1.45}.core-actions{display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1rem}.core-action-wrap{display:grid;gap:.25rem}.core-action{min-height:2.75rem;padding:.65rem .9rem;border:1px solid rgb(56 189 248 / 55%);border-radius:.6rem;background:rgb(12 74 110 / 50%)}.core-action:disabled{border-color:var(--line);color:var(--muted);background:rgb(2 6 23 / 35%)}.core-action-reason{max-width:26rem;font-size:.78rem}.error-boundary{width:min(48rem,100%);margin:8vh auto;padding:1.25rem;border:1px solid rgb(252 165 165 / 52%);border-radius:.9rem;background:var(--panel)}.error-boundary h1{margin-top:0}.error-boundary a{display:inline-block;min-height:2.75rem;padding:.7rem .9rem;border:1px solid var(--line);border-radius:.6rem}.state-disabled{border-color:rgb(250 204 21 / 46%)}
.core-panel:only-child{grid-column:1/-1}.core-panel:only-child .core-item-list{grid-template-columns:repeat(2,minmax(0,1fr))}
@media(max-width:900px){.operator-shell{grid-template-columns:1fr;grid-template-rows:auto auto minmax(0,1fr)}.shell-rail{grid-row:auto;border-right:0;border-bottom:1px solid var(--line)}.shell-navigation{grid-template-columns:repeat(2,minmax(0,1fr))}.shell-note{margin-top:0}.shell-header{align-items:flex-start;flex-direction:column}.core-readiness-panel ul,.core-panel-grid,.core-panel:only-child .core-item-list{grid-template-columns:1fr}}
@media(max-width:520px){.shell-navigation{grid-template-columns:1fr}.core-region-header{display:grid}.core-boundary-badge{justify-self:start}.core-item-heading{display:grid}.shell-authority-warning{max-width:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.00001s!important;animation-iteration-count:1!important;transition-duration:.00001s!important}}
`;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function navigation(
  current: OperatorPageKey,
  capabilities: readonly CoreOperatorCapability[],
): string {
  const capabilityByPage = new Map(
    capabilities.map((capability) => [capability.pageKey, capability]),
  );
  return operatorPageCatalog
    .map((page, index) => {
      const capability = capabilityByPage.get(page.key);
      const status = capability?.status ?? 'planned';
      return `<a href="${coreOperatorPagePaths[page.key]}"${page.key === current ? ' aria-current="page"' : ''}><span class="order">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(page.label)}</span><span class="capability-status ${status}">${status}</span></a>`;
    })
    .join('');
}

export function renderCoreOperatorShellDocument(options: {
  readonly model: OperatorFeatureRegionModel;
  readonly capabilities: readonly CoreOperatorCapability[];
}): string {
  const region = renderOperatorFeatureRegion(options.model);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(options.model.title)} · Chalkwright operator</title>
  <link rel="stylesheet" href="/assets/operator-shell.css">
</head>
<body>
  <a class="skip-link" href="#operator-main">Skip to main content</a>
  <div class="operator-shell">
    <aside class="shell-rail">
      <div class="shell-brand"><strong>Chalkwright</strong><span>Core operator panel</span></div>
      <nav class="shell-navigation" aria-label="Core operator navigation">${navigation(options.model.pageKey, options.capabilities)}</nav>
      <p class="shell-note">Core has no account, login, organization membership, billing, or hosted role interface.</p>
    </aside>
    <header class="shell-header">
      <div class="shell-context"><div><span>Installation workspace</span><strong>${escapeHtml(options.model.workspace.workspaceId)}</strong></div><div><span>Authority</span><strong>Private reachability</strong></div></div>
      <p class="shell-authority-warning">${escapeHtml(operatorDeliveryAcceptance.selfHostedAuthorityWarning.text)}</p>
    </header>
    <main id="operator-main" tabindex="-1">${region}</main>
  </div>
</body>
</html>`;
}

export function renderCoreOperatorErrorDocument(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Operator panel unavailable · Chalkwright</title><link rel="stylesheet" href="/assets/operator-shell.css"></head><body><a class="skip-link" href="#operator-main">Skip to main content</a><main id="operator-main" tabindex="-1"><section class="error-boundary" aria-labelledby="operator-error-title"><p class="core-region-kicker">Core operator panel</p><h1 id="operator-error-title">This operator page is unavailable</h1><p>The request failed within a bounded error response. No configuration change was made.</p><a href="/overview">Return to overview</a></section></main></body></html>`;
}
