import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { chromium } from 'playwright-core';

import { renderDisplayPage } from '../../src/presentation/html.js';
import type { DisplayPresentationModel } from '../../src/presentation/models.js';

const model: DisplayPresentationModel = {
  screenId: 'screen-glossary',
  planId: 'plan-glossary',
  date: '2035-04-13',
  timeZone: 'Etc/UTC',
  evaluatedAt: '2035-04-13T08:30:00Z',
  state: 'in_class_content',
  currentMeeting: {
    meetingId: 'meeting-glossary',
    courseLabel: 'Web Design',
    blockLabel: 'A',
    checkInOpensAt: '2035-04-13T07:55:00Z',
    officialStartsAt: '2035-04-13T08:00:00Z',
    contentStartsAt: '2035-04-13T08:00:00Z',
    dismissalStartsAt: '2035-04-13T08:55:00Z',
    officialEndsAt: '2035-04-13T09:00:00Z',
  },
  cards: [
    {
      cardId: 'card-glossary',
      type: 'vocabulary',
      title: 'Word of the day',
      lines: [],
      vocabulary: {
        term: 'Responsive Web Design',
        definition:
          'A way to make a website adapt clearly to different screen sizes.',
        example: 'Responsive web design keeps the navigation usable.',
        translations: [
          {
            languageCode: 'vi',
            term: 'Thiết kế web đáp ứng',
            definition:
              'Cách làm cho trang web thích ứng rõ ràng với nhiều kích thước màn hình khác nhau để nội dung vẫn dễ đọc và dễ sử dụng.',
            example:
              'Thiết kế web đáp ứng giúp phần điều hướng của dự án luôn dễ sử dụng trên điện thoại, máy tính bảng và máy tính.',
          },
          {
            languageCode: 'ko',
            term: '반응형 웹 디자인',
            definition:
              '웹사이트가 여러 화면 크기에 명확하게 맞춰져 콘텐츠를 계속 읽고 사용하기 쉽게 만드는 방법입니다.',
            example:
              '반응형 웹 디자인은 휴대전화, 태블릿, 컴퓨터에서 프로젝트의 탐색 기능을 사용하기 쉽게 유지합니다.',
          },
          {
            languageCode: 'zh-Hans',
            term: '响应式网页设计',
            definition:
              '一种让网站清晰适应多种屏幕尺寸，使内容始终易于阅读和使用的方法。',
            example:
              '响应式网页设计让项目导航在手机、平板电脑和电脑上都保持易用。',
          },
        ],
      },
    },
  ],
  diagnostics: [],
  pinnedAt: '2035-04-13T08:30:00Z',
};

const ordinaryModel: DisplayPresentationModel = {
  ...model,
  cards: [
    {
      cardId: 'card-glossary-ordinary',
      type: 'vocabulary',
      title: 'Word of the day',
      lines: [],
      vocabulary: {
        term: 'battery',
        definition:
          'The rechargeable part that supplies electrical energy to the robot.',
        example:
          'The team discussed the battery while improving the robot for the challenge.',
        translations: [
          {
            languageCode: 'vi',
            term: 'pin',
            definition:
              'Bộ phận có thể sạc lại cung cấp năng lượng điện cho robot.',
            example:
              'Nhóm đã thảo luận về pin khi cải tiến robot cho thử thách.',
          },
          {
            languageCode: 'ko',
            term: '배터리',
            definition: '로봇에 전기 에너지를 공급하는 충전식 부품.',
            example: '팀은 로봇을 개선하면서 배터리에 대해 논의했다.',
          },
          {
            languageCode: 'zh-Hans',
            term: '电池',
            definition: '为机器人提供电能的可充电部件。',
            example: '团队在改进机器人时讨论了电池。',
          },
        ],
      },
    },
  ],
};

async function startVocabularyServer(
  presentation: DisplayPresentationModel = model,
): Promise<{
  readonly origin: string;
  readonly close: () => Promise<void>;
}> {
  const html = renderDisplayPage(presentation);
  const css = readFileSync('public/display.css');
  const client = readFileSync('dist/client/display-client.js');
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://fixture.invalid').pathname;
    if (path === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    if (path === '/assets/display.css') {
      response.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
      response.end(css);
      return;
    }
    if (path === '/assets/display.js') {
      response.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
      });
      response.end(client);
      return;
    }
    if (path === '/manifest.webmanifest') {
      response.writeHead(200, {
        'content-type': 'application/manifest+json; charset=utf-8',
      });
      response.end('{}');
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) =>
          error === undefined ? resolve() : reject(error),
        );
      }),
  };
}

