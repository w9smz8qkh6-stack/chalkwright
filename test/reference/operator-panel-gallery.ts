import {
  operatorPageCatalog,
  operatorPageKeys,
  operatorRegionStates,
  type OperatorPageKey,
  type OperatorRegionState,
} from '../../src/contracts/v1/index.js';
import { renderOperatorFeatureRegion } from '../../src/presentation/index.js';
import {
  operatorFeatureRegionFixtures,
  operatorStateFixtures,
} from '../fixtures/operator-panel.js';

export type OperatorGalleryShell = 'self-hosted' | 'hosted';

export interface OperatorGalleryOptions {
  readonly styles: string;
  readonly pageKey?: OperatorPageKey;
  readonly shell?: OperatorGalleryShell;
  readonly state?: OperatorRegionState;
}

const logoDataUri = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title"><title id="title">Chalkwright</title><rect width="64" height="64" rx="14" fill="#0c4a6e"/><path d="M14 18h36v28H14z" fill="#f8fafc"/><path d="M19 23h26v5H19zm0 10h12v8H19zm17 0h9v8h-9z" fill="#38bdf8"/><path d="M12 48h40" stroke="#facc15" stroke-width="4" stroke-linecap="round"/></svg>',
)}`;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeStyle(value: string): string {
  return value.replaceAll('</style', '<\\/style');
}

function shellNavigation(pageKey: OperatorPageKey): string {
  return `<nav class="shell-navigation" aria-label="Core operator areas">${operatorPageCatalog
    .map(
      (page) =>
        `<button type="button" data-reference-page="${escapeHtml(page.key)}"${
          page.key === pageKey ? ' aria-current="page"' : ''
        }><span aria-hidden="true">${String(
          operatorPageKeys.indexOf(page.key) + 1,
        ).padStart(2, '0')}</span>${escapeHtml(page.label)}</button>`,
    )
    .join('')}</nav>`;
}

function shellContext(shell: OperatorGalleryShell): string {
  return shell === 'self-hosted'
    ? `<div class="shell-context" aria-label="Self-hosted scope"><div><span>Workspace</span><strong>Synthetic local installation</strong></div><div><span>Selected display</span><strong>Room 101 · Front display</strong></div><div><span>Operator boundary</span><strong>Private listener · no account or login</strong></div></div>`
    : `<div class="shell-context" aria-label="Hosted scope"><div><span>Organization</span><strong>Synthetic Learning Lab</strong></div><div><span>Selected display</span><strong>Room 101 · Front display</strong></div><div><span>Hosted authorization</span><strong>Scope fixed server-side before Core</strong></div></div>`;
}

function shellLabel(shell: OperatorGalleryShell): string {
  return shell === 'self-hosted'
    ? 'Self-hosted Core shell reference'
    : 'Commercial hosted shell reference';
}

const referenceScript = `(() => {
  const dialog = document.querySelector('[data-frame-dialog]');
  const contactSheet = document.querySelector('[data-core-contact-sheet]');
  const triggers = contactSheet === null ? [] : [...contactSheet.querySelectorAll('[data-core-frame-key]')];
  let selectedIndex = Math.max(0, triggers.findIndex((item) => item.getAttribute('aria-selected') === 'true'));
  let opener = null;
  const announce = document.querySelector('[data-reference-announcer]');
  function select(index, focus) {
    if (triggers.length === 0) return;
    selectedIndex = Math.max(0, Math.min(index, triggers.length - 1));
    triggers.forEach((item, itemIndex) => item.setAttribute('aria-selected', String(itemIndex === selectedIndex)));
    const trigger = triggers[selectedIndex];
    const label = trigger.textContent.trim().replace(/\\s+/g, ' ');
    const title = dialog?.querySelector('[data-dialog-frame-title]');
    if (title) title.textContent = label;
    if (announce) announce.textContent = 'Frame ' + String(selectedIndex + 1) + ' of ' + String(triggers.length) + ' selected.';
    if (focus) trigger.focus();
  }
  function openDialog(trigger) {
    if (!(dialog instanceof HTMLDialogElement)) return;
    opener = trigger;
    dialog.showModal();
    dialog.querySelector('[data-dialog-close]')?.focus();
  }
  contactSheet?.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') select(selectedIndex - 1, true);
    if (event.key === 'ArrowRight') select(selectedIndex + 1, true);
    if (event.key === 'Home') select(0, true);
    if (event.key === 'End') select(triggers.length - 1, true);
    if (event.key === 'Enter' || event.key === ' ') openDialog(triggers[selectedIndex]);
  });
  triggers.forEach((trigger, index) => trigger.addEventListener('click', () => {
    select(index, false);
    openDialog(trigger);
  }));
  dialog?.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    select(selectedIndex + (event.key === 'ArrowLeft' ? -1 : 1), false);
  });
  document.querySelector('[data-core-action-key="open-frame-review"]')?.addEventListener('click', (event) => openDialog(event.currentTarget));
  dialog?.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => {
    if (opener instanceof HTMLElement) opener.focus();
  });
  document.querySelectorAll('[data-reference-page]').forEach((button) => button.addEventListener('click', () => {
    if (announce) announce.textContent = 'Static A07 reference. Page navigation is bound by the owning shell and is intentionally inert here.';
  }));
})();`;

export function renderOperatorPanelGallery(
  options: OperatorGalleryOptions,
): string {
  const pageKey = options.pageKey ?? 'overview';
  const shell = options.shell ?? 'self-hosted';
  const fixture =
    options.state === undefined
      ? operatorFeatureRegionFixtures[pageKey]
      : operatorStateFixtures[options.state];
  const region = renderOperatorFeatureRegion(fixture);
  const pageLabel = operatorPageCatalog.find(
    (page) => page.key === pageKey,
  )?.label;
  if (pageLabel === undefined) throw new Error('operator-gallery-page-missing');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(pageLabel)} — Chalkwright A07 reference</title>
  <style>${safeStyle(options.styles)}</style>
</head>
<body data-reference-shell="${escapeHtml(shell)}" data-reference-page="${escapeHtml(pageKey)}">
  <a class="skip-link" href="#reference-main">Skip to operator content</a>
  <div class="reference-shell">
    <aside class="shell-rail">
      <div class="shell-brand"><img src="${logoDataUri}" alt="" width="44" height="44"><div><strong>Chalkwright Core</strong><span>${escapeHtml(shellLabel(shell))}</span></div></div>
      ${shellNavigation(pageKey)}
      <p class="shell-note">Core has no account, login, organization membership, billing, or hosted role UI.</p>
    </aside>
    <header class="shell-header">
      ${shellContext(shell)}
      ${
        shell === 'hosted'
          ? '<nav class="hosted-navigation" aria-label="Hosted account navigation"><button type="button">Organization settings</button><button type="button">Account security</button></nav>'
          : ''
      }
    </header>
    <main id="reference-main" tabindex="-1">${region}</main>
  </div>
  <dialog class="frame-dialog" data-frame-dialog aria-labelledby="frame-dialog-title">
    <div class="dialog-header"><div><p>Preview only · mutation-free</p><h2 id="frame-dialog-title" data-dialog-frame-title>8:00 AM Objective</h2></div><button type="button" data-dialog-close>Close review</button></div>
    <div class="reference-display-frame" role="img" aria-label="Synthetic classroom display frame"><span>Web Design · A</span><strong>Today’s objective</strong><p>Explain a deterministic state transition.</p></div>
    <p>Use Left and Right Arrow to review adjacent frames. Escape closes this review and returns focus to the opener.</p>
  </dialog>
  <p class="visually-hidden" role="status" aria-live="polite" data-reference-announcer></p>
  <script>${referenceScript}</script>
</body>
</html>`;
}

export function renderOperatorStateGallery(styles: string): string {
  const cards = operatorRegionStates
    .map((state) => {
      const fixture = operatorStateFixtures[state];
      return `<article class="state-card state-${escapeHtml(state)}"><span class="core-status-icon" aria-hidden="true">${state === 'ready' || state === 'success' ? '✓' : '!'}</span><h2>${escapeHtml(state.replaceAll('-', ' '))}</h2><p>${escapeHtml(fixture.sections[0]?.summary)}</p><strong>${escapeHtml(fixture.sections[0]?.items[0]?.value)}</strong></article>`;
    })
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A07 finite states</title><style>${safeStyle(styles)}</style></head><body class="state-gallery-page"><a class="skip-link" href="#state-main">Skip to states</a><main id="state-main"><header><p class="core-region-kicker">Chalkwright A07 reference</p><h1>Finite operator states</h1><p>Every state uses text and structure in addition to color.</p></header><div class="state-gallery">${cards}</div></main></body></html>`;
}
