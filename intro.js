// Title-screen gate. Gameplay remains paused until the intro completes or is skipped.

// One stable release token owns every dynamically loaded Miami Nights script.
// A release fetches fresh files once, then normal browser caching makes later
// reloads fast. Every dynamic child receives the same token, so an older parent
// cannot walk the browser through stale child versions one refresh at a time.
(() => {
  if (window.miamiVersionedAsset) return;

  const buildToken = '20260912-gate1b-recovery1';
  window.miamiBuildToken = buildToken;
  window.miamiCurrentBuildLabel =
    'Build 20260912-PERF1-MB2-UP2A-LOWERBASE1-GATE1B-RECOVERY1';

  window.miamiVersionedAsset = function miamiVersionedAsset(path) {
    try {
      const url = new URL(String(path), document.baseURI);
      if (
        url.origin !== window.location.origin ||
        (url.protocol !== 'http:' && url.protocol !== 'https:')
      ) {
        return String(path);
      }
      url.searchParams.set('v', buildToken);
      return url.href;
    } catch (_) {
      return String(path);
    }
  };

  // Child modules created later still contain historical ?v= tags. Normalize
  // those assignments centrally instead of editing every loader whenever one
  // feature changes. Static HTML scripts are intentionally unaffected.
  const srcDescriptor = Object.getOwnPropertyDescriptor(
    HTMLScriptElement.prototype,
    'src'
  );

  if (
    srcDescriptor?.get &&
    srcDescriptor?.set &&
    srcDescriptor.configurable !== false
  ) {
    try {
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: srcDescriptor.configurable,
        enumerable: srcDescriptor.enumerable,
        get() {
          return srcDescriptor.get.call(this);
        },
        set(value) {
          srcDescriptor.set.call(this, window.miamiVersionedAsset(value));
        }
      });
      window.miamiDynamicScriptVersionHookInstalled = true;
    } catch (_) {
      window.miamiDynamicScriptVersionHookInstalled = false;
    }
  }
})();

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

const MIAMI_FEATURE_SCRIPTS = [
  'circle3x.js',
  'businesses.js',
  'cars.js',
  'center-post.js',
  'displays.js',
  'recovery-outlet-polish.js',
  'reef-feedback.js',
  'extra-ball-feedback.js',
  'shooter-return-fix.js',
  'pocket-targets.js',
  'secondary-targets.js',
  'sunset-field.js',
  'sunset-motif-clean.js',
  'sunset-gradient-glow.js',
  'palm-ring.js',
  'deflector-removal.js',
  'strategy-rules.js',
  'captive-repeat.js',
  'high-scores.js',
  'reverse-loop.js',
  'pause-controls.js',
  'clock-event.js'
];

(() => {
  for (const path of MIAMI_FEATURE_SCRIPTS) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = window.miamiVersionedAsset(path);
    document.head.appendChild(link);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const stampCurrentBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (
      buildNumberDisplay &&
      buildNumberDisplay.textContent !== window.miamiCurrentBuildLabel
    ) {
      buildNumberDisplay.textContent = window.miamiCurrentBuildLabel;
    }
  };

  stampCurrentBuild();

  // Older feature modules still contain historical build stamps. Keep the
  // visible footer owned by the release loader so intermediate MB0/MB2 labels
  // cannot flash during startup or remain behind after an interrupted stamp.
  const buildNumberDisplay = document.querySelector('.build-number');
  if (buildNumberDisplay && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(stampCurrentBuild);
    observer.observe(buildNumberDisplay, {
      childList: true,
      characterData: true,
      subtree: true
    });
    window.miamiBuildLabelObserver = observer;
  }

  function loadFeature(index) {
    if (index >= MIAMI_FEATURE_SCRIPTS.length) {
      stampCurrentBuild();
      return;
    }

    const script = document.createElement('script');
    script.src = window.miamiVersionedAsset(MIAMI_FEATURE_SCRIPTS[index]);
    script.async = false;
    script.addEventListener('load', () => loadFeature(index + 1), { once: true });
    script.addEventListener('error', () => {
      console.error('Miami Nights feature failed to load:', MIAMI_FEATURE_SCRIPTS[index]);
    }, { once: true });
    document.body.appendChild(script);
  }

  loadFeature(0);
}, { once: true });
