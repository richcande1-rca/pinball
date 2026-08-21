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
  radius: 10,
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
  { side: 'left', x1: 56, y1: 553, x2: 115, y2: 602, radius: 10, kick: 65, armed: true },
  { side: 'right', x1: 364, y1: 553, x2: 305, y2: 602, radius: 10, kick: 65, armed: true }
];

const cradle = {
  timer: 0,
  sleepDelay: 0.12,
  zoneRadius: 34,
  sleeping: false,
  side: null
};

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

  cradle.timer = 0;
  cradle.sleeping = false;
  cradle.side = null;

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

function isInCradlePocket(flipper) {
  // The actual resting pocket is just inward and above the flipper pivot,
  // where the raised bat meets the inner end of its sling. Use position, not
  // exact contact or speed, so tiny solver bounces cannot keep resetting rest.
  const inward = flipper.side === 'left' ? 1 : -1;
  const pocketX = flipper.pivotX + inward * 15;
  const pocketY = flipper.pivotY - 31;
  const dx = ball.x - pocketX;
  const dy = ball.y - pocketY;

  const onInwardSide = flipper.side === 'left'
    ? ball.x >= flipper.pivotX - 2 && ball.x <= flipper.pivotX + 48
    : ball.x <= flipper.pivotX + 2 && ball.x >= flipper.pivotX - 48;

  const nearBase = ball.y >= flipper.pivotY - 62 && ball.y <= flipper.pivotY + 4;

  return (
    onInwardSide &&
    nearBase &&
    Math.hypot(dx, dy) <= cradle.zoneRadius
  );
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
  resolveSegmentCollision(segment, surfaceVelocity, restitution);
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
  const rearmDistance = contactDistance + 8;

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
  resolveSegmentCollision(
    bumper,
    { x: 0, y: 0 },
    restitution,
    shouldKick ? bumper.kick : 0
  );

  if (shouldKick) {
    bumper.armed = false;
  }
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

  // A sleeping cradle ignores gravity entirely. Releasing or moving the held
  // flipper wakes the ball immediately, then normal physics resumes.
  if (cradle.sleeping) {
    const sleepingFlipper = flippers.find(flipper => flipper.side === cradle.side);
    const stillHolding =
      sleepingFlipper &&
      sleepingFlipper.pressed &&
      Math.abs(sleepingFlipper.angularVelocity) < 0.25;

    if (stillHolding) {
      ball.vx = 0;
      ball.vy = 0;
      return;
    }

    cradle.sleeping = false;
    cradle.side = null;
    cradle.timer = 0;
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

  for (const bumper of sideBumpers) {
    collideWithSideBumper(bumper);
  }

  for (const flipper of flippers) {
    collideWithFlipper(flipper);
  }

  // Final-boss cradle rule: once a ball stays in the actual base pocket of a
  // held flipper for a moment, residual solver bounce is declared finished.
  // There is deliberately no velocity threshold and no exact-contact test.
  let cradleSide = null;

  for (const flipper of flippers) {
    const heldStill = flipper.pressed && Math.abs(flipper.angularVelocity) < 0.25;
    if (heldStill && isInCradlePocket(flipper)) {
      cradleSide = flipper.side;
      break;
    }
  }

  if (cradleSide) {
    cradle.timer += dt;

    if (cradle.timer >= cradle.sleepDelay) {
      cradle.sleeping = true;
      cradle.side = cradleSide;
      cradle.timer = 0;
      ball.vx = 0;
      ball.vy = 0;
    }
  } else {
    cradle.timer = 0;
  }

  // Open drain below the flippers.
  if (ball.y - ball.radius > canvas.height) {
    resetBall();
  }
}

function drawTable() {
  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, '#081925');
  background.addColorStop(0.55, '#07131c');
  background.addColorStop(1, '#050a0f');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const playfield = ctx.createRadialGradient(
    PLAYFIELD_CENTER,
    300,
    30,
    PLAYFIELD_CENTER,
    360,
    410
  );
  playfield.addColorStop(0, '#102433');
  playfield.addColorStop(1, '#08131c');
  ctx.fillStyle = playfield;
  ctx.fillRect(
    TABLE.left,
    TABLE.top,
    TABLE.right - TABLE.left,
    TABLE.bottom - TABLE.top
  );

  // Slightly separate the shooter lane visually without changing geometry.
  ctx.fillStyle = 'rgba(76, 125, 153, 0.075)';
  ctx.fillRect(
    SHOOTER.dividerX,
    TABLE.top,
    TABLE.right - SHOOTER.dividerX,
    TABLE.bottom - TABLE.top
  );

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const traceTable = () => {
    ctx.beginPath();
    ctx.moveTo(TABLE.left, TABLE.bottom);
    ctx.lineTo(TABLE.left, TABLE.top);
    ctx.lineTo(TABLE.right, TABLE.top);
    ctx.lineTo(TABLE.right, TABLE.bottom);
    ctx.stroke();
  };

  ctx.strokeStyle = '#182632';
  ctx.lineWidth = 10;
  traceTable();

  ctx.strokeStyle = '#7e99aa';
  ctx.lineWidth = 4;
  traceTable();

  ctx.strokeStyle = 'rgba(222, 242, 255, 0.45)';
  ctx.lineWidth = 1.2;
  traceTable();
}

