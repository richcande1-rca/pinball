// Miami Nights: dual lower cabinet displays and faster Ocean Drive lettering.
// Loaded last so it can layer display feedback over the existing lower bezels
// without disturbing stable gameplay geometry.

(() => {
  if (window.miamiDisplaysInstalled) return;
  window.miamiDisplaysInstalled = true;

  const DISPLAY_HOLD_MS = 1500;
  const displayEvent = {
    left: 'MIAMI',
    right: 'NIGHTS',
    startedAt: 0,
    until: 0,
    blinkInterval: 0,
    leftAccent: 'cyan',
    rightAccent: 'magenta'
  };
  let circleDisplayProgress = 0;

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
    displayEvent.until = now + duration;
    displayEvent.blinkInterval = blinkInterval;
    displayEvent.leftAccent = leftAccent;
    displayEvent.rightAccent = rightAccent;
  }

  function idleLeftText() {
    if (gameOver) return 'GAME';

    if (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    ) {
      return `2X ${Math.ceil(centerDoubleScoreRemaining)}S`;
    }

    if (
      typeof oceanDriveLettersLit !== 'undefined' &&
      oceanDriveLettersLit > 0
    ) {
      return oceanDriveLettersLit >= 10
        ? 'OCEAN LIT'
        : `OCEAN ${oceanDriveLettersLit}/10`;
    }

    return 'MIAMI';
  }

  function idleRightText() {
    if (gameOver) return 'OVER';

    // Once the three circle passes are complete, keep the earned 3X mode visible
    // between event flashes until the ball drains, matching circle3x.js behavior.
    if (circleDisplayProgress >= 3) return '3X ACTIVE';

    if (
      typeof captiveHitProgress !== 'undefined' &&
      typeof captiveExtraBallAwarded !== 'undefined' &&
      captiveHitProgress > 0 &&
      !captiveExtraBallAwarded
    ) {
      return `EXTRA ${captiveHitProgress}/5`;
    }

    return 'NIGHTS';
  }

  function traceDisplayPanel(side) {
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(40, 672);
      ctx.lineTo(170, 672);
      ctx.lineTo(184, 697);
      ctx.lineTo(40, 697);
    } else {
      ctx.moveTo(250, 672);
      ctx.lineTo(380, 672);
      ctx.lineTo(380, 697);
      ctx.lineTo(236, 697);
    }
    ctx.closePath();
  }

  function drawOneDisplay(side, text, accentName, eventActive = false) {
    const centerX = side === 'left' ? 108 : 312;
    const accent = MIAMI_COLORS[accentName] || MIAMI_COLORS.lavender;

    ctx.save();
    traceDisplayPanel(side);
    ctx.fillStyle = 'rgba(1, 4, 10, 0.96)';
    ctx.fill();

    // Keep the displays visibly alive at all times, but reserve canvas shadow
    // work for short event flashes. The solid accent border/text are much cheaper
    // than two blurred passes every frame and still read clearly on mobile.
    ctx.globalAlpha = eventActive ? 1 : 0.82;
    ctx.strokeStyle = accent;
    ctx.lineWidth = eventActive ? 1.6 : 1.1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = eventActive && !window.miamiMobilePerformanceMode ? 3 : 0;
    traceDisplayPanel(side);
    ctx.stroke();

    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = '#f4ffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(centerX - 52, 681);
    ctx.lineTo(centerX + 52, 681);
    ctx.moveTo(centerX - 52, 691);
    ctx.lineTo(centerX + 52, 691);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = eventActive
      ? '900 9px ui-monospace, monospace'
      : '800 9px ui-monospace, monospace';
    ctx.fillStyle = eventActive ? '#ffffff' : accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = eventActive && !window.miamiMobilePerformanceMode ? 3 : 0;
    ctx.fillText(String(text).toUpperCase(), centerX, 686, 112);
    ctx.restore();
  }

  function drawLowerDisplays() {
    const now = performance.now();
    const showingEvent = now < displayEvent.until;
    const blinkShowsEvent =
      showingEvent &&
      (!displayEvent.blinkInterval ||
        Math.floor((now - displayEvent.startedAt) / displayEvent.blinkInterval) % 2 === 0);

    // Blinking never blanks a panel: the alternate phase falls back to its live
    // idle/status readout, so both lower displays are always visibly active.
    drawOneDisplay(
      'left',
      blinkShowsEvent ? displayEvent.left : idleLeftText(),
      blinkShowsEvent ? displayEvent.leftAccent : 'cyan',
      blinkShowsEvent
    );
    drawOneDisplay(
      'right',
      blinkShowsEvent ? displayEvent.right : idleRightText(),
      blinkShowsEvent ? displayEvent.rightAccent : 'magenta',
      blinkShowsEvent
    );
  }

  const baseDrawTableWithLowerDisplays = drawTable;
  drawTable = function drawTableWithLowerDisplays() {
    baseDrawTableWithLowerDisplays();
    drawLowerDisplays();
  };

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
        `OCEAN ${oceanDriveLettersLit}/10`,
        '+3 LETTERS',
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
      flashDisplays('CIRCLE 3X', 'ACTIVE!', 2200, 'cyan', 'magenta');
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

    flashDisplays('LOOP', `+${points}`, 1500, 'cyan', 'magenta');
  });

  window.addEventListener('miami-magnet-capture', event => {
    const points = event.detail && event.detail.points
      ? event.detail.points
      : 500;
    flashDisplays('MAGNET', `+${points}`, 1400, 'magenta', 'cyan');
  });

  window.addEventListener('miami-drop-target', event => {
    const detail = event.detail || {};
    if (detail.bankComplete) {
      flashDisplays('3-0-5', `BANK +${detail.bankBonus || 3000}`, 1900, 'magenta', 'cyan');
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

  window.addEventListener('miami-reef-complete', event => {
    const award = event.detail && event.detail.award
      ? event.detail.award
      : 2500;
    flashDisplays(
      'REEF HOTEL',
      `BONUS +${award}`,
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
    baseResetGameWithCircleDisplay();
  };

  // Give the underpass a display callout without changing its physical/random
  // routing behavior.
  if (typeof tryEnterUnderpass === 'function') {
    const baseTryEnterUnderpassWithDisplay = tryEnterUnderpass;
    tryEnterUnderpass = function tryEnterUnderpassWithDisplay() {
      const entered = baseTryEnterUnderpassWithDisplay();
      if (entered) {
        flashDisplays('UNDERPASS', '5-WAY', 1400, 'magenta', 'cyan');
      }
      return entered;
    };
  }

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Each completed Ocean Drive pass lights three letters toward OCEAN DRIVE. Circle loop passes show 1/3, 2/3, then persistent 3X ACTIVE feedback until drain.'
    ));
  }

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260901-PERFDISPLAY';
  }
})();
