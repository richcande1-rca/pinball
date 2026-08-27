// Miami Nights visual layer only. No gameplay or collision logic lives here.

const miamiArtwork = new Image();
miamiArtwork.src =
  'assets/miami-sunset-clean.png?v=20260823-1530';

const miamiEffects = {
  previousSlingArmed: sideBumpers.map(bumper => bumper.armed),
  slingFlashStartedAt: sideBumpers.map(() => -Infinity),
  previousFlipperPressed: flippers.map(flipper => flipper.pressed),
  flipperFlashStartedAt: flippers.map(() => -Infinity),
  previousPlungerCharge: plunger.charge,
  plungerLaunchFlashStartedAt: -Infinity,
  previousBallVelocity: { x: ball.vx, y: ball.vy },
  passiveImpactTimes: new Map(),
  ballTrail: [],
  lastTrailSampleAt: -Infinity
};

const passiveImpactSurfaces = [
  ...coastalOrbitRails.map((surface, index) => ({ surface, type: 'coastal-orbit', index })),
  ...upperLeftLoopRails.map((surface, index) => ({ surface, type: 'upper-left-loop', index })),
  ...midPlayfieldGuides.map((surface, index) => ({ surface, type: 'mid-guide', index })),
  ...lowerGuides.map((surface, index) => ({ surface, type: 'lower-guide', index })),
  ...shooterDividerRails.map((surface, index) => ({ surface, type: 'shooter-divider', index })),
  { surface: shooterDiverter, type: 'launch-diverter', index: 0 }
];

function notifyPassiveImpact(type, strength, x, y, index, now) {
  const key = `${type}-${index}`;
  if (now - (miamiEffects.passiveImpactTimes.get(key) || -Infinity) < 85) return;

  miamiEffects.passiveImpactTimes.set(key, now);
  window.dispatchEvent(new CustomEvent('miami-impact', {
    detail: { type, strength, x, y, index }
  }));
}

function detectPassiveImpact(now) {
  const previous = miamiEffects.previousBallVelocity;
  const velocityChange = Math.hypot(ball.vx - previous.x, ball.vy - previous.y);
  miamiEffects.previousBallVelocity = { x: ball.vx, y: ball.vy };

  if (ball.ready || velocityChange < 35) return;

  let nearest = null;
  for (const candidate of passiveImpactSurfaces) {
    const point = closestPointOnSegment(
      ball.x, ball.y,
      candidate.surface.x1, candidate.surface.y1,
      candidate.surface.x2, candidate.surface.y2
    );
    const distance = Math.hypot(ball.x - point.x, ball.y - point.y);
    const contactDistance = ball.radius + candidate.surface.radius + 3;
    if (distance <= contactDistance && (!nearest || distance < nearest.distance)) {
      nearest = { ...candidate, point, distance };
    }
  }

  if (nearest) {
    notifyPassiveImpact(
      nearest.type,
      clamp(velocityChange / 650, 0.08, 1),
      nearest.point.x,
      nearest.point.y,
      nearest.index,
      now
    );
    return;
  }

  const wallContact =
    ball.x - ball.radius <= TABLE.left + 2 ||
    ball.x + ball.radius >= TABLE.right - 2 ||
    ball.y - ball.radius <= TABLE.top + 2;
  if (wallContact) {
    notifyPassiveImpact('outer-wall', clamp(velocityChange / 650, 0.08, 1), ball.x, ball.y, 0, now);
  }
}

function getArtworkBounds() {
  const width = 220;
  const height = miamiArtwork.naturalWidth
    ? width * miamiArtwork.naturalHeight / miamiArtwork.naturalWidth
    : 124;

  return {
    x: Math.round(PLAYFIELD_CENTER - width / 2),
    y: Math.round(350 - height / 2),
    width,
    height
  };
}

function drawSunsetGlow(now) {
  if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) {
    return;
  }

  const bounds = getArtworkBounds();
  const pulse = 0.5 + 0.5 * Math.sin(now / 2700);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radius = Math.max(bounds.width, bounds.height) * 0.76;
  const glow = ctx.createRadialGradient(centerX, centerY, 12, centerX, centerY, radius);
  glow.addColorStop(0, `rgba(255, 60, 172, ${0.14 + pulse * 0.05})`);
  glow.addColorStop(0.55, `rgba(151, 66, 255, ${0.09 + pulse * 0.04})`);
  glow.addColorStop(1, 'rgba(151, 66, 255, 0)');

  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(bounds.x - 34, bounds.y - 34, bounds.width + 68, bounds.height + 68);
  ctx.restore();
}

function drawMiamiArtwork() {
  if (miamiArtwork.complete && miamiArtwork.naturalWidth) {
    const bounds = getArtworkBounds();

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      miamiArtwork,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );

    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowBlur = 5;
  ctx.font = 'italic 24px system-ui, sans-serif';
  ctx.fillStyle = MIAMI_COLORS.magenta;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.fillText('MIAMI', PLAYFIELD_CENTER, 458);
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = MIAMI_COLORS.cyan;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.fillText('N I G H T S', PLAYFIELD_CENTER, 478);
  ctx.restore();
}

