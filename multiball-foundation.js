// Miami Nights multiball foundation.
// MB0 deliberately adds only the lifecycle contract: qualification request,
// successful-start consumption, peer/live-ball bookkeeping, and the rule that
// losing one of two peer balls does not consume a player's normal ball.
// Actual two-ball simulation is installed in the next engine step; until that
// succeeds CAPTIVE READY is never consumed and no fake second ball is shown.

(() => {
  if (window.miamiMultiballFoundationInstalled) return;
  window.miamiMultiballFoundationInstalled = true;

  const state = {
    phase: 'single',
    sourceBallNumber: null,
    requestedAt: -Infinity,
    generation: 0,
    liveCount: 1,
    peers: ['table-ball']
  };
  window.miamiMultiballState = state;

  function strategyReady() {
    return Boolean(
      window.miamiStrategyState &&
      window.miamiStrategyState.captiveReady
    );
  }

  function resetLifecycle() {
    state.phase = 'single';
    state.sourceBallNumber = null;
    state.requestedAt = -Infinity;
    state.liveCount = 1;
    state.peers = ['table-ball'];
  }

  function cancelPendingStart(reason = 'cancelled') {
    if (state.phase !== 'starting') return false;

    const sourceBallNumber = state.sourceBallNumber;
    resetLifecycle();
    window.dispatchEvent(new CustomEvent('miami-multiball-start-cancelled', {
      detail: { reason, ball: sourceBallNumber }
    }));
    return true;
  }

  function requestTwoBallMultiball(source = 'captive') {
    if (
      state.phase !== 'single' ||
      gameOver ||
      ball.ready ||
      !strategyReady()
    ) return false;

    state.phase = 'starting';
    state.sourceBallNumber = ballNumber;
    state.requestedAt = performance.now();

    window.dispatchEvent(new CustomEvent('miami-multiball-start-requested', {
      detail: {
        source,
        ball: ballNumber,
        requestedLiveCount: 2
      }
    }));
    return true;
  }

  function confirmTwoBallMultiballStarted(companionId = 'companion-ball') {
    if (state.phase !== 'starting') return false;

    const consume = window.miamiConsumeCaptiveReadyForMultiball;
    if (typeof consume !== 'function' || !consume()) {
      cancelPendingStart('qualification-unavailable');
      return false;
    }

    state.phase = 'multiball';
    state.generation += 1;
    state.liveCount = 2;
    state.peers = ['table-ball', companionId];

    window.dispatchEvent(new CustomEvent('miami-multiball-start', {
      detail: {
        ball: state.sourceBallNumber,
        liveCount: state.liveCount,
        peers: [...state.peers],
        generation: state.generation
      }
    }));
    return true;
  }

  function reportPeerDrain(peerId) {
    if (state.phase !== 'multiball') {
      return { handled: false, consumesNormalBall: true };
    }

    const index = state.peers.indexOf(peerId);
    if (index < 0) {
      return { handled: false, consumesNormalBall: false };
    }

    state.peers.splice(index, 1);
    state.liveCount = state.peers.length;

    if (state.liveCount === 1) {
      const survivor = state.peers[0];
      state.phase = 'single';
      window.dispatchEvent(new CustomEvent('miami-multiball-end', {
        detail: {
          ball: state.sourceBallNumber,
          drained: peerId,
          survivor,
          consumesNormalBall: false,
          generation: state.generation
        }
      }));
      state.sourceBallNumber = null;
      return {
        handled: true,
        consumesNormalBall: false,
        survivor
      };
    }

    return {
      handled: true,
      consumesNormalBall: false,
      survivor: state.peers[0] || null
    };
  }

  window.miamiRequestTwoBallMultiball = requestTwoBallMultiball;
  window.miamiConfirmTwoBallMultiballStarted = confirmTwoBallMultiballStarted;
  window.miamiReportMultiballPeerDrain = reportPeerDrain;
  window.miamiCancelMultiballStart = cancelPendingStart;

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (detail.type !== 'post' || Number(detail.index) !== 8) return;
    if (!strategyReady()) return;
    requestTwoBallMultiball('captive');
  });

  window.addEventListener('miami-drain', () => {
    if (state.phase === 'starting') cancelPendingStart('drain');
  });

  const baseResetGameWithMultiballFoundation = resetGame;
  resetGame = function resetGameWithMultiballFoundation() {
    resetLifecycle();
    baseResetGameWithMultiballFoundation();
  };

  const stampBuild = () => {
    const buildNumberDisplay = document.querySelector('.build-number');
    if (buildNumberDisplay) {
      buildNumberDisplay.textContent = 'Build 20260910-PERF1-MB0';
    }
  };
  stampBuild();
  window.setTimeout(stampBuild, 400);
})();

(() => {
  if (window.miamiMultiballEngineInstalled) return;
  const script = document.createElement('script');
  script.src = 'multiball-engine.js?v=20260910-mb1a';
  script.async = false;
  document.body.appendChild(script);
})();

(() => {
  if (window.miamiMultiballActivationInstalled) return;
  const script = document.createElement('script');
  script.src = 'multiball-activation.js?v=20260912-mb2-lowerbase1-gate1a';
  script.async = false;
  document.body.appendChild(script);
})();
