const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const leftFlipperButton = document.getElementById('left-flipper-button');
const rightFlipperButton = document.getElementById('right-flipper-button');
const launchButton = document.getElementById('launch-button');

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

function makeRailSegments(points, radius = 4) {
  return points.slice(0, -1).map((point, index) => ({
    x1: point.x,
    y1: point.y,
    x2: points[index + 1].x,
    y2: points[index + 1].y,
    radius
  }));
}

// The shooter lane now feeds a full coastal horseshoe. The two collision
// rails remain short segments for stable physics, while the renderer joins
// the same points into continuous curves.
const coastalOrbitOuterPoints = [
  { x: 30, y: 210 },
  { x: 30, y: 176 },
  { x: 32, y: 150 },
  { x: 40, y: 122 },
  { x: 56, y: 98 },
  { x: 78, y: 82 },
  { x: 106, y: 72 },
  { x: 142, y: 66 },
  { x: 190, y: 62 },
  { x: 240, y: 61 },
  { x: 290, y: 63 },
  { x: 336, y: 68 },
  { x: 374, y: 80 },
  { x: 406, y: 98 },
  { x: 430, y: 122 },
  { x: 446, y: 148 },
  { x: 452, y: 168 }
];

const coastalOrbitInnerPoints = [
  { x: 68, y: 210 },
  { x: 68, y: 180 },
  { x: 70, y: 158 },
  { x: 76, y: 142 },
  { x: 88, y: 128 },
  { x: 106, y: 118 },
  { x: 132, y: 110 },
  { x: 166, y: 104 },
  { x: 206, y: 101 },
  { x: 240, y: 100 },
  { x: 278, y: 102 },
  { x: 314, y: 106 },
  { x: 344, y: 114 },
  { x: 370, y: 126 },
  { x: 388, y: 140 },
  { x: 400, y: 154 },
  { x: 396, y: 158 }
];

const coastalOrbitRails = [
  ...makeRailSegments(coastalOrbitOuterPoints),
  ...makeRailSegments(coastalOrbitInnerPoints)
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

  syncLaunchButton();
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
  syncLaunchButton();
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

  for (const rail of coastalOrbitRails) {
    // The polished orbit loses very little energy, allowing a properly charged
    // launch to sweep through both corners instead of stalling across the top.
    resolveSegmentCollision(rail, { x: 0, y: 0 }, 0.98);
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

function traceSmoothRail(points) {
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    const midpoint = {
      x: (point.x + next.x) / 2,
      y: (point.y + next.y) / 2
    };
    ctx.quadraticCurveTo(point.x, point.y, midpoint.x, midpoint.y);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function drawSmoothNeonRail(points, accent) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = MIAMI_COLORS.structure;
  ctx.lineWidth = 8;
  ctx.beginPath();
  traceSmoothRail(points);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.25;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 7;
  ctx.beginPath();
  traceSmoothRail(points);
  ctx.stroke();
  ctx.restore();
}

function drawCoastalOrbit() {
  const laneGlow = ctx.createLinearGradient(TABLE.left, 0, TABLE.right, 0);
  laneGlow.addColorStop(0, 'rgba(255, 60, 172, 0.12)');
  laneGlow.addColorStop(0.5, 'rgba(201, 184, 255, 0.07)');
  laneGlow.addColorStop(1, 'rgba(34, 223, 243, 0.12)');

  ctx.save();
  ctx.fillStyle = laneGlow;
  ctx.beginPath();
  ctx.moveTo(coastalOrbitOuterPoints[0].x, coastalOrbitOuterPoints[0].y);
  for (const point of coastalOrbitOuterPoints.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  for (const point of [...coastalOrbitInnerPoints].reverse()) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawSmoothNeonRail(coastalOrbitOuterPoints, MIAMI_COLORS.cyan);
  drawSmoothNeonRail(coastalOrbitInnerPoints, MIAMI_COLORS.magenta);
}

function drawTable() {
  ctx.fillStyle = MIAMI_COLORS.playfield;
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
}

function drawShooterLane() {
  drawNeonSegment(shooterDivider, MIAMI_COLORS.cyan);
  drawCoastalOrbit();
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

  if (window.miamiGameStarted === false) {
    accumulator = 0;
    draw();
    requestAnimationFrame(frame);
    return;
  }

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

const keyboardFlipperCodes = {
  left: new Set(),
  right: new Set()
};

const buttonFlipperPointers = {
  left: new Set(),
  right: new Set()
};

function flipperButtonFor(side) {
  return side === 'left' ? leftFlipperButton : rightFlipperButton;
}

function syncFlipperInput(side) {
  const wasPressed = keys[side];
  const isPressed =
    keyboardFlipperCodes[side].size > 0 ||
    buttonFlipperPointers[side].size > 0;

  keys[side] = isPressed;
  flipperButtonFor(side).setAttribute('aria-pressed', String(isPressed));

  if (isPressed && !wasPressed) {
    window.dispatchEvent(new CustomEvent('miami-flipper', {
      detail: { index: side === 'left' ? 0 : 1 }
    }));
  }
}

function sideForKey(code) {
  if (code === 'ArrowLeft' || code === 'KeyZ') {
    return 'left';
  }

  if (
    code === 'ArrowRight' ||
    code === 'Slash' ||
    code === 'NumpadDivide' ||
    code === 'KeyX'
  ) {
    return 'right';
  }

  return null;
}

function setKeyState(code, pressed) {
  const side = sideForKey(code);
  if (!side) {
    return false;
  }

  if (pressed) {
    keyboardFlipperCodes[side].add(code);
  } else {
    keyboardFlipperCodes[side].delete(code);
  }

  syncFlipperInput(side);
  return true;
}

function syncLaunchButton() {
  launchButton.disabled = !ball.ready;
  launchButton.setAttribute('aria-pressed', String(plunger.charging));
}

function beginPlungerCharge() {
  if (!ball.ready || plunger.charging) {
    return;
  }

  plunger.charging = true;
  syncLaunchButton();
}

function finishPlungerCharge(shouldLaunch) {
  if (!plunger.charging) {
    return;
  }

  if (shouldLaunch && ball.ready) {
    launchBall();
    return;
  }

  plunger.charge = 0;
  plunger.charging = false;
  syncLaunchButton();
}

function bindFlipperButton(button, side) {
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    buttonFlipperPointers[side].add(event.pointerId);
    syncFlipperInput(side);
    button.setPointerCapture(event.pointerId);
  });

  const releasePointer = (event) => {
    buttonFlipperPointers[side].delete(event.pointerId);
    syncFlipperInput(side);
  };

  button.addEventListener('pointerup', releasePointer);
  button.addEventListener('pointercancel', releasePointer);
  button.addEventListener('lostpointercapture', releasePointer);
  button.addEventListener('contextmenu', event => event.preventDefault());

  button.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' && event.code !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) {
      buttonFlipperPointers[side].add('keyboard');
      syncFlipperInput(side);
    }
  });

  button.addEventListener('keyup', (event) => {
    if (event.code !== 'Space' && event.code !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    buttonFlipperPointers[side].delete('keyboard');
    syncFlipperInput(side);
  });
}

