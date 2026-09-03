import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

class ClassList implements Iterable<string> {
  private readonly values = new Set<string>();

  constructor(...values: string[]) {
    for (const value of values) this.values.add(value);
  }

  add(value: string): void {
    this.values.add(value);
  }

  remove(value: string): void {
    this.values.delete(value);
  }

  [Symbol.iterator](): Iterator<string> {
    return this.values[Symbol.iterator]();
  }
}

function clientHarness(options: {
  readonly targetUrl: string;
  readonly pinnedAt?: string;
  readonly payload?: unknown;
  readonly payloads?: readonly (unknown | Error)[];
}) {
  const root = {
    dataset: {
      targetUrl: options.targetUrl,
      timeZone: 'Etc/UTC',
      state: 'in_class_content',
      evaluatedAt: '2035-04-13T08:00:00Z',
      ...(options.pinnedAt === undefined ? {} : { pinnedAt: options.pinnedAt }),
    },
  };
  let mainHtml = '';
  let mainHtmlWrites = 0;
  const main = {
    get innerHTML() {
      return mainHtml;
    },
    set innerHTML(value: string) {
      mainHtml = value;
      mainHtmlWrites += 1;
    },
  };
  const clock = { dateTime: '', textContent: '' };
  const bellNumber = { textContent: '' };
  const bellAttributes = new Map<string, string>();
  const bell = {
    hidden: true,
    dataset: {} as { bellTarget?: string },
    classList: new ClassList(),
    isConnected: true,
    setAttribute(name: string, value: string) {
      bellAttributes.set(name, value);
    },
    getAttribute(name: string) {
      return bellAttributes.get(name);
    },
    querySelector(selector: string) {
      return selector === '[data-header-bell-number]' ? bellNumber : undefined;
    },
  };
  const waterBreakValue = { textContent: '' };
  const waterBreakAttributes = new Map<string, string>();
  const waterBreak = {
    hidden: true,
    dataset: {} as { waterBreakStart?: string; waterBreakEnd?: string },
    setAttribute(name: string, value: string) {
      waterBreakAttributes.set(name, value);
    },
    getAttribute(name: string) {
      return waterBreakAttributes.get(name);
    },
    querySelector(selector: string) {
      return selector === '[data-water-break-value]'
        ? waterBreakValue
        : undefined;
    },
  };
  const classChime = {
    dataset: {} as { classStart?: string; classEnd?: string },
  };
  const countdownValue = { textContent: '' };
  const countdown = {
    dataset: {} as {
      countdownTarget?: string;
      countdownSecondsThreshold?: string;
      countdownSubsecondsThreshold?: string;
      countdownRapid?: string;
    },
    querySelector(selector: string) {
      return selector === '[data-countdown-value]' ? countdownValue : undefined;
    },
  };
  function tone() {
    let playCalls = 0;
    let pauseCalls = 0;
    return {
      currentTime: -1,
      readyState: 4,
      play() {
        playCalls += 1;
        return Promise.resolve();
      },
      pause() {
        pauseCalls += 1;
      },
      playCalls: () => playCalls,
      pauseCalls: () => pauseCalls,
    };
  }
  const waterBreakStartTone = tone();
  const waterBreakEndTone = tone();
  const dateLabel = { textContent: 'Friday, April 13' };
  const connectionStatus = { hidden: true };
  const body = {
    classList: new ClassList('display-page', 'state-in_class_content'),
  };
  let fetchCalls = 0;
  let fakeNow = Date.parse('2026-08-08T12:00:00Z');
  class FakeDate extends Date {
    constructor(value?: string | number | Date) {
      super(value === undefined ? fakeNow : value.valueOf());
    }

    static override now(): number {
      return fakeNow;
    }
  }
  const document = {
    title: 'Web Design · A — Chalkwright',
    body,
    hidden: false,
    addEventListener(type: string, callback: () => unknown) {
      documentListeners.set(type, callback);
    },
    querySelector(selector: string) {
      if (selector === '[data-display-root]') return root;
      if (selector === '#presentation-bootstrap')
        return {
          textContent: JSON.stringify({
            meetingId: 'meeting-b407-a',
            timeZone: 'Etc/UTC',
          }),
        };
      if (selector === '#display-main') return main;
      if (selector === '[data-display-date]') return dateLabel;
      if (selector === '[data-connection-status]') return connectionStatus;
      if (selector === '[data-header-bell]') return bell;
      if (selector === '[data-header-water-break]') return waterBreak;
      if (selector === '[data-class-chime]') return classChime;
      if (selector === '[data-water-break-start-tone]')
        return waterBreakStartTone;
      if (selector === '[data-water-break-end-tone]') return waterBreakEndTone;
      return undefined;
    },
    querySelectorAll(selector: string) {
      if (selector === '[data-clock]') return [clock];
      if (selector === '[data-countdown-target]') return [countdown];
      return [];
    },
  };
  const documentListeners = new Map<string, () => unknown>();
  let timerId = 0;
  const timers = new Map<number, { callback: () => unknown; delay: number }>();
  let intervalCallback: (() => unknown) | undefined;
  const windowListeners = new Map<string, () => unknown>();
  const window = {
    location: { origin: 'http://127.0.0.1:4317' },
    setInterval(callback: () => unknown) {
      intervalCallback = callback;
      return ++timerId;
    },
    setTimeout(callback: () => unknown, delay: number) {
      timerId += 1;
      if (delay === 0) queueMicrotask(callback);
      else timers.set(timerId, { callback, delay });
      return timerId;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
    requestAnimationFrame(callback: () => unknown) {
      callback();
      return ++timerId;
    },
    addEventListener(type: string, callback: () => unknown) {
      windowListeners.set(type, callback);
    },
    prompt: () => '',
  };
  const context = {
    AbortController,
    Date: FakeDate,
    FormData,
    Intl,
    JSON,
    Math,
    Number,
    Object,
    String,
    URL,
    document,
    window,
    fetch: async () => {
      const index = fetchCalls++;
      const value = options.payloads?.[index] ?? options.payload;
      if (value instanceof Error) throw value;
      return {
        ok: true,
        json: async () => value,
      };
    },
    queueMicrotask,
  };
  vm.runInNewContext(
    readFileSync('dist/client/display-client.js', 'utf8'),
    context,
  );
  return {
    root,
    main,
    clock,
    bell,
    bellNumber,
    bellAttributes,
    waterBreak,
    waterBreakValue,
    waterBreakAttributes,
    classChime,
    countdown,
    countdownValue,
    waterBreakStartTone,
    waterBreakEndTone,
    dateLabel,
    connectionStatus,
    document,
    body,
    fetchCalls: () => fetchCalls,
    mainHtmlWrites: () => mainHtmlWrites,
    advance(milliseconds: number) {
      fakeNow += milliseconds;
    },
    tickClock() {
      intervalCallback?.();
    },
    resumeFromLifecycle(type: 'focus' | 'pageshow' | 'visibilitychange') {
      if (type === 'visibilitychange') document.hidden = false;
      (type === 'visibilitychange'
        ? documentListeners.get(type)
        : windowListeners.get(type))?.();
    },
    interruptLifecycle(type: 'blur' | 'pagehide' | 'visibilitychange') {
      if (type === 'visibilitychange') document.hidden = true;
      (type === 'visibilitychange'
        ? documentListeners.get(type)
        : windowListeners.get(type))?.();
    },
    async runTimeout(delay: number) {
      const selected = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(selected);
      timers.delete(selected[0]);
      await selected[1].callback();
    },
  };
}

test('client applies cross-day state, labels, title, and degraded status after polling', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-b407',
    payload: {
      presentationHtml: '<section>Dismissal</section>',
      state: 'dismissal_warning',
      meetingId: 'meeting-b407-a',
      courseLabel: 'Web Design · A',
      dateLabel: 'Saturday, April 14',
      documentTitle: 'Synthetic Computing · B — Chalkwright',
      degraded: true,
      evaluatedAt: '2035-04-14T08:02:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.fetchCalls(), 1);
  assert.equal(harness.root.dataset.state, 'dismissal_warning');
  assert.deepEqual(
    [...harness.body.classList],
    ['display-page', 'state-dismissal_warning'],
  );
  assert.equal(harness.main.innerHTML, '<section>Dismissal</section>');
  assert.equal(harness.root.dataset.evaluatedAt, '2035-04-14T08:02:00.000Z');
  assert.equal(harness.dateLabel.textContent, 'Saturday, April 14');
  assert.equal(harness.document.title, 'Synthetic Computing · B — Chalkwright');
  assert.equal(harness.connectionStatus.hidden, false);
});

test('failed polls retain the last scene without rewinding the synthetic clock', async () => {
  const payload = {
    presentationHtml: '<section>Class content</section>',
    state: 'in_class_content',
    meetingId: 'meeting-b407-a',
    courseLabel: 'Web Design · A',
    evaluatedAt: '2035-04-13T08:02:00Z',
  };
  const harness = clientHarness({
    targetUrl: '/target/screen-b407',
    payloads: [payload, new Error('synthetic-poll-failure')],
  });
  await new Promise((resolve) => setImmediate(resolve));
  harness.advance(30_000);
  await harness.runTimeout(30_000);
  harness.tickClock();
  assert.equal(harness.fetchCalls(), 2);
  assert.equal(harness.main.innerHTML, '<section>Class content</section>');
  assert.equal(harness.clock.dateTime, '2035-04-13T08:02:30.000Z');
});

test('unchanged healthy polls retain the scene DOM without replaying transitions', async () => {
  const payload = {
    presentationHtml: '<section>Robotics</section>',
    state: 'in_class_content',
    meetingId: 'meeting-robotics',
    courseLabel: 'Robotics',
    evaluatedAt: '2035-04-13T08:02:00Z',
  };
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payloads: [payload, { ...payload, evaluatedAt: '2035-04-13T08:02:30Z' }],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.mainHtmlWrites(), 1);
  harness.advance(30_000);
  await harness.runTimeout(30_000);
  assert.equal(harness.fetchCalls(), 2);
  assert.equal(harness.main.innerHTML, '<section>Robotics</section>');
  assert.equal(harness.mainHtmlWrites(), 1);
  assert.equal(harness.root.dataset.evaluatedAt, '2035-04-13T08:02:30.000Z');
});

