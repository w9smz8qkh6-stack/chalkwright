import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { chromium, type Browser, type Page } from 'playwright-core';

import { startCoreOperatorApplication } from '../../src/app/core-operator-server.js';
import { VersionedConfigurationService } from '../../src/application/configuration/versioned-configuration-service.js';
import { operatorAccessibilityAcceptance } from '../../src/contracts/v1/index.js';
import { InMemoryConfigurationStateRepository } from '../../src/infrastructure/memory/configuration-state.js';
import type { RunningCoreOperatorHttpServer } from '../../src/infrastructure/operator-http/index.js';
import { coreGoal1FixtureCatalog } from '../fixtures/core-goal1.js';

let browser: Browser;
let running: RunningCoreOperatorHttpServer;

before(async () => {
  browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  running = await startCoreOperatorApplication({
    host: '127.0.0.1',
    workspace: coreGoal1FixtureCatalog.workspace,
    configuration: new VersionedConfigurationService(
      new InMemoryConfigurationStateRepository([
        coreGoal1FixtureCatalog.configurationStates.rolledBack,
      ]),
    ),
    plannedFrames: coreGoal1FixtureCatalog.plannedFrames,
    ...(coreGoal1FixtureCatalog.preview.basis.kind === 'revision'
      ? {
          plannedDisplayBasisRevisionId:
            coreGoal1FixtureCatalog.preview.basis.revisionId,
        }
      : {}),
  });
});

after(async () => {
  await running.close();
  await browser.close();
});

function collectFailures(page: Page): {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
} {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

test('production shell reflows at accepted viewports with landmarks, focus, and reduced motion', async () => {
  for (const viewport of operatorAccessibilityAcceptance.viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const failures = collectFailures(page);
    await page.goto(`${running.origin}/overview`, { waitUntil: 'load' });
    const evidence = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      headingCount: document.querySelectorAll('h1').length,
      mainCount: document.querySelectorAll('main').length,
      navigationCount: document.querySelectorAll('nav').length,
      bannerCount: document.querySelectorAll('header.shell-header').length,
      navigationTargets: document.querySelectorAll('.shell-navigation a')
        .length,
      minimumTarget: [
        ...document.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled])',
        ),
      ]
        .filter((target) => target.getClientRects().length > 0)
        .reduce((minimum, target) => {
          const rectangle = target.getBoundingClientRect();
          return Math.min(minimum, rectangle.width, rectangle.height);
        }, Number.POSITIVE_INFINITY),
      reducedMotion: getComputedStyle(document.body).animationDuration,
    }));
    assert.ok(evidence.overflow <= 1, viewport.label);
    assert.deepEqual(
      [
        evidence.headingCount,
        evidence.mainCount,
        evidence.navigationCount,
        evidence.bannerCount,
        evidence.navigationTargets,
      ],
      [1, 1, 1, 1, 7],
      viewport.label,
    );
    assert.ok(evidence.minimumTarget >= 24, viewport.label);
    assert.match(evidence.reducedMotion, /(?:0\.00001|1e-05)s/u);
    await page.locator('.skip-link').focus();
    assert.equal(await page.locator('.skip-link').isVisible(), true);
    assert.ok(
      await page
        .locator('.skip-link')
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).outlineWidth),
        ),
    );
    assert.deepEqual(failures, { consoleErrors: [], pageErrors: [] });
    await context.close();
  }
});

test('shell remains complete without JavaScript and at the 200 percent effective viewport', async () => {
  const context = await browser.newContext({
    viewport: { width: 683, height: 384 },
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${running.origin}/configuration`, { waitUntil: 'load' });
  assert.equal(await page.locator('h1').innerText(), 'Configuration');
  assert.match(
    await page.locator('.shell-authority-warning').innerText(),
    /anyone who can reach this panel can administer this installation/u,
  );
  assert.equal(await page.locator('.shell-navigation a').count(), 7);
  assert.ok(
    (await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )) <= 1,
  );
  await page.locator('.shell-navigation a[href="/sources"]').click();
  await page.waitForLoadState('load');
  assert.equal(await page.locator('h1').innerText(), 'Sources');
  assert.equal(page.url(), `${running.origin}/sources`);
  await context.close();
});

test('C03 display controls reflow and expose the one-time class-code result without JavaScript', async () => {
  const context = await browser.newContext({
    viewport: { width: 683, height: 384 },
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${running.origin}/displays`, { waitUntil: 'load' });
  assert.equal(await page.locator('h1').innerText(), 'Displays');
  assert.equal(
    await page.locator('form[action$="rotate-class-code"]').count(),
    2,
  );
  assert.ok(
    (await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )) <= 1,
  );
  const rotate = page
    .locator('form[action$="rotate-class-code"] button')
    .first();
  const rectangle = await rotate.boundingBox();
  assert.ok(
    rectangle !== null && rectangle.width >= 24 && rectangle.height >= 24,
  );
  assert.equal(
    await page
      .locator('form[action$="rotate-class-code"]')
      .first()
      .getAttribute('method'),
    'post',
  );
  await context.close();
});

test('C04 source controls retain a useful no-JavaScript manual path', async () => {
  const context = await browser.newContext({
    viewport: { width: 683, height: 384 },
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${running.origin}/sources`, { waitUntil: 'load' });
  assert.equal(await page.locator('h1').innerText(), 'Sources');
  assert.equal(await page.locator('form[action$="save-manual"]').count(), 1);
  assert.equal(
    (await page.locator('select[name="stream"] option').count()) > 1,
    true,
  );
  assert.ok(
    (await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )) <= 1,
  );
  await context.close();
});

test('C11 planned-display review reflows without JavaScript and supports keyboard dialog review with it', async () => {
  const noScript = await browser.newContext({
    viewport: { width: 683, height: 384 },
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  const noScriptPage = await noScript.newPage();
  await noScriptPage.goto(`${running.origin}/planned-display`, {
    waitUntil: 'load',
  });
  assert.equal(await noScriptPage.locator('h1').innerText(), 'Planned display');
  assert.equal(
    await noScriptPage
      .locator('form[action$="planned-displays/select"]')
      .count(),
    1,
  );
  assert.ok((await noScriptPage.locator('[role="option"]').count()) >= 3);
  assert.ok(
    (await noScriptPage.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )) <= 1,
  );
  await noScript.close();

  const enhanced = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: 'reduce',
  });
  const page = await enhanced.newPage();
  const failures = collectFailures(page);
  await page.goto(`${running.origin}/planned-display`, { waitUntil: 'load' });
  const options = page.locator('[role="option"]');
  await options.first().focus();
  await page.keyboard.press('End');
  assert.equal(
    await page.locator('[role="option"][aria-selected="true"]').count(),
    1,
  );
  await page.keyboard.press('Space');
  const dialog = page.locator('[data-planned-dialog]');
  assert.equal(
    await dialog.evaluate((element) => (element as HTMLDialogElement).open),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await dialog.evaluate((element) => (element as HTMLDialogElement).open),
    false,
  );
  assert.deepEqual(failures, { consoleErrors: [], pageErrors: [] });
  await enhanced.close();
});
