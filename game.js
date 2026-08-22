const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TABLE = {
  left: 24,
  right: canvas.width - 24,
  top: 24,
  bottom: canvas.height - 24
};

const SHOOTER = {
  dividerX: 396,
  dividerTop: 158,
  dividerBottom: TABLE.bottom,
  ballX: 430,
  ballY: 650
};

const PLAYFIELD_CENTER = (TABLE.left + SHOOTER.dividerX) / 2;

const ball = {
  x: SHOOTER.ballX,
  y: SHOOTER.ballY,
  vx: 0,
  vy: 0,
  radius: 8,
  ready: true
};

const gravity = 760;      // px/s², straight down the playfield
const wallRestitution = 0.82;
const rollingDrag = 0.9992;

const plunger = {
  x: SHOOTER.ballX,
  topY: 668,
  charge: 0,
  charging: false,
  chargeRate: 0.9,        // reaches full pull in a little over one second
  minSpeed: 760,
  maxSpeed: 1140,
  maxPull: 30
};

const keys = {
  left: false,
  right: false
};

function makeFlipper(side) {
  const isLeft = side === 'left';
  return {
    side,
    // Keep the original pivot spacing, but center the pair on the main
    // playfield rather than on the full canvas including the shooter lane.
    pivotX: PLAYFIELD_CENTER + (isLeft ? -95 : 95),
    pivotY: 620,
    length: 74,
    radius: 11,
    restAngle: isLeft ? 0.34 : Math.PI - 0.34,
    activeAngle: isLeft ? -0.48 : Math.PI + 0.48,
    angle: isLeft ? 0.34 : Math.PI - 0.34,
    angularVelocity: 0,
    pressed: false
  };
}

const flippers = [makeFlipper('left'), makeFlipper('right')];

const sideBumpers = [
  { x1: 56, y1: 553, x2: 115, y2: 602, radius: 10, kick: 65, armed: true },
  { x1: 364, y1: 553, x2: 305, y2: 602, radius: 10, kick: 65, armed: true }
];

const lowerGuides = [
  { x1: 65, y1: 590, x2: 72, y2: 640, radius: 4 },
  { x1: 355, y1: 590, x2: 348, y2: 640, radius: 4 }
];

const upperArchGuides = [
  { x1: 42, y1: 174, x2: 42, y2: 104, radius: 4 },
  { x1: 42, y1: 104, x2: 68, y2: 62, radius: 4 },
  { x1: 68, y1: 62, x2: 126, y2: 38, radius: 4 },
  { x1: 294, y1: 38, x2: 352, y2: 62, radius: 4 },
  { x1: 352, y1: 62, x2: 370, y2: 82, radius: 4 },
  { x1: 370, y1: 82, x2: 407, y2: 72, radius: 4 }
];

const upperPosts = [
  { x1: 146, y1: 236, x2: 146, y2: 238, radius: 7 },
  { x1: 274, y1: 236, x2: 274, y2: 238, radius: 7 },
  { x1: 210, y1: 302, x2: 210, y2: 304, radius: 7 }
];

const midPlayfieldGuides = [
  { x1: 86, y1: 402, x2: 122, y2: 430, radius: 4 },
  { x1: 334, y1: 402, x2: 298, y2: 430, radius: 4 }
];

const shooterDivider = {
  x1: SHOOTER.dividerX,
  y1: SHOOTER.dividerTop,
  x2: SHOOTER.dividerX,
  y2: SHOOTER.dividerBottom,
  radius: 4
};

// A shallow guide near the top of the shooter lane turns some of the ball's
// upward speed into leftward speed without teleporting or directly steering it.
const shooterGuide = {
  x1: 446,
  y1: 146,
  x2: 407,
  y2: 72,
  radius: 4
};

function resetBall() {
  ball.x = SHOOTER.ballX;
  ball.y = SHOOTER.ballY;
  ball.vx = 0;
  ball.vy = 0;
  ball.ready = true;

  plunger.charge = 0;
  plunger.charging = false;

  for (const bumper of sideBumpers) {
    bumper.armed = true;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return { x: x1, y: y1, t: 0 };
  }

  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return {
    x: x1 + dx * t,
    y: y1 + dy * t,
    t
  };
}