test('coming-up state polls at the exact check-in opening boundary', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-b407',
    payloads: [
      {
        presentationHtml: '<section>Coming Up</section>',
        state: 'idle',
        meetingId: '',
        courseLabel: 'Web Design',
        evaluatedAt: '2035-04-13T07:54:40Z',
        checkInOpensAt: '2035-04-13T07:55:00Z',
      },
      {
        presentationHtml: '<section>Check In</section>',
        state: 'pre_checkin',
        meetingId: 'meeting-b407-a',
        courseLabel: 'Web Design',
        evaluatedAt: '2035-04-13T07:55:00.025Z',
      },
    ],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.fetchCalls(), 1);
  assert.equal(harness.main.innerHTML, '<section>Coming Up</section>');

  harness.advance(20_025);
  await harness.runTimeout(20_025);
  assert.equal(harness.fetchCalls(), 2);
  assert.equal(harness.root.dataset.state, 'pre_checkin');
  assert.equal(harness.main.innerHTML, '<section>Check In</section>');
});

test('legacy header bell rounds class time up to minutes and hides outside class content', async () => {
  const first = {
    presentationHtml: '<section>Robotics</section>',
    state: 'in_class_content',
    meetingId: 'meeting-robotics',
    courseLabel: 'Robotics',
    bellEndsAt: '2035-04-13T08:30:00Z',
    evaluatedAt: '2035-04-13T08:00:00Z',
  };
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payloads: [
      first,
      {
        ...first,
        presentationHtml: '<section>Dismissal</section>',
        state: 'dismissal_warning',
        bellEndsAt: '',
        evaluatedAt: '2035-04-13T08:01:00Z',
      },
    ],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.bell.hidden, false);
  assert.equal(harness.bellNumber.textContent, '30');
  assert.equal(
    harness.bellAttributes.get('aria-label'),
    '30 minutes until bell',
  );
  assert.deepEqual([...harness.bell.classList], ['shimmer']);

  harness.advance(60_000);
  harness.tickClock();
  assert.equal(harness.bellNumber.textContent, '29');
  assert.equal(
    harness.bellAttributes.get('aria-label'),
    '29 minutes until bell',
  );

  await harness.runTimeout(30_000);
  assert.equal(harness.bell.hidden, true);
  assert.equal(harness.bellNumber.textContent, '');
  assert.deepEqual([...harness.bell.classList], []);
});

