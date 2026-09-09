import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

import { startFixtureBackedMvp } from '../dist/app/mvp-server.js';

const expectedChrome = '150.0.7871.114';
const viewport = Object.freeze({ width: 1_920, height: 1_080 });
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(
  repositoryRoot,
  'docs',
  'assets',
  'homepage-demo',
  'animations',
);
const manifestPath = join(outputDirectory, 'manifest.json');
const ffmpeg = '/home/bren/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux';
const explainersOnly = process.argv.includes('--explainers-only');
const roboticsClassroomOnly = process.argv.includes(
  '--robotics-classroom-only',
);
const roboticsSplashOnly = process.argv.includes('--robotics-splash-only');

if (
  ![
    '--write',
    '--write --explainers-only',
    '--write --robotics-classroom-only',
    '--write --robotics-splash-only',
  ].includes(process.argv.slice(2).join(' '))
) {
  process.stderr.write('homepage-demo-animation-capture-usage-invalid\n');
  process.exitCode = 2;
} else {
  await capture();
}

async function capture() {
  mkdirSync(outputDirectory, { recursive: true });
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
      throw new Error('homepage-demo-animation-browser-drift');
    const clips = [];
    clips.push(
      await captureClip(browser, application.origin, {
        file: '00-how-it-works-highlight.webm',
        poster: '00-how-it-works-highlight-poster.png',
        label: 'How it works bullets highlighted with the narration',
        durationSeconds: 9.8,
        posterAtSeconds: 8.8,
        setup: async (page) => setupHowItWorksAnimation(page),
      }),
      await captureClip(browser, application.origin, {
        file: '00-screen-anatomy-tour.webm',
        poster: '00-screen-anatomy-tour-poster.png',
        label: 'Screen anatomy callouts with guided pan and zoom',
        durationSeconds: 12,
        posterAtSeconds: 11.7,
        setup: async (page, origin) =>
          setupScreenAnatomyAnimation(page, origin),
      }),
      await captureClip(browser, application.origin, {
        file: '01-coming-up-countdown.webm',
        poster: '01-coming-up-countdown-poster.png',
        label:
          'Web Design coming-up countdown enters minute-and-second precision',
        durationSeconds: 15,
        posterAtSeconds: 11,
        setup: async (page, origin) => {
          await openDisplay(page, origin, '2035-04-13T07:49:50Z', 'idle');
          await startLiveClock(page);
        },
      }),
      await captureClip(browser, application.origin, {
        file: '01b-robotics-coming-up-countdown.webm',
        poster: '01b-robotics-coming-up-countdown-poster.png',
        label: 'Robotics coming-up countdown reaches zero before class',
        durationSeconds: 4,
        posterAtSeconds: 2.9,
        setup: async (page, origin) => {
          await openDisplay(page, origin, '2035-04-13T09:50:00Z', 'post_end');
          await startAcceleratedComingUpCountdown(page, 2_000);
        },
      }),
      await captureClip(browser, application.origin, {
        file: '02-dismissal-countdown.webm',
        poster: '02-dismissal-countdown-poster.png',
        label: 'Robotics dismissal countdown with rapid final timing',
        durationSeconds: 11,
        posterAtSeconds: 5,
        setup: async (page, origin) => {
          await openDisplay(
            page,
            origin,
            '2035-04-13T10:59:49Z',
            'dismissal_warning',
          );
          await startLiveClock(page);
        },
      }),
      await captureClip(browser, application.origin, {
        file: '03-vocabulary-language-rotation.webm',
        poster: '03-vocabulary-language-rotation-poster.png',
        label: 'Vocabulary rotation through all configured languages',
        durationSeconds: 29,
        posterAtSeconds: 16,
        setup: async (page, origin) => {
          await openDisplay(
            page,
            origin,
            '2035-04-13T08:30:00Z',
            'in_class_content',
          );
          await page
            .locator('[data-carousel-dot="2"]')
            .evaluate((element) => element.click());
          await page
            .locator('[data-carousel-card]')
            .nth(2)
            .waitFor({ state: 'visible' });
        },
      }),
      await captureClip(browser, application.origin, {
        file: '04-classroom-assignment-reveal.webm',
        poster: '04-classroom-assignment-reveal-poster.png',
        label: 'Styled Classroom objective and assignment-detail reveal',
        durationSeconds: 9,
        posterAtSeconds: 7,
        setup: async (page, origin) => {
          await openDisplay(
            page,
            origin,
            '2035-04-13T08:30:00Z',
            'in_class_content',
          );
          await page.locator('[data-card-id="objective-b407-a"]').waitFor();
        },
      }),
      await captureClip(browser, application.origin, {
        file: '05-robotics-vocabulary-language-rotation.webm',
        poster: '05-robotics-vocabulary-language-rotation-poster.png',
        label: 'Robotics vocabulary rotation through all configured languages',
        durationSeconds: 29,
        posterAtSeconds: 16,
        setup: async (page, origin) => {
          await openDisplay(
            page,
            origin,
            '2035-04-13T10:30:00Z',
            'in_class_content',
          );
          await page
            .locator('[data-carousel-dot="2"]')
            .evaluate((element) => element.click());
          await page
            .locator('[data-carousel-card]')
            .nth(2)
            .waitFor({ state: 'visible' });
        },
      }),
      await captureClip(browser, application.origin, {
        file: '06-robotics-classroom-assignment-reveal.webm',
        poster: '06-robotics-classroom-assignment-reveal-poster.png',
        label: 'Robotics Google Classroom assignment and detail reveal',
        durationSeconds: 6,
        posterAtSeconds: 3,
        setup: async (page, origin) => {
          await openDisplay(
            page,
            origin,
            '2035-04-13T10:30:00Z',
            'in_class_content',
          );
          await page.locator('[data-card-id="objective-b407-b"]').waitFor();
          await page
            .locator('[data-card-id="coursework-b407-b"]')
            .evaluate((card) => {
              card.dataset.durationMs = '6000';
            });
          await page.locator('[data-carousel-dot="1"]').evaluate((element) => {
            window.setTimeout(() => element.click(), 500);
          });
        },
      }),
    );
    const recordedClips = clips.filter((clip) => clip !== null);
    const existingClips =
      explainersOnly || roboticsClassroomOnly || roboticsSplashOnly
        ? readExistingClips()
        : [];
    const recordedNames = new Set(recordedClips.map((clip) => clip.file));
    const manifestClips = [
      ...recordedClips,
      ...existingClips.filter((clip) => !recordedNames.has(clip.file)),
    ];
    const manifest = {
      version: 1,
      source:
        'live Chalkwright browser runtime over the synthetic B407 fixture',
      browser: `Google Chrome ${expectedChrome}`,
      recorder:
        'Playwright 1.62.0 with bundled FFmpeg n7.0.1-playwright-build-1011',
      viewport,
      format: 'WebM / VP8 / silent',
      clips: manifestClips,
    };
    writeAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(
      `${JSON.stringify({ status: 'captured', clips: recordedClips.length })}\n`,
    );
  } finally {
    await browser.close();
    await application.close();
  }
}

