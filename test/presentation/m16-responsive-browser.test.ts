import assert from 'node:assert/strict';
import test from 'node:test';

import { chromium } from 'playwright-core';

import { startFixtureBackedMvp } from '../../src/app/mvp-server.js';
import {
  b407Date,
  b407StateInstants,
} from '../../src/infrastructure/fixture/b407.js';

const minimumSupportedChromeMajor = 150;
const viewports = [
  { name: 'hikvision-native-output', width: 3_840, height: 2_160 },
  { name: 'legacy-large', width: 1_920, height: 1_080 },
  { name: 'legacy-laptop', width: 1_366, height: 768 },
] as const;

test('renders every accepted display state across the bounded kiosk viewport envelope', async () => {
  const application = await startFixtureBackedMvp(
    {
      nodeEnv: 'test',
      logLevel: 'warn',
      host: '127.0.0.1',
      port: 0,
    },
    process.cwd(),
    { legacyRouteCompatibility: true },
  );
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    assertSupportedChromeVersion(browser.version());
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const foreignRequests: string[] = [];
      const httpFailures: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.name));
      page.on('request', (request) => {
        if (!request.url().startsWith(application.origin))
          foreignRequests.push(request.url().split('?')[0] ?? 'foreign');
      });
      page.on('response', (response) => {
        if (response.status() >= 400)
          httpFailures.push(
            `${response.status()}:${new URL(response.url()).pathname}`,
          );
      });

      for (const [state, now] of Object.entries(b407StateInstants)) {
        const response = await page.goto(
          `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(now)}`,
          { waitUntil: 'domcontentloaded' },
        );
        assert.equal(response?.status(), 200, `${viewport.name}:${state}`);
        await page.locator(`body.state-${state}`).waitFor();
        const displayedClock = await page.locator('[data-clock]').textContent();
        assert.match(displayedClock ?? '', /^\d{1,2}:\d{2} [ap]\.m\.$/u);
        if (state === 'idle' || state === 'post_end') {
          const comingUp = await page
            .locator('.scene-coming-up')
            .evaluate((scene) => {
              const panel =
                scene.querySelector<HTMLElement>('.coming-up-panel');
              if (panel === null) throw new Error('coming-up-panel-missing');
              const sceneRectangle = scene.getBoundingClientRect();
              const panelRectangle = panel.getBoundingClientRect();
              const title = panel.querySelector<HTMLElement>('h1');
              if (title === null) throw new Error('coming-up-title-missing');
              const titleRectangle = title.getBoundingClientRect();
              return {
                sceneCenter: sceneRectangle.top + sceneRectangle.height / 2,
                panelCenter: panelRectangle.top + panelRectangle.height / 2,
                titleCenter: titleRectangle.top + titleRectangle.height / 2,
                viewportHeight: window.innerHeight,
                titleFontSize: Number.parseFloat(
                  getComputedStyle(title).fontSize,
                ),
              };
            });
          assert.ok(
            Math.abs(
              comingUp.sceneCenter -
                comingUp.panelCenter -
                Math.min(64, Math.max(32, comingUp.viewportHeight * 0.05)),
            ) <= 1,
            `${viewport.name}:${state}:coming-up-panel-optical-center`,
          );
          assert.ok(
            Math.abs(comingUp.titleCenter - comingUp.panelCenter) <= 1,
            `${viewport.name}:${state}:coming-up-title-vertical-center`,
          );
          assert.ok(
            comingUp.titleFontSize >= 88,
            `${viewport.name}:${state}:coming-up-title-size`,
          );
        }
        if (state === 'morning_overview') {
          const overview = await page
            .locator('.scene-overview')
            .evaluate((scene) => {
              const firstRow =
                scene.querySelector<HTMLElement>('.meeting-list li');
              const course =
                firstRow?.querySelector<HTMLElement>('.meeting-course');
              const badge =
                firstRow?.querySelector<HTMLElement>('.block-badge');
              const time = firstRow?.querySelector<HTMLElement>('time');
              const heading = scene.querySelector<HTMLElement>('h1');
              if (!firstRow || !course || !badge || !time || !heading)
                throw new Error('morning-overview-layout-missing');
              return {
                montageImages: scene.querySelectorAll('.overview-montage img')
                  .length,
                courseLeft: course.getBoundingClientRect().left,
                badgeLeft: badge.getBoundingClientRect().left,
                timeLeft: time.getBoundingClientRect().left,
                rowFontSize: Number.parseFloat(
                  getComputedStyle(firstRow).fontSize,
                ),
                headingFontSize: Number.parseFloat(
                  getComputedStyle(heading).fontSize,
                ),
              };
            });
          assert.ok(overview.montageImages > 0, viewport.name);
          assert.ok(overview.courseLeft < overview.badgeLeft, viewport.name);
          assert.ok(overview.badgeLeft < overview.timeLeft, viewport.name);
          assert.ok(overview.rowFontSize >= 21.6, viewport.name);
          assert.ok(overview.headingFontSize <= 56, viewport.name);
        }
        if (
          state === 'idle' ||
          state === 'pre_checkin' ||
          state === 'dismissal_warning'
        ) {
          assert.equal(
            await page
              .locator('.banner-backed .course-banner img')
              .evaluate((image) => getComputedStyle(image).objectPosition),
            '100% 50%',
            `${viewport.name}:${state}:banner-position`,
          );
        }
        if (state === 'dismissal_warning') {
          const dismissal = await page
            .locator('.scene-dismissal.banner-backed')
            .evaluate((scene) => {
              const copy = scene.querySelector<HTMLElement>('.scene-copy');
              if (copy === null)
                throw new Error('dismissal-banner-copy-missing');
              return {
                copyWidth: copy.getBoundingClientRect().width,
                sceneWidth: scene.getBoundingClientRect().width,
                background: getComputedStyle(copy).backgroundColor,
              };
            });
          assert.ok(
            dismissal.copyWidth <= dismissal.sceneWidth * 0.58,
            `${viewport.name}:dismissal-copy-width`,
          );
          assert.equal(
            dismissal.background,
            'rgba(0, 0, 0, 0)',
            `${viewport.name}:dismissal-copy-background`,
          );
        }
        if (state === 'in_class_content') {
          assert.doesNotMatch(
            await page.locator('body').innerText(),
            /Dismissal begins/u,
          );
          const objective = await page
            .locator('[data-carousel-card][data-card-id="objective-b407-a"]')
            .evaluate((card) => {
              const icons = [
                ...card.querySelectorAll<HTMLElement>(
                  '[data-objective-detail-icon]',
                ),
              ];
              const list = card.querySelector<HTMLElement>(
                '.objective-detail-list',
              );
              const badge = card.querySelector<HTMLElement>('.date-badge');
              if (!list || !badge)
                throw new Error('objective-detail-layout-missing');
              const badgeRectangle = badge.getBoundingClientRect();
              return {
                icons: icons.map((icon) => icon.textContent),
                iconsDecorative: icons.every(
                  (icon) => icon.getAttribute('aria-hidden') === 'true',
                ),
                month:
                  badge.querySelector('.date-badge-month')?.textContent ?? '',
                day: badge.querySelector('.date-badge-day')?.textContent ?? '',
                badgeDecorative: badge.getAttribute('aria-hidden') === 'true',
                badgeWidth: badgeRectangle.width,
                badgeHeight: badgeRectangle.height,
                listPaddingLeft: getComputedStyle(list).paddingLeft,
                listStyleType: getComputedStyle(list).listStyleType,
              };
            });
          assert.deepEqual(
            objective.icons,
            ['👉', '✅'],
            `${viewport.name}:objective-icons`,
          );
          assert.equal(objective.iconsDecorative, true, viewport.name);
          assert.equal(objective.month, 'APRIL', viewport.name);
          assert.equal(objective.day, '17', viewport.name);
          assert.equal(objective.badgeDecorative, true, viewport.name);
          assert.ok(objective.badgeWidth > 0, viewport.name);
          assert.ok(objective.badgeHeight > 0, viewport.name);
          assert.equal(objective.listPaddingLeft, '0px', viewport.name);
          assert.equal(objective.listStyleType, 'none', viewport.name);
        }
        const bell = await page
          .locator('[data-header-bell]')
          .evaluate((element) => ({
            hidden: (element as HTMLElement).hidden,
            value:
              element.querySelector('[data-header-bell-number]')?.textContent ??
              '',
            label: element.getAttribute('aria-label'),
          }));
        if (state === 'in_class_content') {
          assert.deepEqual(bell, {
            hidden: false,
            value: '60',
            label: '60 minutes until bell',
          });
        } else {
          assert.equal(bell.hidden, true, `${viewport.name}:${state}:bell`);
        }
        const layout = await page.evaluate(() => {
          const rectangle = document.body.getBoundingClientRect();
          return {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            left: rectangle.left,
            top: rectangle.top,
            right: rectangle.right,
            bottom: rectangle.bottom,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)')
              .matches,
          };
        });
        assert.equal(layout.innerWidth, viewport.width);
        assert.equal(layout.innerHeight, viewport.height);
        assert.ok(
          layout.scrollWidth <= viewport.width,
          `${viewport.name}:${state}:horizontal-overflow`,
        );
        assert.ok(
          layout.scrollHeight <= viewport.height,
          `${viewport.name}:${state}:vertical-overflow`,
        );
        assert.ok(layout.left >= 0 && layout.top >= 0);
        assert.ok(
          layout.right <= viewport.width && layout.bottom <= viewport.height,
          `${viewport.name}:${state}:screen-bounds`,
        );
        assert.equal(layout.reducedMotion, true);
      }

      await page.keyboard.press('Tab');
      await page.waitForFunction(() => {
        const active = document.activeElement;
        return (
          active instanceof HTMLElement &&
          active.classList.contains('skip-link') &&
          active.getBoundingClientRect().top >= 0
        );
      });
      const focus = await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) return undefined;
        const rectangle = active.getBoundingClientRect();
        return {
          className: active.className,
          left: rectangle.left,
          top: rectangle.top,
          right: rectangle.right,
          bottom: rectangle.bottom,
          outlineStyle: getComputedStyle(active).outlineStyle,
          transform: getComputedStyle(active).transform,
          focus: active.matches(':focus'),
          focusVisible: active.matches(':focus-visible'),
          focusRule: [...document.styleSheets].some((sheet) => {
            try {
              return [...sheet.cssRules].some(
                (rule) =>
                  rule instanceof CSSStyleRule &&
                  rule.selectorText.includes('.skip-link:focus'),
              );
            } catch {
              return false;
            }
          }),
        };
      });
      assert.match(focus?.className ?? '', /(?:^|\s)skip-link(?:\s|$)/u);
      assert.equal(focus?.focus, true);
      assert.equal(focus?.focusVisible, true);
      assert.equal(focus?.focusRule, true);
      assert.notEqual(focus?.outlineStyle, 'none');
      assert.equal(focus?.transform, 'none');
      assert.ok(
        focus !== undefined &&
          focus.left >= 0 &&
          focus.top >= 0 &&
          focus.right <= viewport.width &&
          focus.bottom <= viewport.height,
        `${viewport.name}:focused-skip-link:${JSON.stringify(focus)}`,
      );
      assert.ok((await page.screenshot()).byteLength > 10_000);
      assert.deepEqual(httpFailures, [], viewport.name);
      assert.deepEqual(consoleErrors, [], viewport.name);
      assert.deepEqual(pageErrors, [], viewport.name);
      assert.deepEqual(foreignRequests, [], viewport.name);
      await context.close();
    }
  } finally {
    await browser.close();
    await application.close();
  }
});

