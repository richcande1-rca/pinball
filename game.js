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
  const rearmDistance = contactDistance + 18;

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

function drawTable() {
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(TABLE.left, TABLE.bottom);
  ctx.lineTo(TABLE.left, TABLE.top);
  ctx.lineTo(TABLE.right, TABLE.top);
  ctx.lineTo(TABLE.right, TABLE.bottom);
  ctx.stroke();
}

function drawShooterLane() {
  ctx.strokeStyle = '#777';
  ctx.lineWidth = shooterDivider.radius * 2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(shooterDivider.x1, shooterDivider.y1);
  ctx.lineTo(shooterDivider.x2, shooterDivider.y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(shooterGuide.x1, shooterGuide.y1);
  ctx.lineTo(shooterGuide.x2, shooterGuide.y2);
  ctx.stroke();
}

function drawPlunger() {
  const pull = plunger.charge * plunger.maxPull;
  const tipY = plunger.topY + pull;

  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(plunger.x, tipY);
  ctx.lineTo(plunger.x, Math.min(canvas.height - 8, tipY + 36));
  ctx.stroke();

  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plunger.x - 12, plunger.topY - 2);
  ctx.lineTo(plunger.x + 12, plunger.topY - 2);
  ctx.stroke();
}

function drawSideBumpers() {
  ctx.strokeStyle = '#b8b8b8';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';

  for (const bumper of sideBumpers) {
    ctx.beginPath();
    ctx.moveTo(bumper.x1, bumper.y1);
    ctx.lineTo(bumper.x2, bumper.y2);
    ctx.stroke();
  }
}

function drawLowerGuides() {
  ctx.strokeStyle = '#777';
  ctx.lineWidth = lowerGuides[0].radius * 2;
  ctx.lineCap = 'round';

  for (const guide of lowerGuides) {
    ctx.beginPath();
    ctx.moveTo(guide.x1, guide.y1);
    ctx.lineTo(guide.x2, guide.y2);
    ctx.stroke();
  }
}

function drawFlippers() {
  ctx.lineCap = 'round';

  for (const flipper of flippers) {
    const segment = getFlipperSegment(flipper);
    ctx.strokeStyle = flipper.pressed ? '#f2f2f2' : '#cfcfcf';
    ctx.lineWidth = flipper.radius * 2;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(flipper.pivotX, flipper.pivotY, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBall() {
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();
  drawShooterLane();
  drawPlunger();
  drawSideBumpers();
  drawLowerGuides();
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
