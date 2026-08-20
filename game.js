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
  vx: 90,
  vy: 0,
  radius: 10
};

const gravity = 760;      // px/s²
const restitution = 0.82; // energy retained after wall bounce
const airDrag = 0.999;

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = 90;
  ball.vx = 90;
  ball.vy = 0;
}

function update(dt) {
  ball.vy += gravity * dt;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  ball.vx *= airDrag;
  ball.vy *= airDrag;

  if (ball.x - ball.radius < TABLE.left) {
    ball.x = TABLE.left + ball.radius;
    ball.vx = Math.abs(ball.vx) * restitution;
  }

  if (ball.x + ball.radius > TABLE.right) {
    ball.x = TABLE.right - ball.radius;
    ball.vx = -Math.abs(ball.vx) * restitution;
  }

  if (ball.y - ball.radius < TABLE.top) {
    ball.y = TABLE.top + ball.radius;
    ball.vy = Math.abs(ball.vy) * restitution;
  }

  // The bottom is deliberately open: this is our first crude drain.
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

function drawBall() {
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();
  drawBall();
}

const fixedStep = 1 / 120;
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

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    resetBall();
  }
});

canvas.addEventListener('pointerdown', resetBall);

requestAnimationFrame(frame);
