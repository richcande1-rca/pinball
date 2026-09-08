// Miami Nights pause control. This late-loaded wrapper freezes simulation
// steps without changing gameplay physics or muting the soundtrack.

(() => {
  if (window.miamiPauseControlsInstalled) return;
  window.miamiPauseControlsInstalled = true;

  let paused = false;

  const controlStrip = document.querySelector('.control-strip');
  if (!controlStrip) return;

  // Keep the two utility controls in the top cabinet strip so phones do not
  // spend vertical space on full-width buttons below the playfield. High scores
  // mirrors the score at upper left; pause mirrors the music controls at right.
  const worldScoresButton = document.getElementById('miami-world-scores-button');
  if (worldScoresButton) {
    worldScoresButton.textContent = 'HIGH SCORES';
    worldScoresButton.setAttribute('aria-label', 'World high scores');
    controlStrip.appendChild(worldScoresButton);
  }

  const pauseButton = document.createElement('button');
  pauseButton.id = 'miami-pause-button';
  pauseButton.className = 'miami-world-scores-button';
  pauseButton.type = 'button';
  pauseButton.textContent = 'PAUSE · P';
  pauseButton.setAttribute('aria-label', 'Pause game');
  pauseButton.setAttribute('aria-pressed', 'false');
  pauseButton.disabled = !window.miamiGameStarted;
  controlStrip.appendChild(pauseButton);

  const style = document.createElement('style');
  style.textContent = `
    .control-strip {
      row-gap: 0.18rem;
    }

    .control-strip #miami-world-scores-button,
    .control-strip #miami-pause-button {
      width: auto;
      min-width: 0;
      min-height: 1.45rem;
      margin: 0;
      padding: 0.18rem 0.42rem;
      white-space: nowrap;
      font-size: 0.5rem;
      letter-spacing: 0.08em;
      line-height: 1;
      align-self: center;
    }

    .control-strip #miami-world-scores-button {
      grid-column: 1;
      grid-row: 2;
      justify-self: start;
    }

    .control-strip #miami-world-scores-button::before {
      margin-right: 0.3rem;
    }

    .control-strip #miami-pause-button {
      grid-column: 3;
      grid-row: 2;
      justify-self: end;
    }

    #miami-pause-button::before {
      content: 'Ⅱ';
      margin-right: 0.3rem;
    }

    #miami-pause-button[aria-pressed="true"] {
      border-color: #22dff3;
      color: #8ef7ff;
      box-shadow:
        inset 0 0 18px rgba(34, 223, 243, 0.12),
        0 0 16px rgba(255, 60, 172, 0.16);
    }

    #miami-pause-button:disabled {
      opacity: 0.46;
      cursor: default;
    }

    .miami-pause-overlay {
      position: fixed;
      inset: 0;
      z-index: 24;
      display: grid;
      place-items: center;
      pointer-events: none;
      background: rgba(2, 4, 12, 0.52);
      backdrop-filter: blur(2px);
    }

    .miami-pause-overlay[hidden] {
      display: none;
    }

    .miami-pause-overlay strong {
      padding: 0.8rem 1.15rem;
      border: 1px solid rgba(34, 223, 243, 0.72);
      border-radius: 6px;
      background: rgba(5, 10, 25, 0.9);
      color: #f4ffff;
      font: 900 clamp(1.2rem, 7vw, 2.2rem) ui-monospace, monospace;
      letter-spacing: 0.18em;
      text-shadow:
        0 0 10px rgba(34, 223, 243, 0.85),
        0 0 14px rgba(255, 60, 172, 0.45);
      box-shadow: 0 0 28px rgba(34, 223, 243, 0.18);
    }

    @media (max-width: 430px) {
      .control-strip #miami-world-scores-button,
      .control-strip #miami-pause-button {
        min-height: 1.3rem;
        padding: 0.14rem 0.28rem;
        font-size: 0.42rem;
        letter-spacing: 0.045em;
      }

      .control-strip #miami-world-scores-button::before,
      #miami-pause-button::before {
        margin-right: 0.2rem;
      }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'miami-pause-overlay';
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<strong>PAUSED</strong>';
  document.body.appendChild(overlay);

  function worldBoardIsOpen() {
    const board = document.getElementById('miami-world-scores');
    return Boolean(board && !board.classList.contains('is-hidden'));
  }

  function setPaused(nextPaused) {
    if (nextPaused && (!window.miamiGameStarted || gameOver || worldBoardIsOpen())) {
      return;
    }

    paused = Boolean(nextPaused);
    if (paused && typeof releaseAllControls === 'function') {
      releaseAllControls();
    }

    pauseButton.textContent = paused ? 'RESUME · P' : 'PAUSE · P';
    pauseButton.setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
    pauseButton.setAttribute('aria-pressed', String(paused));
    overlay.hidden = !paused;
    overlay.setAttribute('aria-hidden', String(!paused));

    window.dispatchEvent(new CustomEvent('miami-pause-change', {
      detail: { paused }
    }));
  }

  function togglePause() {
    setPaused(!paused);
  }

  pauseButton.addEventListener('click', () => {
    togglePause();
    pauseButton.blur();
  });

  window.addEventListener('miami-game-start', () => {
    pauseButton.disabled = false;
  });

  window.addEventListener('keydown', event => {
    if (
      event.code !== 'KeyP' ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) return;

    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable ||
      worldBoardIsOpen()
    ) return;

    event.preventDefault();
    togglePause();
  });

  const baseUpdateWithPause = update;
  update = function updateWithPause(dt) {
    if (paused) return;
    baseUpdateWithPause(dt);
  };

  const baseResetGameWithPause = resetGame;
  resetGame = function resetGameWithPause() {
    if (paused) setPaused(false);
    baseResetGameWithPause();
  };

  const instructions = document.querySelector('.instruction-content');
  if (instructions) {
    instructions.append(document.createTextNode(
      ' Pause: P or the PAUSE button.'
    ));
  }
})();
