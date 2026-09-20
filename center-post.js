// Miami Nights: one passive center post between the lower flippers.
// Late-loaded so the stable core files and approved surrounding geometry stay untouched.

(() => {
  const EASY_MODE = 'easy';
  const HARD_MODE = 'hard';

  if (
    window.miamiDifficultyMode !== EASY_MODE &&
    window.miamiDifficultyMode !== HARD_MODE
  ) {
    window.miamiDifficultyMode = EASY_MODE;
  }

  const centerPost = {
    x: PLAYFIELD_CENTER,
    y: 600,
    radius: 6,
    restitution: 0.88
  };

  function centerPostEnabled() {
    return window.miamiDifficultyMode !== HARD_MODE;
  }

  // Remove the old purely decorative pulsing center dot. It is replaced by the
  // real passive post below in EASY mode, and left open in HARD mode.
  if (typeof drawDecorativeDisplays === 'function') {
    drawDecorativeDisplays = function drawNoDecorativeCenterDot() {};
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

  // Keep difficulty deliberately simple: HARD changes one thing only — the
  // center safety post is absent visually and physically.
  const controlStrip = document.querySelector('.control-strip');
  if (controlStrip) {
    const modeButton = document.createElement('button');
    modeButton.id = 'miami-difficulty-button';
    modeButton.type = 'button';
    modeButton.setAttribute('aria-label', 'Difficulty mode');

    const style = document.createElement('style');
    style.textContent = `
      #miami-difficulty-button {
        grid-column: 2;
        grid-row: 2;
        justify-self: center;
        align-self: center;
        width: auto;
        min-width: 0;
        min-height: 1.45rem;
        margin: 0;
        padding: 0.18rem 0.42rem;
        border: 1px solid rgba(34, 223, 243, 0.68);
        border-radius: 3px;
        background: rgba(5, 16, 34, 0.88);
        color: #f7fbff;
        font: 700 0.5rem system-ui, sans-serif;
        letter-spacing: 0.08em;
        line-height: 1;
        white-space: nowrap;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(34, 223, 243, 0.2);
      }

      #miami-difficulty-button[aria-pressed="true"] {
        border-color: rgba(255, 60, 172, 0.78);
        color: #ff9bd2;
        box-shadow:
          inset 0 0 18px rgba(255, 60, 172, 0.1),
          0 0 14px rgba(255, 60, 172, 0.24);
      }

      #miami-difficulty-button:focus-visible {
        outline: 2px solid #c9b8ff;
        outline-offset: 2px;
      }

      #miami-difficulty-button:disabled {
        opacity: 0.46;
        cursor: default;
      }

      @media (max-width: 430px) {
        #miami-difficulty-button {
          min-height: 1.3rem;
          padding: 0.14rem 0.28rem;
          font-size: 0.42rem;
          letter-spacing: 0.045em;
        }
      }
    `;
    document.head.appendChild(style);

    let difficultyLocked = false;

    function syncModeButton() {
      const hard = window.miamiDifficultyMode === HARD_MODE;
      modeButton.textContent = hard ? 'MODE HARD' : 'MODE EASY';
      modeButton.setAttribute('aria-pressed', String(hard));
      modeButton.title = hard
        ? 'Hard mode: center safety post removed'
        : 'Easy mode: center safety post active';
      modeButton.disabled = difficultyLocked;
    }

    function setDifficultyMode(mode) {
      if (difficultyLocked) return false;
      if (mode !== EASY_MODE && mode !== HARD_MODE) return false;
      window.miamiDifficultyMode = mode;
      syncModeButton();
      window.dispatchEvent(new CustomEvent('miami-difficulty-change', {
        detail: {
          mode,
          centerPost: mode === EASY_MODE
        }
      }));
      return true;
    }

    window.miamiSetDifficultyMode = setDifficultyMode;

    modeButton.addEventListener('click', () => {
      setDifficultyMode(
        window.miamiDifficultyMode === HARD_MODE ? EASY_MODE : HARD_MODE
      );
      modeButton.blur();
    });

    const baseUpdateWithDifficultyLock = update;
    update = function updateWithDifficultyLock(dt) {
      baseUpdateWithDifficultyLock(dt);
      if (!difficultyLocked && !ball.ready) {
        difficultyLocked = true;
        syncModeButton();
      }
    };

    const baseResetGameWithDifficultyUnlock = resetGame;
    resetGame = function resetGameWithDifficultyUnlock() {
      difficultyLocked = false;
      baseResetGameWithDifficultyUnlock();
      syncModeButton();
    };

    controlStrip.appendChild(modeButton);
    syncModeButton();

    const instructions = document.querySelector('.instruction-content');
    if (instructions) {
      instructions.append(document.createTextNode(
        ' Difficulty: EASY keeps the center safety post; HARD removes that post completely. Mode locks after the first launch and resets for a new game.'
      ));
    }
  }
})();

// LOWER2A: install the physical lower-third rearchitecture after the temporary
// safety post. The post remains untouched and active for this test pass.
(() => {
  if (window.miamiLowerPlayfieldInstalled) return;
  const script = document.createElement('script');
  script.src = 'lower-playfield.js?v=20260910-lower2a';
  script.async = false;
  document.body.appendChild(script);
})();