function resolveSegmentCollision(segment, surfaceVelocity = { x: 0, y: 0 }, restitution = 0.9, extraKick = 0) {
  const closest = closestPointOnSegment(
    ball.x,
    ball.y,
    segment.x1,
    segment.y1,
    segment.x2,
    segment.y2
  );

  let nx = ball.x - closest.x;
  let ny = ball.y - closest.y;
  let distance = Math.hypot(nx, ny);
  const minDistance = ball.radius + segment.radius;

  if (distance >= minDistance) {
    return false;
  }

  if (distance < 0.0001) {
    const sx = segment.x2 - segment.x1;
    const sy = segment.y2 - segment.y1;
    const sl = Math.hypot(sx, sy) || 1;
    nx = -sy / sl;
    ny = sx / sl;
    distance = 1;
  } else {
    nx /= distance;
    ny /= distance;
  }

  const overlap = minDistance - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const rvx = ball.vx - surfaceVelocity.x;
  const rvy = ball.vy - surfaceVelocity.y;
  const normalSpeed = rvx * nx + rvy * ny;

  if (normalSpeed < 0) {
    const impulse = -(1 + restitution) * normalSpeed;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;

    if (extraKick > 0) {
      ball.vx += nx * extraKick;
      ball.vy += ny * extraKick;
    }
  }

  return true;
}

function updateFlipper(flipper, dt) {
  flipper.pressed = flipper.side === 'left' ? keys.left : keys.right;
  const target = flipper.pressed ? flipper.activeAngle : flipper.restAngle;

  // Still brisk, but less explosive than the first test pass.
  const maxSpeed = flipper.pressed ? 14 : 10; // rad/s
  const delta = target - flipper.angle;
  const step = clamp(delta, -maxSpeed * dt, maxSpeed * dt);

  flipper.angularVelocity = step / dt;
  flipper.angle += step;
}

function getFlipperSegment(flipper) {
  return {
    x1: flipper.pivotX,
    y1: flipper.pivotY,
    x2: flipper.pivotX + Math.cos(flipper.angle) * flipper.length,
    y2: flipper.pivotY + Math.sin(flipper.angle) * flipper.length,
    radius: flipper.radius
  };
}

function collideWithFlipper(flipper) {
  const segment = getFlipperSegment(flipper);
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
  const contactDistance = ball.radius + segment.radius;

  const rx = closest.x - flipper.pivotX;
  const ry = closest.y - flipper.pivotY;
  const surfaceVelocity = {
    x: -flipper.angularVelocity * ry,
    y: flipper.angularVelocity * rx
  };

  let incomingNormalSpeed = 0;
  if (distance > 0.0001) {
    const nx = dx / distance;
    const ny = dy / distance;
    incomingNormalSpeed = -(
      (ball.vx - surfaceVelocity.x) * nx +
      (ball.vy - surfaceVelocity.y) * ny
    );
  }

  const motion = clamp(Math.abs(flipper.angularVelocity) / 14, 0, 1);
  const heldStill = flipper.pressed && Math.abs(flipper.angularVelocity) < 0.25;

  // A gently settling ball on a held flipper should not bounce at all. Fast
  // impacts retain the livelier restitution, and a moving flipper still adds
  // energy through its actual surface velocity.
  const restingImpact =
    heldStill &&
    distance < contactDistance &&
    incomingNormalSpeed >= 0 &&
    incomingNormalSpeed < 45;

  const restitution = restingImpact ? 0 : 0.38 + 0.42 * motion;
  const touching = resolveSegmentCollision(segment, surfaceVelocity, restitution);

  // Let gravity move the ball freely along a held flipper.
  return touching && heldStill;
}

function collideWithSideBumper(bumper) {
  const closest = closestPointOnSegment(
    ball.x,
    ball.y,
    bumper.x1,
    bumper.y1,
    bumper.x2,
    bumper.y2
  );

  const dx = ball.x - closest.x;
  const dy = ball.y - closest.y;
  const distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + bumper.radius;
  const rearmDistance = contactDistance + 36;

  // Once a sling fires, the ball must move clearly away from it before the
  // sling can arm again. Tiny contact/no-contact jitter in a cradle therefore
  // cannot manufacture another powered hit.
  if (!bumper.armed && distance > rearmDistance) {
    bumper.armed = true;
  }

  let incomingNormalSpeed = 0;
  if (distance > 0.0001) {
    const nx = dx / distance;
    const ny = dy / distance;
    incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
  }

  const shouldKick =
    bumper.armed &&
    distance < contactDistance &&
    incomingNormalSpeed >= 60;

  // Slow settling contact is dead rubber: no bounce and no powered kick.
  const restitution = incomingNormalSpeed < 60 ? 0 : 0.68;
  const touching = resolveSegmentCollision(
    bumper,
    { x: 0, y: 0 },
    restitution,
    shouldKick ? bumper.kick : 0
  );

  if (shouldKick) {
    bumper.armed = false;
  }

  return touching;
}

function launchBall() {
  if (!ball.ready) {
    return;
  }

  const launchSpeed = plunger.minSpeed +
    (plunger.maxSpeed - plunger.minSpeed) * plunger.charge;

  ball.ready = false;
  ball.vx = 0;
  ball.vy = -launchSpeed;
  plunger.charge = 0;
  plunger.charging = false;
}

