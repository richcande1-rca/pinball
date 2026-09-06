// Miami Nights: first connected rules/strategy layer.
//
// Major feature loop:
//   OCEAN DRIVE + CIRCLE + HOTEL DISTRICT -> CAPTIVE READY.
// This build deliberately stops before spawning multiball; the ready state is
// persistent and exposes a future consume hook for the multiball engine.
//
// Tactical helpers:
//   center drop bank -> 15s captive-hit 2X value
//   captive-side pair -> next eligible captive hit counts as two progress hits
//   upper-right pair -> spots one hotel-district step for the current ball

(() => {
  if (window.miamiStrategyRulesInstalled) return;
  window.miamiStrategyRulesInstalled = true;

  const OCEAN_HOT_VALUES = [2500, 5000, 7500, 10000];
  const CAPTIVE_VALUE_BOOST_SECONDS = 15;
  const CAPTIVE_FEATURE_LAMPS = [
    { key: 'ocean', label: 'O', y: 238, accent: 'cyan' },
    { key: 'circle', label: 'C', y: 226, accent: 'lavender' },
    { key: 'hotels', label: 'H', y: 214, accent: 'magenta' }
  ];

  const state = {
    features: {
      ocean: false,
      circle: false,
      hotels: false
    },
    featureCount: 0,
    captiveReady: false,
    oceanHot: false,
    oceanHotShots: 0,
    oceanHotNextAward: OCEAN_HOT_VALUES[0],
    circlePassesThisBall: 0,
    hotelProgressThisBall: 0,
    hotelSpottedThisBall: false,
    captiveScoreBoostRemaining: 0,
    captiveProgressBoostArmed: false
  };
  window.miamiStrategyState = state;

  const hotelBusinessesThisBall = new Set();
  const captiveSideHits = new Set();
  const upperRightHits = new Set();
  const pendingAwards = [];

  function tableScoreMultiplier() {
    return (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    ) ? 2 : 1;
  }

  function queueAward(kind, basePoints, detail = {}) {
    pendingAwards.push({
      kind,
      basePoints,
      multiplier: tableScoreMultiplier(),
      detail
    });
  }

  function flushPendingAwards() {
    if (pendingAwards.length === 0) return;

    let changedScore = false;
    while (pendingAwards.length > 0) {
      const award = pendingAwards.shift();
      const points = award.basePoints * award.multiplier;
      score += points;
      changedScore = true;
      window.dispatchEvent(new CustomEvent('miami-strategy-award', {
        detail: {
          kind: award.kind,
          basePoints: award.basePoints,
          multiplier: award.multiplier,
          points,
          score,
          ...award.detail
        }
      }));
    }

    if (changedScore) syncStatusDisplay();
  }

  function featureCount() {
    return Object.values(state.features).filter(Boolean).length;
  }

  function qualifyFeature(key) {
    if (!Object.prototype.hasOwnProperty.call(state.features, key)) return;
    if (state.features[key]) return;

    state.features[key] = true;
    state.featureCount = featureCount();

    window.dispatchEvent(new CustomEvent('miami-feature-qualified', {
      detail: {
        feature: key,
        count: state.featureCount,
        total: 3
      }
    }));

    if (state.featureCount === 3 && !state.captiveReady) {
      state.captiveReady = true;
      window.dispatchEvent(new CustomEvent('miami-captive-ready', {
        detail: { count: 3, total: 3 }
      }));
    }
  }

  function resetPerBallStrategy() {
    state.circlePassesThisBall = 0;
    state.hotelProgressThisBall = 0;
    state.hotelSpottedThisBall = false;
    state.captiveScoreBoostRemaining = 0;
    state.captiveProgressBoostArmed = false;
    hotelBusinessesThisBall.clear();
    captiveSideHits.clear();
    upperRightHits.clear();
  }

  function resetStrategyForNewGame() {
    state.features.ocean = false;
    state.features.circle = false;
    state.features.hotels = false;
    state.featureCount = 0;
    state.captiveReady = false;
    state.oceanHot = false;
    state.oceanHotShots = 0;
    state.oceanHotNextAward = OCEAN_HOT_VALUES[0];
    pendingAwards.length = 0;
    resetPerBallStrategy();
  }

  function updateHotelProgress() {
    const spottedCredit = state.hotelSpottedThisBall ? 1 : 0;
    state.hotelProgressThisBall = Math.min(
      3,
      hotelBusinessesThisBall.size + spottedCredit
    );

    window.dispatchEvent(new CustomEvent('miami-hotel-progress', {
      detail: {
        progress: state.hotelProgressThisBall,
        total: 3,
        spotted: state.hotelSpottedThisBall
      }
    }));

    if (state.hotelProgressThisBall >= 3) qualifyFeature('hotels');
  }

  function markHotelBusiness(id) {
    if (state.features.hotels || hotelBusinessesThisBall.has(id)) return;
    hotelBusinessesThisBall.add(id);
    updateHotelProgress();
  }

  // The business module already owns the actual physical detection. Strategy
  // consumes its discrete events instead of re-checking spinner/capture geometry
  // independently at the 240 Hz physics rate.
  window.addEventListener('miami-reef-complete', () => {
    markHotelBusiness('reef');
  });
  window.addEventListener('miami-neon-palms-hit', () => {
    markHotelBusiness('neon');
  });
  window.addEventListener('miami-cafe-ocho-capture', () => {
    markHotelBusiness('cafe');
  });

  window.addEventListener('miami-loop-complete', () => {
    if (state.features.circle) return;
    state.circlePassesThisBall = Math.min(3, state.circlePassesThisBall + 1);
    if (state.circlePassesThisBall >= 3) qualifyFeature('circle');
  });

  window.addEventListener('miami-spinner-exit', () => {
    const letters = typeof oceanDriveLettersLit !== 'undefined'
      ? oceanDriveLettersLit
      : 0;

    if (!state.features.ocean && letters >= 10) {
      state.oceanHot = true;
      state.oceanHotShots = 0;
      state.oceanHotNextAward = OCEAN_HOT_VALUES[0];
      qualifyFeature('ocean');
      window.dispatchEvent(new CustomEvent('miami-ocean-hot', {
        detail: { nextAward: state.oceanHotNextAward }
      }));
      return;
    }

    if (!state.oceanHot || !state.features.ocean) return;

    const valueIndex = Math.min(
      state.oceanHotShots,
      OCEAN_HOT_VALUES.length - 1
    );
    const basePoints = OCEAN_HOT_VALUES[valueIndex];
    state.oceanHotShots += 1;
    state.oceanHotNextAward = OCEAN_HOT_VALUES[Math.min(
      state.oceanHotShots,
      OCEAN_HOT_VALUES.length - 1
    )];

    queueAward('ocean-hot', basePoints, {
      hotShot: state.oceanHotShots,
      nextAward: state.oceanHotNextAward
    });
  });

  window.addEventListener('miami-secondary-bank-complete', event => {
    const detail = event.detail || {};
    if (detail.group !== 'center') return;

    state.captiveScoreBoostRemaining = CAPTIVE_VALUE_BOOST_SECONDS;
    window.dispatchEvent(new CustomEvent('miami-captive-value-boost', {
      detail: { seconds: CAPTIVE_VALUE_BOOST_SECONDS }
    }));
  });

  window.addEventListener('miami-secondary-target', event => {
    const detail = event.detail || {};
    const groupIndex = Number(detail.groupIndex);

    if (detail.group === 'captive-side') {
      if (state.captiveProgressBoostArmed) return;
      captiveSideHits.add(groupIndex);
      if (captiveSideHits.size >= 2) {
        captiveSideHits.clear();
        state.captiveProgressBoostArmed = true;
        window.dispatchEvent(new CustomEvent('miami-captive-progress-armed', {
          detail: { extraProgress: 1 }
        }));
      }
      return;
    }

    if (detail.group === 'upper-right') {
      if (state.features.hotels || state.hotelSpottedThisBall) return;
      upperRightHits.add(groupIndex);
      if (upperRightHits.size >= 2) {
        upperRightHits.clear();
        state.hotelSpottedThisBall = true;
        updateHotelProgress();
        window.dispatchEvent(new CustomEvent('miami-hotel-spotted', {
          detail: {
            progress: state.hotelProgressThisBall,
            total: 3
          }
        }));
      }
    }
  });

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (detail.type !== 'post' || Number(detail.index) !== 8) return;

    // A completed center drop bank doubles the normal captive-ball hit value.
    // Queue the extra copy outside the existing center-2X update wrapper so the
    // table multiplier composes exactly once instead of accidentally becoming 4X.
    if (state.captiveScoreBoostRemaining > 0) {
      queueAward('captive-value-boost', 500, {
        remaining: state.captiveScoreBoostRemaining
      });
    }

    // The side pair adds one extra progress step to the next captive hit. If the
    // ordinary hit already awarded the extra ball, keep the helper armed for the
    // next repeat cycle rather than wasting it during the 900 ms reset window.
    if (
      state.captiveProgressBoostArmed &&
      typeof captiveExtraBallAwarded !== 'undefined' &&
      !captiveExtraBallAwarded &&
      typeof captiveHitProgress !== 'undefined' &&
      typeof CAPTIVE_EXTRA_BALL_HITS !== 'undefined'
    ) {
      state.captiveProgressBoostArmed = false;
      captiveHitProgress = Math.min(
        CAPTIVE_EXTRA_BALL_HITS,
        captiveHitProgress + 1
      );

      let extraBallAwarded = false;
      if (
        captiveHitProgress >= CAPTIVE_EXTRA_BALL_HITS &&
        !captiveExtraBallAwarded
      ) {
        captiveExtraBallAwarded = true;
        captiveExtraBallFlashStartedAt = performance.now();
        ballsRemaining += 1;
        extraBallAwarded = true;
      }

      syncStatusDisplay();
      window.dispatchEvent(new CustomEvent('miami-captive-progress-boost', {
        detail: {
          progress: captiveHitProgress,
          total: CAPTIVE_EXTRA_BALL_HITS,
          extraBallAwarded
        }
      }));
    }
  });

  function drawCaptiveFeatureLamps() {
    const now = performance.now();
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const readyPulse = state.captiveReady
      ? 0.55 + 0.45 * Math.sin(now / 105)
      : 0;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 5px ui-monospace, monospace';

    for (const lamp of CAPTIVE_FEATURE_LAMPS) {
      const lit = state.features[lamp.key];
      const accent = MIAMI_COLORS[lamp.accent] || MIAMI_COLORS.lavender;

      ctx.globalAlpha = lit ? 1 : 0.45;
      ctx.fillStyle = lit
        ? (state.captiveReady && readyPulse > 0.82 ? '#ffffff' : accent)
        : '#050914';
      ctx.strokeStyle = lit ? '#ffffff' : MIAMI_COLORS.lavender;
      ctx.lineWidth = lit ? 1.3 : 1;
      if (!mobile && lit) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = state.captiveReady ? 5 + readyPulse * 7 : 4;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(96, lamp.y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = lit ? '#ffffff' : MIAMI_COLORS.lavender;
      ctx.fillText(lamp.label, 96, lamp.y + 0.3);
    }

    if (state.captiveReady) {
      ctx.globalAlpha = 0.72 + readyPulse * 0.28;
      ctx.font = '800 6px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = MIAMI_COLORS.magenta;
      ctx.shadowBlur = mobile ? 0 : 6;
      ctx.fillText('READY', 70, 236);
    } else if (state.captiveProgressBoostArmed) {
      ctx.globalAlpha = 0.9;
      ctx.font = '800 6px ui-monospace, monospace';
      ctx.fillStyle = MIAMI_COLORS.cyan;
      ctx.shadowBlur = 0;
      ctx.fillText('+1', 70, 236);
    } else if (state.captiveScoreBoostRemaining > 0) {
      ctx.globalAlpha = 0.9;
      ctx.font = '800 6px ui-monospace, monospace';
      ctx.fillStyle = MIAMI_COLORS.magenta;
      ctx.shadowBlur = 0;
      ctx.fillText('2X', 70, 236);
    }

    ctx.restore();
  }

  function drawCaptiveReadyRingOverlay() {
    if (!state.captiveReady) return;

    const now = performance.now();
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const centerX = 210;
    const centerY = 350;
    const radiusX = 66;
    const radiusY = 55;

    // A small animated core is painted inside each existing palm-ring insert.
    // The underlying normal event patterns remain visible around it.
    for (let index = 0; index < 12; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 12;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      const distanceFromCaptiveSide = Math.min(
        Math.abs(index - 9),
        12 - Math.abs(index - 9)
      );
      const wave = 0.5 + 0.5 * Math.sin(
        now / 115 + distanceFromCaptiveSide * 1.25
      );
      const accent = index < 6 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;

      ctx.save();
      ctx.globalAlpha = 0.25 + wave * 0.75;
      ctx.fillStyle = wave > 0.82 ? '#ffffff' : accent;
      if (!mobile && wave > 0.9) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 5;
      }
      ctx.beginPath();
      ctx.arc(x, y, 1.7 + wave * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawOceanHotChase() {
    if (!state.oceanHot) return;
    if (
      typeof oceanDriveProgressLetters === 'undefined' ||
      typeof oceanDriveLetterProgress === 'undefined' ||
      typeof oceanRampPath === 'undefined' ||
      typeof sampleSmoothPath !== 'function'
    ) return;

    const now = performance.now();
    const head = Math.floor(now / 120) % oceanDriveProgressLetters.length;
    const mobile = Boolean(window.miamiMobilePerformanceMode);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 14px ui-monospace, monospace';
    ctx.lineWidth = 1;

    for (let index = 0; index < oceanDriveProgressLetters.length; index += 1) {
      const point = sampleSmoothPath(
        oceanRampPath,
        oceanDriveLetterProgress[index]
      );
      const direct = Math.abs(index - head);
      const distance = Math.min(
        direct,
        oceanDriveProgressLetters.length - direct
      );
      const intensity = distance === 0 ? 1 : distance === 1 ? 0.62 : 0.14;
      const accent = index % 2 === 0
        ? MIAMI_COLORS.cyan
        : MIAMI_COLORS.magenta;

      ctx.globalAlpha = intensity;
      ctx.fillStyle = distance === 0 ? '#ffffff' : accent;
      ctx.strokeStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = !mobile && distance === 0 ? 7 : 0;
      ctx.strokeText(oceanDriveProgressLetters[index], point.x, point.y);
      ctx.fillText(oceanDriveProgressLetters[index], point.x, point.y);
    }

    ctx.restore();
  }

  const baseUpdateWithStrategy = update;
  update = function updateWithStrategy(dt) {
    baseUpdateWithStrategy(dt);

    if (
      !gameOver &&
      !ball.ready &&
      state.captiveScoreBoostRemaining > 0
    ) {
      state.captiveScoreBoostRemaining = Math.max(
        0,
        state.captiveScoreBoostRemaining - dt
      );
    }

    flushPendingAwards();
  };

  const baseDrawPassiveGeometryWithStrategy = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassivePlayfieldGeometryWithStrategy() {
    baseDrawPassiveGeometryWithStrategy();
    drawCaptiveFeatureLamps();
  };

  const baseDrawMiamiArtworkWithStrategy = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithStrategy() {
    baseDrawMiamiArtworkWithStrategy();
    drawCaptiveReadyRingOverlay();
  };

  const baseDrawOceanRampWithStrategy = drawOceanRamp;
  drawOceanRamp = function drawOceanRampWithStrategy() {
    baseDrawOceanRampWithStrategy();
    drawOceanHotChase();
  };

  window.addEventListener('miami-drain', resetPerBallStrategy);

  const baseResetGameWithStrategy = resetGame;
  resetGame = function resetGameWithStrategy() {
    resetStrategyForNewGame();
    baseResetGameWithStrategy();
  };

  // Future multiball activation should call this only when the actual multiball
  // start succeeds. Until then CAPTIVE READY remains lit and nothing is consumed.
  window.miamiConsumeCaptiveReadyForMultiball = function () {
    if (!state.captiveReady) return false;

    state.features.ocean = false;
    state.features.circle = false;
    state.features.hotels = false;
    state.featureCount = 0;
    state.captiveReady = false;
    state.oceanHot = false;
    state.oceanHotShots = 0;
    state.oceanHotNextAward = OCEAN_HOT_VALUES[0];
    if (typeof oceanDriveLettersLit !== 'undefined') oceanDriveLettersLit = 0;
    resetPerBallStrategy();

    window.dispatchEvent(new CustomEvent('miami-strategy-consumed'));
    return true;
  };

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Strategy: complete OCEAN DRIVE, three circle passes, and the hotel district to light O/C/H beside the captive ball. All three light CAPTIVE READY. Completed OCEAN DRIVE stays HOT for 2500, 5000, 7500, then 10000 per additional pass. The center drop bank gives 15 seconds of 2X captive-hit value; the two captive-side standups make the next eligible captive hit count as two progress hits; the upper-right pair spots one hotel-district step for that ball.'
    ));
  }
})();