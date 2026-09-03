(() => {
  'use strict';

  interface PollingContract {
    readonly requestTimeoutMs: number;
    readonly healthyIntervalMs: number;
    readonly initialRetryMs: number;
    readonly maximumRetryMs: number;
    readonly retryStrategy: string;
  }

  interface BootstrapContract {
    readonly polling?: Partial<PollingContract>;
    readonly timeZone?: string;
    readonly meetingId?: string;
  }

  interface TargetPayload {
    readonly presentationHtml?: unknown;
    readonly html?: unknown;
    readonly evaluatedAt?: unknown;
    readonly state?: unknown;
    readonly meetingId?: unknown;
    readonly courseLabel?: unknown;
    readonly bellEndsAt?: unknown;
    readonly classStartsAt?: unknown;
    readonly classEndsAt?: unknown;
    readonly checkInOpensAt?: unknown;
    readonly waterBreakStartsAt?: unknown;
    readonly waterBreakEndsAt?: unknown;
    readonly dateLabel?: unknown;
    readonly documentTitle?: unknown;
    readonly degraded?: unknown;
  }

  interface CarouselSnapshot {
    meetingId: string;
    index: number;
    paused: boolean;
  }

  interface CarouselState extends CarouselSnapshot {
    carousel: HTMLElement;
    cards: HTMLElement[];
    dots: HTMLButtonElement[];
    serverHeld: boolean;
    timer: number | undefined;
    vocabularyTimer: number | undefined;
    touchStartX: number | undefined;
  }

  interface OperatorRequest {
    readonly method: string;
    readonly url: string;
    readonly body?: unknown;
  }

  const root = document.querySelector<HTMLElement>('[data-display-root]');
  const bootstrapElement = document.querySelector('#presentation-bootstrap');
  let bootstrap: BootstrapContract = {};
  try {
    const parsed: unknown = bootstrapElement
      ? JSON.parse(bootstrapElement.textContent || '{}')
      : {};
    bootstrap =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as BootstrapContract)
        : {};
  } catch {
    bootstrap = {};
  }

  const polling = {
    requestTimeoutMs: 10000,
    healthyIntervalMs: 30000,
    initialRetryMs: 5000,
    maximumRetryMs: 120000,
    retryStrategy: 'exponential',
    ...(bootstrap.polling || {}),
  };
  const timeZone = root?.dataset.timeZone || bootstrap.timeZone || 'Etc/UTC';
  let failureCount = 0;
  let pollTimer: number | undefined;
  let currentMeetingId = String(bootstrap.meetingId || '');
  let carouselState: CarouselState | undefined;
  let lastPresentationHtml: string | undefined;
  let activeWaterBreakKey = '';
  let rapidCountdownTimer: number | undefined;
  let observedWaterBreakKey = '';
  let previousWaterBreakNow: number | undefined;
  let observedClassBoundary:
    | {
        key: string;
        startsAt: number;
        endsAt: number;
        previousNow: number;
        startPlayed: boolean;
        endPlayed: boolean;
      }
    | undefined;
  let operatorAuthorization = '';
  let displayWasInterrupted = false;
  let boundaryTonesSuppressedUntil = 0;
  const maximumBoundarySampleGapMs = 15_000;
  const displayResumeChimeMuteMs = 15_000;
  const boundaryPollAllowanceMs = 25;
  const minimumBoundaryPollDelayMs = 50;
  const waterBreakCompletionHoldMs = 10_000;
  let serverClockAnchor = Date.parse(root?.dataset.evaluatedAt || '');
  let browserClockAnchor = Date.now();

  function displayNow(): Date {
    const pinnedAt = root?.dataset.pinnedAt;
    if (pinnedAt) return new Date(pinnedAt);
    if (Number.isFinite(serverClockAnchor))
      return new Date(serverClockAnchor + (Date.now() - browserClockAnchor));
    return new Date();
  }

  function syntheticOperatorNow(reference: string | undefined): Date {
    const anchor = Date.parse(String(reference || ''));
    return new Date(anchor + (Date.now() - browserClockAnchor));
  }

  function formatClockTime(instant: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => {
        if (part.type !== 'dayPeriod') return part.value;
        return part.value.toUpperCase() === 'AM' ? 'a.m.' : 'p.m.';
      })
      .join('')
      .replace(/\u202f/gu, ' ');
  }

  function announce(message: string): void {
    const region = document.querySelector<HTMLElement>('[data-announcer]');
    if (region) region.textContent = message;
  }

  function setConnectionDegraded(degraded: boolean): void {
    const status = document.querySelector<HTMLElement>(
      '[data-connection-status]',
    );
    if (!status) return;
    status.hidden = !degraded;
  }

  function updateClock(): void {
    const now = displayNow();
    for (const element of document.querySelectorAll<HTMLTimeElement>(
      '[data-clock]',
    )) {
      element.dateTime = now.toISOString();
      try {
        element.textContent = formatClockTime(now);
      } catch {
        element.textContent = now.toISOString().slice(11, 16);
      }
    }
    for (const element of document.querySelectorAll<HTMLElement>(
      '[data-local-time]',
    )) {
      const instant = new Date(element.dataset.localTime || '');
      if (!Number.isFinite(instant.getTime())) continue;
      try {
        element.textContent = new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: 'numeric',
          minute: '2-digit',
        }).format(instant);
      } catch {
        element.textContent = instant.toISOString().slice(11, 16);
      }
    }
    const rapidCountdownActive = updateCountdowns(now.getTime());
    updateHeaderBellCountdown(now.getTime());
    updateWaterBreakCountdown(now.getTime());
    updateClassBoundaryChimes(now.getTime());
    synchronizeRapidCountdown(rapidCountdownActive);
  }

  function updateHeaderBellCountdown(now: number): void {
    const bell = document.querySelector<HTMLElement>('[data-header-bell]');
    const number = bell?.querySelector<HTMLElement>(
      '[data-header-bell-number]',
    );
    if (!bell || !number) return;
    const target = Date.parse(bell.dataset.bellTarget || '');
    const show =
      root?.dataset.state === 'in_class_content' && Number.isFinite(target);
    bell.hidden = !show;
    if (!show) {
      bell.classList.remove('shimmer');
      bell.setAttribute('aria-label', 'Minutes until bell');
      number.textContent = '';
      return;
    }
    const minutes = Math.max(0, Math.ceil((target - now) / 60_000));
    const nextValue = String(minutes);
    bell.setAttribute(
      'aria-label',
      `${nextValue} ${minutes === 1 ? 'minute' : 'minutes'} until bell`,
    );
    if (number.textContent === nextValue) return;
    number.textContent = nextValue;
    bell.classList.remove('shimmer');
    window.requestAnimationFrame(() => {
      if (bell.isConnected && number.textContent === nextValue)
        bell.classList.add('shimmer');
    });
  }

  function updateWaterBreakCountdown(now: number): void {
    const waterBreak = document.querySelector<HTMLElement>(
      '[data-header-water-break]',
    );
    const value = waterBreak?.querySelector<HTMLElement>(
      '[data-water-break-value]',
    );
    if (!waterBreak || !value) return;
    const startsAt = Date.parse(waterBreak.dataset.waterBreakStart || '');
    const endsAt = Date.parse(waterBreak.dataset.waterBreakEnd || '');
    const validWindow = Number.isFinite(startsAt) && Number.isFinite(endsAt);
    const windowKey = `${startsAt}:${endsAt}`;
    const observedContinuously =
      previousWaterBreakNow !== undefined &&
      now >= previousWaterBreakNow &&
      now - previousWaterBreakNow <= maximumBoundarySampleGapMs;
    const crossedStart =
      validWindow &&
      observedWaterBreakKey === windowKey &&
      previousWaterBreakNow !== undefined &&
      previousWaterBreakNow < startsAt &&
      now >= startsAt &&
      observedContinuously;
    const crossedEnd =
      validWindow &&
      observedWaterBreakKey === windowKey &&
      previousWaterBreakNow !== undefined &&
      previousWaterBreakNow < endsAt &&
      now >= endsAt &&
      observedContinuously;
    observedWaterBreakKey = validWindow ? windowKey : '';
    previousWaterBreakNow = validWindow ? now : undefined;
    const active =
      root?.dataset.state === 'in_class_content' &&
      validWindow &&
      now >= startsAt &&
      now < endsAt;
    const completed =
      root?.dataset.state === 'in_class_content' &&
      validWindow &&
      now >= endsAt &&
      now < endsAt + waterBreakCompletionHoldMs;
    waterBreak.hidden = !active && !completed;
    if (completed) {
      if (activeWaterBreakKey === windowKey && crossedEnd)
        playBoundaryTone('end');
      activeWaterBreakKey = windowKey;
      value.textContent = '0:00';
      waterBreak.setAttribute('aria-label', 'Water break complete');
      return;
    }
    if (!active) {
      activeWaterBreakKey = '';
      value.textContent = '';
      waterBreak.setAttribute('aria-label', 'Water break countdown');
      return;
    }
    if (activeWaterBreakKey !== windowKey) {
      activeWaterBreakKey = windowKey;
      if (crossedStart) playBoundaryTone('start');
    }
    const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
    const nextValue = `${Math.floor(seconds / 60)}:${String(
      seconds % 60,
    ).padStart(2, '0')}`;
    value.textContent = nextValue;
    waterBreak.setAttribute(
      'aria-label',
      `Water break: ${nextValue} remaining`,
    );
  }

  function updateClassBoundaryChimes(now: number): void {
    if (observedClassBoundary) {
      const boundary = observedClassBoundary;
      const observedContinuously =
        now >= boundary.previousNow &&
        now - boundary.previousNow <= maximumBoundarySampleGapMs;
      if (
        !boundary.endPlayed &&
        boundary.previousNow < boundary.endsAt &&
        now >= boundary.endsAt &&
        observedContinuously
      ) {
        playBoundaryTone('end');
        boundary.endPlayed = true;
      } else if (
        !boundary.startPlayed &&
        boundary.previousNow < boundary.startsAt &&
        now >= boundary.startsAt &&
        now < boundary.endsAt &&
        observedContinuously
      ) {
        playBoundaryTone('start');
        boundary.startPlayed = true;
      }
      boundary.previousNow = now;
    }

    const marker = document.querySelector<HTMLElement>('[data-class-chime]');
    const startsAt = Date.parse(marker?.dataset.classStart || '');
    const endsAt = Date.parse(marker?.dataset.classEnd || '');
    if (
      !Number.isFinite(startsAt) ||
      !Number.isFinite(endsAt) ||
      endsAt <= startsAt
    )
      return;
    const key = `${startsAt}:${endsAt}`;
    if (observedClassBoundary?.key === key) return;
    observedClassBoundary = {
      key,
      startsAt,
      endsAt,
      previousNow: now,
      startPlayed: now >= startsAt,
      endPlayed: now >= endsAt,
    };
  }

  function resetBoundaryChimeObservation(): void {
    // Android WebView can pause the display while a screen-share app is in
    // front, then resume its timers and media together. Treat that return as
    // a new observation so an old boundary is never replayed as a chime.
    activeWaterBreakKey = '';
    observedWaterBreakKey = '';
    previousWaterBreakNow = undefined;
    observedClassBoundary = undefined;
  }

  function handleDisplayLifecycleResume(): void {
    resetBoundaryChimeObservation();
    if (!displayWasInterrupted) return;
    displayWasInterrupted = false;
    boundaryTonesSuppressedUntil = Date.now() + displayResumeChimeMuteMs;
    silenceBoundaryTones();
  }

  function handleDisplayLifecycleInterruption(): void {
    displayWasInterrupted = true;
    resetBoundaryChimeObservation();
    silenceBoundaryTones();
  }

  function boundaryTonesAreSuppressed(): boolean {
    return document.hidden || Date.now() < boundaryTonesSuppressedUntil;
  }

  function silenceBoundaryTones(): void {
    for (const selector of [
      '[data-water-break-start-tone]',
      '[data-water-break-end-tone]',
    ]) {
      const audio = document.querySelector<HTMLAudioElement>(selector);
      if (!audio) continue;
      try {
        audio.pause();
        if (audio.readyState > 0) audio.currentTime = 0;
      } catch {
        // A suspended WebView may not expose a usable media element yet.
      }
    }
  }

  function playBoundaryTone(kind: 'start' | 'end'): void {
    if (boundaryTonesAreSuppressed()) return;
    const audio = document.querySelector<HTMLAudioElement>(
      kind === 'start'
        ? '[data-water-break-start-tone]'
        : '[data-water-break-end-tone]',
    );
    if (!audio) return;
    try {
      if (audio.readyState > 0) audio.currentTime = 0;
    } catch {
      // A first play remains valid when a kiosk has not exposed media metadata.
    }
    try {
      const playback = audio.play();
      if (playback !== undefined)
        void playback.catch((error: unknown) => {
          if (playbackFailureName(error) !== 'AbortError') return;
          window.setTimeout(() => retryBoundaryTone(audio), 250);
        });
    } catch {
      // Browser autoplay policy remains an operator-controlled kiosk setting.
    }
  }

  function retryBoundaryTone(audio: HTMLAudioElement): void {
    if (boundaryTonesAreSuppressed()) return;
    try {
      const playback = audio.play();
      if (playback !== undefined) void playback.catch(() => undefined);
    } catch {
      // A transient media interruption must not break the display clock.
    }
  }

  function playbackFailureName(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('name' in error))
      return '';
    return typeof error.name === 'string' ? error.name : '';
  }

  function updateCountdowns(now: number): boolean {
    let rapidCountdownActive = false;
    for (const countdown of document.querySelectorAll<HTMLElement>(
      '[data-countdown-target]',
    )) {
      const target = Date.parse(countdown.dataset.countdownTarget || '');
      const value = countdown.querySelector('[data-countdown-value]');
      if (!value || !Number.isFinite(target)) continue;
      const remaining = Math.max(0, target - now);
      const totalSeconds = Math.ceil(remaining / 1000);
      const subsecondsThreshold = Number(
        countdown.dataset.countdownSubsecondsThreshold,
      );
      if (
        Number.isFinite(subsecondsThreshold) &&
        remaining <= subsecondsThreshold * 1000
      ) {
        countdown.dataset.countdownRapid = 'true';
        const totalHundredths = Math.ceil(remaining / 10);
        const minutes = Math.floor(totalHundredths / 6000);
        const seconds = Math.floor((totalHundredths % 6000) / 100);
        const hundredths = totalHundredths % 100;
        value.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
        rapidCountdownActive ||= remaining > 0;
        continue;
      }
      delete countdown.dataset.countdownRapid;
      const secondsThreshold = Number(
        countdown.dataset.countdownSecondsThreshold,
      );
      if (
        Number.isFinite(secondsThreshold) &&
        totalSeconds > secondsThreshold
      ) {
        const totalMinutes = Math.ceil(remaining / 60_000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        value.textContent =
          hours > 0
            ? `${hours} hr${hours === 1 ? '' : 's'}${minutes > 0 ? ` ${minutes} min` : ''}`
            : `${minutes} min`;
        continue;
      }
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      value.textContent =
        hours > 0
          ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
    return rapidCountdownActive;
  }

  function synchronizeRapidCountdown(active: boolean): void {
    if (!active || root?.dataset.pinnedAt) {
      if (rapidCountdownTimer !== undefined)
        window.clearTimeout(rapidCountdownTimer);
      rapidCountdownTimer = undefined;
      return;
    }
    if (rapidCountdownTimer !== undefined) return;
    rapidCountdownTimer = window.setTimeout(() => {
      rapidCountdownTimer = undefined;
      const now = displayNow().getTime();
      const stillActive = updateCountdowns(now);
      updateClassBoundaryChimes(now);
      synchronizeRapidCountdown(stillActive);
    }, 10);
  }

  function stopCarouselTimer(): void {
    if (carouselState?.timer) window.clearTimeout(carouselState.timer);
    if (carouselState?.vocabularyTimer)
      window.clearTimeout(carouselState.vocabularyTimer);
    if (carouselState) {
      carouselState.timer = undefined;
      carouselState.vocabularyTimer = undefined;
    }
  }

  function activateVocabularyFace(card: HTMLElement, index: number): void {
    const panel = card.querySelector<HTMLElement>('[data-vocabulary-panel]');
    const faces = [
      ...card.querySelectorAll<HTMLElement>('[data-vocabulary-face]'),
    ];
    if (!panel || faces.length === 0) return;
    const previous = Number(panel.dataset.activeFace || 0);
    const active = (index + faces.length) % faces.length;
    faces.forEach((face, faceIndex) => {
      face.classList.toggle('is-active', faceIndex === active);
      face.classList.toggle(
        'is-leaving',
        faceIndex === previous && faceIndex !== active,
      );
      face.setAttribute('aria-hidden', String(faceIndex !== active));
    });
    panel.dataset.activeFace = String(active);
  }

  function startVocabularyCycle(card: HTMLElement | undefined): void {
    if (!carouselState || !card) return;
    const faces = [
      ...card.querySelectorAll<HTMLElement>('[data-vocabulary-face]'),
    ];
    if (faces.length === 0) return;
    activateVocabularyFace(card, 0);
    if (faces.length === 1 || carouselState.paused) return;
    const state = carouselState;
    const configuredInterval = Number(
      card.querySelector<HTMLElement>('[data-vocabulary-panel]')?.dataset
        .vocabularyIntervalMs,
    );
    const interval = Number.isFinite(configuredInterval)
      ? Math.max(6000, configuredInterval)
      : 10000;
    let faceIndex = 0;
    const advance = () => {
      if (carouselState !== state || state.cards[state.index] !== card) return;
      faceIndex = (faceIndex + 1) % faces.length;
      activateVocabularyFace(card, faceIndex);
      state.vocabularyTimer = window.setTimeout(advance, interval);
    };
    state.vocabularyTimer = window.setTimeout(advance, interval);
  }

  function initializeCarousel(previousState?: CarouselSnapshot): void {
    stopCarouselTimer();
    const carousel = document.querySelector<HTMLElement>('[data-carousel]');
    if (!carousel) {
      carouselState = undefined;
      return;
    }
    const cards = [
      ...carousel.querySelectorAll<HTMLElement>('[data-carousel-card]'),
    ];
    const dots = [
      ...carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]'),
    ];
    const meetingId = carousel.dataset.meetingId || '';
    const sameMeeting = previousState?.meetingId === meetingId;
    carouselState = {
      carousel,
      cards,
      dots,
      meetingId,
      index: sameMeeting ? Math.min(previousState.index, cards.length - 1) : 0,
      paused: sameMeeting ? previousState.paused : false,
      serverHeld: carousel.dataset.serverHeld === 'true',
      timer: undefined,
      vocabularyTimer: undefined,
      touchStartX: undefined,
    };

    function show(index: number, userInitiated = false): void {
      if (!carouselState || cards.length === 0) return;
      stopCarouselTimer();
      const previous = cards[carouselState.index];
      carouselState.index = (index + cards.length) % cards.length;
      const state = carouselState;
      cards.forEach((card, cardIndex) => {
        if (cardIndex === state.index) {
          card.hidden = false;
          card.classList.remove('carousel-leaving');
        } else if (card !== previous || previous === cards[state.index]) {
          card.hidden = true;
          card.classList.remove('carousel-leaving');
        }
        card.classList.remove('revealed');
      });
      if (
        previous !== undefined &&
        previous !== cards[state.index] &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        previous.hidden = false;
        previous.classList.add('carousel-leaving');
        window.setTimeout(() => {
          previous.classList.remove('carousel-leaving');
          if (carouselState?.cards[carouselState.index] !== previous)
            previous.hidden = true;
        }, 420);
      }
      dots.forEach((dot, dotIndex) => {
        dot.setAttribute('aria-selected', String(dotIndex === state.index));
      });
      const active = cards[state.index];
      if (active !== undefined) {
        window.requestAnimationFrame(() => fitCard(active));
      }
      if (userInitiated && active) {
        announce(`Showing card ${state.index + 1} of ${cards.length}`);
      }
      startVocabularyCycle(active);
      schedule(active);
    }

    function fitCard(card: HTMLElement): void {
      card.classList.remove('content-tight', 'content-compact');
      if (cardContentFits(card)) return;
      card.classList.add('content-tight');
      if (cardContentFits(card)) return;
      card.classList.add('content-compact');
    }

    function cardContentFits(card: HTMLElement): boolean {
      if (card.scrollHeight - card.clientHeight > 1) return false;
      return [
        ...card.querySelectorAll<HTMLElement>('.vocabulary-panel-face'),
      ].every((face) => face.scrollHeight - face.clientHeight <= 1);
    }

    function schedule(card: HTMLElement | undefined): void {
      if (
        !carouselState ||
        !card ||
        cards.length <= 1 ||
        carouselState.paused ||
        carouselState.serverHeld
      )
        return;
      const configured = Number(card.dataset.durationMs || 12000);
      const duration = Number.isFinite(configured)
        ? Math.max(5000, configured)
        : 12000;
      const reveal = card.querySelector('[data-reveal]');
      const revealAt = reveal ? Math.min(duration * 0.45, duration - 4000) : 0;
      if (reveal && revealAt > 0) {
        window.setTimeout(() => {
          if (carouselState?.cards[carouselState.index] === card)
            card.classList.add('revealed');
        }, revealAt);
      }
      const revealAwareDuration = reveal
        ? Math.max(duration, revealAt + 4000)
        : duration;
      carouselState.timer = window.setTimeout(() => {
        if (carouselState) show(carouselState.index + 1);
      }, revealAwareDuration);
    }

    carousel
      .querySelector('[data-carousel-previous]')
      ?.addEventListener('click', () => {
        if (carouselState) show(carouselState.index - 1, true);
      });
    carousel
      .querySelector('[data-carousel-next]')
      ?.addEventListener('click', () => {
        if (carouselState) show(carouselState.index + 1, true);
      });
    dots.forEach((dot, index) =>
      dot.addEventListener('click', () => show(index, true)),
    );
    const pause = carousel.querySelector<HTMLButtonElement>(
      '[data-carousel-pause]',
    );
    pause?.addEventListener('click', () => {
      if (!carouselState || carouselState.serverHeld) return;
      carouselState.paused = !carouselState.paused;
      pause.setAttribute('aria-pressed', String(carouselState.paused));
      pause.textContent = carouselState.paused ? 'Resume' : 'Pause';
      if (carouselState.paused) stopCarouselTimer();
      else {
        startVocabularyCycle(cards[carouselState.index]);
        schedule(cards[carouselState.index]);
      }
      announce(carouselState.paused ? 'Carousel paused' : 'Carousel resumed');
    });
    if (carouselState.serverHeld && pause) {
      pause.disabled = true;
      pause.textContent = 'Held';
    } else if (pause && carouselState.paused) {
      pause.setAttribute('aria-pressed', 'true');
      pause.textContent = 'Resume';
    }
    carousel.addEventListener('pointerdown', (event) => {
      if (carouselState) carouselState.touchStartX = event.clientX;
    });
    carousel.addEventListener('pointerup', (event) => {
      if (!carouselState || carouselState.touchStartX === undefined) return;
      const distance = event.clientX - carouselState.touchStartX;
      carouselState.touchStartX = undefined;
      if (Math.abs(distance) < 45) return;
      show(carouselState.index + (distance < 0 ? 1 : -1), true);
    });
    show(carouselState.index);
  }

  function initializeSceneMedia(): void {
    const scene = document.querySelector<HTMLElement>('[data-media-scene]');
    if (!scene) return;
    const layers = [
      ...scene.querySelectorAll<HTMLVideoElement>('[data-media-layer]'),
    ];
    let revealed = false;
    let active = 0;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      scene.classList.remove('media-pending');
    };
    const fallback = window.setTimeout(reveal, 2000);
    const play = (video: HTMLVideoElement): void => {
      const result = video.play();
      if (result && typeof result.catch === 'function') result.catch(reveal);
    };
    layers.forEach((video, index) => {
      video.muted = true;
      video.preload = 'auto';
      video.addEventListener('canplay', () => {
        window.clearTimeout(fallback);
        reveal();
        if (index === active) play(video);
      });
      video.addEventListener('timeupdate', () => {
        if (
          index !== active ||
          !Number.isFinite(video.duration) ||
          video.duration - video.currentTime > 0.8 ||
          layers.length < 2
        )
          return;
        const next = (active + 1) % layers.length;
        const nextVideo = layers[next];
        if (!nextVideo) return;
        nextVideo.currentTime = 0;
        play(nextVideo);
        nextVideo.classList.add('active');
        video.classList.remove('active');
        active = next;
      });
      video.addEventListener('ended', () => {
        if (index !== active) return;
        video.currentTime = 0;
        play(video);
      });
      video.addEventListener('error', reveal);
    });
    if (layers[0]) play(layers[0]);
  }

  function applyTargetPayload(payload: TargetPayload): boolean {
    const html = payload?.presentationHtml ?? payload?.html;
    const main = document.querySelector<HTMLElement>('#display-main');
    if (typeof html !== 'string' || html.length === 0 || !main) return false;
    const previousState = carouselState
      ? {
          meetingId: carouselState.meetingId,
          index: carouselState.index,
          paused: carouselState.paused,
        }
      : undefined;
    const sceneChanged = html !== lastPresentationHtml;
    if (sceneChanged) {
      main.innerHTML = html;
      lastPresentationHtml = html;
    }
    const evaluatedAt = Date.parse(String(payload.evaluatedAt || ''));
    if (Number.isFinite(evaluatedAt) && !root?.dataset.pinnedAt) {
      serverClockAnchor = evaluatedAt;
      browserClockAnchor = Date.now();
      if (root) root.dataset.evaluatedAt = new Date(evaluatedAt).toISOString();
    }
    if (typeof payload.state === 'string' && root) {
      for (const name of [...document.body.classList]) {
        if (name.startsWith('state-')) document.body.classList.remove(name);
      }
      document.body.classList.add(`state-${payload.state}`);
      root.dataset.state = payload.state;
    }
    const nextMeetingId = String(payload.meetingId || '');
    if (nextMeetingId !== currentMeetingId) {
      currentMeetingId = nextMeetingId;
      if (previousState) previousState.paused = false;
    }
    const label = document.querySelector('[data-course-label]');
    if (label && typeof payload.courseLabel === 'string')
      label.textContent = payload.courseLabel;
    const bell = document.querySelector<HTMLElement>('[data-header-bell]');
    if (bell) {
      delete bell.dataset.bellTarget;
      if (
        typeof payload.bellEndsAt === 'string' &&
        payload.bellEndsAt.length <= 64 &&
        Number.isFinite(Date.parse(payload.bellEndsAt))
      )
        bell.dataset.bellTarget = payload.bellEndsAt;
    }
    const waterBreak = document.querySelector<HTMLElement>(
      '[data-header-water-break]',
    );
    if (waterBreak) {
      delete waterBreak.dataset.waterBreakStart;
      delete waterBreak.dataset.waterBreakEnd;
      if (
        typeof payload.waterBreakStartsAt === 'string' &&
        typeof payload.waterBreakEndsAt === 'string' &&
        payload.waterBreakStartsAt.length <= 64 &&
        payload.waterBreakEndsAt.length <= 64 &&
        Number.isFinite(Date.parse(payload.waterBreakStartsAt)) &&
        Number.isFinite(Date.parse(payload.waterBreakEndsAt))
      ) {
        waterBreak.dataset.waterBreakStart = payload.waterBreakStartsAt;
        waterBreak.dataset.waterBreakEnd = payload.waterBreakEndsAt;
      }
    }
    const classChime =
      document.querySelector<HTMLElement>('[data-class-chime]');
    if (classChime) {
      delete classChime.dataset.classStart;
      delete classChime.dataset.classEnd;
      if (
        typeof payload.classStartsAt === 'string' &&
        typeof payload.classEndsAt === 'string' &&
        payload.classStartsAt.length <= 64 &&
        payload.classEndsAt.length <= 64 &&
        Number.isFinite(Date.parse(payload.classStartsAt)) &&
        Number.isFinite(Date.parse(payload.classEndsAt)) &&
        Date.parse(payload.classEndsAt) > Date.parse(payload.classStartsAt)
      ) {
        classChime.dataset.classStart = payload.classStartsAt;
        classChime.dataset.classEnd = payload.classEndsAt;
      }
    }
    const dateLabel = document.querySelector('[data-display-date]');
    if (
      dateLabel &&
      typeof payload.dateLabel === 'string' &&
      payload.dateLabel.length <= 128
    )
      dateLabel.textContent = payload.dateLabel;
    if (
      typeof payload.documentTitle === 'string' &&
      payload.documentTitle.length <= 160
    )
      document.title = payload.documentTitle;
    setConnectionDegraded(payload.degraded === true);
    if (sceneChanged) {
      initializeCarousel(previousState);
      initializeSceneMedia();
    }
    updateClock();
    return true;
  }

  function schedulePoll(delay: number): void {
    if (!root) return;
    if (pollTimer) window.clearTimeout(pollTimer);
    pollTimer = window.setTimeout(pollTarget, delay);
  }

  function healthyPollDelay(payload: TargetPayload): number {
    if (
      payload.state !== 'morning_overview' &&
      payload.state !== 'idle' &&
      payload.state !== 'post_end'
    )
      return polling.healthyIntervalMs;
    if (
      typeof payload.checkInOpensAt !== 'string' ||
      payload.checkInOpensAt.length > 64
    )
      return polling.healthyIntervalMs;
    const boundary = Date.parse(payload.checkInOpensAt);
    if (!Number.isFinite(boundary)) return polling.healthyIntervalMs;
    const untilBoundary = boundary - displayNow().getTime();
    if (untilBoundary < 0 || untilBoundary >= polling.healthyIntervalMs)
      return polling.healthyIntervalMs;
    return Math.max(
      minimumBoundaryPollDelayMs,
      untilBoundary + boundaryPollAllowanceMs,
    );
  }

  async function pollTarget(): Promise<void> {
    if (!root?.dataset.targetUrl) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      polling.requestTimeoutMs,
    );
    try {
      const response = await fetch(root.dataset.targetUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('target-unavailable');
      const payload: unknown = await response.json();
      if (payload === null || typeof payload !== 'object')
        throw new Error('target-invalid');
      const targetPayload = payload as TargetPayload;
      if (!applyTargetPayload(targetPayload)) throw new Error('target-invalid');
      failureCount = 0;
      schedulePoll(healthyPollDelay(targetPayload));
    } catch {
      failureCount += 1;
      setConnectionDegraded(true);
      const retry = Math.min(
        polling.maximumRetryMs,
        polling.initialRetryMs * 2 ** Math.max(0, failureCount - 1),
      );
      schedulePoll(retry);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function formValues(form: HTMLFormElement): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value !== 'string') throw new Error('operator-file-rejected');
      values[key] = value;
    }
    return values;
  }

  function operatorRequest(form: HTMLFormElement): OperatorRequest {
    const values = formValues(form);
    const kind = form.dataset.operatorForm;
    const method = form.dataset.httpMethod || 'POST';
    if (kind === 'override') {
      const classOverride = {
        cardsMode: values.cardsMode,
        hideAssignments: values.hideAssignments === 'on',
        ...(values.dismissalMessage
          ? { dismissalMessage: values.dismissalMessage }
          : {}),
      };
      return {
        method,
        url: form.action,
        body: {
          screenId: values.screenId,
          date: values.date,
          ...(values.announcement ? { announcement: values.announcement } : {}),
          ...(values.meetingId
            ? { classes: { [values.meetingId]: classOverride } }
            : {}),
        },
      };
    }
    if (kind === 'hold') {
      const heldAt = syntheticOperatorNow(values.effectiveAt);
      const duration = Number(values.durationMinutes);
      return {
        method,
        url: form.action,
        body: {
          screenId: values.screenId,
          date: values.date,
          roomId: values.roomId,
          classId: values.classId,
          planId: values.planId,
          meetingId: values.meetingId,
          heldAt: heldAt.toISOString(),
          reasonCode: values.reasonCode,
          ...(Number.isFinite(duration) && duration > 0
            ? {
                expiresAt: new Date(
                  heldAt.getTime() + duration * 60000,
                ).toISOString(),
              }
            : {}),
          ...(values.expectedRevision
            ? { expectedRevision: values.expectedRevision }
            : {}),
        },
      };
    }
    const url = new URL(form.action, window.location.origin);
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
    }
    if (kind === 'hold-release')
      url.searchParams.set(
        'releasedAt',
        syntheticOperatorNow(values.effectiveAt).toISOString(),
      );
    return { method, url: url.href };
  }

  function initializeOperatorForms(): void {
    for (const form of document.querySelectorAll<HTMLFormElement>(
      '[data-operator-form]',
    )) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const status = document.querySelector('[data-form-status]');
        if (status) status.textContent = 'Saving…';
        if (!operatorAuthorization) {
          operatorAuthorization =
            window.prompt('Operator authorization for this page') || '';
        }
        if (!operatorAuthorization) {
          if (status) status.textContent = 'Authorization is required.';
          return;
        }
        const request = operatorRequest(form);
        const hasBody = request.body !== undefined;
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              Accept: 'application/json',
              ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
              Authorization: `Bearer ${operatorAuthorization}`,
            },
            ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
            cache: 'no-store',
          });
          if (!response.ok) {
            if (response.status === 401) operatorAuthorization = '';
            throw new Error('operator-request-failed');
          }
          if (status) status.textContent = 'Saved.';
        } catch {
          if (status)
            status.textContent =
              'The change was not saved. Review authorization and try again.';
        }
      });
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) handleDisplayLifecycleInterruption();
    else handleDisplayLifecycleResume();
  });
  window.addEventListener('blur', handleDisplayLifecycleInterruption);
  window.addEventListener('pagehide', handleDisplayLifecycleInterruption);
  window.addEventListener('focus', handleDisplayLifecycleResume);
  window.addEventListener('pageshow', handleDisplayLifecycleResume);
  updateClock();
  window.setInterval(updateClock, 1000);
  initializeCarousel();
  initializeSceneMedia();
  initializeOperatorForms();
  if (root?.dataset.targetUrl) schedulePoll(0);
})();