test('legacy header bell uses a singular label and fails closed on a missing target', async () => {
  const first = {
    presentationHtml: '<section>Robotics</section>',
    state: 'in_class_content',
    meetingId: 'meeting-robotics',
    courseLabel: 'Robotics',
    bellEndsAt: '2035-04-13T08:01:00Z',
    evaluatedAt: '2035-04-13T08:00:00Z',
  };
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payloads: [
      first,
      {
        presentationHtml: '<section>Robotics next meeting</section>',
        state: 'in_class_content',
        meetingId: 'meeting-robotics-next',
        courseLabel: 'Robotics',
        evaluatedAt: '2035-04-13T08:00:30Z',
      },
    ],
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.bell.hidden, false);
  assert.equal(harness.bellNumber.textContent, '1');
  assert.equal(harness.bellAttributes.get('aria-label'), '1 minute until bell');

  harness.advance(30_000);
  await harness.runTimeout(30_000);
  assert.equal(harness.bell.hidden, true);
  assert.equal(harness.bellNumber.textContent, '');
  assert.equal(harness.bell.dataset.bellTarget, undefined);
});

test('water-break timer and tones follow actual boundary crossings', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'in_class_content',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:39:59Z',
      waterBreakStartsAt: '2035-04-13T08:40:00Z',
      waterBreakEndsAt: '2035-04-13T08:45:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.waterBreak.hidden, true);
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);

  harness.advance(1_000);
  harness.tickClock();
  assert.equal(harness.waterBreak.hidden, false);
  assert.equal(harness.waterBreakValue.textContent, '5:00');
  assert.equal(harness.waterBreakStartTone.playCalls(), 1);
  assert.equal(harness.waterBreakStartTone.currentTime, 0);
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);
  assert.equal(
    harness.waterBreakAttributes.get('aria-label'),
    'Water break: 5:00 remaining',
  );

  harness.advance(4 * 60_000 + 59_000);
  harness.tickClock();
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);
  harness.advance(1_000);
  harness.tickClock();
  assert.equal(harness.waterBreak.hidden, false);
  assert.equal(harness.waterBreakValue.textContent, '0:00');
  assert.equal(
    harness.waterBreakAttributes.get('aria-label'),
    'Water break complete',
  );
  assert.equal(harness.waterBreakStartTone.playCalls(), 1);
  assert.equal(harness.waterBreakEndTone.playCalls(), 1);
  assert.equal(harness.waterBreakEndTone.currentTime, 0);

  harness.advance(9_999);
  harness.tickClock();
  assert.equal(harness.waterBreak.hidden, false);
  assert.equal(harness.waterBreakValue.textContent, '0:00');
  assert.equal(harness.waterBreakEndTone.playCalls(), 1);

  harness.advance(1);
  harness.tickClock();
  assert.equal(harness.waterBreak.hidden, true);
  assert.equal(harness.waterBreakValue.textContent, '');
  assert.equal(harness.waterBreakEndTone.playCalls(), 1);
});

