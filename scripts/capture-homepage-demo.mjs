import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

import { startFixtureBackedMvp } from '../dist/app/mvp-server.js';
import { b407StateInstants } from '../dist/infrastructure/fixture/b407.js';

const expectedChrome = '150.0.7871.114';
const viewport = Object.freeze({ width: 1_920, height: 1_080 });
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(repositoryRoot, 'docs', 'assets', 'homepage-demo');
const manifestPath = join(outputDirectory, 'manifest.json');

if (process.argv.slice(2).join(' ') !== '--write') {
  process.stderr.write('homepage-demo-capture-usage-invalid\n');
  process.exitCode = 2;
} else {
  await capture();
}

function shell(content) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0}body{overflow:hidden;color:#f8fafc;background:#0f172a;font-family:ui-rounded,"Segoe UI",system-ui,sans-serif}
  .slide{position:relative;width:100%;height:100%;display:grid;align-content:center;padding:92px 128px;background:radial-gradient(circle at 13% 18%,rgba(56,189,248,.2),transparent 34rem),radial-gradient(circle at 87% 84%,rgba(251,146,60,.15),transparent 36rem),#0f172a}
  .mark{position:absolute;top:62px;left:76px;display:flex;align-items:center;gap:18px;font-size:26px;font-weight:750;letter-spacing:.01em}.mark svg{width:54px;height:54px}
  .kicker{margin:0 0 24px;color:#7dd3fc;font-size:24px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
  h1{max-width:1420px;margin:0;font-size:104px;line-height:.98;letter-spacing:-.045em}p{max-width:1260px;margin:34px 0 0;color:#cbd5e1;font-size:34px;line-height:1.35}
  .rule{width:164px;height:8px;margin-top:48px;border-radius:99px;background:linear-gradient(90deg,#38bdf8,#fb923c)}
  .overview{grid-template-columns:1fr 1fr;gap:86px;align-items:center}.overview h1{font-size:76px}.flow{display:grid;gap:20px}.step{display:grid;grid-template-columns:72px 1fr;align-items:center;gap:22px;padding:22px 28px;border:1px solid rgba(226,232,240,.22);border-radius:20px;background:rgba(15,23,42,.82);box-shadow:0 18px 50px rgba(2,6,23,.28)}.step strong{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;color:#082f49;background:#7dd3fc;font-size:28px}.step span{font-size:30px;font-weight:720}.arrow{height:18px;margin:-13px 0 -13px 27px;border-left:4px dotted rgba(125,211,252,.55)}
  .close{text-align:center;justify-items:center}.close h1{font-size:104px}.close p{font-size:34px}.repository{display:flex;align-items:center;gap:24px;margin-top:42px;padding:18px 30px 18px 20px;border:1px solid rgba(125,211,252,.5);border-radius:22px;color:#e0f2fe;background:rgba(8,47,73,.62);text-align:left}.repository img{width:82px;height:82px;border-radius:50%;background:#fff}.repository span{display:block;margin-bottom:7px;color:#7dd3fc;font-size:18px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.repository strong{display:block;font-size:28px;font-weight:760;letter-spacing:-.015em}
</style></head><body>${content}</body></html>`;
}

function mark(svg) {
  return `<div class="mark">${svg}<span>ChalkWright</span></div>`;
}

async function capture() {
  const logo = readFileSync(
    join(repositoryRoot, 'public', 'chalkwright.svg'),
    'utf8',
  )
    .replace(/<\?xml[^>]*>/u, '')
    .replace(/<!DOCTYPE[^>]*>/u, '');
  const githubMark = readFileSync(
    join(outputDirectory, 'github-mark.png'),
  ).toString('base64');
  const application = await startFixtureBackedMvp(
    { nodeEnv: 'test', logLevel: 'warn', host: '127.0.0.1', port: 0 },
    repositoryRoot,
    { legacyRouteCompatibility: true },
  );
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });
  try {
    if (browser.version() !== expectedChrome)
      throw new Error('homepage-demo-capture-browser-drift');
    mkdirSync(outputDirectory, { recursive: true });
    const context = await browser.newContext({
      viewport,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const failures = [];
    page.on('console', (message) => {
      if (message.type() === 'error')
        failures.push(`console:${message.text()}`);
    });
    page.on('pageerror', (error) => failures.push(`page:${error.message}`));
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`http:${response.status()}`);
    });

    const frames = [];
    unlinkDeprecatedFrame('06-in-class-content.png');
    unlinkDeprecatedFrame('06c-web-design-vocabulary.png');
    unlinkDeprecatedFrame('06f-robotics-vocabulary.png');
    await setSlide(
      page,
      shell(
        `<main class="slide">${mark(logo)}<p class="kicker">The classroom display that runs itself</p><h1>One school day,<br>automatically orchestrated.</h1><div class="rule"></div></main>`,
      ),
    );
    await screenshot(page, frames, '01-opening.png', 'Opening title');

    await setSlide(
      page,
      shell(
        `<main class="slide overview">${mark(logo)}<section><p class="kicker">How it works</p><h1>The right display,<br>at the right moment.</h1><p>ChalkWright combines the day’s schedule with teacher content, then advances the classroom screen automatically.</p></section><section class="flow" aria-label="System overview"><div class="step"><strong>1</strong><span>Read today’s schedule</span></div><div class="arrow"></div><div class="step"><strong>2</strong><span>Bring in Google Classroom content</span></div><div class="arrow"></div><div class="step"><strong>3</strong><span>Choose the correct display state</span></div></section></main>`,
      ),
    );
    await screenshot(page, frames, '02-overview.png', 'System overview');

    await captureScreenAnatomy(page, application.origin, frames);

    const states = [
      ['day_complete', '03-tomorrow.png', 'Tomorrow schedule'],
      ['morning_overview', '04-todays-schedule.png', "Today's schedule"],
      ['idle', '05-coming-up.png', 'Coming up'],
    ];
    for (const [state, file, label] of states) {
      const now = b407StateInstants[state];
      const response = await page.goto(
        `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(now)}`,
        { waitUntil: 'networkidle' },
      );
      if (response?.status() !== 200)
        throw new Error(`homepage-demo-${state}-response-invalid`);
      await page.locator(`body.state-${state}`).waitFor();
      if (state === 'day_complete') {
        await page
          .locator('.next-day-schedule .eyebrow')
          .evaluate((element) => {
            element.textContent = 'Tomorrow';
          });
        await page.locator('[data-display-date]').evaluate((element) => {
          element.textContent = 'Sunday, April 15';
        });
      }
      await screenshot(page, frames, file, label, state, now);
    }

    await captureCarouselSequence(page, application.origin, frames, {
      instant: b407StateInstants.in_class_content,
      course: 'Web Design',
      frames: [
        {
          file: '06a-web-design-objective.png',
          label: 'Web Design: objective',
          cardIndex: 0,
        },
        {
          file: '06b-web-design-assignment.png',
          label: 'Web Design: assignment',
          cardIndex: 1,
        },
        {
          file: '06c1-web-design-vocabulary-vietnamese.png',
          label: 'Web Design vocabulary: Vietnamese',
          cardIndex: 2,
          faceIndex: 0,
        },
        {
          file: '06c2-web-design-vocabulary-korean.png',
          label: 'Web Design vocabulary: Korean',
          cardIndex: 2,
          faceIndex: 1,
        },
        {
          file: '06c3-web-design-vocabulary-chinese.png',
          label: 'Web Design vocabulary: Chinese',
          cardIndex: 2,
          faceIndex: 2,
        },
      ],
    });
    await captureRoboticsComingUp(page, application.origin, frames);
    await captureCarouselSequence(page, application.origin, frames, {
      instant: '2035-04-13T10:00:00Z',
      course: 'Robotics',
      frames: [
        {
          file: '06d-robotics-objective.png',
          label: 'Robotics: objective',
          cardIndex: 0,
        },
        {
          file: '06e-robotics-assignment.png',
          label: 'Robotics: assignment',
          cardIndex: 1,
        },
        {
          file: '06f1-robotics-vocabulary-vietnamese.png',
          label: 'Robotics vocabulary: Vietnamese',
          cardIndex: 2,
          faceIndex: 0,
        },
        {
          file: '06f2-robotics-vocabulary-korean.png',
          label: 'Robotics vocabulary: Korean',
          cardIndex: 2,
          faceIndex: 1,
        },
        {
          file: '06f3-robotics-vocabulary-chinese.png',
          label: 'Robotics vocabulary: Chinese',
          cardIndex: 2,
          faceIndex: 2,
        },
      ],
    });

    const dismissalAt = b407StateInstants.dismissal_warning;
    const dismissalResponse = await page.goto(
      `${application.origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(dismissalAt)}`,
      { waitUntil: 'networkidle' },
    );
    if (dismissalResponse?.status() !== 200)
      throw new Error('homepage-demo-dismissal-response-invalid');
    await page.locator('body.state-dismissal_warning').waitFor();
    await screenshot(
      page,
      frames,
      '07-dismissal-soon.png',
      'Dismissal soon',
      'dismissal_warning',
      dismissalAt,
    );

    await setSlide(
      page,
      shell(
        `<main class="slide close">${mark(logo)}<p class="kicker">Less screen management. More teaching.</p><h1>ChalkWright</h1><p>Free, open-source software under the Apache License 2.0.</p><div class="repository"><img src="data:image/png;base64,${githubMark}" alt=""><div><span>Official repository</span><strong>github.com/w9smz8qkh6-stack/chalkwright</strong></div></div></main>`,
      ),
    );
    await screenshot(page, frames, '08-closing.png', 'Closing frame');

    if (failures.length > 0)
      throw new Error(`homepage-demo-capture-errors:${failures.join('|')}`);
    const manifest = {
      version: 1,
      source:
        'repository-owned synthetic B407 fixture, Chalkwright brand assets, and the approved landing-page GitHub mark',
      browser: `Google Chrome ${expectedChrome}`,
      viewport,
      reducedMotion: true,
      note: 'The Tomorrow label demonstrates the valid next-class-day variant using the day-complete layout. Vocabulary frames show the native ten-second rotation through Vietnamese, Korean, and Simplified Chinese. The closing frame uses the approved landing-page GitHub mark to identify the canonical repository.',
      closingRepository: {
        url: 'https://github.com/w9smz8qkh6-stack/chalkwright',
        githubMarkSha256: createHash('sha256')
          .update(Buffer.from(githubMark, 'base64'))
          .digest('hex'),
      },
      frames,
    };
    writeAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(
      `${JSON.stringify({ status: 'captured', frames: frames.length })}\n`,
    );
    await context.close();
  } finally {
    await browser.close();
    await application.close();
  }
}

async function captureRoboticsComingUp(page, origin, frames) {
  const instant = '2035-04-13T09:50:00Z';
  const response = await page.goto(
    `${origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(instant)}`,
    { waitUntil: 'networkidle' },
  );
  if (response?.status() !== 200)
    throw new Error('homepage-demo-robotics-coming-up-response-invalid');
  await page.locator('body.state-post_end').waitFor();
  const title = (await page.locator('h1').textContent()) ?? '';
  if (!title.includes('Robotics'))
    throw new Error('homepage-demo-robotics-coming-up-course-invalid');
  await screenshot(
    page,
    frames,
    '06d0-robotics-coming-up.png',
    'Robotics: next class',
    'post_end',
    instant,
  );
}

async function captureScreenAnatomy(page, origin, frames) {
  const instant = '2035-04-13T08:30:00Z';
  const response = await page.goto(
    `${origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(instant)}`,
    { waitUntil: 'networkidle' },
  );
  if (response?.status() !== 200)
    throw new Error('homepage-demo-screen-anatomy-response-invalid');
  await page.locator('body.state-in_class_content').waitFor();
  await page.locator('[data-header-bell]:not([hidden])').waitFor();
  await page.evaluate(() => {
    const annotation = document.createElement('div');
    annotation.setAttribute('data-demo-annotation', '');
    annotation.setAttribute('aria-hidden', 'true');
    annotation.innerHTML = `<svg viewBox="0 0 1920 1080" width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#020617" flood-opacity=".55"/></filter></defs>
      <rect x="28" y="16" width="250" height="76" rx="14" fill="none" stroke="#7dd3fc" stroke-width="3" stroke-dasharray="10 8"/>
      <g fill="none" stroke="#7dd3fc" stroke-width="4" stroke-linecap="round"><path d="M190 164 L152 92"/><path d="M760 164 L958 92"/><path d="M1260 164 L1640 83"/><path d="M1690 278 L1818 79"/></g>
      <g fill="#7dd3fc"><circle cx="152" cy="92" r="7"/><circle cx="958" cy="92" r="7"/><circle cx="1640" cy="83" r="7"/><circle cx="1818" cy="79" r="7"/></g>
      <g filter="url(#shadow)">
        <rect x="40" y="164" width="300" height="86" rx="18" fill="#082f49" stroke="#7dd3fc" stroke-width="2"/>
        <rect x="590" y="164" width="340" height="86" rx="18" fill="#082f49" stroke="#7dd3fc" stroke-width="2"/>
        <rect x="1080" y="164" width="360" height="86" rx="18" fill="#082f49" stroke="#7dd3fc" stroke-width="2"/>
        <rect x="1470" y="278" width="390" height="102" rx="18" fill="#431407" stroke="#fb923c" stroke-width="2"/>
      </g>
      <g fill="#f8fafc" font-family="Segoe UI,system-ui,sans-serif" font-weight="700">
        <text x="66" y="201" font-size="25">School logo area</text><text x="66" y="231" font-size="19" fill="#bae6fd">Configured per installation</text>
        <text x="616" y="201" font-size="25">Current class</text><text x="616" y="231" font-size="19" fill="#bae6fd">Course name and block</text>
        <text x="1106" y="201" font-size="25">Current date and time</text><text x="1106" y="231" font-size="19" fill="#bae6fd">Always visible</text>
        <text x="1498" y="318" font-size="27">Minutes to bell</text><text x="1498" y="351" font-size="20" fill="#fed7aa">Live countdown during class</text>
      </g>
    </svg>`;
    Object.assign(annotation.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '100',
      pointerEvents: 'none',
    });
    document.body.append(annotation);
  });
  await screenshot(
    page,
    frames,
    '02a-screen-anatomy.png',
    'Classroom screen anatomy',
    'in_class_content',
    instant,
  );
}

async function captureCarouselSequence(page, origin, frames, options) {
  const response = await page.goto(
    `${origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(options.instant)}`,
    { waitUntil: 'networkidle' },
  );
  if (response?.status() !== 200)
    throw new Error(`homepage-demo-${options.course}-response-invalid`);
  await page.locator('body.state-in_class_content').waitFor();
  await page.locator('[data-carousel]').waitFor();
  const header =
    (await page.locator('[data-course-label]').textContent()) ?? '';
  if (!header.startsWith(options.course))
    throw new Error(`homepage-demo-${options.course}-course-invalid`);
  let selectedCard = 0;
  for (const frame of options.frames) {
    if (frame.cardIndex !== selectedCard) {
      await page
        .locator(`[data-carousel-dot="${frame.cardIndex}"]`)
        .evaluate((element) => element.click());
      selectedCard = frame.cardIndex;
    }
    await page
      .locator('[data-carousel-card]')
      .nth(frame.cardIndex)
      .waitFor({ state: 'visible' });
    const selected = await page
      .locator(`[data-carousel-dot="${frame.cardIndex}"]`)
      .getAttribute('aria-selected');
    if (selected !== 'true')
      throw new Error(`homepage-demo-${options.course}-card-invalid`);
    await page.locator('[data-carousel-card]').evaluateAll((cards, active) => {
      cards.forEach((card, cardIndex) => {
        card.hidden = cardIndex !== active;
        card.classList.remove('carousel-leaving');
      });
    }, frame.cardIndex);
    if (frame.faceIndex !== undefined) {
      const card = page.locator('[data-carousel-card]').nth(frame.cardIndex);
      await card
        .locator('[data-vocabulary-face]')
        .evaluateAll((faces, active) => {
          faces.forEach((face, faceIndex) => {
            face.classList.toggle('is-active', faceIndex === active);
            face.classList.remove('is-leaving');
            face.setAttribute('aria-hidden', String(faceIndex !== active));
          });
        }, frame.faceIndex);
    }
    await screenshot(
      page,
      frames,
      frame.file,
      frame.label,
      'in_class_content',
      options.instant,
    );
  }
}

function unlinkDeprecatedFrame(file) {
  try {
    unlinkSync(join(outputDirectory, file));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

async function setSlide(page, html) {
  await page.goto('about:blank');
  await page.setContent(html, { waitUntil: 'load' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function screenshot(page, frames, file, label, state, instant) {
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  if (
    layout.width !== viewport.width ||
    layout.height !== viewport.height ||
    layout.scrollWidth > viewport.width ||
    layout.scrollHeight > viewport.height
  )
    throw new Error(
      `homepage-demo-${file}-layout-invalid:${JSON.stringify(layout)}`,
    );
  const path = join(outputDirectory, file);
  const temporary = `${path}.tmp`;
  await page.screenshot({
    path: temporary,
    type: 'png',
    animations: 'disabled',
    caret: 'hide',
  });
  renameSync(temporary, path);
  const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
  frames.push({
    file,
    label,
    ...(state === undefined ? {} : { state, instant }),
    sha256,
  });
}

function writeAtomic(path, content) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, content, 'utf8');
  renameSync(temporary, path);
}
