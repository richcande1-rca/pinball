// Title-screen gate. Gameplay remains paused until the intro completes or is skipped.

(() => {
  const INTRO_DURATION_MS = 3000;
  const screen = document.getElementById('intro-screen');
  const startButton = document.getElementById('intro-start');
  const skipButton = document.getElementById('intro-skip');
  const status = document.getElementById('intro-status');
  let introState = 'ready';
  let introTimer = null;

  window.miamiGameStarted = false;

  function finishIntro(skipped) {
    if (introState !== 'playing') return;
    introState = 'leaving';
    clearTimeout(introTimer);

    window.dispatchEvent(new CustomEvent('miami-intro-end', {
      detail: { skipped }
    }));

    screen.classList.add('is-leaving');
    window.setTimeout(() => {
      screen.hidden = true;
      window.miamiGameStarted = true;
      window.dispatchEvent(new CustomEvent('miami-game-start'));
    }, 420);
  }

  function startIntro() {
    if (introState !== 'ready') return;
    introState = 'playing';
    screen.classList.add('is-playing');
    startButton.hidden = true;
    skipButton.hidden = false;
    status.textContent = 'Click anywhere to skip';
    window.dispatchEvent(new CustomEvent('miami-intro-start'));
    introTimer = window.setTimeout(() => finishIntro(false), INTRO_DURATION_MS);
  }

  startButton.addEventListener('click', event => {
    event.stopPropagation();
    startIntro();
  });

  skipButton.addEventListener('click', event => {
    event.stopPropagation();
    finishIntro(true);
  });

  screen.addEventListener('click', () => {
    if (introState === 'playing') finishIntro(true);
  });

  function blockGameKeys(event) {
    if (window.miamiGameStarted) return;
    event.stopImmediatePropagation();
    if (!(event.target instanceof HTMLButtonElement)) event.preventDefault();
  }

  window.addEventListener('keydown', blockGameKeys);
  window.addEventListener('keyup', blockGameKeys);
})();

// Late feature hooks are intentionally ordered. Each script may wrap globals
// established by the previous one, so load them one-at-a-time rather than as a
// parallel bundle. This replaces the old callback staircase with the same
// execution semantics in a form that is easy to audit before multiball work.
window.addEventListener('load', async () => {
  const CURRENT_BUILD = 'Build 20260905-SURGERY-A';
  const FEATURE_SCRIPTS = [
    'circle3x.js?v=20260830-handoff',
    'businesses.js?v=20260830-businesses',
    'cars.js?v=20260904-ferraritransparent',
    'center-post.js?v=20260904-centerpost',
    'displays.js?v=20260902-paneldisplays',
    'reef-feedback.js?v=20260902-displaycache',
    'extra-ball-feedback.js?v=20260905-surgery-a',
    'shooter-return-fix.js?v=20260904-shooterreturn',
    'pocket-targets.js?v=20260905-pockettargets',
    'sunset-field.js?v=20260905-ribopt',
    'palm-ring.js?v=20260905-palmringopt',
    'deflector-removal.js?v=20260905-nodeflectors',
    'captive-repeat.js?v=20260905-repeat-extraball'
  ];

  const stampCurrentBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) buildNumberDisplay.textContent = CURRENT_BUILD;
  };

  const loadClassicScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.body.appendChild(script);
  });

  stampCurrentBuild();

  try {
    for (const src of FEATURE_SCRIPTS) {
      await loadClassicScript(src);
    }
  } catch (error) {
    console.error('Miami Nights feature load failed:', error);
    return;
  }

  stampCurrentBuild();
  window.setTimeout(stampCurrentBuild, 400);
}, { once: true });
