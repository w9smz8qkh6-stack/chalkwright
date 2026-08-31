import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { chromium, type Page } from 'playwright-core';

import { operatorAccessibilityAcceptance } from '../../src/contracts/v1/index.js';
import {
  renderOperatorPanelGallery,
  renderOperatorStateGallery,
} from '../reference/operator-panel-gallery.js';

const minimumSupportedChromeMajor = 150;
const styles = readFileSync(
  'test/reference/operator-panel-gallery.css',
  'utf8',
);

function assertSupportedChromeVersion(version: string): void {
  const major = Number.parseInt(version.split('.')[0] ?? '', 10);
  assert.ok(
    Number.isFinite(major) && major >= minimumSupportedChromeMajor,
    `Chrome ${version} is older than ${minimumSupportedChromeMajor}`,
  );
}

async function collectPageFailures(page: Page): Promise<{
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
}> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

test('reference shell reflows across required viewports and reduced motion', async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    assertSupportedChromeVersion(browser.version());
    for (const viewport of operatorAccessibilityAcceptance.viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const failures = await collectPageFailures(page);
      await page.setContent(
        renderOperatorPanelGallery({ styles, pageKey: 'overview' }),
        { waitUntil: 'load' },
      );
      const evidence = await page.evaluate(() => {
        const enabledTargets = [
          ...document.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex="0"]',
          ),
        ]
          .filter((target) => target.getClientRects().length > 0)
          .map((target) => {
            const rectangle = target.getBoundingClientRect();
            return {
              label: target.textContent?.trim().slice(0, 80) ?? target.tagName,
              width: rectangle.width,
              height: rectangle.height,
            };
          });
        return {
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          headings: document.querySelectorAll('h1').length,
          main: document.querySelectorAll('main').length,
          navigation: document.querySelectorAll('nav').length,
          banner: document.querySelectorAll('header.shell-header').length,
          targetMinimum: enabledTargets.reduce(
            (minimum, target) => Math.min(minimum, target.width, target.height),
            Number.POSITIVE_INFINITY,
          ),
          reducedMotion: getComputedStyle(document.body).animationDuration,
        };
      });
      assert.ok(
        evidence.horizontalOverflow <= 1,
        `${viewport.label}:horizontal-overflow:${evidence.horizontalOverflow}`,
      );
      assert.deepEqual(
        [
          evidence.headings,
          evidence.main,
          evidence.navigation,
          evidence.banner,
        ],
        [1, 1, 1, 1],
        `${viewport.label}:landmarks`,
      );
      assert.ok(
        evidence.targetMinimum >= 24,
        `${viewport.label}:minimum-target:${evidence.targetMinimum}`,
      );
      assert.match(evidence.reducedMotion, /(?:0\.00001|1e-05)s/u);

      await page.locator('.skip-link').focus();
      assert.equal(await page.locator('.skip-link').isVisible(), true);
      const focusEvidence = await page
        .locator('.skip-link')
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            outlineWidth: Number.parseFloat(style.outlineWidth),
            rectangle: element.getBoundingClientRect().toJSON(),
          };
        });
      assert.ok(
        focusEvidence.outlineWidth >= 2,
        `${viewport.label}:focus-outline`,
      );
      assert.ok(
        focusEvidence.rectangle.width > 0,
        `${viewport.label}:skip-link`,
      );
      assert.deepEqual(failures, { consoleErrors: [], pageErrors: [] });
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test('self-hosted reference remains legible without JavaScript and shows the operator-authority warning', async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: false,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.setContent(
      renderOperatorPanelGallery({
        styles,
        pageKey: 'planned-display',
        shell: 'self-hosted',
      }),
      { waitUntil: 'load' },
    );
    const warning = page.locator('.shell-authority-warning');
    await assert.doesNotReject(() => warning.waitFor({ state: 'visible' }));
    assert.match(
      await warning.innerText(),
      /anyone who can reach this panel can administer this installation/u,
    );
    assert.equal(await page.locator('h1').innerText(), 'Planned display');
    assert.ok((await page.locator('[data-core-action-key]').count()) > 0);
    assert.ok((await page.locator('[role="option"]').count()) > 0);
    assert.ok(
      (await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )) <= 1,
    );
    await context.close();
  } finally {
    await browser.close();
  }
});

