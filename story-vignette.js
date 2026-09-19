// Miami Nights: reusable story-vignette layer.
// Presentation only. Gameplay remains gated until the vignette resolves.

(() => {
  if (window.miamiStoryVignetteInstalled) return;
  window.miamiStoryVignetteInstalled = true;
  window.miamiStoryVignetteReady = false;

  const CASE_ONE_SRC = window.miamiVersionedAsset(
    'assets/miami-case1-vignette.webp'
  );
  const DEFAULT_DURATION_MS = 3800;
  const FADE_OUT_MS = 220;

  const style = document.createElement('style');
  style.textContent = `
    .miami-story-vignette {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2vh 2vw;
      box-sizing: border-box;
      background: #000;
      opacity: 0;
      transition: opacity 140ms ease-out;
      cursor: pointer;
      touch-action: manipulation;
    }

    .miami-story-vignette.is-visible {
      opacity: 1;
    }

    .miami-story-vignette.is-leaving {
      opacity: 0;
      transition-duration: ${FADE_OUT_MS}ms;
    }

    .miami-story-vignette__frame {
      display: block;
      width: min(96vw, 960px);
      max-height: 94vh;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
      transform: scale(1);
      animation: miami-story-drift ${DEFAULT_DURATION_MS}ms linear forwards;
    }

    @keyframes miami-story-drift {
      from { transform: scale(1); }
      to { transform: scale(1.018); }
    }

    @media (prefers-reduced-motion: reduce) {
      .miami-story-vignette__frame {
        animation: none;
      }
    }
  `;
  document.head.appendChild(style);

  const preload = new Image();
  let preloadSettled = false;

  function markReady(failed = false) {
    if (preloadSettled) return;
    preloadSettled = true;
    window.miamiStoryVignetteAssetFailed = failed;
    window.miamiStoryVignetteReady = true;
    window.dispatchEvent(new CustomEvent('miami-story-ready', {
      detail: { failed }
    }));
  }

  preload.addEventListener('load', () => markReady(false), { once: true });
  preload.addEventListener('error', () => markReady(true), { once: true });
  preload.src = CASE_ONE_SRC;

  if (preload.complete) {
    window.queueMicrotask(() => markReady(!preload.naturalWidth));
  }

  window.miamiPlayStoryVignette = function miamiPlayStoryVignette(options = {}) {
    const src = options.src || CASE_ONE_SRC;
    const duration = Number.isFinite(options.duration)
      ? Math.max(900, options.duration)
      : DEFAULT_DURATION_MS;

    return new Promise(resolve => {
      if (window.miamiStoryVignetteAssetFailed && src === CASE_ONE_SRC) {
        resolve({ skipped: true, failed: true });
        return;
      }

      const prior = document.querySelector('.miami-story-vignette');
      if (prior) prior.remove();

      const overlay = document.createElement('div');
      overlay.className = 'miami-story-vignette';
      overlay.tabIndex = -1;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Miami Nights story vignette');

      const image = document.createElement('img');
      image.className = 'miami-story-vignette__frame';
      image.src = src;
      image.alt =
        'Miami Nights Case 1. Detective: We’re gonna get this slime ball! The clock is ticking!';

      overlay.appendChild(image);
      document.body.appendChild(overlay);

      let finished = false;
      let timer = null;

      function cleanupKeyHandler() {
        document.removeEventListener('keydown', onKeyDown, true);
      }

      function finish(skipped) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        cleanupKeyHandler();

        overlay.classList.remove('is-visible');
        overlay.classList.add('is-leaving');

        window.dispatchEvent(new CustomEvent('miami-story-end', {
          detail: { skipped, caseId: options.caseId || 'case-1' }
        }));

        window.setTimeout(() => {
          overlay.remove();
          resolve({ skipped, failed: false });
        }, FADE_OUT_MS);
      }

      function onKeyDown(event) {
        if (
          event.code !== 'Space' &&
          event.code !== 'Enter' &&
          event.code !== 'Escape'
        ) return;

        event.preventDefault();
        event.stopPropagation();
        finish(true);
      }

      overlay.addEventListener('click', () => finish(true));
      document.addEventListener('keydown', onKeyDown, true);

      window.dispatchEvent(new CustomEvent('miami-story-start', {
        detail: { caseId: options.caseId || 'case-1' }
      }));

      window.requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
        overlay.focus({ preventScroll: true });
      });

      timer = window.setTimeout(() => finish(false), duration);
    });
  };
})();
