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
// retaining blind random routing. The final lower baseline restore loads after
// that route layer so both physical balls see the same proven lower geometry.
(() => {
  const loadLowerCleanup = () => {
    if (window.miamiLowerRightCleanupInstalled) return;
    const cleanup = document.createElement('script');
    cleanup.src = 'lower-right-cleanup.js?v=20260911-lowerbase1-r1';
    cleanup.async = false;
    document.body.appendChild(cleanup);
  };

  if (window.miamiBidirectionalUnderpassInstalled) {
    loadLowerCleanup();
    return;
  }

  const script = document.createElement('script');
  script.src = 'underpass-bidirectional.js?v=20260911-up2a-lower2a';
  script.async = false;
  script.addEventListener('load', loadLowerCleanup, { once: true });
  document.body.appendChild(script);
})();
