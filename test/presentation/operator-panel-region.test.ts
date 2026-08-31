import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { renderOperatorFeatureRegion } from '../../src/presentation/index.js';
import { operatorFeatureRegionFixtures } from '../fixtures/operator-panel.js';
import { renderOperatorPanelGallery } from '../reference/operator-panel-gallery.js';

const styles = readFileSync(
  'test/reference/operator-panel-gallery.css',
  'utf8',
);

test('renderer emits an escaped route-independent Core fragment', () => {
  const html = renderOperatorFeatureRegion(
    operatorFeatureRegionFixtures.overview,
  );
  assert.match(html, /^<section class="core-feature-region/u);
  assert.match(html, /<h1[^>]*>Setup readiness<\/h1>/u);
  assert.match(html, /data-core-action-key="continue-setup"/u);
  assert.match(html, /data-core-target-page="displays"/u);
  assert.doesNotMatch(
    html,
    /<(?:html|head|body|nav|form|script|a)\b|\bhref=|\baction=|https?:|cookie|account|login|organization membership|billing|authorization/iu,
  );

  const hostile = structuredClone(operatorFeatureRegionFixtures.overview);
  (hostile as { title: string }).title = '<img src=x onerror=alert(1)>';
  const escaped = renderOperatorFeatureRegion(hostile);
  assert.match(escaped, /&lt;img src=x onerror=alert\(1\)&gt;/u);
  assert.doesNotMatch(escaped, /<img src=x/u);
});

test('planned-display fragment provides semantic contact-sheet controls', () => {
  const html = renderOperatorFeatureRegion(
    operatorFeatureRegionFixtures['planned-display'],
  );
  assert.match(html, /role="listbox"/u);
  const frameCount =
    operatorFeatureRegionFixtures['planned-display'].sections.find(
      (section) => section.sectionKey === 'contact-sheet',
    )?.items.length ?? 0;
  assert.equal((html.match(/role="option"/gu) ?? []).length, frameCount);
  assert.equal((html.match(/aria-selected="true"/gu) ?? []).length, 1);
  assert.match(html, /data-core-mutation-boundary="preview-only"/u);
});

test('same Core fixture remains byte-identical inside self-hosted and hosted shells', () => {
  const region = renderOperatorFeatureRegion(
    operatorFeatureRegionFixtures.sources,
  );
  const selfHosted = renderOperatorPanelGallery({
    styles,
    pageKey: 'sources',
    shell: 'self-hosted',
  });
  const hosted = renderOperatorPanelGallery({
    styles,
    pageKey: 'sources',
    shell: 'hosted',
  });
  assert.ok(selfHosted.includes(region));
  assert.ok(hosted.includes(region));
  assert.doesNotMatch(
    region,
    /Hosted account navigation|Organization settings/u,
  );
  assert.match(hosted, /Hosted account navigation/u);
});

test('invalid region input fails closed', () => {
  assert.throws(
    () =>
      renderOperatorFeatureRegion({
        ...operatorFeatureRegionFixtures.overview,
        rawHtml: '<strong>shell-owned</strong>',
      } as never),
    /Invalid operator feature-region model/u,
  );
});
