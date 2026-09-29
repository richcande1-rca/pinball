// Miami Nights: AFTER HOURS hotel-district mode.
// Qualify by completing REEF HOTEL, NEON PALMS, and CAFE OCHO three times each
// during the current ball. The 30-second mode dims the table into a smoky
// late-night look; completing all three hotel shots during the mode awards an
// escalating HOTEL JACKPOT: 25K -> 35K -> 50K, then 50K for later sets.
//
// This mode is independent of the Clock / Neon Rush / Midnight story chain.
// If Neon Rush or Midnight is active, AFTER HOURS waits or suspends cleanly
// rather than competing for the same presentation layer.

(() => {
  if (window.miamiAfterHoursInstalled) return;
  window.miamiAfterHoursInstalled = true;

  const MODE_SECONDS = 30;
  const MODE_MS = MODE_SECONDS * 1000;
  const TITLE_MS = 1200;
  const JACKPOT_FLASH_MS = 950;
  const JACKPOTS = [25000, 35000, 50000];
  const HOTEL_KEYS = ['reef', 'neon', 'cafe'];

  const state = {
    counts: {
      reef: 0,
      neon: 0,
      cafe: 0
    },
    qualified: false,
    active: false,
    remainingMs: 0,
    titleUntil: -Infinity,
    setHits: new Set(),
    jackpotTier: 0,
    lastJackpot: 0,
    lastJackpotAt: -Infinity,
    suspended: false
  };
  window.miamiAfterHoursState = state;

  function resetCounts() {
    for (const key of HOTEL_KEYS) state.counts[key] = 0;
    state.qualified = false;
  }

  function majorModeBusy(now = performance.now()) {
    const rush = window.miamiNeonRushState;
    const rushPending = Number(rush?.pendingUntil) > now;
    const rushBusy = Boolean(rush?.active || rushPending);

    const midnightPhase = window.miamiMidnightRunState?.phase;
    const midnightBusy = Boolean(midnightPhase && midnightPhase !== 'idle');

    return rushBusy || midnightBusy;
  }

  function stopAfterHours({ resetQualification = true, completed = false } = {}) {
    const wasActive = state.active;

    state.active = false;
    state.remainingMs = 0;
    state.titleUntil = -Infinity;
    state.setHits.clear();
    state.jackpotTier = 0;
    state.lastJackpot = 0;
    state.lastJackpotAt = -Infinity;
    state.suspended = false;

    if (resetQualification) resetCounts();

    if (wasActive) {
      window.dispatchEvent(new CustomEvent('miami-after-hours-end', {
        detail: { completed }
      }));
    }
  }

  function startAfterHours() {
    if (state.active || !state.qualified || gameOver || majorModeBusy()) {
      return false;
    }

    state.active = true;
    state.qualified = false;
    state.remainingMs = MODE_MS;
    state.titleUntil = performance.now() + TITLE_MS;
    state.setHits.clear();
    state.jackpotTier = 0;
    state.lastJackpot = 0;
    state.lastJackpotAt = -Infinity;
    state.suspended = false;

    for (const key of HOTEL_KEYS) state.counts[key] = 0;

    window.dispatchEvent(new CustomEvent('miami-after-hours-start', {
      detail: { durationMs: MODE_MS }
    }));
    return true;
  }

  function awardHotelJackpot(now) {
    const tier = Math.min(state.jackpotTier, JACKPOTS.length - 1);
    const jackpot = JACKPOTS[tier];

    score += jackpot;
    syncStatusDisplay();

    state.lastJackpot = jackpot;
    state.lastJackpotAt = now;
    state.jackpotTier = Math.min(
      state.jackpotTier + 1,
      JACKPOTS.length - 1
    );
    state.setHits.clear();

    window.dispatchEvent(new CustomEvent('miami-after-hours-jackpot', {
      detail: {
        jackpot,
        tier: tier + 1,
        score
      }
    }));
  }

  function recordHotelVisit(key) {
    if (gameOver || !HOTEL_KEYS.includes(key)) return;

    const now = performance.now();

    if (state.active) {
      if (state.suspended) return;

      state.setHits.add(key);
      window.dispatchEvent(new CustomEvent('miami-after-hours-set-progress', {
        detail: {
          hotel: key,
          hits: state.setHits.size,
          total: HOTEL_KEYS.length
        }
      }));

      if (state.setHits.size === HOTEL_KEYS.length) {
        awardHotelJackpot(now);
      }
      return;
    }

    if (state.qualified) return;

    state.counts[key] = Math.min(3, state.counts[key] + 1);

    window.dispatchEvent(new CustomEvent('miami-after-hours-qualify-progress', {
      detail: {
        hotel: key,
        count: state.counts[key],
        counts: { ...state.counts }
      }
    }));

    if (HOTEL_KEYS.every(hotel => state.counts[hotel] >= 3)) {
      state.qualified = true;
      window.dispatchEvent(new CustomEvent('miami-after-hours-qualified', {
        detail: { counts: { ...state.counts } }
      }));
      startAfterHours();
    }
  }

  window.addEventListener('miami-reef-complete', () => recordHotelVisit('reef'));
  window.addEventListener('miami-neon-palms-hit', () => recordHotelVisit('neon'));
  window.addEventListener('miami-cafe-ocho-capture', () => recordHotelVisit('cafe'));

  window.addEventListener('miami-drain', () => {
    stopAfterHours({ resetQualification: true, completed: false });
  });

  const baseResetGameWithAfterHours = resetGame;
  resetGame = function resetGameWithAfterHours() {
    stopAfterHours({ resetQualification: true, completed: false });
    baseResetGameWithAfterHours();
  };

  window.miamiTestStartAfterHours = function miamiTestStartAfterHours() {
    if (!window.miamiTestModeActive) return false;

    stopAfterHours({ resetQualification: true, completed: false });
    state.qualified = true;
    return startAfterHours();
  };

  const baseUpdateWithAfterHours = update;
  update = function updateWithAfterHours(dt) {
    baseUpdateWithAfterHours(dt);

    const now = performance.now();

    if (state.qualified && !state.active) {
      startAfterHours();
    }

    if (!state.active) return;

    state.suspended = majorModeBusy(now);
    if (state.suspended) return;

    state.remainingMs = Math.max(0, state.remainingMs - dt * 1000);
    if (state.remainingMs === 0) {
      stopAfterHours({ resetQualification: true, completed: true });
    }
  };

  function drawQualificationProgress() {
    const anyProgress = HOTEL_KEYS.some(key => state.counts[key] > 0);
    if (!anyProgress || state.active) return;

    const rows = [
      { key: 'reef', label: 'REEF', y: 316, accent: MIAMI_COLORS.cyan },
      { key: 'neon', label: 'NEON', y: 400, accent: MIAMI_COLORS.magenta },
      { key: 'cafe', label: 'CAFE', y: 466, accent: MIAMI_COLORS.lavender }
    ];

    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '800 8px ui-monospace, monospace';

    for (const row of rows) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = row.accent;
      ctx.fillText(
        `${row.label} ${state.counts[row.key]}/3`,
        371,
        row.y
      );
    }
    ctx.restore();
  }

  function drawSmoke(now) {
    const phase = now * 0.012;
    const lanes = [
      { y: 180, width: 150, height: 32, drift: 0 },
      { y: 350, width: 185, height: 42, drift: 150 },
      { y: 525, width: 165, height: 36, drift: 300 }
    ];

    ctx.save();
    ctx.fillStyle = 'rgba(205, 220, 235, 0.075)';
    for (const lane of lanes) {
      const x = ((phase + lane.drift) % (canvas.width + 280)) - 140;
      ctx.beginPath();
      ctx.ellipse(x, lane.y, lane.width, lane.height, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        x - canvas.width - 140,
        lane.y,
        lane.width,
        lane.height,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHotelMarkers() {
    const markers = [
      { key: 'reef', x: 403, y: 316, accent: MIAMI_COLORS.cyan },
      { key: 'neon', x: 404, y: 400, accent: MIAMI_COLORS.magenta },
      { key: 'cafe', x: 403, y: 466, accent: MIAMI_COLORS.lavender }
    ];

    ctx.save();
    ctx.lineWidth = 2;
    for (const marker of markers) {
      const hit = state.setHits.has(marker.key);
      ctx.globalAlpha = hit ? 1 : 0.66;
      ctx.strokeStyle = hit ? '#ffffff' : marker.accent;
      ctx.shadowColor = marker.accent;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (hit ? 12 : 5);
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, hit ? 16 : 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAfterHours(now) {
    if (!state.active || state.suspended || majorModeBusy(now)) return;

    ctx.save();
    ctx.fillStyle = 'rgba(1, 3, 8, 0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    drawSmoke(now);
    drawHotelMarkers();

    const remainingSeconds = Math.max(
      0,
      Math.ceil(state.remainingMs / 1000)
    );

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.globalAlpha = 0.88;
    ctx.font = '900 11px ui-monospace, monospace';
    ctx.fillStyle = '#d9e7ef';
    ctx.fillText('AFTER HOURS', canvas.width / 2, 222);

    ctx.font = '900 24px ui-monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = MIAMI_COLORS.lavender;
    ctx.lineWidth = 1.2;
    if (!window.miamiMobilePerformanceMode) {
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = 8;
    }
    const timerText = `00:${String(remainingSeconds).padStart(2, '0')}`;
    ctx.strokeText(timerText, canvas.width / 2, 250);
    ctx.fillText(timerText, canvas.width / 2, 250);

    if (now < state.titleUntil) {
      ctx.globalAlpha = Math.min(1, (state.titleUntil - now) / 240);
      ctx.font = '900 30px ui-monospace, monospace';
      ctx.fillStyle = '#f1f4f7';
      ctx.strokeStyle = MIAMI_COLORS.cyan;
      ctx.lineWidth = 1.5;
      ctx.strokeText('AFTER HOURS', canvas.width / 2, 188, 340);
      ctx.fillText('AFTER HOURS', canvas.width / 2, 188, 340);
    }

    const jackpotAge = now - state.lastJackpotAt;
    if (jackpotAge >= 0 && jackpotAge < JACKPOT_FLASH_MS) {
      const strength = 1 - jackpotAge / JACKPOT_FLASH_MS;
      ctx.globalAlpha = Math.min(1, strength * 1.6);
      ctx.font = '900 18px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = MIAMI_COLORS.magenta;
      ctx.lineWidth = 1.2;
      const text = `HOTEL JACKPOT +${state.lastJackpot.toLocaleString('en-US')}`;
      ctx.strokeText(text, canvas.width / 2, 286, 360);
      ctx.fillText(text, canvas.width / 2, 286, 360);
    }

    ctx.restore();
  }

  const baseDrawWithAfterHours = draw;
  draw = function drawWithAfterHours() {
    baseDrawWithAfterHours();

    const now = performance.now();
    if (state.active) {
      drawAfterHours(now);
    } else {
      drawQualificationProgress();
    }
  };

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' AFTER HOURS: complete REEF HOTEL, NEON PALMS, and CAFE OCHO three times each in one ball. For 30 seconds, hit all three businesses to collect escalating 25K, 35K, then 50K HOTEL JACKPOTS.'
    ));
  }
})();
