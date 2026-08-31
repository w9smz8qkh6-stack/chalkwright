import {
  isOperatorFeatureRegionModel,
  type OperatorFeatureAction,
  type OperatorFeatureItem,
  type OperatorFeatureRegionModel,
  type OperatorReadinessSignal,
} from '../contracts/v1/operator-panel.js';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function actionMarkup(action: OperatorFeatureAction): string {
  const disabledId = `${action.actionKey}-disabled-reason`;
  const attributes = [
    `type="button"`,
    `class="core-action intent-${escapeHtml(action.intent)}"`,
    `data-core-action-key="${escapeHtml(action.actionKey)}"`,
    `data-core-action-intent="${escapeHtml(action.intent)}"`,
    ...(action.targetPage === null
      ? []
      : [`data-core-target-page="${escapeHtml(action.targetPage)}"`]),
    ...(action.disabledReason === null
      ? []
      : [`disabled`, `aria-describedby="${escapeHtml(disabledId)}"`]),
  ];
  return `<span class="core-action-wrap"><button ${attributes.join(' ')}>${escapeHtml(action.label)}</button>${
    action.disabledReason === null
      ? ''
      : `<span id="${escapeHtml(disabledId)}" class="core-action-reason">${escapeHtml(action.disabledReason)}</span>`
  }</span>`;
}

function itemContent(item: OperatorFeatureItem): string {
  return `<div class="core-item-heading"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>${
    item.detail === null
      ? ''
      : `<p class="core-item-detail">${escapeHtml(item.detail)}</p>`
  }`;
}

function itemMarkup(
  item: OperatorFeatureItem,
  interactive = false,
  selected = false,
): string {
  const content = itemContent(item);
  return interactive
    ? `<li class="core-item state-${escapeHtml(item.state)}" data-core-item-key="${escapeHtml(item.itemKey)}"><button type="button" class="core-contact-trigger" role="option" aria-selected="${selected ? 'true' : 'false'}" data-core-frame-key="${escapeHtml(item.itemKey)}">${content}</button></li>`
    : `<li class="core-item state-${escapeHtml(item.state)}" data-core-item-key="${escapeHtml(item.itemKey)}">${content}</li>`;
}

function readinessIcon(signal: OperatorReadinessSignal): string {
  switch (signal.level) {
    case 'blocker':
      return '×';
    case 'warning':
      return '!';
    case 'information':
      return 'i';
    case 'ready':
      return '✓';
  }
}

function readinessMarkup(signal: OperatorReadinessSignal): string {
  return `<li class="core-readiness level-${escapeHtml(signal.level)}" data-core-readiness-key="${escapeHtml(signal.signalKey)}"><span class="core-status-icon" aria-hidden="true">${readinessIcon(signal)}</span><div><strong>${escapeHtml(signal.summary)}</strong><p>${escapeHtml(signal.detail)}</p><span class="core-status-label">${escapeHtml(signal.level)}${signal.blocksActivation ? ' · blocks activation' : ''}</span></div></li>`;
}

/**
 * Renders only an inert Core feature region. Shells own the document, global
 * navigation, URL/action binding, authorization, headers, cookies, and errors.
 */
export function renderOperatorFeatureRegion(
  model: OperatorFeatureRegionModel,
): string {
  if (!isOperatorFeatureRegionModel(model)) {
    throw new TypeError('Invalid operator feature-region model.');
  }
  const titleId = `core-region-title-${model.pageKey}`;
  const readinessId = `core-readiness-title-${model.pageKey}`;
  const status =
    model.statusAnnouncement === null
      ? ''
      : `<p class="core-region-announcement" role="status" aria-live="polite">${escapeHtml(model.statusAnnouncement)}</p>`;
  const readiness =
    model.readiness.length === 0
      ? ''
      : `<aside class="core-readiness-panel" aria-labelledby="${escapeHtml(readinessId)}"><h2 id="${escapeHtml(readinessId)}">Readiness</h2><ul>${model.readiness.map(readinessMarkup).join('')}</ul></aside>`;
  const sections = model.sections
    .map((section) => {
      const sectionId = `core-section-${model.pageKey}-${section.sectionKey}`;
      const contactSheet = section.sectionKey === 'contact-sheet';
      return `<section class="core-panel state-${escapeHtml(section.state)}" aria-labelledby="${escapeHtml(sectionId)}" data-core-section-key="${escapeHtml(section.sectionKey)}"><header><h2 id="${escapeHtml(sectionId)}">${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.summary)}</p></header>${
        section.items.length === 0
          ? '<p class="core-empty">No items in this reference state.</p>'
          : `<ul class="core-item-list"${contactSheet ? ' role="listbox" aria-label="Frames for the selected date" data-core-contact-sheet' : ''}>${section.items.map((item, index) => itemMarkup(item, contactSheet, index === 1)).join('')}</ul>`
      }${
        section.actions.length === 0
          ? ''
          : `<div class="core-actions">${section.actions.map(actionMarkup).join('')}</div>`
      }</section>`;
    })
    .join('');

  return `<section class="core-feature-region state-${escapeHtml(model.state)}" aria-labelledby="${escapeHtml(titleId)}" data-core-feature-region="${escapeHtml(model.regionKey)}" data-core-page-key="${escapeHtml(model.pageKey)}" data-core-mutation-boundary="${escapeHtml(model.mutationBoundary)}"><header class="core-region-header"><div><p class="core-region-kicker">Core operator panel</p><h1 id="${escapeHtml(titleId)}">${escapeHtml(model.title)}</h1><p class="core-region-guidance">${escapeHtml(model.guidance)}</p></div><span class="core-boundary-badge">${escapeHtml(model.mutationBoundary.replaceAll('-', ' '))}</span></header>${status}${readiness}<div class="core-panel-grid">${sections}</div></section>`;
}