test('multilingual vocabulary keeps English anchored while the panel flips through three translations', async () => {
  const fixture = await startVocabularyServer();
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1_920, height: 1_080 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const originalSetTimeout = window.setTimeout.bind(window);
      const vocabularyCallbacks: Array<() => void> = [];
      (
        window as unknown as { __advanceVocabulary: () => void }
      ).__advanceVocabulary = () => vocabularyCallbacks.shift()?.();
      window.setTimeout = ((
        handler: TimerHandler,
        timeout?: number,
        ...arguments_: unknown[]
      ) => {
        if (timeout === 10000 && typeof handler === 'function') {
          vocabularyCallbacks.push(() => handler(...arguments_));
          return 900_000 + vocabularyCallbacks.length;
        }
        return originalSetTimeout(handler, timeout, ...arguments_);
      }) as typeof window.setTimeout;
    });
    await page.goto(fixture.origin, { waitUntil: 'domcontentloaded' });
    const labels = await page
      .locator('.vocabulary-panel-face')
      .evaluateAll((faces) =>
        faces.map((face) => face.getAttribute('aria-label')),
      );
    assert.deepEqual(labels, [
      'Vietnamese vocabulary',
      'Korean vocabulary',
      'Chinese vocabulary',
    ]);
    const translatedTermWeights = await page
      .locator('.vocabulary-translation-term')
      .evaluateAll((terms) =>
        terms.map((term) => Number(getComputedStyle(term).fontWeight)),
      );
    assert.equal(
      translatedTermWeights.every((weight) => weight >= 700),
      true,
    );

    const anchoredTerm = await page
      .locator('.vocabulary-anchor h2')
      .innerText();
    const anchoredDefinition = await page
      .locator('.vocabulary-anchor-definition')
      .innerText();
    assert.equal(
      await page.locator('.card-vocabulary > .card-type').count(),
      0,
    );
    assert.equal(await page.getByText('English', { exact: true }).count(), 0);
    const activeLabels: (string | null)[] = [];
    for (let index = 0; index < labels.length; index += 1) {
      activeLabels.push(
        await page
          .locator('.vocabulary-panel-face.is-active')
          .getAttribute('aria-label'),
      );
      assert.equal(
        await page.locator('.vocabulary-anchor h2').innerText(),
        anchoredTerm,
      );
      assert.equal(
        await page.locator('.vocabulary-anchor-definition').innerText(),
        anchoredDefinition,
      );
      assert.equal(
        await page.locator('.vocabulary-panel-face.is-active').count(),
        1,
      );
      if (index < labels.length - 1)
        await page.evaluate(() =>
          (
            window as unknown as { __advanceVocabulary: () => void }
          ).__advanceVocabulary(),
        );
    }
    assert.deepEqual(activeLabels, labels);

    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      clippedFaces: [
        ...document.querySelectorAll<HTMLElement>('.vocabulary-panel-face'),
      ].filter((face) => face.scrollHeight > face.clientHeight).length,
      faceBounds: [
        ...document.querySelectorAll<HTMLElement>('.vocabulary-panel-face'),
      ].map((face) => ({
        label: face.getAttribute('aria-label'),
        clientHeight: face.clientHeight,
        scrollHeight: face.scrollHeight,
      })),
    }));
    assert.ok(layout.width <= layout.innerWidth, 'horizontal-overflow');
    assert.ok(layout.height <= layout.innerHeight, 'vertical-overflow');
    assert.equal(
      layout.clippedFaces,
      0,
      `translated-face-overflow:${JSON.stringify(layout.faceBounds)}`,
    );
    await context.close();
  } finally {
    await browser.close();
    await fixture.close();
  }
});

