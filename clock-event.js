// Miami Nights: center clock event.
// Clear the three upper and three lower field barriers in one ball to open
// the clock. Six alternating clock lamps then rise into high-bounce pegs.
// Knock down all six pegs to complete the clock event; everything resets on
// the next ball/new game.

(() => {
  if (window.miamiClockEventInstalled) return;
  window.miamiClockEventInstalled = true;

  const CENTER_X = 210;
  const CENTER_Y = 350;
  const RADIUS_X = 66;
  const RADIUS_Y = 55;
  const PEG_LAMP_INDICES = [0, 2, 4, 6, 8, 10];
  const PEG_RADIUS = 5.4;
  const PEG_KICK = 300;
  const PEG_RESTITUTION = 0.90;
  const OPEN_REVEAL_MS = 760;

  const upperBarrierHits = new Set();
  const lowerBarrierHits = new Set();
  const state = {
    open: false,
    completed: false,
    remaining: 6,
    openedAt: -Infinity
  };
  window.miamiClockEventState = state;

  const pegs = PEG_LAMP_INDICES.map((lampIndex, pegIndex) => {
    const angle = -Math.PI / 2 + lampIndex * Math.PI * 2 / 12;
    return {
      lampIndex,
      x: CENTER_X + Math.cos(angle) * RADIUS_X,
      y: CENTER_Y + Math.sin(angle) * RADIUS_Y,
      radius: PEG_RADIUS,
      kick: PEG_KICK,
      accent: pegIndex % 2 === 0 ? 'cyan' : 'magenta',
      dropped: false,
      flashStartedAt: -Infinity
    };
  });

  function resetClockEvent() {
    const wasOpen = state.open;
    state.open = false;
    state.completed = false;
    state.remaining = pegs.length;
    state.openedAt = -Infinity;
    upperBarrierHits.clear();
    lowerBarrierHits.clear();

    for (const peg of pegs) {
      peg.dropped = false;
      peg.flashStartedAt = -Infinity;
    }

    if (wasOpen) {
      window.dispatchEvent(new CustomEvent('miami-clock-close'));
    }
  }

  function maybeOpenClock() {
    if (state.open) return;
    if (upperBarrierHits.size < 3 || lowerBarrierHits.size < 3) return;

    state.open = true;
    state.completed = false;
    state.remaining = pegs.length;
    state.openedAt = performance.now();
    for (const peg of pegs) peg.dropped = false;

    window.dispatchEvent(new CustomEvent('miami-clock-open', {
      detail: {
        upperBarriers: upperBarrierHits.size,
        lowerBarriers: lowerBarrierHits.size,
        totalBarriers: 6,
        clockPegs: pegs.length
      }
    }));
  }

  // The established upper barrier bank reports its three hits as post impacts
  // 11, 12, and 13. Each one already stays down for the rest of the ball.
  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (detail.type !== 'post') return;

    const impactIndex = Number(detail.index);
    if (impactIndex >= 11 && impactIndex <= 13) {
      upperBarrierHits.add(impactIndex - 11);
      maybeOpenClock();
    }
  });

  // The lower-center barrier bank exposes stable group/groupIndex metadata.
  window.addEventListener('miami-secondary-target', event => {
    const detail = event.detail || {};
    if (detail.group !== 'center') return;

    const groupIndex = Number(detail.groupIndex);
    if (groupIndex < 0 || groupIndex > 2) return;
    lowerBarrierHits.add(groupIndex);
    maybeOpenClock();
  });

  function pegRise(pegIndex, now) {
    if (!state.open) return 0;
    const stagger = pegIndex * 55;
    return clamp((now - state.openedAt - stagger) / 260, 0, 1);
  }

  function liveBallOnMainPlayfield() {
    return !gameOver &&
      !ball.ready &&
      !underpass.active &&
      !oceanRamp.active &&
      !loopRamp.active &&
      magneticTarget.state !== 'holding';
  }

  function collideWithClockPeg(peg, pegIndex, now) {
    if (peg.dropped) return false;

    const rise = pegRise(pegIndex, now);
    if (rise < 0.92) return false;

    let dx = ball.x - peg.x;
    let dy = ball.y - peg.y;
    let distance = Math.hypot(dx, dy);
    const contactDistance = ball.radius + peg.radius;
    if (distance >= contactDistance) return false;

    if (distance < 0.0001) {
      const escapeAngle = -Math.PI / 2 + pegIndex * Math.PI * 2 / pegs.length;
      dx = Math.cos(escapeAngle);
      dy = Math.sin(escapeAngle);
      distance = 1;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const incomingNormalSpeed = -(ball.vx * nx + ball.vy * ny);
    const overlap = contactDistance - distance;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    if (incomingNormalSpeed > 0) {
      const impulse = (1 + PEG_RESTITUTION) * incomingNormalSpeed;
      ball.vx += impulse * nx;
      ball.vy += impulse * ny;
    }

    if (incomingNormalSpeed >= 35) {
      const jitter = (Math.random() - 0.5) * 0.18;
      const cos = Math.cos(jitter);
      const sin = Math.sin(jitter);
      const kickX = nx * cos - ny * sin;
      const kickY = nx * sin + ny * cos;

      ball.vx += kickX * peg.kick;
      ball.vy += kickY * peg.kick;
      peg.dropped = true;
      peg.flashStartedAt = now;
      state.remaining = pegs.reduce(
        (remaining, candidate) => remaining + (candidate.dropped ? 0 : 1),
        0
      );

      window.dispatchEvent(new CustomEvent('miami-impact', {
        detail: {
          type: 'post',
          strength: clamp((incomingNormalSpeed + peg.kick * 0.45) / 650, 0.2, 1),
          x: peg.x,
          y: peg.y,
          index: 60 + pegIndex
        }
      }));

      window.dispatchEvent(new CustomEvent('miami-clock-peg-hit', {
        detail: {
          pegIndex,
          lampIndex: peg.lampIndex,
          x: peg.x,
          y: peg.y,
          remaining: state.remaining
        }
      }));

      if (state.remaining === 0 && !state.completed) {
        state.completed = true;
        window.dispatchEvent(new CustomEvent('miami-clock-complete', {
          detail: { pegsKnockedDown: pegs.length }
        }));
      }
    }

    return true;
  }

  const baseUpdateWithClockEvent = update;
  update = function updateWithClockEvent(dt) {
    baseUpdateWithClockEvent(dt);
    if (!state.open || state.completed || !liveBallOnMainPlayfield()) return;

    const now = performance.now();
    for (let index = 0; index < pegs.length; index += 1) {
      collideWithClockPeg(pegs[index], index, now);
    }
  };

  function drawClockPegs() {
    if (!state.open) return;

    const now = performance.now();
    const mobile = Boolean(window.miamiMobilePerformanceMode);
    const openAge = now - state.openedAt;
    const reveal = clamp(openAge / OPEN_REVEAL_MS, 0, 1);

    // A brief twelve-hour white chase announces that all six barriers are down.
    if (reveal < 1) {
      for (let lampIndex = 0; lampIndex < 12; lampIndex += 1) {
        const angle = -Math.PI / 2 + lampIndex * Math.PI * 2 / 12;
        const x = CENTER_X + Math.cos(angle) * RADIUS_X;
        const y = CENTER_Y + Math.sin(angle) * RADIUS_Y;
        const localAge = openAge - lampIndex * 42;
        const wave = clamp(1 - Math.abs(localAge - 120) / 160, 0, 1);
        if (wave <= 0) continue;

        ctx.save();
        ctx.globalAlpha = wave * 0.9;
        ctx.fillStyle = '#ffffff';
        if (!mobile && wave > 0.72) {
          ctx.shadowColor = lampIndex % 2 ? MIAMI_COLORS.magenta : MIAMI_COLORS.cyan;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + wave * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let index = 0; index < pegs.length; index += 1) {
      const peg = pegs[index];
      const rise = pegRise(index, now);
      if (rise <= 0) continue;

      const accent = MIAMI_COLORS[peg.accent] || MIAMI_COLORS.cyan;
      const hitAge = now - peg.flashStartedAt;
      const hitFlash = hitAge >= 0 && hitAge < 220
        ? 1 - hitAge / 220
        : 0;
      const radius = peg.radius * (0.52 + rise * 0.48);

      // A successful clock hit knocks the post out of play. Leave only a brief
      // floor-level glint so the player can see which post just fell.
      if (peg.dropped) {
        if (hitFlash <= 0) continue;
        ctx.save();
        ctx.translate(peg.x, peg.y);
        ctx.globalAlpha = hitFlash * 0.85;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = accent;
        ctx.shadowBlur = mobile ? 0 : 12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.75 + (1 - hitFlash) * 0.45), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.translate(peg.x, peg.y);
      ctx.globalAlpha = 0.45 + rise * 0.55;

      ctx.fillStyle = '#070b15';
      ctx.strokeStyle = MIAMI_COLORS.structure;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = hitFlash > 0.48 ? '#f4ffff' : accent;
      ctx.strokeStyle = hitFlash > 0 ? '#ffffff' : accent;
      ctx.lineWidth = 1.6;
      if (!mobile && (rise < 1 || hitFlash > 0)) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 5 + hitFlash * 12;
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.78 + hitFlash * 0.22;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-radius * 0.28, -radius * 0.32, Math.max(0.8, radius * 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const baseDrawPassiveGeometryWithClockEvent = drawPassivePlayfieldGeometry;
  drawPassivePlayfieldGeometry = function drawPassivePlayfieldGeometryWithClockEvent() {
    baseDrawPassiveGeometryWithClockEvent();
    drawClockPegs();
  };

  window.addEventListener('miami-drain', resetClockEvent);

  const baseResetGameWithClockEvent = resetGame;
  resetGame = function resetGameWithClockEvent() {
    resetClockEvent();
    baseResetGameWithClockEvent();
  };
})();