test('loading during the water-break completion hold shows zero silently', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'in_class_content',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:45:05Z',
      waterBreakStartsAt: '2035-04-13T08:40:00Z',
      waterBreakEndsAt: '2035-04-13T08:45:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.waterBreak.hidden, false);
  assert.equal(harness.waterBreakValue.textContent, '0:00');
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);
});

test('water-break start tolerates bounded foreground timer jitter', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'in_class_content',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:39:59Z',
      waterBreakStartsAt: '2035-04-13T08:40:00Z',
      waterBreakEndsAt: '2035-04-13T08:45:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  harness.waterBreakStartTone.readyState = 0;
  harness.advance(8_000);
  harness.tickClock();
  assert.equal(harness.waterBreak.hidden, false);
  assert.equal(harness.waterBreakValue.textContent, '4:53');
  assert.equal(harness.waterBreakStartTone.playCalls(), 1);
  assert.equal(harness.waterBreakStartTone.currentTime, -1);
});

test('water-break start stays silent after a mirroring-sized clock discontinuity', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'in_class_content',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:39:59Z',
      waterBreakStartsAt: '2035-04-13T08:40:00Z',
      waterBreakEndsAt: '2035-04-13T08:45:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  harness.advance(30_000);
  harness.tickClock();
  assert.equal(harness.waterBreak.hidden, false);
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);
});

test('loading or reverse-mirroring during an active water break stays silent', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'in_class_content',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:42:00Z',
      waterBreakStartsAt: '2035-04-13T08:40:00Z',
      waterBreakEndsAt: '2035-04-13T08:45:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.waterBreak.hidden, false);
  assert.equal(harness.waterBreakValue.textContent, '3:00');
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);
});

test('class tones follow actual start and end boundary crossings', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'check_in',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:29:59Z',
      classStartsAt: '2035-04-13T08:30:00Z',
      classEndsAt: '2035-04-13T09:15:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);

  harness.advance(1_000);
  harness.tickClock();
  assert.equal(harness.waterBreakStartTone.playCalls(), 1);
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);

  harness.advance(44 * 60_000 + 59_000);
  harness.tickClock();
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);
  harness.advance(1_000);
  harness.tickClock();
  assert.equal(harness.waterBreakStartTone.playCalls(), 1);
  assert.equal(harness.waterBreakEndTone.playCalls(), 1);
});

test('mirroring-like clock discontinuities cannot trigger class tones', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'check_in',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:29:59Z',
      classStartsAt: '2035-04-13T08:30:00Z',
      classEndsAt: '2035-04-13T09:15:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  harness.advance(30_000);
  harness.tickClock();
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);
});