test('ordinary vocabulary uses the maximum readable scale and translation spacing', async () => {
  const fixture = await startVocabularyServer(ordinaryModel);
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1_920, height: 1_080 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(fixture.origin, { waitUntil: 'domcontentloaded' });
    const result = await page.locator('.card-vocabulary').evaluate((card) => {
      const metric = (selector: string): number =>
        Number.parseFloat(
          getComputedStyle(card.querySelector<HTMLElement>(selector)!).fontSize,
        );
      const anchor = card
        .querySelector<HTMLElement>('.vocabulary-anchor')!
        .getBoundingClientRect();
      const panel = card
        .querySelector<HTMLElement>('.vocabulary-panel')!
        .getBoundingClientRect();
      return {
        className: card.className,
        term: metric('.vocabulary-anchor h2'),
        definition: metric('.vocabulary-anchor-definition'),
        example: metric('.vocabulary-anchor-example'),
        translationTerm: metric('.vocabulary-translation-term'),
        translationDefinition: metric('.vocabulary-definition'),
        translationExample: metric('.vocabulary-example'),
        gap: panel.top - anchor.bottom,
        clippedFaces: [
          ...card.querySelectorAll<HTMLElement>('.vocabulary-panel-face'),
        ].filter((face) => face.scrollHeight > face.clientHeight).length,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      };
    });
    assert.doesNotMatch(result.className, /content-(?:tight|compact)/u);
    assert.ok(result.term >= 120, JSON.stringify(result));
    assert.ok(result.definition >= 48, JSON.stringify(result));
    assert.ok(result.example >= 32, JSON.stringify(result));
    assert.ok(result.translationTerm >= 88, JSON.stringify(result));
    assert.ok(result.translationDefinition >= 44, JSON.stringify(result));
    assert.ok(result.translationExample >= 32, JSON.stringify(result));
    assert.ok(result.gap >= 36, JSON.stringify(result));
    assert.equal(result.clippedFaces, 0, JSON.stringify(result));
    assert.ok(
      result.documentWidth <= result.viewportWidth,
      JSON.stringify(result),
    );
    assert.ok(
      result.documentHeight <= result.viewportHeight,
      JSON.stringify(result),
    );
    await context.close();
  } finally {
    await browser.close();
    await fixture.close();
  }
});

test('reduced motion preserves one readable vocabulary face without overflow', async () => {
  const fixture = await startVocabularyServer();
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    for (const viewport of [
      { width: 1_920, height: 1_080 },
      { width: 1_366, height: 768 },
      { width: 768, height: 1_024 },
    ]) {
      const context = await browser.newContext({
        viewport,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(fixture.origin, { waitUntil: 'domcontentloaded' });
      const result = await page
        .locator('.vocabulary-stage')
        .evaluate((stage) => ({
          faceCount: stage.querySelectorAll('.vocabulary-panel-face').length,
          visibleCount: [
            ...stage.querySelectorAll('.vocabulary-panel-face'),
          ].filter((face) => getComputedStyle(face).opacity === '1').length,
          stageBottom: stage.getBoundingClientRect().bottom,
          viewportHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          bodyMargin: getComputedStyle(document.body).margin,
          termFontSize: Number.parseFloat(
            getComputedStyle(
              stage.querySelector<HTMLElement>('.vocabulary-anchor h2')!,
            ).fontSize,
          ),
          englishTranslationGap: (() => {
            const anchor = stage
              .querySelector<HTMLElement>('.vocabulary-anchor')!
              .getBoundingClientRect();
            const panel = stage
              .querySelector<HTMLElement>('.vocabulary-panel')!
              .getBoundingClientRect();
            return panel.top - anchor.bottom;
          })(),
          clippedFaces: [
            ...stage.querySelectorAll<HTMLElement>('.vocabulary-panel-face'),
          ].filter((face) => face.scrollHeight > face.clientHeight).length,
          faceBounds: [
            ...stage.querySelectorAll<HTMLElement>('.vocabulary-panel-face'),
          ].map((face) => ({
            label: face.getAttribute('aria-label'),
            clientHeight: face.clientHeight,
            scrollHeight: face.scrollHeight,
          })),
        }));
      assert.equal(result.faceCount, 3);
      assert.equal(result.visibleCount, 1);
      assert.equal(
        result.clippedFaces,
        0,
        `translated-face-overflow:${JSON.stringify({ viewport, faceBounds: result.faceBounds })}`,
      );
      assert.equal(result.bodyMargin, '0px');
      assert.ok(
        result.termFontSize >= (viewport.width >= 1_000 ? 76 : 48),
        `responsive-term-scale:${JSON.stringify({ viewport, result })}`,
      );
      assert.ok(
        result.englishTranslationGap >= 20,
        `responsive-translation-gap:${JSON.stringify({ viewport, result })}`,
      );
      assert.ok(
        result.stageBottom <= result.viewportHeight,
        `stage-bounds:${JSON.stringify({ viewport, result })}`,
      );
      assert.ok(
        result.scrollWidth <= result.viewportWidth,
        `horizontal-overflow:${JSON.stringify({ viewport, result })}`,
      );
      assert.ok(
        result.scrollHeight <= result.viewportHeight,
        `vertical-overflow:${JSON.stringify({ viewport, result })}`,
      );
      await context.close();
    }
  } finally {
    await browser.close();
    await fixture.close();
  }
});