test('school branding follows the legacy responsive logo widths', async () => {
  const application = await startFixtureBackedMvp(
    {
      nodeEnv: 'test',
      logLevel: 'warn',
      host: '127.0.0.1',
      port: 0,
    },
    process.cwd(),
    {
      legacyRouteCompatibility: true,
      presentationCustomization: {
        school: {
          name: 'Example Academy',
          logoPath: '/assets/banner-advisory-v1.png',
        },
        courseBanners: {},
      },
    },
  );
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    assertSupportedChromeVersion(browser.version());
    for (const viewport of [
      { width: 1_920, height: 1_080, expected: 204 },
      { width: 1_366, height: 768, expected: 168 },
      { width: 480, height: 800, expected: 132 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      await page.goto(
        `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(b407StateInstants.pre_checkin)}`,
        { waitUntil: 'domcontentloaded' },
      );
      const branding = await page.locator('.brand-school').evaluate((brand) => {
        const image = brand.querySelector<HTMLImageElement>('img');
        if (image === null) throw new Error('school-logo-missing');
        return {
          width: image.getBoundingClientRect().width,
          alt: image.alt,
          wordmark: brand.textContent?.trim() ?? '',
          objectFit: getComputedStyle(image).objectFit,
        };
      });
      assert.equal(branding.width, viewport.expected);
      assert.equal(branding.alt, 'Example Academy');
      assert.equal(branding.wordmark, '');
      assert.equal(branding.objectFit, 'contain');
      const credit = await page
        .locator('.system-credit')
        .evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const image = element.querySelector<HTMLImageElement>('img');
          return {
            text: element.textContent?.trim() ?? '',
            iconPath: image?.getAttribute('src') ?? '',
            opacity: getComputedStyle(element).opacity,
            backgroundColor: getComputedStyle(element).backgroundColor,
            borderWidth: getComputedStyle(element).borderTopWidth,
            boxShadow: getComputedStyle(element).boxShadow,
            iconFilter: image === null ? '' : getComputedStyle(image).filter,
            left: bounds.left,
            rightGap: window.innerWidth - bounds.right,
            bottomGap: window.innerHeight - bounds.bottom,
          };
        });
      assert.equal(
        credit.text,
        'ChalkWright Classroom Screen System v.0.1.0: www.chalkwright.org',
      );
      assert.equal(credit.iconPath, '/classroom-screen/assets/chalkwright.svg');
      assert.equal(credit.opacity, '0.38');
      assert.equal(credit.backgroundColor, 'rgba(0, 0, 0, 0)');
      assert.equal(credit.borderWidth, '0px');
      assert.equal(credit.boxShadow, 'none');
      assert.equal(credit.iconFilter, 'grayscale(1)');
      assert.ok(credit.left >= 0);
      assert.ok(credit.rightGap >= 0 && credit.rightGap <= 25);
      assert.ok(credit.bottomGap >= 0 && credit.bottomGap <= 17);

      await page.goto(
        `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(`${b407Date}T07:59:30.120Z`)}`,
        { waitUntil: 'domcontentloaded' },
      );
      const rapidCountdown = await page
        .locator('.checkin-display .scene-countdown strong')
        .evaluate((value) => ({
          text: value.textContent,
          numericSpacing: getComputedStyle(value).fontVariantNumeric,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
      assert.equal(rapidCountdown.text, '0:29.88');
      assert.equal(rapidCountdown.numericSpacing, 'tabular-nums');
      assert.ok(rapidCountdown.scrollWidth <= rapidCountdown.innerWidth);
      await context.close();
    }
  } finally {
    await browser.close();
    await application.close();
  }
});

test('during-class header timers remain readable without horizontal overflow', async () => {
  const application = await startFixtureBackedMvp(
    {
      nodeEnv: 'test',
      logLevel: 'warn',
      host: '127.0.0.1',
      port: 0,
    },
    process.cwd(),
    { legacyRouteCompatibility: true },
  );
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    assertSupportedChromeVersion(browser.version());
    for (const viewport of [
      { name: 'native', width: 3_840, height: 2_160 },
      { name: 'classroom', width: 1_920, height: 1_080 },
      { name: 'tablet', width: 768, height: 1_024 },
      { name: 'mobile', width: 390, height: 844 },
    ] as const) {
      const context = await browser.newContext({
        viewport,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const response = await page.goto(
        `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(b407StateInstants.in_class_content)}`,
        { waitUntil: 'domcontentloaded' },
      );
      assert.equal(response?.status(), 200, viewport.name);
      const titleLayout = await page
        .locator('.meeting-label')
        .evaluate((title) => {
          const titleRectangle = title.getBoundingClientRect();
          const headerRectangle = title
            .closest('header')
            ?.getBoundingClientRect();
          return {
            fontSize: Number.parseFloat(getComputedStyle(title).fontSize),
            top: titleRectangle.top,
            bottom: titleRectangle.bottom,
            headerTop: headerRectangle?.top ?? Number.NaN,
            headerBottom: headerRectangle?.bottom ?? Number.NaN,
          };
        });
      assert.equal(
        titleLayout.top >= titleLayout.headerTop &&
          titleLayout.bottom <= titleLayout.headerBottom,
        true,
        `${viewport.name}:course-title-contained`,
      );
      if (viewport.width >= 1_920)
        assert.equal(
          titleLayout.fontSize >= 48,
          true,
          `${viewport.name}:course-title-enlarged`,
        );
      const result = await page.locator('.header-status').evaluate((status) => {
        const bell = status.querySelector<HTMLElement>('[data-header-bell]');
        const bellIcon = status.querySelector<HTMLElement>('.header-bell-icon');
        const bellNumber = status.querySelector<HTMLElement>(
          '[data-header-bell-number]',
        );
        const date = status.querySelector<HTMLElement>('[data-display-date]');
        const clock = status.querySelector<HTMLElement>('[data-clock]');
        if (!bell || !bellIcon || !bellNumber || !date || !clock)
          throw new Error('header-status-invalid');
        const rectangle = bell.getBoundingClientRect();
        const iconRectangle = bellIcon.getBoundingClientRect();
        const numberRectangle = bellNumber.getBoundingClientRect();
        const dateRectangle = date.getBoundingClientRect();
        const clockRectangle = clock.getBoundingClientRect();
        const numberStyle = getComputedStyle(bellNumber);
        return {
          hidden: bell.hidden,
          value:
            bell.querySelector('[data-header-bell-number]')?.textContent ?? '',
          left: rectangle.left,
          right: rectangle.right,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          dateRight: dateRectangle.right,
          clockLeft: clockRectangle.left,
          dateTop: dateRectangle.top,
          clockBottom: clockRectangle.bottom,
          dateCenter: dateRectangle.left + dateRectangle.width / 2,
          clockHorizontalCenter: clockRectangle.left + clockRectangle.width / 2,
          clockCenter: clockRectangle.top + clockRectangle.height / 2,
          bellCenter: rectangle.top + rectangle.height / 2,
          iconNumberGap: numberRectangle.left - iconRectangle.right,
          clusterCenter:
            iconRectangle.left +
            (numberRectangle.right - iconRectangle.left) / 2,
          badgeCenter: rectangle.left + rectangle.width / 2,
          numberJustification: numberStyle.justifyContent,
          numberTextAlignment: numberStyle.textAlign,
        };
      });
      assert.equal(result.hidden, false, viewport.name);
      assert.equal(result.value, '60', viewport.name);
      assert.ok(result.left >= 0, viewport.name);
      assert.ok(result.right <= result.innerWidth, viewport.name);
      assert.ok(result.scrollWidth <= result.innerWidth, viewport.name);
      assert.equal(result.reducedMotion, true, viewport.name);
      if (viewport.name === 'tablet' || viewport.name === 'mobile') {
        assert.ok(
          result.dateTop >= result.clockBottom,
          `${viewport.name}:date-below-clock`,
        );
        assert.ok(
          Math.abs(result.dateCenter - result.clockHorizontalCenter) <= 1,
          `${viewport.name}:date-clock-centering`,
        );
        assert.ok(
          Math.abs(result.clockCenter - result.bellCenter) <= 1,
          `${viewport.name}:bell-clock-alignment`,
        );
        assert.ok(
          result.iconNumberGap >= 0 && result.iconNumberGap <= 4.1,
          `${viewport.name}:bell-number-gap`,
        );
        assert.ok(
          Math.abs(result.clusterCenter - result.badgeCenter) <= 1,
          `${viewport.name}:bell-content-centering`,
        );
        assert.equal(result.numberJustification, 'center', viewport.name);
        assert.equal(result.numberTextAlignment, 'center', viewport.name);
      }

      await page.goto(
        `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(`${b407Date}T08:41:00Z`)}`,
        { waitUntil: 'domcontentloaded' },
      );
      const waterBreak = await page
        .locator('[data-header-water-break]')
        .evaluate((timer) => {
          const element = timer as HTMLElement;
          const value = timer.querySelector<HTMLElement>(
            '[data-water-break-value]',
          );
          if (value === null) throw new Error('water-break-value-missing');
          const rectangle = timer.getBoundingClientRect();
          return {
            hidden: element.hidden,
            value: value.textContent,
            valueFontSize: Number.parseFloat(getComputedStyle(value).fontSize),
            labelFontSize: Number.parseFloat(getComputedStyle(timer).fontSize),
            height: rectangle.height,
            left: rectangle.left,
            right: rectangle.right,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          };
        });
      assert.equal(waterBreak.hidden, false, viewport.name);
      assert.equal(waterBreak.value, '4:00', viewport.name);
      assert.ok(waterBreak.valueFontSize >= 56, viewport.name);
      assert.ok(waterBreak.labelFontSize >= 16, viewport.name);
      assert.ok(waterBreak.height >= 88, viewport.name);
      assert.ok(waterBreak.left >= 0, viewport.name);
      assert.ok(waterBreak.right <= waterBreak.innerWidth, viewport.name);
      assert.ok(waterBreak.scrollWidth <= waterBreak.innerWidth, viewport.name);
      await context.close();
    }
  } finally {
    await browser.close();
    await application.close();
  }
});

test('Coming Up animates only the localized course-art motif', async () => {
  const application = await startFixtureBackedMvp(
    {
      nodeEnv: 'test',
      logLevel: 'warn',
      host: '127.0.0.1',
      port: 0,
    },
    process.cwd(),
    { legacyRouteCompatibility: true },
  );
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    assertSupportedChromeVersion(browser.version());
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const context = await browser.newContext({
        viewport: { width: 1_920, height: 1_080 },
        reducedMotion,
      });
      const page = await context.newPage();
      await page.goto(
        `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(b407StateInstants.idle)}`,
        { waitUntil: 'domcontentloaded' },
      );
      const animation = await page
        .locator('.course-banner')
        .evaluate((art) => ({
          image: getComputedStyle(art.querySelector('img') as HTMLImageElement)
            .animationName,
          motif: getComputedStyle(art, '::before').animationName,
        }));
      assert.equal(animation.image, 'none', reducedMotion);
      assert.equal(
        animation.motif,
        reducedMotion === 'reduce' ? 'none' : 'course-motif-glimmer',
        reducedMotion,
      );
      const surfaces = await page
        .locator('.scene-coming-up')
        .evaluate((scene) => {
          const inspect = (selector: string) => {
            const element = scene.querySelector<HTMLElement>(selector);
            if (element === null)
              throw new Error(`coming-up-surface-missing:${selector}`);
            const style = getComputedStyle(element);
            return {
              backgroundColor: style.backgroundColor,
              backgroundImage: style.backgroundImage,
              borderWidth: style.borderTopWidth,
              boxShadow: style.boxShadow,
              backdropFilter: style.backdropFilter,
            };
          };
          return {
            panel: inspect('.coming-up-panel'),
            footer: inspect('.scene-countdown-footer'),
            countdown: inspect('.scene-countdown'),
          };
        });
      for (const [surface, style] of Object.entries(surfaces)) {
        assert.equal(style.backgroundColor, 'rgba(0, 0, 0, 0)', surface);
        assert.equal(style.backgroundImage, 'none', surface);
        assert.equal(style.borderWidth, '0px', surface);
        assert.equal(style.boxShadow, 'none', surface);
        assert.equal(style.backdropFilter, 'none', surface);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await application.close();
  }
});

function assertSupportedChromeVersion(version: string): void {
  const major = Number.parseInt(version.split('.')[0] ?? '', 10);
  assert.ok(
    Number.isInteger(major) && major >= minimumSupportedChromeMajor,
    `unsupported Chromium version ${version}`,
  );
}
