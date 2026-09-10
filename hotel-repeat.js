// Miami Nights: repeatable REEF HOTEL bank.
// The original business module keeps the physical targets; this late hook owns
// their lamp/scoring cycle so all three floors can be completed repeatedly.

(() => {
  if (window.miamiHotelRepeatInstalled) return;
  window.miamiHotelRepeatInstalled = true;

  const TARGET_VALUE = 400;
  const COMPLETION_VALUE = 2500;
  const BANK_RESET_DELAY_MS = 900;
  const HOTEL_X = 409;
  const HOTEL_ROWS = [
    { y1: 279, y2: 292 },
    { y1: 310, y2: 323 },
    { y1: 341, y2: 354 }
  ];

  const targets = HOTEL_ROWS.map(row => ({
    ...row,
    lit: false,
    flashStartedAt: -Infinity
  }));
  let bankComplete = false;
  let resetAt = -Infinity;

  function multiplier() {
    return typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0 ? 2 : 1;
  }

  function award(basePoints) {
    const points = basePoints * multiplier();
    score += points;
    syncStatusDisplay();
    return points;
  }

  function resetHotelBank() {
    for (const target of targets) {
      target.lit = false;
      target.flashStartedAt = -Infinity;
    }
    bankComplete = false;
    resetAt = -Infinity;
  }

  function hotelTargetIndex(segment) {
    if (!segment || Math.abs(segment.x1 - HOTEL_X) > 0.01 || Math.abs(segment.x2 - HOTEL_X) > 0.01) {
      return -1;
    }
    return HOTEL_ROWS.findIndex(row =>
      Math.abs(segment.y1 - row.y1) < 0.01 &&
      Math.abs(segment.y2 - row.y2) < 0.01
    );
  }

  function hotelsAlreadyQualified() {
    return Boolean(
      window.miamiStrategyState &&
      window.miamiStrategyState.features &&
      window.miamiStrategyState.features.hotels
    );
  }

  function promoteHotelsQualification() {
    const strategy = window.miamiStrategyState;
    if (!strategy || !strategy.features || strategy.features.hotels) return;

    strategy.features.hotels = true;
    strategy.hotelProgressThisBall = 3;
    strategy.featureCount = Object.values(strategy.features).filter(Boolean).length;

    window.dispatchEvent(new CustomEvent('miami-hotel-progress', {
      detail: { progress: 3, total: 3, spotted: strategy.hotelSpottedThisBall }
    }));
    window.dispatchEvent(new CustomEvent('miami-feature-qualified', {
      detail: {
        feature: 'hotels',
        count: strategy.featureCount,
        total: 3
      }
    }));

    if (strategy.featureCount === 3 && !strategy.captiveReady) {
      strategy.captiveReady = true;
      window.dispatchEvent(new CustomEvent('miami-captive-ready', {
        detail: { count: 3, total: 3 }
      }));
    }
  }

  // The first REEF completion retains the established big completion feedback.
  // It also becomes the permanent HOTELS qualification for the current game.
  window.addEventListener('miami-reef-complete', promoteHotelsQualification);

  const baseResolveSegmentCollisionWithHotelRepeat = resolveSegmentCollision;
  resolveSegmentCollision = function resolveSegmentCollisionWithHotelRepeat(
    segment,
    surfaceVelocity = { x: 0, y: 0 },
    restitution = 0.9,
    extraKick = 0
  ) {
    const index = hotelTargetIndex(segment);
    if (index < 0) {
      return baseResolveSegmentCollisionWithHotelRepeat(
        segment,
        surfaceVelocity,
        restitution,
        extraKick
      );
    }

    const target = targets[index];
    const closest = closestPointOnSegment(
      ball.x,
      ball.y,
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2
    );
    const dx = ball.x - closest.x;
    const dy = ball.y - closest.y;
    const distance = Math.hypot(dx, dy);
    let incomingNormalSpeed = 0;
    if (distance > 0.0001) {
      const nx = dx / distance;
      const ny = dy / distance;
      incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
    }

    const touching = baseResolveSegmentCollisionWithHotelRepeat(
      segment,
      surfaceVelocity,
      restitution,
      extraKick
    );

    // Return false to the original business target handler so its one-shot lamp
    // state does not also score or permanently latch the bank. Physical contact
    // was already resolved above.
    if (!touching || bankComplete || target.lit || incomingNormalSpeed < 55) {
      return false;
    }

    const qualifiedBeforeHit = hotelsAlreadyQualified();
    target.lit = true;
    target.flashStartedAt = performance.now();
    const targetPoints = award(TARGET_VALUE);

    window.dispatchEvent(new CustomEvent('miami-impact', {
      detail: {
        type: 'post',
        strength: clamp(incomingNormalSpeed / 700, 0.14, 1),
        x: closest.x,
        y: closest.y,
        // Preserve the established 20-22 event indexes until HOTELS is first
        // qualified. Repeat cycles use 23-25 so reef-feedback does not mistake
        // one repeat hit for another first-time bank completion.
        index: (qualifiedBeforeHit ? 23 : 20) + index
      }
    }));

    window.dispatchEvent(new CustomEvent('miami-hotel-target', {
      detail: {
        index,
        points: targetPoints,
        lit: targets.filter(candidate => candidate.lit).length,
        total: targets.length,
        repeat: qualifiedBeforeHit
      }
    }));

    if (targets.every(candidate => candidate.lit)) {
      bankComplete = true;
      resetAt = performance.now() + BANK_RESET_DELAY_MS;
      const completionPoints = award(COMPLETION_VALUE);

      // First-time completion is announced by reef-feedback after it sees the
      // original 20/21/22 impacts. Once HOTELS is already qualified, announce
      // repeat completions directly so the existing lower display still shows
      // the familiar REEF bonus without replaying the large facade blink.
      if (qualifiedBeforeHit) {
        window.dispatchEvent(new CustomEvent('miami-reef-complete', {
          detail: {
            award: completionPoints,
            repeat: true
          }
        }));
      }

      window.dispatchEvent(new CustomEvent('miami-hotel-bank-complete', {
        detail: {
          points: completionPoints,
          repeat: qualifiedBeforeHit,
          resetDelay: BANK_RESET_DELAY_MS
        }
      }));
    }

    return false;
  };

  const baseUpdateWithHotelRepeat = update;
  update = function updateWithHotelRepeat(dt) {
    baseUpdateWithHotelRepeat(dt);
    if (bankComplete && performance.now() >= resetAt) {
      resetHotelBank();
      window.dispatchEvent(new CustomEvent('miami-hotel-bank-reset'));
    }
  };

  function drawHotelRepeatLights() {
    const now = performance.now();
    for (const [index, target] of targets.entries()) {
      if (!target.lit) continue;
      const centerY = (target.y1 + target.y2) / 2;
      const flashAge = now - target.flashStartedAt;
      const flash = flashAge >= 0 && flashAge < 260
        ? 1 - flashAge / 260
        : 0;

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = flash > 0.45 ? '#ffffff' : MIAMI_COLORS.cyan;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = MIAMI_COLORS.cyan;
      ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : (6 + flash * 8);
      ctx.fillRect(399, centerY - 3.5, 10, 7);
      ctx.strokeRect(399, centerY - 3.5, 10, 7);
      ctx.fillStyle = '#07101d';
      ctx.shadowBlur = 0;
      ctx.font = '700 5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), 404, centerY + 0.5);
      ctx.restore();
    }
  }

  const baseDrawOceanRampWithHotelRepeat = drawOceanRamp;
  drawOceanRamp = function drawOceanRampWithHotelRepeat() {
    baseDrawOceanRampWithHotelRepeat();
    drawHotelRepeatLights();
  };

  window.addEventListener('miami-drain', resetHotelBank);

  const baseResetGameWithHotelRepeat = resetGame;
  resetGame = function resetGameWithHotelRepeat() {
    resetHotelBank();
    baseResetGameWithHotelRepeat();
  };
})();

// MB0 begins the real multiball work without pretending a second ball exists.
// Load the lifecycle/peer contract after every current gameplay wrapper is live.
(() => {
  if (window.miamiMultiballFoundationInstalled) return;
  const script = document.createElement('script');
  script.src = 'multiball-foundation.js?v=20260910-mb0';
  script.async = false;
  document.body.appendChild(script);
})();