function update(dt) {
  for (const flipper of flippers) {
    updateFlipper(flipper, dt);
  }

  if (ball.ready) {
    ball.x = SHOOTER.ballX;
    ball.y = SHOOTER.ballY;
    ball.vx = 0;
    ball.vy = 0;

    if (plunger.charging) {
      plunger.charge = clamp(plunger.charge + plunger.chargeRate * dt, 0, 1);
    }
    return;
  }

  ball.vy += gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Light rolling resistance. Spin / English is still deliberately deferred.
  ball.vx *= rollingDrag;
  ball.vy *= rollingDrag;

  if (ball.x - ball.radius < TABLE.left) {
    ball.x = TABLE.left + ball.radius;
    ball.vx = Math.abs(ball.vx) * wallRestitution;
  }

  if (ball.x + ball.radius > TABLE.right) {
    ball.x = TABLE.right - ball.radius;
    ball.vx = -Math.abs(ball.vx) * wallRestitution;
  }

  if (ball.y - ball.radius < TABLE.top) {
    ball.y = TABLE.top + ball.radius;
    ball.vy = Math.abs(ball.vy) * wallRestitution;
  }

  resolveSegmentCollision(shooterDivider, { x: 0, y: 0 }, 0.86);
  resolveSegmentCollision(shooterGuide, { x: 0, y: 0 }, 0.92);

  for (const guide of upperArchGuides) {
    resolveSegmentCollision(guide, { x: 0, y: 0 }, wallRestitution);
  }

  for (const post of upperPosts) {
    resolveSegmentCollision(post, { x: 0, y: 0 }, wallRestitution);
  }

  for (const guide of midPlayfieldGuides) {
    resolveSegmentCollision(guide, { x: 0, y: 0 }, wallRestitution);
  }

  for (const guide of lowerGuides) {
    resolveSegmentCollision(guide, { x: 0, y: 0 }, wallRestitution);
  }

  for (const bumper of sideBumpers) {
    collideWithSideBumper(bumper);
  }

  for (const flipper of flippers) {
    collideWithFlipper(flipper);
  }

  // Open drain below the flippers.
  if (ball.y - ball.radius > canvas.height) {
    resetBall();
  }
}

const MIAMI_COLORS = {
  playfield: '#070b18',
  shooterLane: '#0b1222',
  structure: '#20283a',
  cyan: '#22dff3',
  magenta: '#ff3cac',
  lavender: '#c9b8ff'
};

function drawNeonSegment(segment, accent = MIAMI_COLORS.cyan, bodyWidth = 6, accentWidth = 2) {
  ctx.save();
  ctx.lineCap = 'round';

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = bodyWidth;
  ctx.beginPath();
  ctx.moveTo(segment.x1, segment.y1);
  ctx.lineTo(segment.x2, segment.y2);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = accentWidth;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(segment.x1, segment.y1);
  ctx.lineTo(segment.x2, segment.y2);
  ctx.stroke();
  ctx.restore();
}

function drawTable() {
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
}

