// Miami Nights: dual lower apron displays and faster Ocean Drive lettering.
// Loaded late so it can add presentation feedback inside the existing lower
// MIAMI / NIGHTS panels without disturbing stable gameplay geometry.

(() => {
  if (window.miamiDisplaysInstalled) return;
  window.miamiDisplaysInstalled = true;

  const DISPLAY_HOLD_MS = 1500;
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

  // Each inset is rendered into a tiny offscreen canvas only when its text or
  // visual state changes. Normal frames remain two small drawImage calls.
  const PANEL_WIDTH = 160;
  const PANEL_HEIGHT = 22;
  const panelCache = {
    left: makePanelCache('left', 30, 673, 76),
    right: makePanelCache('right', 230, 673, 86)
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
    displayEvent.until = now + duration;
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

  // These are inset versions of the existing apron polygons. They deliberately
  // leave the original cabinet edges visible so the displays read as built into
  // the MIAMI / NIGHTS panels rather than floating on top of the playfield.
  function traceCachedPanel(targetCtx, side) {
    targetCtx.beginPath();
    if (side === 'left') {
      targetCtx.moveTo(2, 1);
      targetCtx.lineTo(131, 1);
      targetCtx.lineTo(150, 20);
      targetCtx.lineTo(2, 20);
    } else {
      targetCtx.moveTo(158, 1);
      targetCtx.lineTo(29, 1);
      targetCtx.lineTo(10, 20);
      targetCtx.lineTo(158, 20);
    }
    targetCtx.closePath();
  }

  function renderPanel(cache, text, accentName, eventActive) {
    const accent = MIAMI_COLORS[accentName] || MIAMI_COLORS.lavender;
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const nextKey = [
      text,
      accentName,
      eventActive ? 'event' : 'idle',
      mobile ? 'mobile' : 'desktop'
    ].join('|');
    if (cache.key === nextKey) return;
    cache.key = nextKey;

    const panelCtx = cache.ctx;
    panelCtx.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    panelCtx.save();

    const face = panelCtx.createLinearGradient(0, 0, 0, PANEL_HEIGHT);
    face.addColorStop(0, 'rgba(5, 16, 34, 0.98)');
    face.addColorStop(1, 'rgba(1, 4, 10, 0.98)');
    traceCachedPanel(panelCtx, cache.side);
    panelCtx.fillStyle = face;
    panelCtx.fill();

    panelCtx.globalAlpha = eventActive ? 1 : 0.8;
    panelCtx.strokeStyle = accent;
    panelCtx.lineWidth = eventActive ? 1.5 : 1.1;
    panelCtx.shadowColor = accent;
    panelCtx.shadowBlur = mobile ? 0 : (eventActive ? 4 : 2);
    traceCachedPanel(panelCtx, cache.side);
    panelCtx.stroke();

    // A restrained glass highlight gives these the same dark-neon-display feel
    // as the top score strip without adding another animated effect.
    panelCtx.globalAlpha = 0.12;
    panelCtx.strokeStyle = '#f4ffff';
    panelCtx.lineWidth = 1;
    panelCtx.shadowBlur = 0;
    panelCtx.beginPath();
    if (cache.side === 'left') {
      panelCtx.moveTo(8, 5);
      panelCtx.lineTo(128, 5);
    } else {
      panelCtx.moveTo(32, 5);
      panelCtx.lineTo(152, 5);
    }
    panelCtx.stroke();

    panelCtx.globalAlpha = 1;
    panelCtx.textAlign = 'center';
    panelCtx.textBaseline = 'middle';
    panelCtx.font = eventActive
      ? '800 10px ui-monospace, monospace'
      : '700 10px ui-monospace, monospace';
    panelCtx.fillStyle = eventActive ? '#f7fbff' : accent;
    panelCtx.shadowColor = accent;
    panelCtx.shadowBlur = mobile ? 0 : (eventActive ? 5 : 3);
    panelCtx.fillText(String(text).toUpperCase(), cache.centerX, 12, 116);
    panelCtx.restore();
  }

  function drawCachedPanel(side, text, accentName, eventActive) {
    const cache = panelCache[side];
    renderPanel(cache, text, accentName, eventActive);
    ctx.drawImage(cache.canvas, cache.x, cache.y);
  }

  function drawLowerDisplays() {
    const now = performance.now();
    const showingEvent = now < displayEvent.until;
    const blinkShowsEvent =
      showingEvent &&
      (!displayEvent.blinkInterval ||
        Math.floor((now - displayEvent.startedAt) / displayEvent.blinkInterval) % 2 === 0);

    // Left answers "what just happened?"; right answers "what mode am I in?".
    // During an event the right panel can briefly show award/detail information,
    // then it automatically returns to the persistent live mode/progress state.
    drawCachedPanel(
      'left',
      blinkShowsEvent ? displayEvent.left : idleLeftText(),
      blinkShowsEvent ? displayEvent.leftAccent : 'cyan',
      blinkShowsEvent
    );
    drawCachedPanel(
      'right',
      blinkShowsEvent ? displayEvent.right : idleRightText(),
      blinkShowsEvent ? displayEvent.rightAccent : 'magenta',
      blinkShowsEvent
    );
  }

  // Draw directly after the existing lower apron. This is a presentation-only
  // layer: the panel geometry is left untouched and no physics path reads it.
  const baseDrawLowerApronWithDisplays = drawLowerApron;
  drawLowerApron = function drawLowerApronWithDisplays() {
    baseDrawLowerApronWithDisplays();
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
