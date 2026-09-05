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

// Late-load small feature hooks after all core/table scripts have established
// their globals. Keeping this separate avoids touching the stable physics core.
window.addEventListener('load', () => {
  const CURRENT_BUILD = 'Build 20260905-RIBOPT';
  const stampCurrentBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) buildNumberDisplay.textContent = CURRENT_BUILD;
  };

  // Stamp immediately, then again after late features load. The loader is the
  // sole owner of the visible build label so older feature shims cannot roll it
  // backward after a newer build arrives.
  stampCurrentBuild();

  const circleTripleScript = document.createElement('script');
  circleTripleScript.src = 'circle3x.js?v=20260830-handoff';
  circleTripleScript.async = false;
  circleTripleScript.addEventListener('load', () => {
    const businessesScript = document.createElement('script');
    businessesScript.src = 'businesses.js?v=20260830-businesses';
    businessesScript.async = false;
    businessesScript.addEventListener('load', () => {
      const carsScript = document.createElement('script');
      carsScript.src = 'cars.js?v=20260904-ferraritransparent';
      carsScript.async = false;
      carsScript.addEventListener('load', () => {
        const centerPostScript = document.createElement('script');
        centerPostScript.src = 'center-post.js?v=20260904-centerpost';
        centerPostScript.async = false;
        centerPostScript.addEventListener('load', () => {
          const displaysScript = document.createElement('script');
          displaysScript.src = 'displays.js?v=20260902-paneldisplays';
          displaysScript.async = false;
          displaysScript.addEventListener('load', () => {
            const reefFeedbackScript = document.createElement('script');
            reefFeedbackScript.src = 'reef-feedback.js?v=20260902-displaycache';
            reefFeedbackScript.async = false;
            reefFeedbackScript.addEventListener('load', () => {
              const extraBallFeedbackScript = document.createElement('script');
              extraBallFeedbackScript.src = 'extra-ball-feedback.js?v=20260904-extraballfx';
              extraBallFeedbackScript.async = false;
              extraBallFeedbackScript.addEventListener('load', () => {
                const shooterReturnScript = document.createElement('script');
                shooterReturnScript.src = 'shooter-return-fix.js?v=20260904-shooterreturn';
                shooterReturnScript.async = false;
                shooterReturnScript.addEventListener('load', () => {
                  const pocketTargetsScript = document.createElement('script');
                  pocketTargetsScript.src = 'pocket-targets.js?v=20260905-pockettargets';
                  pocketTargetsScript.async = false;
                  pocketTargetsScript.addEventListener('load', () => {
                    const sunsetFieldScript = document.createElement('script');
                    sunsetFieldScript.src = 'sunset-field.js?v=20260905-ribopt';
                    sunsetFieldScript.async = false;
                    sunsetFieldScript.addEventListener('load', () => {
                      const palmRingScript = document.createElement('script');
                      palmRingScript.src = 'palm-ring.js?v=20260905-palmringopt';
                      palmRingScript.async = false;
                      palmRingScript.addEventListener('load', () => {
                        const deflectorRemovalScript = document.createElement('script');
                        deflectorRemovalScript.src = 'deflector-removal.js?v=20260905-nodeflectors';
                        deflectorRemovalScript.async = false;
                        deflectorRemovalScript.addEventListener('load', () => {
                          stampCurrentBuild();
                          window.setTimeout(stampCurrentBuild, 400);
                        }, { once: true });
                        document.body.appendChild(deflectorRemovalScript);
                      }, { once: true });
                      document.body.appendChild(palmRingScript);
                    }, { once: true });
                    document.body.appendChild(sunsetFieldScript);
                  }, { once: true });
                  document.body.appendChild(pocketTargetsScript);
                }, { once: true });
                document.body.appendChild(shooterReturnScript);
              }, { once: true });
              document.body.appendChild(extraBallFeedbackScript);
            }, { once: true });
            document.body.appendChild(reefFeedbackScript);
          }, { once: true });
          document.body.appendChild(displaysScript);
        }, { once: true });
        document.body.appendChild(centerPostScript);
      }, { once: true });
      document.body.appendChild(carsScript);
    }, { once: true });
    document.body.appendChild(businessesScript);
  }, { once: true });
  document.body.appendChild(circleTripleScript);
}, { once: true });
