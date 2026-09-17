// Miami Nights: presentation + scoring polish for the existing clock event.
// The established barricade rules, clock peg collision geometry and physics stay
// untouched. This late layer only makes the objective obvious and rewarding.

(() => {
  if (window.miamiClockPolishInstalled) return;
  window.miamiClockPolishInstalled = true;

  const clockState = window.miamiClockEventState;
  if (!clockState) return;

  const CENTER_X = 210;
  const CENTER_Y = 350;
  const RADIUS_X = 66;
  const RADIUS_Y = 55;
  const PEG_LAMP_INDICES = [0, 2, 4, 6, 8, 10];
  const PEG_POINTS = 500;
  const COMPLETE_BONUS = 5000;
  const OPEN_FLASH_MS = 1150;
  const COMPLETE_FLASH_MS = 1600;

  const dropped = new Array(PEG_LAMP_INDICES.length).fill(false);
  let openedAt = -Infinity;
  let completedAt = -Infinity;

  const callout = {
    left: '',
    right: '',
    leftAccent: 'cyan',
    rightAccent: 'magenta',
    startedAt: -Infinity,
    until: -Infinity,
    blinkInterval: 0
  };

  function showCallout(
    left,
    right,
    duration,
    leftAccent = 'cyan',
    rightAccent = 'magenta',
    blinkInterval = 0
  ) {
    const now = performance.now();
    callout.left = left;
    callout.right = right;
    callout.leftAccent = leftAccent;
    callout.rightAccent = rightAccent;
    callout.startedAt = now;
    callout.until = now + duration;
    callout.blinkInterval = blinkInterval;
  }

  function lampPosition(lampIndex) {
    const angle = -Math.PI / 2 + lampIndex * Math.PI * 2 / 12;
    return {
      x: CENTER_X + Math.cos(angle) * RADIUS_X,
      y: CENTER_Y + Math.sin(angle) * RADIUS_Y
    };
  }

  function drawInactiveClockMarks() {
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    for (let lampIndex = 1; lampIndex < 12; lampIndex += 2) {
      const pos = lampPosition(lampIndex);
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = '#01040a';
      ctx.strokeStyle = MIAMI_COLORS.structure;
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = mobile ? 0 : 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawLivePegHalos(now) {
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const pulse = 0.5 + 0.5 * Math.sin(now / 125);

    for (let pegIndex = 0; pegIndex < PEG_LAMP_INDICES.length; pegIndex += 1) {
      if (dropped[pegIndex]) continue;
      const pos = lampPosition(PEG_LAMP_INDICES[pegIndex]);
      const accent = pegIndex % 2 === 0
        ? MIAMI_COLORS.cyan
        : MIAMI_COLORS.magenta;

      ctx.save();
      ctx.globalAlpha = 0.72 + pulse * 0.28;
      ctx.strokeStyle = pulse > 0.72 ? '#ffffff' : accent;
      ctx.lineWidth = 2.1 + pulse * 0.8;
      ctx.shadowColor = accent;
      ctx.shadowBlur = mobile ? 0 : (8 + pulse * 10);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10.2 + pulse * 2.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.68;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 14.5 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawOpeningChase(now) {
    const age = now - openedAt;
    if (age < 0 || age >= OPEN_FLASH_MS) return;
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const progress = age / OPEN_FLASH_MS;

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.25;
    ctx.strokeStyle = progress < 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = mobile ? 0 : 16;
    ctx.beginPath();
    ctx.ellipse(
      CENTER_X,
      CENTER_Y,
      RADIUS_X + 5 + progress * 8,
      RADIUS_Y + 5 + progress * 7,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();

    for (let lampIndex = 0; lampIndex < 12; lampIndex += 1) {
      const localAge = age - lampIndex * 55;
      const wave = clamp(1 - Math.abs(localAge - 130) / 170, 0, 1);
      if (wave <= 0) continue;
      const pos = lampPosition(lampIndex);
      const accent = lampIndex % 2 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;

      ctx.save();
      ctx.globalAlpha = wave;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = accent;
      ctx.shadowBlur = mobile ? 0 : 12;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2 + wave * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawClockCenterStatus(now) {
    const openAge = now - openedAt;
    const text = openAge >= 0 && openAge < OPEN_FLASH_MS
      ? 'HIT 6'
      : `${clockState.remaining} LEFT`;

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(1, 5, 13, 0.88)';
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1.4;
    ctx.fillRect(CENTER_X - 31, CENTER_Y - 9, 62, 18);
    ctx.strokeRect(CENTER_X - 31, CENTER_Y - 9, 62, 18);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 9px ui-monospace, monospace';
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 6;
    ctx.fillText(text, CENTER_X, CENTER_Y + 0.5, 56);
    ctx.restore();
  }

  function drawCompletionBurst(now) {
    const age = now - completedAt;
    if (age < 0 || age >= COMPLETE_FLASH_MS) return;

    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const progress = age / COMPLETE_FLASH_MS;
    const pulse = 0.5 + 0.5 * Math.sin(age / 70);

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = pulse > 0.5 ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.lineWidth = 3.2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = mobile ? 0 : 20;
    ctx.beginPath();
    ctx.ellipse(
      CENTER_X,
      CENTER_Y,
      RADIUS_X + 8 + progress * 34,
      RADIUS_Y + 7 + progress * 28,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = clamp(1 - progress * 1.2, 0, 1);
    ctx.fillStyle = 'rgba(1, 5, 13, 0.92)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.fillRect(CENTER_X - 34, CENTER_Y - 10, 68, 20);
    ctx.strokeRect(CENTER_X - 34, CENTER_Y - 10, 68, 20);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 9px ui-monospace, monospace';
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = mobile ? 0 : 8;
    ctx.fillText('CLOCK CLEAR!', CENTER_X, CENTER_Y + 0.5, 62);
    ctx.restore();
  }

  function drawClockPolish() {
    const now = performance.now();

    if (clockState.open && !clockState.completed) {
      drawInactiveClockMarks();
      drawLivePegHalos(now);
      drawOpeningChase(now);
      drawClockCenterStatus(now);
    }

    drawCompletionBurst(now);
  }

  const baseDrawPassiveGeometryWithClockPolish = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassivePlayfieldGeometryWithClockPolish() {
    baseDrawPassiveGeometryWithClockPolish();
    drawClockPolish();
  };

  function traceApronPanel(side) {
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(24, 665);
      ctx.lineTo(164, 665);
      ctx.lineTo(189, 694);
      ctx.lineTo(24, 694);
    } else {
      ctx.moveTo(395, 665);
      ctx.lineTo(256, 665);
      ctx.lineTo(231, 694);
      ctx.lineTo(395, 694);
    }
    ctx.closePath();
  }

  function drawClockCalloutPanel(side, text, accentName, flashLevel) {
    const accent = MIAMI_COLORS[accentName] || MIAMI_COLORS.cyan;
    const mobile = Boolean(window.miamiMobilePerformanceMode);

    ctx.save();
    traceApronPanel(side);
    ctx.fillStyle = flashLevel > 1
      ? 'rgba(15, 26, 48, 0.98)'
      : 'rgba(2, 7, 18, 0.98)';
    ctx.fill();

    ctx.strokeStyle = flashLevel > 1 ? '#ffffff' : accent;
    ctx.lineWidth = flashLevel > 1 ? 2.8 : 2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : (flashLevel > 1 ? 14 : 8);
    traceApronPanel(side);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 12px ui-monospace, monospace';
    ctx.shadowColor = accent;
    ctx.shadowBlur = mobile ? 0 : 7;
    ctx.fillText(text, side === 'left' ? 103 : 313, 680, 132);
    ctx.restore();
  }

  function drawClockCallout() {
    const now = performance.now();
    if (now >= callout.until) return;

    const age = now - callout.startedAt;
    let flashLevel = 1;
    if (age < 720) {
      flashLevel = Math.floor(age / 90) % 2 === 0 ? 2 : 1;
    } else if (callout.blinkInterval > 0) {
      flashLevel = Math.floor(age / callout.blinkInterval) % 2 === 0 ? 2 : 1;
    }

    drawClockCalloutPanel('left', callout.left, callout.leftAccent, flashLevel);
    drawClockCalloutPanel('right', callout.right, callout.rightAccent, flashLevel);
  }

  const baseDrawLowerApronWithClockPolish = drawLowerApron;
  drawLowerApron = function drawLowerApronWithClockPolish() {
    baseDrawLowerApronWithClockPolish();
    drawClockCallout();
  };

  window.addEventListener('miami-clock-open', () => {
    openedAt = performance.now();
    completedAt = -Infinity;
    dropped.fill(false);
    showCallout('CLOCK OPEN', 'HIT 6 PEGS', 2700, 'cyan', 'magenta', 150);
  });

  window.addEventListener('miami-clock-peg-hit', event => {
    const detail = event.detail || {};
    const pegIndex = Number(detail.pegIndex);
    if (pegIndex >= 0 && pegIndex < dropped.length) dropped[pegIndex] = true;

    score += PEG_POINTS;
    syncStatusDisplay();

    if (Number(detail.remaining) > 0) {
      showCallout(
        `CLOCK +${PEG_POINTS}`,
        `${Number(detail.remaining)} LEFT`,
        1250,
        'cyan',
        'magenta'
      );
    }
  });

  window.addEventListener('miami-clock-complete', () => {
    completedAt = performance.now();
    score += COMPLETE_BONUS;
    syncStatusDisplay();
    showCallout(
      'CLOCK CLEARED!',
      `+${COMPLETE_BONUS} BONUS`,
      3100,
      'magenta',
      'cyan',
      130
    );
  });

  window.addEventListener('miami-drain', () => {
    dropped.fill(false);
    openedAt = -Infinity;
    completedAt = -Infinity;
    callout.until = -Infinity;
  });
})();
