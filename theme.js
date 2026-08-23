// Miami Nights visual layer only. No gameplay or collision logic lives here.

const miamiArtwork = new Image();
miamiArtwork.src =
  'assets/miami-sunset-clean.png?v=20260823-1530';

const miamiEffects = {
  previousSlingArmed: sideBumpers.map(bumper => bumper.armed),
  slingFlashStartedAt: sideBumpers.map(() => -Infinity),
  previousFlipperPressed: flippers.map(flipper => flipper.pressed),
  flipperFlashStartedAt: flippers.map(() => -Infinity),
  ballTrail: [],
  lastTrailSampleAt: -Infinity
};

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
  const radius = Math.max(bounds.width, bounds.height) * 0.64;
  const glow = ctx.createRadialGradient(centerX, centerY, 12, centerX, centerY, radius);
  glow.addColorStop(0, `rgba(255, 60, 172, ${0.07 + pulse * 0.025})`);
  glow.addColorStop(0.55, `rgba(151, 66, 255, ${0.045 + pulse * 0.02})`);
  glow.addColorStop(1, 'rgba(151, 66, 255, 0)');

  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(bounds.x - 22, bounds.y - 22, bounds.width + 44, bounds.height + 44);
  ctx.restore();
}

function drawPlayfieldSweep(now) {
  const cycle = 9000;
  const progress = (now % cycle) / cycle;
  const sweepX = TABLE.left - 70 + progress * (TABLE.right - TABLE.left + 140);
  const opacity = Math.sin(progress * Math.PI) * 0.045;
  const gradient = ctx.createLinearGradient(sweepX - 38, 0, sweepX + 38, 0);
  gradient.addColorStop(0, 'rgba(126, 231, 255, 0)');
  gradient.addColorStop(0.5, `rgba(126, 231, 255, ${opacity})`);
  gradient.addColorStop(1, 'rgba(126, 231, 255, 0)');

  ctx.save();
  ctx.beginPath();
  ctx.rect(TABLE.left, TABLE.top, TABLE.right - TABLE.left, TABLE.bottom - TABLE.top);
  ctx.clip();
  ctx.transform(1, 0, -0.12, 1, 44, 0);
  ctx.fillStyle = gradient;
  ctx.fillRect(sweepX - 38, TABLE.top, 76, TABLE.bottom - TABLE.top);
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
  sideBumpers.forEach((bumper, index) => {
    if (miamiEffects.previousSlingArmed[index] && !bumper.armed) {
      miamiEffects.slingFlashStartedAt[index] = now;
    }
    miamiEffects.previousSlingArmed[index] = bumper.armed;
  });

  flippers.forEach((flipper, index) => {
    if (flipper.pressed && !miamiEffects.previousFlipperPressed[index]) {
      miamiEffects.flipperFlashStartedAt[index] = now;
    }
    miamiEffects.previousFlipperPressed[index] = flipper.pressed;
  });
}

function drawSlingFlashes(now) {
  sideBumpers.forEach((bumper, index) => {
    const strength = 1 - (now - miamiEffects.slingFlashStartedAt[index]) / 150;
    if (strength <= 0 || strength > 1) return;

    ctx.save();
    ctx.globalAlpha = strength * 0.65;
    ctx.strokeStyle = '#ff5bc4';
    ctx.shadowColor = '#ff3cac';
    ctx.shadowBlur = 16;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bumper.x1, bumper.y1);
    ctx.lineTo(bumper.x2, bumper.y2);
    ctx.stroke();
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
    ctx.globalAlpha = strength * 0.55;
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlungerChargeGlow() {
  if (plunger.charge <= 0) return;

  ctx.save();
  ctx.globalAlpha = 0.12 + plunger.charge * 0.22;
  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 8 + plunger.charge * 14;
  ctx.lineWidth = 2 + plunger.charge * 2;
  ctx.strokeRect(shooterDivider.x1 + 9, plunger.topY - 16, TABLE.right - shooterDivider.x1 - 18, 42);
  ctx.restore();
}

function drawBallTrail(now) {
  const speed = Math.hypot(ball.vx, ball.vy);
  const trail = miamiEffects.ballTrail;
  const previous = trail[trail.length - 1];

  if (previous && Math.hypot(ball.x - previous.x, ball.y - previous.y) > 100) {
    trail.length = 0;
  }

  if (speed > 300 && now - miamiEffects.lastTrailSampleAt >= 28) {
    trail.push({ x: ball.x, y: ball.y, time: now });
    miamiEffects.lastTrailSampleAt = now;
    if (trail.length > 6) trail.shift();
  }

  while (trail.length && (now - trail[0].time > 160 || speed <= 300)) {
    trail.shift();
  }

  ctx.save();
  for (let index = 0; index < trail.length; index += 1) {
    const sample = trail[index];
    const age = (now - sample.time) / 160;
    const opacity = Math.max(0, 1 - age) * (index + 1) / trail.length * 0.22;
    ctx.fillStyle = `rgba(190, 244, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(sample.x, sample.y, ball.radius * (0.3 + index * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDecorativeDisplays() {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 25, 0.84)';
  ctx.strokeStyle = 'rgba(34, 223, 243, 0.58)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(166, 154, 88, 38, 6);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '9px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(201, 184, 255, 0.72)';
  ctx.fillText('SCORE', PLAYFIELD_CENTER, 167);
  ctx.font = '16px ui-monospace, monospace';
  ctx.fillStyle = MIAMI_COLORS.magenta;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.shadowBlur = 4;
  ctx.fillText('000000', PLAYFIELD_CENTER, 185);
  ctx.restore();

  const inserts = [
    { x: 104, y: 468, color: MIAMI_COLORS.cyan },
    { x: 316, y: 468, color: MIAMI_COLORS.magenta },
    { x: 210, y: 520, color: MIAMI_COLORS.lavender }
  ];

  for (const insert of inserts) {
    ctx.save();
    ctx.strokeStyle = insert.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = insert.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(insert.x, insert.y, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(7, 11, 24, 0.8)';
    ctx.fill();
    ctx.restore();
  }
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
  drawPlayfieldSweep(now);
  drawSunsetGlow(now);
  drawMiamiArtwork();

  drawDecorativeDisplays();
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
  drawBallTrail(now);
  drawBall();
};
