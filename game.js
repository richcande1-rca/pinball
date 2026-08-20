const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TABLE = {
  left: 24,
  right: canvas.width - 24,
  top: 24,
  bottom: canvas.height - 24
};

const ball = {
  x: canvas.width / 2,
  y: 90,
  vx: 0,
  vy: 0,
  radius: 10
};

const gravity = 760;      // px/s², straight down the playfield
const wallRestitution = 0.82;
const rollingDrag = 0.9992;

const keys = {
  left: false,
  right: false
};

function makeFlipper(side) {
  const isLeft = side === 'left';
  return {
    side,
    // A real physical gap remains between the rounded flipper tips so the
    // ball can drain through the center without any special-case logic.
    pivotX: isLeft ? 145 : 335,
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
  { x1: 56, y1: 525, x2: 145, y2: 574, radius: 10, kick: 125, touching: false },
  { x1: canvas.width - 56, y1: 525, x2: canvas.width - 145, y2: 574, radius: 10, kick: 125, touching: false }
];

function resetBall() {
  // Neutral reset: no built-in sideways motion. Lateral velocity must come
  // from the table, a bumper, or a flipper.
  ball.x = canvas.width / 2;
  ball.y = 90;
  ball.vx = 0;
  ball.vy = 0;

  for (const bumper of sideBumpers) {
    bumper.touching = false;
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

  const rx = closest.x - flipper.pivotX;
  const ry = closest.y - flipper.pivotY;
  const surfaceVelocity = {
    x: -flipper.angularVelocity * ry,
    y: flipper.angularVelocity * rx
  };

  resolveSegmentCollision(segment, surfaceVelocity, 0.86);
}

function collideWithSideBumper(bumper) {
  // Fire the powered kick only when the ball first enters contact. Remaining
  // overlapped for another physics step does not create free extra energy.
  const kick = bumper.touching ? 0 : bumper.kick;
  const touchingNow = resolveSegmentCollision(
    bumper,
    { x: 0, y: 0 },
    0.84,
    kick
  );

  bumper.touching = touchingNow;
}

function update(dt) {
  for (const flipper of flippers) {
    updateFlipper(flipper, dt);
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
  drawSideBumpers();
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

  if (event.code === 'Space' || event.code === 'KeyR') {
    event.preventDefault();
    resetBall();
  }
});

window.addEventListener('keyup', (event) => {
  if (setKeyState(event.code, false)) {
    event.preventDefault();
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

requestAnimationFrame(frame);
