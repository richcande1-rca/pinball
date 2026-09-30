// Miami Nights hidden service/test panel.
// Unlock: click/tap the visible build number four times, then enter 3050.
// Session-only by design: reload/exit restores normal play and test scores are
// blocked from the worldwide leaderboard.

(() => {
  if (window.miamiTestModeInstalled) return;
  window.miamiTestModeInstalled = true;
  window.miamiTestModeActive = false;

  const SERVICE_CODE = '3050';
  const buildNumber = document.querySelector('.build-number');
  if (!buildNumber) return;

  let tapCount = 0;
  let firstTapAt = -Infinity;

  const style = document.createElement('style');
  style.textContent = `
    .miami-test-gate,
    .miami-test-panel {
      position: fixed;
      z-index: 60;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #f4ffff;
    }

    .miami-test-gate {
      inset: 0;
      display: grid;
      place-items: center;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(2px);
    }

    .miami-test-gate[hidden],
    .miami-test-panel[hidden] {
      display: none;
    }

    .miami-test-card {
      width: min(88vw, 270px);
      padding: 14px;
      border: 1px solid rgba(34, 223, 243, 0.72);
      border-radius: 7px;
      background: rgba(4, 8, 18, 0.97);
      box-shadow: 0 0 24px rgba(255, 60, 172, 0.16);
    }

    .miami-test-card strong {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      letter-spacing: 0.14em;
      text-align: center;
    }

    .miami-test-code {
      width: 100%;
      box-sizing: border-box;
      min-height: 42px;
      border: 1px solid rgba(201, 184, 255, 0.56);
      border-radius: 5px;
      background: #02050d;
      color: #ffffff;
      font: 900 22px ui-monospace, monospace;
      letter-spacing: 0.32em;
      text-align: center;
      outline: none;
    }

    .miami-test-code:focus {
      border-color: #22dff3;
      box-shadow: 0 0 12px rgba(34, 223, 243, 0.22);
    }

    .miami-test-gate-actions,
    .miami-test-grid {
      display: grid;
      gap: 7px;
      margin-top: 9px;
    }

    .miami-test-gate-actions {
      grid-template-columns: 1fr 1fr;
    }

    .miami-test-grid {
      grid-template-columns: 1fr 1fr;
    }

    .miami-test-gate button,
    .miami-test-panel button {
      min-height: 38px;
      border: 1px solid rgba(34, 223, 243, 0.48);
      border-radius: 5px;
      background: rgba(9, 16, 31, 0.98);
      color: #eaffff;
      font: 800 10px ui-monospace, monospace;
      letter-spacing: 0.07em;
      cursor: pointer;
    }

    .miami-test-gate button:active,
    .miami-test-panel button:active {
      transform: translateY(1px);
    }

    .miami-test-error {
      min-height: 16px;
      margin-top: 7px;
      color: #ff9bd3;
      font-size: 10px;
      text-align: center;
    }

    .miami-test-panel {
      right: 8px;
      bottom: 8px;
      width: min(250px, calc(100vw - 16px));
      padding: 10px;
      border: 1px solid rgba(255, 60, 172, 0.72);
      border-radius: 7px;
      background: rgba(2, 5, 13, 0.94);
      box-shadow: 0 0 18px rgba(34, 223, 243, 0.12);
    }

    .miami-test-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 7px;
    }

    .miami-test-head strong {
      color: #ff85c8;
      font-size: 11px;
      letter-spacing: 0.12em;
    }

    .miami-test-status {
      min-height: 14px;
      margin-top: 7px;
      color: #9eefff;
      font-size: 9px;
      line-height: 1.3;
    }

    .miami-test-panel .miami-test-exit {
      border-color: rgba(255, 130, 180, 0.5);
      color: #ffc0dd;
    }
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.className = 'miami-test-gate';
  gate.hidden = true;
  gate.innerHTML = `
    <form class="miami-test-card" autocomplete="off">
      <strong>SERVICE ACCESS</strong>
      <input
        class="miami-test-code"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength="4"
        aria-label="Four digit service code"
      >
      <div class="miami-test-gate-actions">
        <button type="submit">ENTER</button>
        <button type="button" data-action="cancel">CANCEL</button>
      </div>
      <div class="miami-test-error" aria-live="polite"></div>
    </form>
  `;
  document.body.appendChild(gate);

  const panel = document.createElement('div');
  panel.className = 'miami-test-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="miami-test-head">
      <strong>TEST MODE · 3050</strong>
      <span>NO SCORE POST</span>
    </div>
    <div class="miami-test-grid">
      <button type="button" data-action="ball">TEST BALL</button>
      <button type="button" data-action="multiball">MULTIBALL</button>
      <button type="button" data-action="clock1">CLOCK #1</button>
      <button type="button" data-action="rush">NEON RUSH</button>
      <button type="button" data-action="afterhours">AFTER HOURS</button>
      <button type="button" data-action="ambush">AMBUSH</button>
      <button type="button" data-action="clock2">CLOCK #2</button>
      <button type="button" data-action="midnight">MIDNIGHT RUN</button>
      <button type="button" data-action="reset">RESET GAME</button>
      <button type="button" class="miami-test-exit" data-action="exit">EXIT TEST</button>
    </div>
    <div class="miami-test-status" aria-live="polite">SERVICE MODE READY</div>
  `;
  document.body.appendChild(panel);

  const form = gate.querySelector('form');
  const codeInput = gate.querySelector('.miami-test-code');
  const error = gate.querySelector('.miami-test-error');
  const status = panel.querySelector('.miami-test-status');

  function setStatus(message) {
    status.textContent = message;
  }

  function closeGate() {
    gate.hidden = true;
    codeInput.value = '';
    error.textContent = '';
  }

  function openGate() {
    if (window.miamiTestModeActive) {
      panel.hidden = false;
      return;
    }
    gate.hidden = false;
    codeInput.value = '';
    error.textContent = '';
    if (typeof releaseAllControls === 'function') releaseAllControls();
    window.setTimeout(() => codeInput.focus({ preventScroll: true }), 0);
  }

  function unlock() {
    window.miamiTestModeActive = true;
    closeGate();
    panel.hidden = false;
    setStatus('SERVICE MODE READY · WORLD SCORES DISABLED');
    window.dispatchEvent(new CustomEvent('miami-test-mode-change', {
      detail: { active: true }
    }));
  }

  function cleanTestGame() {
    resetGame();
  }

  function startTestBall() {
    cleanTestGame();
    plunger.charge = 0.7;
    launchBall();
    setStatus('TEST BALL LAUNCHED');
  }

  function prepareTimedMode() {
    cleanTestGame();
    if (ball.ready) {
      plunger.charge = 0.7;
      launchBall();
    }
  }

  function startTestMultiball() {
    if (gameOver) resetGame();

    if (ball.ready) {
      plunger.charge = 0.7;
      launchBall();
    }

    const request = window.miamiRequestTwoBallMultiball;
    const requested = typeof request === 'function' && request('ocean');
    const lifecycle = window.miamiMultiballState;
    const companionActive = Boolean(
      window.miamiMultiballEngine?.state?.companion?.active
    );

    if (
      requested &&
      lifecycle?.phase === 'multiball' &&
      companionActive
    ) {
      setStatus('MULTIBALL STARTED · REAL OCEAN PATH');
      return;
    }

    if (requested) {
      setStatus('MULTIBALL REQUESTED · CHECK LIFECYCLE');
      return;
    }

    setStatus('MULTIBALL START FAILED');
  }

  function exitTestMode() {
    panel.hidden = true;
    window.miamiTestModeActive = false;
    resetGame();
    window.dispatchEvent(new CustomEvent('miami-test-mode-change', {
      detail: { active: false }
    }));
  }

  function handleAction(action) {
    switch (action) {
      case 'ball':
        startTestBall();
        break;
      case 'multiball':
        startTestMultiball();
        break;
      case 'clock1':
        cleanTestGame();
        if (typeof window.miamiTestOpenClockStage === 'function' &&
            window.miamiTestOpenClockStage(1)) {
          setStatus('CLOCK #1 OPEN');
        }
        break;
      case 'rush':
        prepareTimedMode();
        if (typeof window.miamiTestStartNeonRush === 'function' &&
            window.miamiTestStartNeonRush()) {
          setStatus('NEON RUSH STARTED');
        }
        break;
      case 'afterhours':
        prepareTimedMode();
        if (typeof window.miamiTestStartAfterHours === 'function' &&
            window.miamiTestStartAfterHours()) {
          setStatus('AFTER HOURS STARTED');
        }
        break;
      case 'ambush':
        prepareTimedMode();
        if (typeof window.miamiTestStartAmbush === 'function' &&
            window.miamiTestStartAmbush()) {
          setStatus('AMBUSH STARTED');
        }
        break;
      case 'clock2':
        cleanTestGame();
        if (typeof window.miamiTestOpenClockStage === 'function' &&
            window.miamiTestOpenClockStage(2)) {
          setStatus('CLOCK #2 OPEN');
        }
        break;
      case 'midnight':
        prepareTimedMode();
        if (typeof window.miamiTestStartMidnightRun === 'function' &&
            window.miamiTestStartMidnightRun()) {
          setStatus('MIDNIGHT RUN TRANSITION STARTED');
        }
        break;
      case 'reset':
        resetGame();
        setStatus('GAME RESET · TEST MODE STILL ACTIVE');
        break;
      case 'exit':
        exitTestMode();
        break;
      default:
        break;
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();

    const value = codeInput.value.replace(/\D/g, '').slice(0, 4);
    codeInput.value = value;
    if (value !== SERVICE_CODE) {
      error.textContent = 'ACCESS DENIED';
      codeInput.value = '';
      codeInput.focus();
      return;
    }

    unlock();
  });

  gate.querySelector('[data-action="cancel"]').addEventListener('click', closeGate);

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 4);
    error.textContent = '';
  });

  for (const type of ['keydown', 'keyup', 'pointerdown', 'pointerup']) {
    gate.addEventListener(type, event => event.stopPropagation());
    panel.addEventListener(type, event => event.stopPropagation());
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    handleAction(button.dataset.action);
    button.blur();
  });

  buildNumber.setAttribute('role', 'button');
  buildNumber.setAttribute('tabindex', '0');
  buildNumber.setAttribute('aria-label', 'Build number');

  function registerBuildTap() {
    const now = performance.now();
    if (now - firstTapAt > 2400) {
      tapCount = 0;
      firstTapAt = now;
    }
    if (tapCount === 0) firstTapAt = now;

    tapCount += 1;
    if (tapCount >= 4) {
      tapCount = 0;
      firstTapAt = -Infinity;
      openGate();
    }
  }

  buildNumber.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    registerBuildTap();
  });
  buildNumber.addEventListener('keydown', event => {
    if (event.code !== 'Enter' && event.code !== 'Space') return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) registerBuildTap();
  });
})();
