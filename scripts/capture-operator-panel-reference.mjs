import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import { format } from 'prettier';

import {
  renderOperatorPanelGallery,
  renderOperatorStateGallery,
} from '../.test-dist/test/reference/operator-panel-gallery.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(
  repositoryRoot,
  'docs',
  'ui-references',
  'a07-code-native-reference',
  'evidence',
);
const styles = readFileSync(
  join(repositoryRoot, 'test', 'reference', 'operator-panel-gallery.css'),
  'utf8',
);
const requiredCases = [
  { name: 'overview-mobile', width: 390, height: 844, pageKey: 'overview' },
  { name: 'overview-tablet', width: 768, height: 1024, pageKey: 'overview' },
  {
    name: 'planned-display-compact',
    width: 1366,
    height: 768,
    pageKey: 'planned-display',
  },
  { name: 'overview-wide', width: 1920, height: 1080, pageKey: 'overview' },
  {
    name: 'configuration-200-percent-effective',
    width: 683,
    height: 384,
    pageKey: 'configuration',
    zoomEvidence:
      '1366x768 at 200% browser zoom exposes about 683x384 CSS pixels',
  },
];

if (process.argv.slice(2).join(' ') !== '--write') {
  process.stderr.write('operator-panel-reference-capture-usage-invalid\n');
  process.exitCode = 2;
} else {
  await capture();
}

async function inspect(page) {
  return page.evaluate(() => {
    const targets = [
      ...document.querySelectorAll('button:not([disabled]), a[href]'),
    ].filter((target) => target.getClientRects().length > 0);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      headingCount: document.querySelectorAll('h1').length,
      mainCount: document.querySelectorAll('main').length,
      navigationCount: document.querySelectorAll('nav').length,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      minimumTargetCssPixels: Math.min(
        ...targets.flatMap((target) => {
          const rectangle = target.getBoundingClientRect();
          return [rectangle.width, rectangle.height];
        }),
      ),
    };
  });
}

async function capture() {
  mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  const cases = [];
  try {
    for (const captureCase of requiredCases) {
      const context = await browser.newContext({
        viewport: { width: captureCase.width, height: captureCase.height },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const failures = {
        consoleErrors: [],
        pageErrors: [],
        requestFailures: [],
      };
      page.on('console', (message) => {
        if (message.type() === 'error')
          failures.consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => failures.pageErrors.push(error.message));
      page.on('requestfailed', (request) =>
        failures.requestFailures.push(request.url()),
      );
      await page.setContent(
        renderOperatorPanelGallery({
          styles,
          pageKey: captureCase.pageKey,
          shell: 'self-hosted',
        }),
        { waitUntil: 'load' },
      );
      const layout = await inspect(page);
      if (
        layout.horizontalOverflow > 1 ||
        layout.headingCount !== 1 ||
        layout.mainCount !== 1 ||
        layout.navigationCount !== 1 ||
        layout.reducedMotion !== true ||
        layout.minimumTargetCssPixels < 24 ||
        Object.values(failures).some((failure) => failure.length > 0)
      ) {
        throw new Error(`operator-panel-reference-invalid:${captureCase.name}`);
      }
      const filename = `${captureCase.name}.png`;
      const imagePath = join(outputDirectory, filename);
      const temporaryImagePath = `${imagePath}.tmp`;
      await page.screenshot({
        path: temporaryImagePath,
        type: 'png',
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      });
      renameSync(temporaryImagePath, imagePath);
      cases.push({
        name: captureCase.name,
        pageKey: captureCase.pageKey,
        requestedViewport: {
          width: captureCase.width,
          height: captureCase.height,
        },
        ...(captureCase.zoomEvidence === undefined
          ? {}
          : { zoomEvidence: captureCase.zoomEvidence }),
        reducedMotion: true,
        layout,
        failures: {
          consoleErrors: 0,
          pageErrors: 0,
          requestFailures: 0,
        },
        image: filename,
        sha256: createHash('sha256')
          .update(readFileSync(imagePath))
          .digest('hex'),
      });
      await context.close();
    }

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.setContent(renderOperatorStateGallery(styles), {
      waitUntil: 'load',
    });
    const stateImage = 'finite-states-compact.png';
    const statePath = join(outputDirectory, stateImage);
    const temporaryStatePath = `${statePath}.tmp`;
    await page.screenshot({
      path: temporaryStatePath,
      type: 'png',
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    });
    renameSync(temporaryStatePath, statePath);
    const finiteStateCount = await page.locator('.state-card').count();
    await context.close();

    const manifest = {
      schemaVersion: 1,
      source: 'repository-owned synthetic A07 Core operator fixtures',
      browser: `Google Chrome ${browser.version()}`,
      renderer: 'native TypeScript server-rendered HTML/CSS reference gallery',
      requiredViewports: ['390x844', '768x1024', '1366x768', '1920x1080'],
      keyboardEvidence:
        'Automated browser test covers contact-sheet arrows, Enter, Escape, and focus return.',
      finiteStateCount,
      finiteStateImage: stateImage,
      finiteStateSha256: createHash('sha256')
        .update(readFileSync(statePath))
        .digest('hex'),
      cases,
    };
    const manifestPath = join(outputDirectory, 'manifest.json');
    const temporaryManifestPath = `${manifestPath}.tmp`;
    const formattedManifest = await format(JSON.stringify(manifest), {
      parser: 'json',
    });
    writeFileSync(temporaryManifestPath, formattedManifest, 'utf8');
    renameSync(temporaryManifestPath, manifestPath);
    process.stdout.write(
      `${JSON.stringify({ status: 'captured', cases: cases.length, finiteStateCount })}\n`,
    );
  } finally {
    await browser.close();
  }
}
