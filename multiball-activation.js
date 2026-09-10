// Miami Nights: MB2 real multiball activation bridge.
//
// CAPTIVE READY still belongs to strategy-rules.js. The lifecycle foundation
// raises a start request on a solid captive hit; this bridge asks the proven
// MB1A peer engine to create the physical companion. READY is consumed only
// after the engine confirms that the second ball really exists.

(() => {
  if (window.miamiMultiballActivationInstalled) return;
  window.miamiMultiballActivationInstalled = true;

  function cancelStart(reason) {
    const cancel = window.miamiCancelMultiballStart;
    if (typeof cancel === 'function') cancel(reason);
  }

  window.addEventListener('miami-multiball-start-requested', () => {
    const lifecycle = window.miamiMultiballState;
    if (!lifecycle || lifecycle.phase !== 'starting') return;

    const engine = window.miamiMultiballEngine;
    if (!engine || typeof engine.spawnCompanion !== 'function') {
      cancelStart('engine-unavailable');
      return;
    }

    if (engine.state?.companion?.active) {
      cancelStart('peer-already-active');
      return;
    }

    const started = engine.spawnCompanion({
      confirmLifecycle: true,
      testOnly: false
    });

    // spawnCompanion/confirmation already cancels qualification failures.
    // This fallback handles any other refused physical start without spending
    // CAPTIVE READY or leaving the lifecycle stuck in "starting".
    if (!started && lifecycle.phase === 'starting') {
      cancelStart('peer-create-failed');
    }
  });

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) {
      buildNumberDisplay.textContent = 'Build 20260910-PERF1-MB2';
    }
  };
  stampBuild();
  window.setTimeout(stampBuild, 400);
})();

// Underpass upgrade: every existing tunnel mouth is now bidirectional while
// retaining blind random routing. Load this after MB2 so the peer engine also
// uses the same final underpass functions through its saved route context.
(() => {
  if (window.miamiBidirectionalUnderpassInstalled) return;
  const script = document.createElement('script');
  script.src = 'underpass-bidirectional.js?v=20260910-up2';
  script.async = false;
  document.body.appendChild(script);
})();
