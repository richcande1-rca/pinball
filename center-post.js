// Miami Nights: one passive center post between the lower flippers.
// Late-loaded so the stable core files and approved surrounding geometry stay untouched.

(() => {
  const centerPost = {
    x: PLAYFIELD_CENTER,
    y: 600,
    radius: 6,
    restitution: 0.88
  };

  // Remove the old purely decorative pulsing center dot. It is replaced by the
  // real passive post below.
  if (typeof drawDecorativeDisplays === 'function') {
    drawDecorativeDisplays = function drawNoDecorativeCenterDot() {};
  }

  function collideWithCenterPost() {
    if (
      gameOver ||
      ball.ready ||
      underpass.active ||
      oceanRamp.active ||
      loopRamp.active ||
      magneticTarget.state === 'holding'
    ) return false;

    let dx = ball.x - centerPost.x;
    let dy = ball.y - centerPost.y;
    let distance = Math.hypot(dx, dy);
    const contactDistance = ball.radius + centerPost.radius;
    if (distance >= contactDistance) return false;

    let nx;
    let ny;
    if (distance > 0.0001) {
      nx = dx / distance;
      ny = dy / distance;
    } else {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > 0.0001) {
        nx = -ball.vx / speed;
        ny = -ball.vy / speed;
      } else {
        nx = 0;
        ny = -1;
      }
      distance = 0;
    }

    const overlap = contactDistance - distance;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const normalSpeed = ball.vx * nx + ball.vy * ny;
    if (normalSpeed < 0) {
      const impulse = (1 + centerPost.restitution) * normalSpeed;
      ball.vx -= impulse * nx;
      ball.vy -= impulse * ny;
    }

    return true;
  }

  const baseUpdateWithCenterPost = update;
  update = function updateWithCenterPost(dt) {
    baseUpdateWithCenterPost(dt);
    collideWithCenterPost();
  };

  function drawCenterPost() {
    ctx.save();
    ctx.translate(centerPost.x, centerPost.y);

    ctx.fillStyle = '#050812';
    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, centerPost.radius + 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = MIAMI_COLORS.lavender;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = MIAMI_COLORS.lavender;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    ctx.beginPath();
    ctx.arc(0, 0, centerPost.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#cfd5e6';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const baseDrawBallWithCenterPost = drawBall;
  drawBall = function drawBallWithCenterPost() {
    drawCenterPost();
    baseDrawBallWithCenterPost();
  };
})();