async function setupHowItWorksAnimation(page) {
  const logo = readFileSync(
    join(repositoryRoot, 'public', 'chalkwright.svg'),
    'utf8',
  )
    .replace(/<\?xml[^>]*>/u, '')
    .replace(/<!DOCTYPE[^>]*>/u, '');
  await page.setContent(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0}body{overflow:hidden;color:#f8fafc;background:#0f172a;font-family:ui-rounded,"Segoe UI",system-ui,sans-serif}.slide{position:relative;width:100%;height:100%;display:grid;grid-template-columns:1fr 1fr;gap:86px;align-items:center;padding:92px 128px;background:radial-gradient(circle at 13% 18%,rgba(56,189,248,.2),transparent 34rem),radial-gradient(circle at 87% 84%,rgba(251,146,60,.15),transparent 36rem),#0f172a}.mark{position:absolute;top:62px;left:76px;display:flex;align-items:center;gap:18px;font-size:26px;font-weight:750}.mark svg{width:54px;height:54px}.kicker{margin:0 0 24px;color:#7dd3fc;font-size:24px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{margin:0;font-size:76px;line-height:.98;letter-spacing:-.045em}p{max-width:800px;margin:34px 0 0;color:#cbd5e1;font-size:34px;line-height:1.35}.flow{display:grid;gap:24px}.step{display:grid;grid-template-columns:72px 1fr;align-items:center;gap:22px;padding:26px 28px;border:2px solid rgba(226,232,240,.14);border-radius:20px;background:rgba(15,23,42,.58);box-shadow:0 18px 50px rgba(2,6,23,.2);opacity:.42;transform:scale(.97);transition:opacity .42s ease,transform .42s ease,border-color .42s ease,background .42s ease,box-shadow .42s ease}.step strong{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;color:#082f49;background:#64748b;font-size:28px;transition:background .42s ease,box-shadow .42s ease}.step span{font-size:30px;font-weight:720}.step.active{opacity:1;transform:scale(1.035);border-color:#7dd3fc;background:rgba(8,47,73,.92);box-shadow:0 0 0 5px rgba(56,189,248,.14),0 24px 65px rgba(2,132,199,.28)}.step.active strong{background:#7dd3fc;box-shadow:0 0 28px rgba(125,211,252,.52)}.step.done{opacity:.78;transform:scale(1);border-color:rgba(125,211,252,.42)}.step.done strong{background:#38bdf8}.arrow{height:22px;margin:-13px 0 -13px 27px;border-left:4px dotted rgba(125,211,252,.35)}</style></head><body><main class="slide"><div class="mark">${logo}<span>ChalkWright</span></div><section><p class="kicker">How it works</p><h1>The right display,<br>at the right moment.</h1><p>ChalkWright combines the day’s schedule with teacher content, then advances the classroom screen automatically.</p></section><section class="flow"><div class="step"><strong>1</strong><span>Read today’s schedule</span></div><div class="arrow"></div><div class="step"><strong>2</strong><span>Bring in Google Classroom content</span></div><div class="arrow"></div><div class="step"><strong>3</strong><span>Choose the correct display state</span></div></section></main><script>const moments=[[700,1],[2500,2],[5600,3]];setTimeout(()=>{for(const [delay,index] of moments)setTimeout(()=>{document.querySelectorAll('.step').forEach((step,position)=>{step.classList.toggle('active',position===index-1);step.classList.toggle('done',position<index-1)})},delay)},350)</script></body></html>`,
    { waitUntil: 'load' },
  );
}

