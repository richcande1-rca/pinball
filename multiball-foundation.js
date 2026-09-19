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
    startSource: null,
    requestedAt: -Infinity,
    stackPending: false,
    stackRequestedAt: -Infinity,
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
    state.startSource = null;
    state.requestedAt = -Infinity;
    state.stackPending = false;
    state.stackRequestedAt = -Infinity;
    state.liveCount = 1;
    state.peers = ['table-ball'];
  }

  function cancelPendingStart(reason = 'cancelled') {
    if (state.phase !== 'starting') return false;

    const sourceBallNumber = state.sourceBallNumber;
    const source = state.startSource;
    resetLifecycle();
    window.dispatchEvent(new CustomEvent('miami-multiball-start-cancelled', {
      detail: { reason, ball: sourceBallNumber, source }
    }));
    return true;
  }

  function cancelStackStart(reason = 'cancelled') {
    if (!state.stackPending) return false;

    state.stackPending = false;
    state.stackRequestedAt = -Infinity;
    window.dispatchEvent(new CustomEvent('miami-multiball-stack-cancelled', {
      detail: {
        reason,
        ball: state.sourceBallNumber,
        liveCount: state.liveCount
      }
    }));
    return true;
  }

  function requestTwoBallMultiball(source = 'captive') {
    const requiresCaptiveReady = source !== 'ocean';

    if (
      state.phase !== 'single' ||
      gameOver ||
      ball.ready ||
      (requiresCaptiveReady && !strategyReady())
    ) return false;

    state.phase = 'starting';
    state.sourceBallNumber = ballNumber;
    state.startSource = source;
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

  function requestThreeBallStack(source = 'captive-stack') {
    if (
      state.phase !== 'multiball' ||
      state.liveCount !== 2 ||
      state.stackPending ||
      gameOver ||
      ball.ready ||
      !strategyReady()
    ) return false;

    state.stackPending = true;
    state.stackRequestedAt = performance.now();

    window.dispatchEvent(new CustomEvent('miami-multiball-stack-requested', {
      detail: {
        source,
        ball: ballNumber,
        requestedLiveCount: 3,
        peers: [...state.peers]
      }
    }));
    return true;
  }

  function confirmTwoBallMultiballStarted(companionId = 'companion-ball') {
    if (state.phase !== 'starting') return false;

    const source = state.startSource || 'captive';
    if (source !== 'ocean') {
      const consume = window.miamiConsumeCaptiveReadyForMultiball;
      if (typeof consume !== 'function' || !consume()) {
        cancelPendingStart('qualification-unavailable');
        return false;
      }
    }

    state.phase = 'multiball';
    state.startSource = null;
    state.generation += 1;
    state.liveCount = 2;
    state.peers = ['table-ball', companionId];

    window.dispatchEvent(new CustomEvent('miami-multiball-start', {
      detail: {
        source,
        ball: state.sourceBallNumber,
        liveCount: state.liveCount,
        peers: [...state.peers],
        generation: state.generation
      }
    }));
    return true;
  }

  function confirmThreeBallStackStarted(companionId = 'companion-ball-2') {
    if (
      !state.stackPending ||
      state.phase !== 'multiball' ||
      state.liveCount !== 2 ||
      state.peers.includes(companionId)
    ) return false;

    const consume = window.miamiConsumeCaptiveReadyForMultiball;
    if (typeof consume !== 'function' || !consume()) {
      cancelStackStart('qualification-unavailable');
      return false;
    }

    state.stackPending = false;
    state.stackRequestedAt = -Infinity;
    state.liveCount = 3;
    state.peers.push(companionId);

    window.dispatchEvent(new CustomEvent('miami-multiball-stack-start', {
      detail: {
        source: 'captive-stack',
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
      state.startSource = null;
      state.stackPending = false;
      state.stackRequestedAt = -Infinity;
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
  window.miamiRequestThreeBallStack = requestThreeBallStack;
  window.miamiConfirmTwoBallMultiballStarted = confirmTwoBallMultiballStarted;
  window.miamiConfirmThreeBallStackStarted = confirmThreeBallStackStarted;
  window.miamiReportMultiballPeerDrain = reportPeerDrain;
  window.miamiCancelMultiballStart = cancelPendingStart;
  window.miamiCancelMultiballStack = cancelStackStart;

  window.addEventListener('miami-ocean-hot', () => {
    // A completed Ocean Drive run starts the proven two-ball system directly.
    // O/C/H remain intact so the deeper captive qualification can continue
    // underneath the active Ocean Drive multiball.
    requestTwoBallMultiball('ocean');
  });

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    if (detail.type !== 'post' || Number(detail.index) !== 8) return;
    if (!strategyReady()) return;

    if (state.phase === 'single') {
      requestTwoBallMultiball('captive');
      return;
    }

    if (state.phase === 'multiball' && state.liveCount === 2) {
      requestThreeBallStack('captive-stack');
    }
  });

  window.addEventListener('miami-drain', () => {
    if (state.phase === 'starting') cancelPendingStart('drain');
    if (state.stackPending) cancelStackStart('drain');
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