let activeLaunchPointer = null;
let launchKeyHeld = false;

launchButton.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  event.preventDefault();
  activeLaunchPointer = event.pointerId;
  beginPlungerCharge();
  launchButton.setPointerCapture(event.pointerId);
});

launchButton.addEventListener('pointerup', (event) => {
  if (event.pointerId !== activeLaunchPointer) {
    return;
  }

  activeLaunchPointer = null;
  finishPlungerCharge(true);
});

function cancelLaunchPointer(event) {
  if (event.pointerId !== activeLaunchPointer) {
    return;
  }

  activeLaunchPointer = null;
  finishPlungerCharge(false);
}

launchButton.addEventListener('pointercancel', cancelLaunchPointer);
launchButton.addEventListener('lostpointercapture', cancelLaunchPointer);
launchButton.addEventListener('contextmenu', event => event.preventDefault());

launchButton.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (!event.repeat) {
    launchKeyHeld = true;
    beginPlungerCharge();
  }
});

launchButton.addEventListener('keyup', (event) => {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (launchKeyHeld) {
    launchKeyHeld = false;
    finishPlungerCharge(true);
  }
});

window.addEventListener('keydown', (event) => {
  if (setKeyState(event.code, true)) {
    event.preventDefault();
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) {
      beginPlungerCharge();
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
    finishPlungerCharge(true);
  }
});

function releaseAllControls() {
  keyboardFlipperCodes.left.clear();
  keyboardFlipperCodes.right.clear();
  buttonFlipperPointers.left.clear();
  buttonFlipperPointers.right.clear();
  syncFlipperInput('left');
  syncFlipperInput('right');

  activeLaunchPointer = null;
  launchKeyHeld = false;
  finishPlungerCharge(false);
}

bindFlipperButton(leftFlipperButton, 'left');
bindFlipperButton(rightFlipperButton, 'right');
syncFlipperInput('left');
syncFlipperInput('right');
syncLaunchButton();

window.addEventListener('blur', releaseAllControls);

requestAnimationFrame(frame);