function drawShooterLane() {
  ctx.lineCap = 'round';

  const drawMetalSegment = (segment) => {
    ctx.strokeStyle = '#17232d';
    ctx.lineWidth = segment.radius * 2 + 7;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.strokeStyle = '#8da7b8';
    ctx.lineWidth = segment.radius * 2;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(235, 249, 255, 0.48)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();
  };

  drawMetalSegment(shooterDivider);
  drawMetalSegment(shooterGuide);
}

function drawPlunger() {
  const pull = plunger.charge * plunger.maxPull;
  const tipY = plunger.topY + pull;

  // Dark groove behind the plunger shaft.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(plunger.x, plunger.topY - 4);
  ctx.lineTo(plunger.x, canvas.height - 10);
  ctx.stroke();

  const shaft = ctx.createLinearGradient(plunger.x - 6, 0, plunger.x + 6, 0);
  shaft.addColorStop(0, '#566673');
  shaft.addColorStop(0.45, '#d7e3ea');
  shaft.addColorStop(0.7, '#8b9ca8');
  shaft.addColorStop(1, '#4e5c66');

  ctx.strokeStyle = shaft;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(plunger.x, tipY);
  ctx.lineTo(plunger.x, Math.min(canvas.height - 8, tipY + 36));
  ctx.stroke();

  ctx.strokeStyle = '#8da7b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(plunger.x - 13, plunger.topY - 2);
  ctx.lineTo(plunger.x + 13, plunger.topY - 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(232, 248, 255, 0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plunger.x - 10, plunger.topY - 4);
  ctx.lineTo(plunger.x + 10, plunger.topY - 4);
  ctx.stroke();
}

function drawSideBumpers() {
  ctx.lineCap = 'round';

  for (const bumper of sideBumpers) {
    ctx.strokeStyle = '#451a21';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(bumper.x1, bumper.y1);
    ctx.lineTo(bumper.x2, bumper.y2);
    ctx.stroke();

    ctx.strokeStyle = '#d94a55';
    ctx.lineWidth = 19;
    ctx.beginPath();
    ctx.moveTo(bumper.x1, bumper.y1);
    ctx.lineTo(bumper.x2, bumper.y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 180, 147, 0.72)';
    ctx.lineWidth = 3;
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

    ctx.strokeStyle = '#3d161b';
    ctx.lineWidth = flipper.radius * 2 + 8;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.strokeStyle = flipper.pressed ? '#ff665d' : '#df414b';
    ctx.lineWidth = flipper.radius * 2;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.strokeStyle = flipper.pressed
      ? 'rgba(255, 225, 200, 0.78)'
      : 'rgba(255, 180, 160, 0.58)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.stroke();

    ctx.fillStyle = '#17212a';
    ctx.beginPath();
    ctx.arc(flipper.pivotX, flipper.pivotY, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#95aab8';
    ctx.beginPath();
    ctx.arc(flipper.pivotX, flipper.pivotY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dbe8ef';
    ctx.beginPath();
    ctx.arc(flipper.pivotX - 1.5, flipper.pivotY - 1.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBall() {
  ctx.save();
  ctx.shadowColor = 'rgba(160, 220, 255, 0.34)';
  ctx.shadowBlur = 8;

  const metal = ctx.createRadialGradient(
    ball.x - 4,
    ball.y - 5,
    1.5,
    ball.x,
    ball.y,
    ball.radius
  );
  metal.addColorStop(0, '#ffffff');
  metal.addColorStop(0.24, '#dbe6ec');
  metal.addColorStop(0.68, '#9cabb5');
  metal.addColorStop(1, '#53616c');

  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ball.x - 2, ball.y - 2, ball.radius - 2.5, Math.PI * 1.08, Math.PI * 1.7);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();
  drawShooterLane();
  drawPlunger();
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

requestAnimationFrame(frame);