test('200 percent effective viewport reflows without clipping or unreachable actions', async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    const context = await browser.newContext({
      // A 1366-wide viewport at 200% browser zoom exposes about 683 CSS pixels.
      viewport: { width: 683, height: 384 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.setContent(
      renderOperatorPanelGallery({ styles, pageKey: 'configuration' }),
      { waitUntil: 'load' },
    );
    const evidence = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      actionCount: document.querySelectorAll<HTMLElement>(
        '.core-action:not([disabled])',
      ).length,
      actionsInDocument: [
        ...document.querySelectorAll<HTMLElement>(
          '.core-action:not([disabled])',
        ),
      ].every((action) => action.getBoundingClientRect().width > 0),
    }));
    assert.ok(
      evidence.overflow <= 1,
      `200-percent:overflow:${evidence.overflow}`,
    );
    assert.ok(evidence.actionCount > 0);
    assert.equal(evidence.actionsInDocument, true);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('planned-display contact sheet supports selection, modal review, and focus return', async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const failures = await collectPageFailures(page);
    await page.setContent(
      renderOperatorPanelGallery({ styles, pageKey: 'planned-display' }),
      { waitUntil: 'load' },
    );
    const options = page.locator('[role="option"]');
    assert.ok((await options.count()) >= 3);
    const initiallySelected = page.locator(
      '[role="option"][aria-selected="true"]',
    );
    assert.equal(await initiallySelected.count(), 1);
    await initiallySelected.focus();
    await page.keyboard.press('End');
    assert.equal(
      await page
        .locator('[role="option"][aria-selected="true"]')
        .getAttribute('data-core-frame-key'),
      await options.last().getAttribute('data-core-frame-key'),
    );
    await page.keyboard.press('Home');
    const initialKey = await options
      .first()
      .getAttribute('data-core-frame-key');
    assert.equal(
      await page
        .locator('[role="option"][aria-selected="true"]')
        .getAttribute('data-core-frame-key'),
      initialKey,
    );
    await page.keyboard.press('ArrowRight');
    const nextSelected = page.locator('[role="option"][aria-selected="true"]');
    assert.equal(await nextSelected.count(), 1);
    assert.notEqual(
      await nextSelected.getAttribute('data-core-frame-key'),
      initialKey,
    );
    await page.keyboard.press('Space');
    const dialog = page.locator('[data-frame-dialog]');
    assert.equal(
      await dialog.evaluate((element) => (element as HTMLDialogElement).open),
      true,
    );
    const dialogFrameBefore = await page
      .locator('[data-dialog-frame-title]')
      .innerText();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(
      await page.locator('[data-dialog-frame-title]').innerText(),
      dialogFrameBefore,
    );
    assert.equal(
      await page.evaluate(() =>
        document.activeElement?.hasAttribute('data-dialog-close'),
      ),
      true,
    );
    await page.keyboard.press('Escape');
    assert.equal(
      await dialog.evaluate((element) => (element as HTMLDialogElement).open),
      false,
    );
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('role')),
      'option',
    );
    assert.deepEqual(failures, { consoleErrors: [], pageErrors: [] });
    await context.close();
  } finally {
    await browser.close();
  }
});

test('finite state gallery names every state with textual meaning', async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });
    await page.setContent(renderOperatorStateGallery(styles));
    const cards = page.locator('.state-card');
    assert.equal(await cards.count(), 13);
    for (const card of await cards.all()) {
      assert.ok((await card.locator('h2').innerText()).length > 0);
      assert.ok((await card.locator('p').innerText()).length > 0);
    }
  } finally {
    await browser.close();
  }
});