test('WebView lifecycle interruption silences and suppresses a class-boundary tone', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'check_in',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:29:59Z',
      classStartsAt: '2035-04-13T08:30:00Z',
      classEndsAt: '2035-04-13T09:15:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));

  for (const [index, { interruption, resume }] of [
    { interruption: 'blur' as const, resume: 'focus' as const },
    { interruption: 'pagehide' as const, resume: 'pageshow' as const },
    {
      interruption: 'visibilitychange' as const,
      resume: 'visibilitychange' as const,
    },
  ].entries()) {
    harness.interruptLifecycle(interruption);
    assert.equal(harness.waterBreakStartTone.pauseCalls(), index * 2 + 1);
    harness.resumeFromLifecycle(resume);
    harness.advance(1_000);
    harness.tickClock();
    assert.equal(harness.waterBreakStartTone.playCalls(), 0);
  }
});

test('coming-up countdowns reveal seconds only in the final ten minutes', async () => {
  const harness = clientHarness({
    targetUrl: '',
    pinnedAt: '2035-04-13T08:00:00Z',
  });
  await new Promise((resolve) => setImmediate(resolve));
  harness.countdown.dataset.countdownTarget = '2035-04-13T10:45:00Z';
  harness.countdown.dataset.countdownSecondsThreshold = '600';
  harness.tickClock();
  assert.equal(harness.countdownValue.textContent, '2 hrs 45 min');

  harness.countdown.dataset.countdownTarget = '2035-04-13T08:10:00Z';
  harness.tickClock();
  assert.equal(harness.countdownValue.textContent, '10:00');
});

test('rapid countdowns use two-digit minutes and hundredths during the final minute', async () => {
  const harness = clientHarness({ targetUrl: '' });
  await new Promise((resolve) => setImmediate(resolve));
  harness.classChime.dataset.classStart = '2035-04-13T08:01:00Z';
  harness.classChime.dataset.classEnd = '2035-04-13T08:46:00Z';
  harness.countdown.dataset.countdownTarget = '2035-04-13T08:01:00Z';
  harness.countdown.dataset.countdownSubsecondsThreshold = '60';
  harness.tickClock();
  assert.equal(harness.countdownValue.textContent, '01:00.00');
  assert.equal(harness.countdown.dataset.countdownRapid, 'true');
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);

  harness.advance(10);
  await harness.runTimeout(10);
  assert.equal(harness.countdownValue.textContent, '00:59.99');

  harness.advance(59_980);
  await harness.runTimeout(10);
  assert.equal(harness.countdownValue.textContent, '00:00.01');
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);

  harness.advance(10);
  await harness.runTimeout(10);
  assert.equal(harness.countdownValue.textContent, '00:00.00');
  assert.equal(harness.countdown.dataset.countdownRapid, 'true');
  assert.equal(harness.waterBreakStartTone.playCalls(), 1);
  harness.tickClock();
  assert.equal(harness.waterBreakStartTone.playCalls(), 1);
});

test('rapid styling clears outside a configured final-minute window', async () => {
  const harness = clientHarness({ targetUrl: '' });
  await new Promise((resolve) => setImmediate(resolve));
  harness.countdown.dataset.countdownTarget = '2035-04-13T08:01:01Z';
  harness.countdown.dataset.countdownSubsecondsThreshold = '60';
  harness.tickClock();
  assert.equal(harness.countdownValue.textContent, '1:01');
  assert.equal(harness.countdown.dataset.countdownRapid, undefined);
});

test('loading or reverse-mirroring during an active class stays silent', async () => {
  const harness = clientHarness({
    targetUrl: '/target/screen-c509',
    payload: {
      presentationHtml: '<section>Robotics</section>',
      state: 'in_class_content',
      meetingId: 'meeting-robotics',
      courseLabel: 'Robotics',
      evaluatedAt: '2035-04-13T08:45:00Z',
      classStartsAt: '2035-04-13T08:30:00Z',
      classEndsAt: '2035-04-13T09:15:00Z',
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.waterBreakStartTone.playCalls(), 0);
  assert.equal(harness.waterBreakEndTone.playCalls(), 0);
});

test('pinned client uses its fixture instant, conventional day periods, and performs no target polling', async () => {
  const harness = clientHarness({
    targetUrl: '',
    pinnedAt: '2035-04-13T08:30:00Z',
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.fetchCalls(), 0);
  assert.equal(harness.clock.dateTime, '2035-04-13T08:30:00.000Z');
  assert.equal(harness.clock.textContent, '8:30 a.m.');

  const afternoonHarness = clientHarness({
    targetUrl: '',
    pinnedAt: '2035-04-13T20:30:00Z',
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(afternoonHarness.clock.textContent, '8:30 p.m.');
});
