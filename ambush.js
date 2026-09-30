// Miami Nights: AMBUSH standalone underpass/clock mode.
// Five completed trips that ENTER through the main upper underpass qualify the
// mode across drains. AMBUSH borrows the six physical Clock pegs for 20 seconds
// without advancing the normal Clock / Neon Rush / Midnight story chain.
//
// Scoring climbs 5K -> 10K -> 15K -> 20K -> 25K -> 25K. On timeout, every
// uncleared peg costs 10K and one rotating consequence follows:
// BLACKOUT (neon dim), PRESSURE (half scoring), SABOTAGE (pops score zero).

(() => {
  if (window.miamiAmbushInstalled) return;
  window.miamiAmbushInstalled = true;

  const QUALIFY_TRIPS = 5;
  const DURATION_MS = 20000;
  const FAIL_EFFECT_MS = 10000;
  const MISS_PENALTY = 10000;
  const HIT_AWARDS = [5000, 10000, 15000, 20000, 25000, 25000];
  const FAIL_ROTATION = ['blackout', 'pressure', 'sabotage'];
  const CLOCK_CENTER_X = 210;
  const CLOCK_CENTER_Y = 350;
  const CLOCK_RADIUS_X = 66;
  const CLOCK_RADIUS_Y = 55;
  const PEG_LAMP_INDICES = [0, 2, 4, 6, 8, 10];

  const state = {
    qualifyingTrips: 0,
    pendingStart: false,
    active: false,
    remainingMs: DURATION_MS,
    hitPegs: new Set(),
    hitCount: 0,
    runScore: 0,
    startedAt: -Infinity,
    snapUntil: -Infinity,
    progressFlashUntil: -Infinity,
    progressText: '',
    hitFlashUntil: -Infinity,
    hitFlashText: '',
    resultUntil: -Infinity,
    resultTop: '',
    resultBottom: '',
    failIndex: 0,
    penaltyType: null,
    penaltyRemainingMs: 0,
    lastScoreSeen: typeof score === 'number' ? score : 0
  };
  window.miamiAmbushState = state;

  function formatPoints(value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString();
  }

  function remainingTargets() {
    return Math.max(0, PEG_LAMP_INDICES.length - state.hitPegs.size);
  }

  function penaltyLabel(type) {
    if (type === 'blackout') return 'BLACKOUT';
    if (type === 'pressure') return 'PRESSURE';
    if (type === 'sabotage') return 'SABOTAGE';
    return '';
  }

  function livePlayMs(dt) {
    if (gameOver || ball.ready) return 0;
    return Math.max(0, Number(dt) || 0) * 1000;
  }

  const baseSyncStatusDisplayWithAmbush = syncStatusDisplay;

  function applyPressureToScore() {
    if (state.penaltyType !== 'pressure' || state.penaltyRemainingMs <= 0) {
      state.lastScoreSeen = score;
      return false;
    }

    const delta = score - state.lastScoreSeen;
    if (delta <= 0) {
      state.lastScoreSeen = score;
      return false;
    }

    score = state.lastScoreSeen + Math.round(delta * 0.5);
    state.lastScoreSeen = score;
    return true;
  }

  syncStatusDisplay = function syncStatusDisplayWithAmbushPressure() {
    applyPressureToScore();
    baseSyncStatusDisplayWithAmbush();
  };

  function closeBorrowedClock() {
    if (typeof window.miamiCloseClockForAmbush === 'function') {
      window.miamiCloseClockForAmbush();
    }
  }

  function startAmbush() {
    if (state.active || gameOver) return false;

    const openClock = window.miamiOpenClockForAmbush;
    if (typeof openClock !== 'function' || !openClock()) {
      state.pendingStart = true;
      return false;
    }

    const now = performance.now();
    state.pendingStart = false;
    state.active = true;
    state.qualifyingTrips = 0;
    state.remainingMs = DURATION_MS;
    state.hitPegs.clear();
    state.hitCount = 0;
    state.runScore = 0;
    state.startedAt = now;
    state.snapUntil = now + 520;
    state.hitFlashUntil = -Infinity;
    state.resultUntil = now + 1450;
    state.resultTop = 'AMBUSH!';
    state.resultBottom = '20 SECONDS • HIT ALL 6';

    window.dispatchEvent(new CustomEvent('miami-ambush-start', {
      detail: {
        durationMs: DURATION_MS,
        targets: PEG_LAMP_INDICES.length
      }
    }));
    return true;
  }

  function finishAmbushSuccess() {
    if (!state.active) return;

    state.active = false;
    state.remainingMs = 0;
    closeBorrowedClock();

    const now = performance.now();
    state.resultUntil = now + 2800;
    state.resultTop = 'AMBUSH ESCAPED';
    state.resultBottom = `+${formatPoints(state.runScore)}`;

    window.dispatchEvent(new CustomEvent('miami-ambush-success', {
      detail: {
        score: state.runScore,
        targetsCleared: state.hitPegs.size
      }
    }));
  }

  function beginFailEffect() {
    const type = FAIL_ROTATION[state.failIndex % FAIL_ROTATION.length];
    state.failIndex = (state.failIndex + 1) % FAIL_ROTATION.length;
    state.penaltyType = type;
    state.penaltyRemainingMs = FAIL_EFFECT_MS;
    state.lastScoreSeen = score;
    return type;
  }

  function finishAmbushFailure() {
    if (!state.active) return;

    const uncleared = remainingTargets();
    const requestedPenalty = uncleared * MISS_PENALTY;
    const before = score;
    score = Math.max(0, score - requestedPenalty);
    state.lastScoreSeen = score;
    baseSyncStatusDisplayWithAmbush();
    const actualPenalty = before - score;

    state.active = false;
    state.remainingMs = 0;
    closeBorrowedClock();

    const failEffect = beginFailEffect();
    const now = performance.now();
    state.resultUntil = now + 3300;
    state.resultTop = 'AMBUSH FAILED';
    state.resultBottom =
      `-${formatPoints(actualPenalty)} • ${penaltyLabel(failEffect)}`;

    window.dispatchEvent(new CustomEvent('miami-ambush-fail', {
      detail: {
        uncleared,
        requestedPenalty,
        penalty: actualPenalty,
        consequence: failEffect,
        consequenceMs: FAIL_EFFECT_MS
      }
    }));
  }

  function abortAmbush() {
    if (!state.active) return;
    state.active = false;
    state.remainingMs = 0;
    closeBorrowedClock();
  }

  window.addEventListener('miami-underpass-trip-complete', event => {
    const detail = event.detail || {};
    if (gameOver || state.active) return;
    if (Number(detail.sourceIndex) !== 0) return;

    state.qualifyingTrips = Math.min(
      QUALIFY_TRIPS,
      state.qualifyingTrips + 1
    );

    const now = performance.now();
    state.progressText = `AMBUSH ${state.qualifyingTrips}/${QUALIFY_TRIPS}`;
    state.progressFlashUntil = now + 1450;

    window.dispatchEvent(new CustomEvent('miami-ambush-progress', {
      detail: {
        trips: state.qualifyingTrips,
        required: QUALIFY_TRIPS
      }
    }));

    if (state.qualifyingTrips >= QUALIFY_TRIPS) startAmbush();
  });

  window.addEventListener('miami-clock-peg-hit', event => {
    const detail = event.detail || {};
    if (!state.active || detail.mode !== 'ambush') return;

    const pegIndex = Number(detail.pegIndex);
    if (
      !Number.isInteger(pegIndex) ||
      pegIndex < 0 ||
      pegIndex >= PEG_LAMP_INDICES.length ||
      state.hitPegs.has(pegIndex)
    ) return;

    state.hitPegs.add(pegIndex);
    const award = HIT_AWARDS[Math.min(state.hitCount, HIT_AWARDS.length - 1)];
    state.hitCount += 1;

    const before = score;
    score += award;
    syncStatusDisplay();
    const actualAward = Math.max(0, score - before);
    state.runScore += actualAward;

    state.hitFlashText =
      `+${formatPoints(actualAward)} • ${remainingTargets()} LEFT`;
    state.hitFlashUntil = performance.now() + 1050;
  });

  window.addEventListener('miami-clock-complete', event => {
    if (!state.active || event.detail?.mode !== 'ambush') return;
    finishAmbushSuccess();
  });

  // SABOTAGE makes the pop-bank physically live but worth zero for ten seconds.
  // Restore the score to the value immediately before the bumper event, which
  // also cancels any earlier same-event 3X bonus listeners.
  window.addEventListener('miami-pop-bumper', event => {
    if (state.penaltyType !== 'sabotage' || state.penaltyRemainingMs <= 0) return;

    const detail = event.detail || {};
    const points = Math.max(0, Number(detail.points) || 0);
    const scoreAfterBaseHit = Number(detail.score);
    if (!Number.isFinite(scoreAfterBaseHit) || points <= 0) return;

    const scoreBeforeBumper = scoreAfterBaseHit - points;
    if (score > scoreBeforeBumper) {
      score = Math.max(0, scoreBeforeBumper);
      state.lastScoreSeen = score;
      baseSyncStatusDisplayWithAmbush();
    }
  });

  const baseUpdateWithAmbush = update;
  update = function updateWithAmbush(dt) {
    baseUpdateWithAmbush(dt);

    // Catch score paths that do not call syncStatusDisplay immediately.
    if (applyPressureToScore()) baseSyncStatusDisplayWithAmbush();

    if (gameOver) {
      abortAmbush();
      return;
    }

    if (state.pendingStart && !state.active) startAmbush();

    const elapsedMs = livePlayMs(dt);

    if (state.active && elapsedMs > 0) {
      state.remainingMs = Math.max(0, state.remainingMs - elapsedMs);
      if (state.remainingMs <= 0) finishAmbushFailure();
    }

    if (state.penaltyType && elapsedMs > 0) {
      state.penaltyRemainingMs = Math.max(
        0,
        state.penaltyRemainingMs - elapsedMs
      );
      if (state.penaltyRemainingMs <= 0) {
        state.penaltyType = null;
        state.lastScoreSeen = score;
      }
    }
  };

  function clockPoint(pegIndex) {
    const lampIndex = PEG_LAMP_INDICES[pegIndex];
    const angle = -Math.PI / 2 + lampIndex * Math.PI * 2 / 12;
    return {
      x: CLOCK_CENTER_X + Math.cos(angle) * CLOCK_RADIUS_X,
      y: CLOCK_CENTER_Y + Math.sin(angle) * CLOCK_RADIUS_Y
    };
  }

  function activePaletteOverride(now) {
    if (state.active && now < state.snapUntil) {
      return {
        cyan: '#ff405f',
        magenta: '#ff2ea6',
        lavender: '#ff76c8'
      };
    }

    if (state.penaltyType === 'blackout' && state.penaltyRemainingMs > 0) {
      return {
        cyan: 'rgba(34, 223, 243, 0.16)',
        magenta: 'rgba(255, 60, 172, 0.16)',
        lavender: 'rgba(201, 184, 255, 0.14)'
      };
    }

    return null;
  }

  function drawCompactPanel(top, bottom, y, accent = '#ff2ea6') {
    const width = 152;
    const height = bottom ? 31 : 20;
    const x = CLOCK_CENTER_X - width / 2;

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(1, 4, 10, 0.90)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 8;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 10px ui-monospace, monospace';
    ctx.fillText(top, CLOCK_CENTER_X, y + (bottom ? 9 : 10), width - 10);

    if (bottom) {
      ctx.globalAlpha = 0.88;
      ctx.font = '800 8px ui-monospace, monospace';
      ctx.fillStyle = accent;
      ctx.fillText(bottom, CLOCK_CENTER_X, y + 22, width - 10);
    }
    ctx.restore();
  }

  function drawTargetPressure(now) {
    if (!state.active) return;

    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const pulse = 0.5 + 0.5 * Math.sin(now / 78);

    for (let pegIndex = 0; pegIndex < PEG_LAMP_INDICES.length; pegIndex += 1) {
      if (state.hitPegs.has(pegIndex)) continue;
      const point = clockPoint(pegIndex);
      const accent = pegIndex % 2 === 0 ? '#ff315f' : MIAMI_COLORS.magenta;

      ctx.save();
      ctx.globalAlpha = 0.68 + pulse * 0.32;
      ctx.strokeStyle = pulse > 0.74 ? '#ffffff' : accent;
      ctx.lineWidth = 2.4 + pulse * 1.2;
      ctx.shadowColor = accent;
      ctx.shadowBlur = mobile ? 0 : 10 + pulse * 12;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 12 + pulse * 2.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawAmbushPresentation(now) {
    drawTargetPressure(now);

    if (state.active) {
      const seconds = Math.max(0, Math.ceil(state.remainingMs / 1000));
      const top = `AMBUSH ${seconds}S • ${remainingTargets()} LEFT`;
      const bottom = now < state.hitFlashUntil ? state.hitFlashText : '';
      drawCompactPanel(top, bottom, CLOCK_CENTER_Y - 91, '#ff315f');
      return;
    }

    if (now < state.resultUntil && state.resultTop) {
      drawCompactPanel(
        state.resultTop,
        state.resultBottom,
        CLOCK_CENTER_Y - 91,
        state.resultTop === 'AMBUSH FAILED' ? '#ff315f' : MIAMI_COLORS.cyan
      );
      return;
    }

    if (state.penaltyType && state.penaltyRemainingMs > 0) {
      const seconds = Math.max(1, Math.ceil(state.penaltyRemainingMs / 1000));
      const detail = state.penaltyType === 'sabotage'
        ? 'POPS OFFLINE'
        : state.penaltyType === 'pressure'
          ? 'HALF SCORE'
          : 'NEON DARK';
      drawCompactPanel(
        `${penaltyLabel(state.penaltyType)} ${seconds}S`,
        detail,
        CLOCK_CENTER_Y - 91,
        '#ff315f'
      );
    }

    if (
      now < state.progressFlashUntil &&
      state.progressText &&
      typeof underpass !== 'undefined' &&
      underpass.entry
    ) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 9px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(1, 4, 10, 0.92)';
      ctx.lineWidth = 3;
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 8;
      const x = underpass.entry.x;
      const y = underpass.entry.y - 19;
      ctx.strokeText(state.progressText, x, y);
      ctx.fillText(state.progressText, x, y);
      ctx.restore();
    }
  }

  const baseDrawWithAmbush = draw;
  draw = function drawWithAmbush() {
    const now = performance.now();
    const override = activePaletteOverride(now);
    const previousOverride = window.miamiAmbushPaletteOverride;
    let savedPalette = null;

    if (override) {
      savedPalette = {
        cyan: MIAMI_COLORS.cyan,
        magenta: MIAMI_COLORS.magenta,
        lavender: MIAMI_COLORS.lavender
      };
      window.miamiAmbushPaletteOverride = override;
      MIAMI_COLORS.cyan = override.cyan;
      MIAMI_COLORS.magenta = override.magenta;
      MIAMI_COLORS.lavender = override.lavender;
    }

    try {
      baseDrawWithAmbush();
    } finally {
      if (savedPalette) {
        MIAMI_COLORS.cyan = savedPalette.cyan;
        MIAMI_COLORS.magenta = savedPalette.magenta;
        MIAMI_COLORS.lavender = savedPalette.lavender;
        window.miamiAmbushPaletteOverride = previousOverride;
      }
    }

    drawAmbushPresentation(now);
  };

  function resetAmbushForNewGame() {
    if (state.active) closeBorrowedClock();
    state.qualifyingTrips = 0;
    state.pendingStart = false;
    state.active = false;
    state.remainingMs = DURATION_MS;
    state.hitPegs.clear();
    state.hitCount = 0;
    state.runScore = 0;
    state.startedAt = -Infinity;
    state.snapUntil = -Infinity;
    state.progressFlashUntil = -Infinity;
    state.progressText = '';
    state.hitFlashUntil = -Infinity;
    state.hitFlashText = '';
    state.resultUntil = -Infinity;
    state.resultTop = '';
    state.resultBottom = '';
    state.failIndex = 0;
    state.penaltyType = null;
    state.penaltyRemainingMs = 0;
    state.lastScoreSeen = score;
  }

  const baseResetGameWithAmbush = resetGame;
  resetGame = function resetGameWithAmbush() {
    resetAmbushForNewGame();
    baseResetGameWithAmbush();
    state.lastScoreSeen = score;
  };

  window.miamiTestStartAmbush = function miamiTestStartAmbush() {
    if (!window.miamiTestModeActive) return false;
    state.qualifyingTrips = 0;
    return startAmbush();
  };

  window.miamiTestFailAmbush = function miamiTestFailAmbush() {
    if (!window.miamiTestModeActive || !state.active) return false;
    finishAmbushFailure();
    return true;
  };

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' AMBUSH: complete five trips entering through the main upper underpass; progress survives drains. You then have 20 seconds to knock down all six Clock pegs. Hits climb from 5K to 25K. A timeout loses 10K per uncleared peg and rotates BLACKOUT, PRESSURE, and SABOTAGE consequences.'
    ));
  }
})();
