// Miami Nights: one passive center post between the lower flippers.
// Late-loaded so the stable core files and approved surrounding geometry stay untouched.

(() => {
  const EASY_MODE = 'easy';
  const HARD_MODE = 'hard';

  // Production play is permanently HARD. EASY exists only as a service/test aid.
  window.miamiDifficultyMode = HARD_MODE;

  const centerPost = {
    x: PLAYFIELD_CENTER,
    y: 600,
    radius: 6,
    restitution: 0.88
  };

  function centerPostEnabled() {
    return Boolean(window.miamiTestModeActive) &&
      window.miamiDifficultyMode === EASY_MODE;
  }

  function collideWithCenterPost() {
    if (
      !centerPostEnabled() ||
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
    if (!centerPostEnabled()) return;

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

  // Normal play is always HARD: the center safety post is absent.
  // EASY is intentionally available only while hidden service/test mode is active.
  function setDifficultyMode(mode) {
    if (mode !== EASY_MODE && mode !== HARD_MODE) return false;
    if (mode === EASY_MODE && !window.miamiTestModeActive) return false;

    window.miamiDifficultyMode = mode;
    window.dispatchEvent(new CustomEvent('miami-difficulty-change', {
      detail: {
        mode,
        centerPost: mode === EASY_MODE
      }
    }));
    return true;
  }

  window.miamiSetDifficultyMode = setDifficultyMode;

  const baseResetGameWithDifficulty = resetGame;
  resetGame = function resetGameWithDifficulty() {
    if (!window.miamiTestModeActive) {
      window.miamiDifficultyMode = HARD_MODE;
    }
    baseResetGameWithDifficulty();
  };

  window.addEventListener('miami-test-mode-change', event => {
    if (event.detail?.active) return;
    if (window.miamiDifficultyMode === HARD_MODE) return;

    window.miamiDifficultyMode = HARD_MODE;
    window.dispatchEvent(new CustomEvent('miami-difficulty-change', {
      detail: {
        mode: HARD_MODE,
        centerPost: false
      }
    }));
  });

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Normal play uses HARD geometry with no center safety post. EASY geometry is available only in hidden Test Mode.'
    ));
  }
})();

// LOWER2A: install the physical lower-third rearchitecture after the temporary
// safety post. The post remains untouched and active for this test pass.
(() => {
  if (window.miamiLowerPlayfieldInstalled) return;
  const script = document.createElement('script');
  script.src = window.miamiVersionedAsset('lower-playfield.js');
  script.async = false;
  document.body.appendChild(script);
})();