async function setupScreenAnatomyAnimation(page, origin) {
  await openDisplay(page, origin, '2035-04-13T08:30:00Z', 'in_class_content');
  await page.locator('[data-header-bell]:not([hidden])').waitFor();
  const regions = await measureScreenAnatomyRegions(page);
  const base = await page.screenshot({
    type: 'jpeg',
    quality: 90,
    animations: 'disabled',
    caret: 'hide',
  });
  const source = `data:image/jpeg;base64,${base.toString('base64')}`;
  await page.goto('about:blank');
  await page.setContent(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{width:100%;height:100%;margin:0;background:#020617;overflow:hidden;font-family:"Segoe UI",system-ui,sans-serif}
.stage{position:absolute;inset:0;width:1920px;height:1080px;transform-origin:0 0;transition:transform 1.05s cubic-bezier(.22,.78,.2,1)}
.stage>img{position:absolute;inset:0;width:1920px;height:1080px}
.overlay{position:absolute;inset:0;z-index:2;width:1920px;height:1080px;overflow:visible;pointer-events:none}
.focus,.line{opacity:0;transition:opacity .35s ease;vector-effect:non-scaling-stroke}
.focus{fill:rgba(8,47,73,.1);stroke:#7dd3fc;stroke-width:3;stroke-dasharray:11 8}
.line{stroke:#7dd3fc;stroke-width:4;stroke-linecap:round}
.bell-focus{fill:rgba(67,20,7,.1);stroke:#fb923c}
.bell-line{stroke:#fb923c}
.focus.visible,.line.visible{opacity:1}
.callout{position:absolute;z-index:3;padding:18px 24px;border:2px solid #7dd3fc;border-radius:18px;color:#f8fafc;background:#082f49;box-shadow:0 14px 38px rgba(2,6,23,.58);opacity:0;transform:translateY(18px);transition:opacity .45s ease,transform .45s ease}
.callout.visible{opacity:1;transform:translateY(0)}
.callout b{display:block;font-size:25px}
.callout span{display:block;margin-top:5px;color:#bae6fd;font-size:19px}
.logo{left:38px;top:162px;width:306px}
.class-name{left:588px;top:162px;width:344px}
.date-time{left:1078px;top:162px;width:365px}
.bell{left:1468px;top:276px;width:395px;border-color:#fb923c;background:#431407}
.bell span{color:#fed7aa}
</style></head><body><div class="stage"><img src="${source}" alt=""><svg class="overlay" viewBox="0 0 1920 1080" aria-hidden="true">${anatomyOutline('logo', regions.logo)}${anatomyLeader('logo', regions.logo, { left: 38, top: 162, width: 306 })}${anatomyOutline('class', regions.className)}${anatomyLeader('class', regions.className, { left: 588, top: 162, width: 344 })}${anatomyOutline('date', regions.dateTime)}${anatomyLeader('date', regions.dateTime, { left: 1078, top: 162, width: 365 })}${anatomyOutline('bell', regions.bell, true)}${anatomyLeader('bell', regions.bell, { left: 1468, top: 276, width: 395 }, true)}</svg><div class="callout logo" data-part="logo"><b>School logo area</b><span>Configured per installation</span></div><div class="callout class-name" data-part="class"><b>Current class</b><span>Course name and block</span></div><div class="callout date-time" data-part="date"><b>Current date and time</b><span>Always visible</span></div><div class="callout bell" data-part="bell"><b>Minutes to bell</b><span>Live countdown during class</span></div></div><script>const stage=document.querySelector('.stage');const scenes=[[3250,'logo','${anatomyTransform(regions.logo, 1.55)}'],[4700,'class','${anatomyTransform(regions.className, 1.52)}'],[5850,'date','${anatomyTransform(regions.dateTime, 1.52)}'],[7050,'bell','${anatomyTransform(regions.bell, 1.48)}']];setTimeout(()=>{for(const [delay,part,transform] of scenes)setTimeout(()=>{document.querySelectorAll('[data-part="'+part+'"]').forEach(node=>node.classList.add('visible'));stage.style.transform=transform},delay);setTimeout(()=>{stage.style.transitionDuration='.65s';stage.style.transform='translate(0,0) scale(1)'},10100)},350)</script></body></html>`,
    { waitUntil: 'load' },
  );
  await page.waitForFunction(() => {
    const image = document.querySelector('.stage > img');
    return (
      image instanceof HTMLImageElement &&
      image.complete &&
      image.naturalWidth > 0
    );
  });
}

async function measureScreenAnatomyRegions(page) {
  const definitions = {
    logo: {
      selector: '.brand-school img, .header-brand-slot',
      paddingX: 14,
      paddingY: 10,
    },
    className: {
      selector: '[data-course-label]',
      paddingX: 18,
      paddingY: 10,
    },
    dateTime: {
      selectors: ['[data-clock]', '[data-display-date]'],
      paddingX: 16,
      paddingY: 10,
    },
    bell: {
      selector: '[data-header-bell]:not([hidden])',
      paddingX: 13,
      paddingY: 10,
    },
  };
  const measured = {};
  for (const [name, definition] of Object.entries(definitions)) {
    const selectors = definition.selectors ?? [definition.selector];
    let boxes = (
      await Promise.all(
        selectors.map((selector) => page.locator(selector).boundingBox()),
      )
    ).filter((bounds) => bounds !== null);
    if (boxes.length === 0)
      throw new Error(`homepage-demo-anatomy-region-missing:${name}`);
    if (name === 'logo' && boxes[0].height < 1) {
      const header = await page.locator('.display-header').boundingBox();
      if (header === null)
        throw new Error('homepage-demo-anatomy-region-missing:header');
      boxes = [
        {
          ...boxes[0],
          y: header.y + 16,
          height: header.height - 32,
        },
      ];
    }
    const left = Math.min(...boxes.map((bounds) => bounds.x));
    const top = Math.min(...boxes.map((bounds) => bounds.y));
    const right = Math.max(...boxes.map((bounds) => bounds.x + bounds.width));
    const bottom = Math.max(...boxes.map((bounds) => bounds.y + bounds.height));
    measured[name] = {
      x: Math.round(left - definition.paddingX),
      y: Math.round(top - definition.paddingY),
      width: Math.round(right - left + definition.paddingX * 2),
      height: Math.round(bottom - top + definition.paddingY * 2),
    };
  }
  return measured;
}

function anatomyOutline(part, region, bell = false) {
  return `<rect class="focus${bell ? ' bell-focus' : ''}" data-part="${part}" x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}" rx="16" ry="16"></rect>`;
}

function anatomyLeader(part, region, callout, bell = false) {
  const startX = Math.round(region.x + region.width / 2);
  const startY = Math.round(region.y + region.height);
  const endX = Math.round(callout.left + callout.width / 2);
  return `<line class="line${bell ? ' bell-line' : ''}" data-part="${part}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${callout.top}"></line>`;
}

function anatomyTransform(region, scale) {
  const centerX = Math.round(region.x + region.width / 2);
  const centerY = Math.round(region.y + region.height / 2);
  return `translate(960px,420px) scale(${scale}) translate(-${centerX}px,-${centerY}px)`;
}

async function startHighQualityScreencast(page, recordingDirectory) {
  const session = await page.context().newCDPSession(page);
  const frames = [];
  let sequence = 0;
  session.on('Page.screencastFrame', (event) => {
    const capturedAt = performance.now();
    const framePath = join(
      recordingDirectory,
      `frame-${String(sequence).padStart(6, '0')}.jpg`,
    );
    sequence += 1;
    writeFileSync(framePath, Buffer.from(event.data, 'base64'));
    frames.push({ capturedAt, framePath });
    void session.send('Page.screencastFrameAck', {
      sessionId: event.sessionId,
    });
  });
  await session.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 100,
    maxWidth: viewport.width,
    maxHeight: viewport.height,
    everyNthFrame: 1,
  });
  return {
    async stop() {
      await session.send('Page.stopScreencast');
      await page.waitForTimeout(100);
      await session.detach();
      return frames;
    },
  };
}

function selectScreencastFrames(frames, clipStartedAt, durationSeconds) {
  if (frames.length === 0)
    throw new Error('homepage-demo-animation-screencast-empty');
  const frameDuration = 1 / 30;
  const targetCount = Math.ceil(durationSeconds / frameDuration);
  const selected = [];
  let sourceIndex = 0;
  for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
    const targetAt = clipStartedAt + targetIndex * frameDuration * 1_000;
    while (
      sourceIndex + 1 < frames.length &&
      frames[sourceIndex + 1].capturedAt <= targetAt
    )
      sourceIndex += 1;
    selected.push(frames[sourceIndex]);
  }
  return selected;
}

async function encodeScreencastFrames(frames, durationSeconds, temporaryPath) {
  const encoder = spawn(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      '30',
      '-vcodec',
      'mjpeg',
      '-i',
      'pipe:0',
      '-t',
      String(durationSeconds),
      '-an',
      '-c:v',
      'libvpx',
      '-crf',
      '4',
      '-b:v',
      '8M',
      '-deadline',
      'good',
      '-cpu-used',
      '2',
      '-threads',
      '8',
      '-screen-content-mode',
      '1',
      '-sharpness',
      '5',
      '-r',
      '30',
      temporaryPath,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] },
  );
  const errors = [];
  encoder.stderr.on('data', (chunk) => errors.push(chunk));
  for (const frame of frames) {
    if (!encoder.stdin.write(readFileSync(frame.framePath)))
      await once(encoder.stdin, 'drain');
  }
  encoder.stdin.end();
  const [code] = await once(encoder, 'close');
  if (code !== 0)
    throw new Error(
      `homepage-demo-animation-encode-failed:${Buffer.concat(errors).toString('utf8').trim()}`,
    );
}

async function captureClip(browser, origin, options) {
  if (explainersOnly && !options.file.startsWith('00-')) return null;
  if (
    roboticsClassroomOnly &&
    options.file !== '06-robotics-classroom-assignment-reveal.webm'
  )
    return null;
  if (
    roboticsSplashOnly &&
    options.file !== '01b-robotics-coming-up-countdown.webm'
  )
    return null;
  const recordingDirectory = mkdtempSync(
    join(tmpdir(), 'chalkwright-homepage-animation-'),
  );
  const context = await browser.newContext({
    viewport,
    reducedMotion: 'no-preference',
  });
  try {
    const page = await context.newPage();
    const screencast = await startHighQualityScreencast(
      page,
      recordingDirectory,
    );
    const failures = [];
    page.on('console', (message) => {
      if (message.type() === 'error')
        failures.push(`console:${message.text()}`);
    });
    page.on('pageerror', (error) => failures.push(`page:${error.message}`));
    await options.setup(page, origin);
    await page.waitForTimeout(250);
    const clipStartedAt = performance.now();
    await page.waitForTimeout(options.durationSeconds * 1000);
    const frames = await screencast.stop();
    if (failures.length > 0)
      throw new Error(
        `homepage-demo-animation-page-errors:${failures.join('|')}`,
      );
    await context.close();
    const finalPath = join(outputDirectory, options.file);
    const temporaryPath = `${finalPath}.tmp.webm`;
    const selectedFrames = selectScreencastFrames(
      frames,
      clipStartedAt,
      options.durationSeconds,
    );
    await encodeScreencastFrames(
      selectedFrames,
      options.durationSeconds,
      temporaryPath,
    );
    renameSync(temporaryPath, finalPath);
    const posterPath = join(outputDirectory, options.poster);
    const temporaryPoster = `${posterPath}.tmp.png`;
    execFileSync(ffmpeg, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      String(options.posterAtSeconds),
      '-i',
      finalPath,
      '-frames:v',
      '1',
      temporaryPoster,
    ]);
    renameSync(temporaryPoster, posterPath);
    return {
      file: options.file,
      poster: options.poster,
      label: options.label,
      durationSeconds: options.durationSeconds,
      sha256: createHash('sha256')
        .update(readFileSync(finalPath))
        .digest('hex'),
    };
  } finally {
    await context.close().catch(() => undefined);
    rmSync(recordingDirectory, { recursive: true, force: true });
  }
}

function readExistingClips() {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return Array.isArray(manifest.clips) ? manifest.clips : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function openDisplay(page, origin, instant, state) {
  const response = await page.goto(
    `${origin}/classroom-screen/preview/b407?view=display&now=${encodeURIComponent(instant)}`,
    { waitUntil: 'networkidle' },
  );
  if (response?.status() !== 200)
    throw new Error(`homepage-demo-animation-${state}-response-invalid`);
  await page.locator(`body.state-${state}`).waitFor();
}

async function startLiveClock(page) {
  await page.locator('[data-display-root]').evaluate((root) => {
    root.removeAttribute('data-pinned-at');
  });
}

async function startAcceleratedComingUpCountdown(page, durationMs) {
  await page.locator('[data-display-root]').evaluate((root, duration) => {
    const evaluatedAt = Date.parse(root.dataset.evaluatedAt ?? '');
    const timeZone = root.dataset.timeZone ?? 'Etc/UTC';
    const countdowns = [...document.querySelectorAll('[data-countdown-target]')]
      .map((countdown) => ({
        countdown,
        target: Date.parse(countdown.dataset.countdownTarget ?? ''),
        value: countdown.querySelector('[data-countdown-value]'),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.target) && item.value instanceof HTMLElement,
      );
    const finalTarget = Math.max(...countdowns.map((item) => item.target));
    if (!Number.isFinite(evaluatedAt) || !Number.isFinite(finalTarget))
      throw new Error('homepage-demo-accelerated-countdown-invalid');
    const clock = document.querySelector('[data-clock]');
    window.setTimeout(() => {
      const startedAt = performance.now();
      const update = () => {
        const progress = Math.min(
          1,
          (performance.now() - startedAt) / duration,
        );
        const now = evaluatedAt + (finalTarget - evaluatedAt) * progress;
        for (const item of countdowns) {
          const remaining = Math.max(0, item.target - now);
          const totalSeconds = Math.ceil(remaining / 1_000);
          const hours = Math.floor(totalSeconds / 3_600);
          const minutes = Math.floor((totalSeconds % 3_600) / 60);
          const seconds = totalSeconds % 60;
          item.value.textContent =
            hours > 0
              ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
              : `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
        if (clock instanceof HTMLElement)
          clock.textContent = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(now));
      };
      update();
      window.setInterval(update, 33);
    }, 350);
  }, durationMs);
}

function writeAtomic(path, content) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, content, 'utf8');
  renameSync(temporary, path);
}
