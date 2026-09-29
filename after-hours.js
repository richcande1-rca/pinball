// Miami Nights: AFTER HOURS hotel-district mode.
// Qualify by completing REEF HOTEL, NEON PALMS, and CAFE OCHO three times each
// across the current game. Qualification progress survives drains. During the
// 30-second mode, only the table's cyan/magenta/lavender neon breathes with a
// slow pulse; the sunset/background remains untouched. Completing all three
// hotel shots during the mode awards an
// escalating HOTEL JACKPOT: 25K -> 35K -> 50K, then 50K for later sets.
//
// This mode is fully independent of the Clock / Neon Rush / Midnight story
// chain. It can qualify, run, score, and finish while any other mode is active.
// Qualification and an active run survive ordinary drains; only GAME OVER or
// NEW GAME/reset clears the subsystem.

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
    lastJackpotAt: -Infinity
  };
  window.miamiAfterHoursState = state;

  function resetCounts() {
    for (const key of HOTEL_KEYS) state.counts[key] = 0;
    state.qualified = false;
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

    if (resetQualification) resetCounts();

    if (wasActive) {
      window.dispatchEvent(new CustomEvent('miami-after-hours-end', {
        detail: { completed }
      }));
    }
  }

  function startAfterHours() {
    if (state.active || !state.qualified || gameOver) {
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

    if (gameOver) {
      const hasQualificationProgress =
        state.qualified ||
        HOTEL_KEYS.some(key => state.counts[key] > 0);

      if (state.active || hasQualificationProgress) {
        stopAfterHours({ resetQualification: true, completed: false });
      }
      return;
    }

    if (state.qualified && !state.active) {
      startAfterHours();
    }

    if (!state.active) return;

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

  const baseNeonPalette = {
    cyan: MIAMI_COLORS.cyan,
    magenta: MIAMI_COLORS.magenta,
    lavender: MIAMI_COLORS.lavender
  };

  const NEON_PULSE_STEPS = 64;
  const neonPulsePalette = Array.from({ length: NEON_PULSE_STEPS }, (_, index) => {
    const phase = index / (NEON_PULSE_STEPS - 1);
    const alpha = 0.58 + phase * 0.42;
    return {
      cyan: `rgba(34, 223, 243, ${alpha})`,
      magenta: `rgba(255, 60, 172, ${alpha})`,
      lavender: `rgba(201, 184, 255, ${alpha})`
    };
  });

  function applyNeonPulse(now) {
    const phase = (now % 1800) / 1800 * Math.PI * 2;
    const breath = (Math.sin(phase) + 1) * 0.5;
    const index = Math.min(
      NEON_PULSE_STEPS - 1,
      Math.round(breath * (NEON_PULSE_STEPS - 1))
    );
    const palette = neonPulsePalette[index];

    MIAMI_COLORS.cyan = palette.cyan;
    MIAMI_COLORS.magenta = palette.magenta;
    MIAMI_COLORS.lavender = palette.lavender;
  }

  function restoreNeonPalette() {
    MIAMI_COLORS.cyan = baseNeonPalette.cyan;
    MIAMI_COLORS.magenta = baseNeonPalette.magenta;
    MIAMI_COLORS.lavender = baseNeonPalette.lavender;
  }

  function drawAfterHours(now) {
    if (!state.active) return;

    const remainingSeconds = Math.max(
      0,
      Math.ceil(state.remainingMs / 1000)
    );

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.globalAlpha = 0.92;
    ctx.font = '900 10px ui-monospace, monospace';
    ctx.fillStyle = '#f4ffff';
    ctx.strokeStyle = MIAMI_COLORS.lavender;
    ctx.lineWidth = 1;
    if (!window.miamiMobilePerformanceMode) {
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = 5;
    }

    const timerText =
      `AFTER HOURS · 00:${String(remainingSeconds).padStart(2, '0')}`;
    ctx.strokeText(timerText, canvas.width / 2, canvas.height - 104, 250);
    ctx.fillText(timerText, canvas.width / 2, canvas.height - 104, 250);

    const jackpotAge = now - state.lastJackpotAt;
    if (jackpotAge >= 0 && jackpotAge < JACKPOT_FLASH_MS) {
      const strength = 1 - jackpotAge / JACKPOT_FLASH_MS;
      ctx.globalAlpha = Math.min(1, strength * 1.6);
      ctx.font = '900 18px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = MIAMI_COLORS.magenta;
      ctx.lineWidth = 1.2;
      if (!window.miamiMobilePerformanceMode) {
        ctx.shadowColor = MIAMI_COLORS.cyan;
        ctx.shadowBlur = 8;
      }
      const text =
        `HOTEL JACKPOT +${state.lastJackpot.toLocaleString('en-US')}`;
      ctx.strokeText(text, canvas.width / 2, 286, 360);
      ctx.fillText(text, canvas.width / 2, 286, 360);
    }

    ctx.restore();
  }

  const baseDrawWithAfterHours = draw;
  draw = function drawWithAfterHours() {
    const now = performance.now();

    if (state.active) {
      applyNeonPulse(now);
      try {
        baseDrawWithAfterHours();
      } finally {
        restoreNeonPalette();
      }
      drawAfterHours(now);
      return;
    }

    baseDrawWithAfterHours();
    drawQualificationProgress();
  };

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' AFTER HOURS: complete REEF HOTEL, NEON PALMS, and CAFE OCHO three times each across the game. Qualification and an active 30-second run survive ordinary drains and run independently of other modes. Hit all three businesses to collect escalating 25K, 35K, then 50K HOTEL JACKPOTS; when the run ends, qualify it again.'
    ));
  }
})();
