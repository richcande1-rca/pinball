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
    until: 0,
    leftAccent: 'cyan',
    rightAccent: 'magenta'
  };

  function flashDisplays(
    left,
    right,
    duration = DISPLAY_HOLD_MS,
    leftAccent = 'cyan',
    rightAccent = 'magenta'
  ) {
    displayEvent.left = left;
    displayEvent.right = right;
    displayEvent.until = performance.now() + duration;
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

  function drawOneDisplay(side, text, accentName) {
    const centerX = side === 'left' ? 108 : 312;
    const accent = MIAMI_COLORS[accentName] || MIAMI_COLORS.lavender;

    ctx.save();
    traceDisplayPanel(side);
    ctx.fillStyle = 'rgba(1, 4, 10, 0.96)';
    ctx.fill();

    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = '#3e3657';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    traceDisplayPanel(side);
    ctx.stroke();

    // A couple of faint horizontal phosphor lines give the inserts a smoked
    // VFD/alphanumeric feel without adding expensive effects on mobile.
    ctx.globalAlpha = 0.12;
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
    ctx.font = '800 9px ui-monospace, monospace';
    ctx.fillStyle = '#f4ffff';
    ctx.shadowColor = accent;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 6;
    ctx.fillText(String(text).toUpperCase(), centerX, 686, 112);
    ctx.restore();
  }

  function drawLowerDisplays() {
    const now = performance.now();
    const showingEvent = now < displayEvent.until;
    drawOneDisplay(
      'left',
      showingEvent ? displayEvent.left : idleLeftText(),
      showingEvent ? displayEvent.leftAccent : 'cyan'
    );
    drawOneDisplay(
      'right',
      showingEvent ? displayEvent.right : idleRightText(),
      showingEvent ? displayEvent.rightAccent : 'magenta'
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

  window.addEventListener('miami-loop-complete', event => {
    const points = event.detail && event.detail.points
      ? event.detail.points
      : 2500;
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

  window.addEventListener('miami-drain', () => {
    flashDisplays('DRAIN', 'NEXT BALL', 1200, 'magenta', 'cyan');
  });

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
      ' Each completed Ocean Drive pass lights three letters toward OCEAN DRIVE.'
    ));
  }

  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay) {
    buildNumberDisplay.textContent = 'Build 20260901-DISPLAYS';
  }
})();