function updateEffectTriggers(now) {
  detectPassiveImpact(now);
  sideBumpers.forEach((bumper, index) => {
    if (miamiEffects.previousSlingArmed[index] && !bumper.armed) {
      miamiEffects.slingFlashStartedAt[index] = now;
    }
    miamiEffects.previousSlingArmed[index] = bumper.armed;
  });

  flippers.forEach((flipper, index) => {
    if (flipper.pressed && !miamiEffects.previousFlipperPressed[index]) {
      miamiEffects.flipperFlashStartedAt[index] = now;
      window.dispatchEvent(new CustomEvent('miami-flipper', {
        detail: { index, side: flipper.side }
      }));
    }
    miamiEffects.previousFlipperPressed[index] = flipper.pressed;
  });

  if (miamiEffects.previousPlungerCharge > 0 && plunger.charge === 0 && !ball.ready) {
    miamiEffects.plungerLaunchFlashStartedAt = now;
  }
  miamiEffects.previousPlungerCharge = plunger.charge;
}

function drawSlingFlashes(now) {
  sideBumpers.forEach((bumper, index) => {
    const strength = 1 - (now - miamiEffects.slingFlashStartedAt[index]) / 150;
    if (strength <= 0 || strength > 1) return;

    ctx.save();
    ctx.globalAlpha = strength * 0.48;
    ctx.strokeStyle = '#ff20a8';
    ctx.shadowColor = '#ff3cac';
    ctx.shadowBlur = 28;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bumper.x1, bumper.y1);
    ctx.lineTo(bumper.x2, bumper.y2);
    ctx.stroke();

    ctx.globalAlpha = strength * 0.9;
    ctx.strokeStyle = '#ff4fbd';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 9;
    ctx.stroke();

    ctx.globalAlpha = strength;
    ctx.strokeStyle = '#fff2fc';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.globalAlpha = strength * 0.75;
    ctx.fillStyle = '#fff2fc';
    for (const endpoint of [{ x: bumper.x1, y: bumper.y1 }, { x: bumper.x2, y: bumper.y2 }]) {
      ctx.beginPath();
      ctx.arc(endpoint.x, endpoint.y, 5 + strength * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawFlipperFlashes(now) {
  flippers.forEach((flipper, index) => {
    const strength = 1 - (now - miamiEffects.flipperFlashStartedAt[index]) / 170;
    if (strength <= 0 || strength > 1) return;

    const segment = getFlipperSegment(flipper);
    const accent = flipper.side === 'left' ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;
    ctx.save();
    ctx.globalAlpha = strength * 0.65;
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 26;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.globalAlpha = strength;
    ctx.strokeStyle = '#f4ffff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.globalAlpha = strength * 0.85;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(flipper.pivotX, flipper.pivotY, 12 + (1 - strength) * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlungerChargeGlow() {
  if (plunger.charge <= 0) return;

  const stripHeight = 24 + plunger.charge * 130;
  ctx.save();
  ctx.globalAlpha = 0.32 + plunger.charge * 0.55;
  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 16 + plunger.charge * 24;
  ctx.lineWidth = 3 + plunger.charge * 4;
  ctx.strokeRect(shooterDivider.x1 + 9, plunger.topY - 16, TABLE.right - shooterDivider.x1 - 18, 42);

  ctx.globalAlpha = 0.28 + plunger.charge * 0.62;
  ctx.fillStyle = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 12 + plunger.charge * 20;
  ctx.fillRect(plunger.x - 4, plunger.topY - stripHeight, 8, stripHeight - 12);
  ctx.fillStyle = '#efffff';
  ctx.fillRect(plunger.x - 1.5, plunger.topY - stripHeight, 3, stripHeight - 12);
  ctx.restore();
}

function drawPlungerLaunchFlash(now) {
  const strength = 1 - (now - miamiEffects.plungerLaunchFlashStartedAt) / 130;
  if (strength <= 0 || strength > 1) return;

  ctx.save();
  ctx.globalAlpha = strength * 0.8;
  ctx.fillStyle = MIAMI_COLORS.cyan;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 30;
  ctx.fillRect(plunger.x - 10, plunger.topY - 155, 20, 145);
  ctx.globalAlpha = strength;
  ctx.fillStyle = '#f2ffff';
  ctx.fillRect(plunger.x - 2, plunger.topY - 155, 4, 145);
  ctx.beginPath();
  ctx.arc(plunger.x, plunger.topY - 4, 10 + (1 - strength) * 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBallTrail(now) {
  const speed = Math.hypot(ball.vx, ball.vy);
  const trail = miamiEffects.ballTrail;
  const previous = trail[trail.length - 1];

  if (previous && Math.hypot(ball.x - previous.x, ball.y - previous.y) > 100) {
    trail.length = 0;
  }

  if (speed > 320 && now - miamiEffects.lastTrailSampleAt >= 24) {
    trail.push({ x: ball.x, y: ball.y, time: now });
    miamiEffects.lastTrailSampleAt = now;
    if (trail.length > 8) trail.shift();
  }

  while (trail.length && (now - trail[0].time > 210 || speed <= 320)) {
    trail.shift();
  }

  ctx.save();
  for (let index = 0; index < trail.length; index += 1) {
    const sample = trail[index];
    const age = (now - sample.time) / 210;
    const speedStrength = Math.min(1, (speed - 320) / 500);
    const opacity = Math.max(0, 1 - age) * (index + 1) / trail.length * (0.28 + speedStrength * 0.32);
    ctx.fillStyle = `rgba(220, 252, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(sample.x, sample.y, ball.radius * (0.3 + index * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDecorativeDisplays(now) {
  const inserts = [
    { x: 210, y: 520, color: MIAMI_COLORS.lavender }
  ];

  inserts.forEach((insert, index) => {
    const pulse = 0.5 + 0.5 * Math.sin(now / 900 + index * 2.1);
    ctx.save();
    ctx.globalAlpha = 0.45 + pulse * 0.5;
    ctx.strokeStyle = insert.color;
    ctx.lineWidth = 1.5 + pulse * 1.5;
    ctx.shadowColor = insert.color;
    ctx.shadowBlur = 7 + pulse * 9;
    ctx.beginPath();
    ctx.arc(insert.x, insert.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = insert.color;
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.fillStyle = '#f4ffff';
    ctx.beginPath();
    ctx.arc(insert.x, insert.y, 1.5 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

drawTable = function drawMiamiTable() {
  const playfieldGradient = ctx.createLinearGradient(0, TABLE.top, 0, TABLE.bottom);
  playfieldGradient.addColorStop(0, '#090d20');
  playfieldGradient.addColorStop(0.55, MIAMI_COLORS.playfield);
  playfieldGradient.addColorStop(1, '#040711');
  ctx.fillStyle = playfieldGradient;
  ctx.fillRect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, TABLE.bottom - TABLE.top);

  ctx.fillStyle = MIAMI_COLORS.shooterLane;
  ctx.fillRect(
    shooterDivider.x1 + shooterDivider.radius,
    shooterDivider.y1,
    TABLE.right - shooterDivider.x1 - shooterDivider.radius,
    TABLE.bottom - shooterDivider.y1
  );

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TABLE.left, TABLE.bottom);
  ctx.lineTo(TABLE.left, TABLE.top);
  ctx.lineTo(TABLE.right, TABLE.top);
  ctx.lineTo(TABLE.right, TABLE.bottom);
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.lineWidth = 1;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 3;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(2, 5, 14, 0.72)';
  ctx.beginPath();
  ctx.moveTo(TABLE.left, TABLE.top);
  ctx.lineTo(42, 48);
  ctx.lineTo(42, 650);
  ctx.lineTo(TABLE.left, TABLE.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(TABLE.right, TABLE.top);
  ctx.lineTo(438, 48);
  ctx.lineTo(438, 650);
  ctx.lineTo(TABLE.right, TABLE.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = 'rgba(201, 184, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(42, 48);
  ctx.lineTo(42, 650);
  ctx.moveTo(438, 48);
  ctx.lineTo(438, 650);
  ctx.stroke();
  ctx.restore();
};

drawLowerApron = function drawMiamiLowerApron() {
  ctx.fillStyle = '#0b1020';
  ctx.strokeStyle = '#28314b';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(24, 670);
  ctx.lineTo(164, 670);
  ctx.lineTo(190, 696);
  ctx.lineTo(24, 696);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(396, 670);
  ctx.lineTo(256, 670);
  ctx.lineTo(230, 696);
  ctx.lineTo(396, 696);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = MIAMI_COLORS.magenta;
  ctx.lineWidth = 1;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(32, 666);
  ctx.lineTo(62, 666);
  ctx.moveTo(358, 666);
  ctx.lineTo(388, 666);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 8px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(201, 184, 255, 0.72)';
  ctx.fillText('MIAMI', 108, 687);
  ctx.fillText('NIGHTS', 312, 687);
  ctx.restore();
};

draw = function drawMiamiNightsFrame() {
  const now = performance.now();

  updateEffectTriggers(now);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();
  drawSunsetGlow(now);
  drawMiamiArtwork();

  drawDecorativeDisplays(now);
  drawShooterLane();
  drawPassivePlayfieldGeometry();
  drawPlunger();
  drawSideBumpers();
  drawLowerGuides();
  drawLowerApron();
  drawFlippers();

  drawSlingFlashes(now);
  drawFlipperFlashes(now);
  drawPlungerChargeGlow();
  drawPlungerLaunchFlash(now);
  drawBallTrail(now);
  drawBall();
};
