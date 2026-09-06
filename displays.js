// Miami Nights: dual lower apron displays and faster Ocean Drive lettering.
// Loaded late so it can add presentation feedback inside the existing lower
// MIAMI / NIGHTS panels without disturbing stable gameplay geometry.

(() => {
  if (window.miamiDisplaysInstalled) return;
  window.miamiDisplaysInstalled = true;

  const DISPLAY_HOLD_MS = 2800;
  const MIN_EVENT_HOLD_MS = 2500;
  const STARTUP_FLASH_MS = 720;
  const STARTUP_FLASH_INTERVAL_MS = 90;
  const displayEvent = {
    left: 'READY',
    right: 'BALL 1',
    startedAt: 0,
    until: 0,
    blinkInterval: 0,
    leftAccent: 'cyan',
    rightAccent: 'magenta'
  };
  let circleDisplayProgress = 0;

  // The apron panels are still cached offscreen. They are slightly taller and
  // wider now, and only re-render during the brief event strobe or when text
  // changes; steady frames remain two cheap drawImage calls.
  const PANEL_WIDTH = 166;
  const PANEL_HEIGHT = 30;
  const panelCache = {
    left: makePanelCache('left', 24, 665, 78),
    right: makePanelCache('right', 230, 665, 88)
  };

  function makePanelCache(side, x, y, centerX) {
    const canvas = document.createElement('canvas');
    canvas.width = PANEL_WIDTH;
    canvas.height = PANEL_HEIGHT;
    return {
      side,
      x,
      y,
      centerX,
      canvas,
      ctx: canvas.getContext('2d'),
      key: ''
    };
  }

  function flashDisplays(
    left,
    right,
    duration = DISPLAY_HOLD_MS,
    leftAccent = 'cyan',
    rightAccent = 'magenta',
    blinkInterval = 0
  ) {
    const now = performance.now();
    displayEvent.left = left;
    displayEvent.right = right;
    displayEvent.startedAt = now;
    displayEvent.until = now + Math.max(duration, MIN_EVENT_HOLD_MS);
    displayEvent.blinkInterval = blinkInterval;
    displayEvent.leftAccent = leftAccent;
    displayEvent.rightAccent = rightAccent;
  }

  function idleLeftText() {
    if (gameOver) return 'GAME OVER';
    if (ball.ready) return 'READY';
    return 'PLAY';
  }

  function idleRightText() {
    if (gameOver) return `BALL ${ballNumber}`;

    // Timed/scoring modes get first priority, then persistent progress. The top
    // strip remains the only score display; this panel is for useful mode state.
    if (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    ) {
      return `2X ${Math.ceil(centerDoubleScoreRemaining)}S`;
    }

    if (circleDisplayProgress >= 3) return '3X ACTIVE';

    if (
      typeof captiveHitProgress !== 'undefined' &&
      typeof captiveExtraBallAwarded !== 'undefined' &&
      captiveHitProgress > 0 &&
      !captiveExtraBallAwarded
    ) {
      return `EXTRA ${captiveHitProgress}/5`;
    }

    if (
      typeof oceanDriveLettersLit !== 'undefined' &&
      oceanDriveLettersLit > 0
    ) {
      return oceanDriveLettersLit >= 10
        ? 'OCEAN LIT'
        : `OCEAN ${oceanDriveLettersLit}/10`;
    }

    return `BALL ${ballNumber}`;
  }

  // These enlarged insets now use nearly the full lower-apron polygons while
  // still leaving a thin cabinet edge around them.
  function traceCachedPanel(targetCtx, side) {
    targetCtx.beginPath();
    if (side === 'left') {
      targetCtx.moveTo(1, 1);
      targetCtx.lineTo(140, 1);
      targetCtx.lineTo(165, 29);
      targetCtx.lineTo(1, 29);
    } else {
      targetCtx.moveTo(165, 1);
      targetCtx.lineTo(26, 1);
      targetCtx.lineTo(1, 29);
      targetCtx.lineTo(165, 29);
    }
    targetCtx.closePath();
  }

  function renderPanel(cache, text, accentName, eventActive, flashLevel = 0) {
    const accent = MIAMI_COLORS[accentName] || MIAMI_COLORS.lavender;
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const nextKey = [
      text,
      accentName,
      eventActive ? 'event' : 'idle',
      flashLevel,
      mobile ? 'mobile' : 'desktop'
    ].join('|');
    if (cache.key === nextKey) return;
    cache.key = nextKey;

    const panelCtx = cache.ctx;
    panelCtx.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    panelCtx.save();

    const face = panelCtx.createLinearGradient(0, 0, 0, PANEL_HEIGHT);
    face.addColorStop(0, flashLevel > 1
      ? 'rgba(16, 34, 58, 0.99)'
      : 'rgba(5, 16, 34, 0.99)');
    face.addColorStop(1, 'rgba(1, 4, 10, 0.99)');
    traceCachedPanel(panelCtx, cache.side);
    panelCtx.fillStyle = face;
    panelCtx.fill();

    if (eventActive && flashLevel > 0) {
      panelCtx.globalAlpha = flashLevel > 1 ? 0.2 : 0.09;
      panelCtx.fillStyle = accent;
      traceCachedPanel(panelCtx, cache.side);
      panelCtx.fill();
    }

    panelCtx.globalAlpha = eventActive ? 1 : 0.82;
    panelCtx.strokeStyle = flashLevel > 1 ? '#ffffff' : accent;
    panelCtx.lineWidth = eventActive ? (flashLevel > 1 ? 2.35 : 1.8) : 1.2;
    panelCtx.shadowColor = accent;
    panelCtx.shadowBlur = mobile ? 0 :
      (eventActive ? (flashLevel > 1 ? 12 : 6) : 3);
    traceCachedPanel(panelCtx, cache.side);
    panelCtx.stroke();

    // Brighter glass streak during the event strobe; steady states remain calm.
    panelCtx.globalAlpha = eventActive ? (flashLevel > 1 ? 0.34 : 0.18) : 0.1;
    panelCtx.strokeStyle = '#f4ffff';
    panelCtx.lineWidth = flashLevel > 1 ? 1.5 : 1;
    panelCtx.shadowBlur = 0;
    panelCtx.beginPath();
    if (cache.side === 'left') {
      panelCtx.moveTo(8, 6);
      panelCtx.lineTo(135, 6);
    } else {
      panelCtx.moveTo(31, 6);
      panelCtx.lineTo(158, 6);
    }
    panelCtx.stroke();

    panelCtx.globalAlpha = 1;
    panelCtx.textAlign = 'center';
    panelCtx.textBaseline = 'middle';
    panelCtx.font = eventActive
      ? `${flashLevel > 1 ? '900 13px' : '900 12.5px'} ui-monospace, monospace`
      : '800 12px ui-monospace, monospace';
    panelCtx.fillStyle = eventActive ? '#ffffff' : accent;
    panelCtx.shadowColor = accent;
    panelCtx.shadowBlur = mobile ? 0 :
      (eventActive ? (flashLevel > 1 ? 12 : 7) : 4);
    panelCtx.fillText(String(text).toUpperCase(), cache.centerX, 16, 132);
    panelCtx.restore();
  }

  function drawCachedPanel(side, text, accentName, eventActive, flashLevel) {
    const cache = panelCache[side];
    renderPanel(cache, text, accentName, eventActive, flashLevel);
    ctx.drawImage(cache.canvas, cache.x, cache.y);
  }

  function drawLowerDisplays() {
    const now = performance.now();
    const showingEvent = now < displayEvent.until;
    const eventAge = now - displayEvent.startedAt;
    let flashLevel = 0;

    // Event text now remains readable for the full hold. The "flash" is a short
    // bright strobe/inversion rather than swapping back to idle text.
    if (showingEvent && eventAge < STARTUP_FLASH_MS) {
      flashLevel =
        Math.floor(eventAge / STARTUP_FLASH_INTERVAL_MS) % 2 === 0 ? 2 : 1;
    } else if (showingEvent && displayEvent.blinkInterval) {
      flashLevel =
        Math.floor(eventAge / displayEvent.blinkInterval) % 2 === 0 ? 2 : 1;
    }

    drawCachedPanel(
      'left',
      showingEvent ? displayEvent.left : idleLeftText(),
      showingEvent ? displayEvent.leftAccent : 'cyan',
      showingEvent,
      flashLevel
    );
    drawCachedPanel(
      'right',
      showingEvent ? displayEvent.right : idleRightText(),
      showingEvent ? displayEvent.rightAccent : 'magenta',
      showingEvent,
      flashLevel
    );
  }

  // Draw directly after the existing lower apron. This is a presentation-only
  // layer: the panel geometry is left untouched and no physics path reads it.
  const baseDrawLowerApronWithDisplays = drawLowerApron;
  drawLowerApron = function drawLowerApronWithDisplays() {
    baseDrawLowerApronWithDisplays();
    drawLowerDisplays();
  };

  // Clean up the crowded lower-right return area without changing its physics.
  // The recovery rail is only a visual guide in core, so this tighter sweep keeps
  // the same feed logic while removing the broad floating hook from the apron.
  if (
    typeof shooterRecoveryGuidePoints !== 'undefined' &&
    Array.isArray(shooterRecoveryGuidePoints)
  ) {
    shooterRecoveryGuidePoints.splice(
      0,
      shooterRecoveryGuidePoints.length,
      { x: 447, y: 516 },
      { x: 439, y: 520 },
      { x: 427, y: 525 },
      { x: 414, y: 530 },
      { x: 401, y: 533 },
      { x: 386, y: 538 }
    );
  }

  if (typeof drawShooterRecoveryGate === 'function') {
    drawShooterRecoveryGate = function drawShooterRecoveryGatePolished() {
      const active = shooterRoute === 'recovery';
      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.2;
      drawSmoothNeonRail(
        shooterRecoveryGuidePoints,
        active ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan
      );
      ctx.restore();
    };
  }

  function drawIntegratedRecoveryExit(mouth) {
    ctx.save();
    ctx.translate(mouth.x, mouth.y);

    // A small recessed slot replaces the large sideways D-shaped tunnel mouth.
    // It stays centered on the real underpass exit and reads as part of the
    // shooter divider rather than as another bumper in the flipper area.
    ctx.fillStyle = '#01030a';
    ctx.strokeStyle = '#4a3b66';
    ctx.lineWidth = 5;
    ctx.fillRect(-5, -12, 10, 24);
    ctx.strokeRect(-5, -12, 10, 24);

    ctx.strokeStyle = MIAMI_COLORS.magenta;
    ctx.lineWidth = 2;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 6;
    ctx.strokeRect(-4, -11, 8, 22);

    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.lineTo(-2, 8);
    ctx.stroke();
    ctx.restore();
  }

  if (
    typeof drawProminentUnderpassMouth === 'function' &&
    typeof drawCompactSideExit === 'function'
  ) {
    drawUnderpassMouths = function drawUnderpassMouthsPolished() {
      drawProminentUnderpassMouth(underpass.entry, MIAMI_COLORS.magenta);
      drawTunnelMouth(underpass.outlets[0], MIAMI_COLORS.lavender);
      drawTunnelMouth(underpass.outlets[1], MIAMI_COLORS.cyan, Math.PI / 2);
      drawTunnelMouth(underpass.outlets[2], MIAMI_COLORS.cyan);
      drawIntegratedRecoveryExit(underpass.outlets[3]);
      drawCompactSideExit(underpass.outlets[4], MIAMI_COLORS.cyan);
    };
  }

  // The existing Ocean Drive listener lights one letter per completed pass.
  // Add two more here so the progression becomes 3, 6, 9, 10 letters across
  // successive passes while preserving the original completion/reset logic.
  window.addEventListener('miami-spinner-exit', () => {
    if (typeof oceanDriveLettersLit === 'undefined') return;

    oceanDriveLettersLit = Math.min(10, oceanDriveLettersLit + 2);
    if (oceanDriveLettersLit >= 10) {
      flashDisplays('OCEAN DRIVE', 'COMPLETE', 2200, 'cyan', 'magenta');
    } else {
      flashDisplays(
        'OCEAN DRIVE',
        `${oceanDriveLettersLit}/10 LIT`,
        1800,
        'cyan',
        'magenta'
      );
    }
  });

  window.addEventListener('miami-ramp-enter', () => {
    flashDisplays('OCEAN DRIVE', 'PASS', 1100, 'cyan', 'magenta');
  });

  // Mirror the circle-pass progress used by circle3x.js. Both systems are driven
  // by the same loop-complete event and both reset on a drain/new game, so this
  // adds display feedback only; scoring and the actual 3X state remain untouched.
  window.addEventListener('miami-loop-complete', event => {
    const points = event.detail && event.detail.points
      ? event.detail.points
      : 2500;
    const wasTripleActive = circleDisplayProgress >= 3;
    circleDisplayProgress = Math.min(3, circleDisplayProgress + 1);

    if (!wasTripleActive && circleDisplayProgress === 3) {
      flashDisplays('3X ACTIVE!', 'CIRCLE MODE', 2200, 'cyan', 'magenta');
      return;
    }

    if (circleDisplayProgress < 3) {
      flashDisplays(
        `CIRCLE ${circleDisplayProgress}/3`,
        `+${points}`,
        1700,
        'cyan',
        'magenta'
      );
      return;
    }

    flashDisplays('LOOP!', `+${points}`, 1500, 'cyan', 'magenta');
  });

  window.addEventListener('miami-magnet-capture', event => {
    const points = event.detail && event.detail.points
      ? event.detail.points
      : 500;
    flashDisplays('MAGNET!', `+${points}`, 1400, 'magenta', 'cyan');
  });

  window.addEventListener('miami-drop-target', event => {
    const detail = event.detail || {};
    if (detail.bankComplete) {
      flashDisplays(
        'BONUS!',
        `3-0-5 +${detail.bankBonus || 3000}`,
        1900,
        'magenta',
        'cyan'
      );
      return;
    }
    flashDisplays('3-0-5', `+${detail.points || 500}`, 900, 'magenta', 'cyan');
  });

  window.addEventListener('miami-pop-bumper', event => {
    const detail = event.detail || {};
    flashDisplays(
      `COMBO X${detail.combo || 1}`,
      `+${detail.points || 100}`,
      650,
      'cyan',
      'magenta'
    );
  });

  // Reuse existing impact events for presentation-only mode announcements.
  // No score, collision or timing values are changed here.
  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    const index = Number(detail.index);

    if (
      index >= 11 &&
      index <= 13 &&
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    ) {
      flashDisplays(
        '2X SCORE!',
        `${Math.ceil(centerDoubleScoreRemaining)} SECONDS`,
        1900,
        'magenta',
        'cyan'
      );
      return;
    }

    if (index === 8 && typeof captiveHitProgress !== 'undefined') {
      if (
        typeof captiveExtraBallAwarded !== 'undefined' &&
        captiveExtraBallAwarded &&
        captiveHitProgress >= 5
      ) {
        flashDisplays('EXTRA BALL!', 'AWARDED', 2400, 'cyan', 'magenta', 160);
      } else {
        flashDisplays(
          'CAPTIVE',
          `EXTRA ${captiveHitProgress}/5`,
          950,
          'cyan',
          'magenta'
        );
      }
      return;
    }

    if (index === 9) {
      flashDisplays('TOP SWITCH!', '+2500', 1300, 'magenta', 'cyan');
    } else if (index === 10) {
      flashDisplays('ROOF HIT!', '+1000', 1200, 'cyan', 'magenta');
    }
  });

  window.addEventListener('miami-reef-complete', event => {
    const award = event.detail && event.detail.award
      ? event.detail.award
      : 2500;
    flashDisplays(
      'BONUS!',
      `REEF +${award}`,
      2400,
      'cyan',
      'magenta',
      140
    );
  });

  window.addEventListener('miami-drain', () => {
    circleDisplayProgress = 0;
    flashDisplays('DRAIN', 'NEXT BALL', 1200, 'magenta', 'cyan');
  });

  const baseResetGameWithCircleDisplay = resetGame;
  resetGame = function resetGameWithCircleDisplay() {
    circleDisplayProgress = 0;
    panelCache.left.key = '';
    panelCache.right.key = '';
    baseResetGameWithCircleDisplay();
  };

  // Give the underpass a display callout without changing its physical/random
  // routing behavior.
  if (typeof tryEnterUnderpass === 'function') {
    const baseTryEnterUnderpassWithDisplay = tryEnterUnderpass;
    tryEnterUnderpass = function tryEnterUnderpassWithDisplay() {
      const entered = baseTryEnterUnderpassWithDisplay();
      if (entered) {
        flashDisplays('UNDERPASS!', '5-WAY', 1400, 'magenta', 'cyan');
      }
      return entered;
    };
  }

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Lower apron displays show event/bonus callouts on the left and live mode/progress status on the right. Each completed Ocean Drive pass lights three letters toward OCEAN DRIVE. Circle loop passes show 1/3, 2/3, then persistent 3X ACTIVE feedback until drain.'
    ));
  }
})();