function drawMiamiArtwork() {
  ctx.save();
  ctx.globalAlpha = 0.32;

  const sunset = ctx.createLinearGradient(0, 300, 0, 402);
  sunset.addColorStop(0, MIAMI_COLORS.magenta);
  sunset.addColorStop(0.58, '#ff6f91');
  sunset.addColorStop(1, MIAMI_COLORS.lavender);
  ctx.fillStyle = sunset;
  ctx.beginPath();
  ctx.arc(PLAYFIELD_CENTER, 350, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'destination-out';
  for (let y = 354; y <= 394; y += 8) {
    ctx.fillRect(PLAYFIELD_CENTER - 54, y, 108, 3);
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#050916';
  ctx.strokeStyle = '#050916';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(PLAYFIELD_CENTER - 4, 392);
  ctx.quadraticCurveTo(PLAYFIELD_CENTER - 15, 350, PLAYFIELD_CENTER - 8, 320);
  ctx.stroke();
  ctx.restore();
}

  const crownX = PLAYFIELD_CENTER - 8;
  const crownY = 320;
  for (const [dx, dy, bend] of [
    [-34, -8, -18], [-29, 9, -17], [-17, -22, -10],
    [18, -25, 10], [34, -10, 18], [29, 10, 18]
  ]) {
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(crownX + bend, crownY - 12, crownX + dx, crownY + dy);
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowBlur = 5;
  ctx.font = 'italic 24px system-ui, sans-serif';
  ctx.fillStyle = MIAMI_COLORS.magenta;
  ctx.shadowColor = MIAMI_COLORS.magenta;
  ctx.fillText('MIAMI', PLAYFIELD_CENTER, 458);
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = MIAMI_COLORS.cyan;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.fillText('N I G H T S', PLAYFIELD_CENTER, 478);
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

function drawShooterLane() {
  drawNeonSegment(shooterDivider, MIAMI_COLORS.cyan);
  drawNeonSegment(shooterGuide, MIAMI_COLORS.cyan);
}

function drawPlunger() {
  ctx.save();
  const pull = plunger.charge * plunger.maxPull;
  const tipY = plunger.topY + pull;

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(plunger.x, tipY);
  ctx.lineTo(plunger.x, Math.min(canvas.height - 8, tipY + 36));
  ctx.stroke();

  ctx.strokeStyle = MIAMI_COLORS.cyan;
  ctx.lineWidth = 1;
  ctx.shadowColor = MIAMI_COLORS.cyan;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(plunger.x - 12, plunger.topY - 2);
  ctx.lineTo(plunger.x + 12, plunger.topY - 2);
  ctx.stroke();
  ctx.restore();
}

function drawSideBumpers() {
  for (const bumper of sideBumpers) {
    drawNeonSegment(bumper, MIAMI_COLORS.magenta, 10, 3);
  }
}

function drawLowerGuides() {
  for (const guide of lowerGuides) {
    drawNeonSegment(guide);
  }
}

function drawPassivePlayfieldGeometry() {
  for (const guide of upperArchGuides) {
    drawNeonSegment(guide);
  }

  for (const guide of midPlayfieldGuides) {
    drawNeonSegment(guide, MIAMI_COLORS.magenta);
  }

  for (const [index, post] of upperPosts.entries()) {
    const accent = index === 0
      ? MIAMI_COLORS.cyan
      : index === 1
        ? MIAMI_COLORS.magenta
        : MIAMI_COLORS.lavender;

    ctx.fillStyle = MIAMI_COLORS.structure;
    ctx.beginPath();
    ctx.arc(post.x1, (post.y1 + post.y2) / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 3;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(post.x1, (post.y1 + post.y2) / 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawLowerApron() {
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
}

function drawFlippers() {
  ctx.lineCap = 'round';

  for (const flipper of flippers) {
    const segment = getFlipperSegment(flipper);
    const accent = flipper.side === 'left' ? MIAMI_COLORS.cyan : MIAMI_COLORS.magenta;

    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.strokeStyle = flipper.pressed ? '#f1efff' : MIAMI_COLORS.lavender;
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = MIAMI_COLORS.structure;
    ctx.beginPath();
    ctx.arc(flipper.pivotX, flipper.pivotY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawBall() {
  ctx.fillStyle = '#eef4ff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();
  drawMiamiArtwork();
  drawDecorativeDisplays();
  drawShooterLane();
  drawPassivePlayfieldGeometry();
  drawPlunger();
  drawSideBumpers();
  drawLowerGuides();
  drawLowerApron();
  drawFlippers();
  drawBall();
}

const fixedStep = 1 / 240;
let accumulator = 0;
let previousTime = performance.now();

function frame(now) {
  let frameTime = (now - previousTime) / 1000;
  previousTime = now;

  // Avoid giant physics jumps after the tab has been inactive.
  frameTime = Math.min(frameTime, 0.05);
  accumulator += frameTime;

  while (accumulator >= fixedStep) {
    update(fixedStep);
    accumulator -= fixedStep;
  }

  draw();
  requestAnimationFrame(frame);
}

function setKeyState(code, pressed) {
  if (code === 'ArrowLeft' || code === 'KeyZ') {
    keys.left = pressed;
    return true;
  }

  if (code === 'ArrowRight' || code === 'KeyX') {
    keys.right = pressed;
    return true;
  }

  return false;
}

window.addEventListener('keydown', (event) => {
  if (setKeyState(event.code, true)) {
    event.preventDefault();
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (ball.ready && !event.repeat) {
      plunger.charging = true;
    }
  }

  if (event.code === 'KeyR') {
    event.preventDefault();
    resetBall();
  }
});

window.addEventListener('keyup', (event) => {
  if (setKeyState(event.code, false)) {
    event.preventDefault();
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (ball.ready && plunger.charging) {
      launchBall();
    }
  }
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);

  if (x < canvas.width / 2) {
    keys.left = true;
  } else {
    keys.right = true;
  }

  canvas.setPointerCapture(event.pointerId);
});

function releasePointer() {
  keys.left = false;
  keys.right = false;
}

canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('pointerleave', (event) => {
  if (event.buttons === 0) {
    releasePointer();
  }
});
window.addEventListener('blur', releasePointer);

requestAnimationFrame(frame);
