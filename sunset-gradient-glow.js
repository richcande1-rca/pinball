// Miami Nights: animate the sunset/color field behind the palm silhouettes.
// Presentation only. The palms remain the original dark artwork; this module
// brightens only the colored sunset pixels and adds a soft cached halo.

(() => {
  if (window.miamiSunsetGradientGlowInstalled) return;
  window.miamiSunsetGradientGlowInstalled = true;

  const PADDING = 24;
  let colorLayer = null;
  let haloLayer = null;
  let cachedNaturalWidth = 0;
  let cachedNaturalHeight = 0;
  let burstStartedAt = -Infinity;
  let burstDuration = 0;

  function triggerBurst(duration = 900) {
    burstStartedAt = performance.now();
    burstDuration = Math.max(260, duration);
  }

  function buildLayers() {
    if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) return false;
    if (
      colorLayer &&
      haloLayer &&
      cachedNaturalWidth === miamiArtwork.naturalWidth &&
      cachedNaturalHeight === miamiArtwork.naturalHeight
    ) return true;

    const bounds = getArtworkBounds();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    // Precompute a more saturated version once. Because it is later drawn with
    // screen blending, the black palm silhouettes contribute no brightness.
    colorLayer = document.createElement('canvas');
    colorLayer.width = width;
    colorLayer.height = height;
    const colorCtx = colorLayer.getContext('2d');
    colorCtx.imageSmoothingEnabled = true;
    colorCtx.imageSmoothingQuality = 'high';
    colorCtx.filter = 'saturate(1.55) brightness(1.12)';
    colorCtx.drawImage(miamiArtwork, 0, 0, width, height);
    colorCtx.filter = 'none';

    // One-time blurred bloom for desktop. Runtime animation is only alpha.
    haloLayer = document.createElement('canvas');
    haloLayer.width = width + PADDING * 2;
    haloLayer.height = height + PADDING * 2;
    const haloCtx = haloLayer.getContext('2d');
    haloCtx.imageSmoothingEnabled = true;
    haloCtx.imageSmoothingQuality = 'high';
    haloCtx.filter = 'blur(12px) saturate(1.8) brightness(1.28)';
    haloCtx.drawImage(miamiArtwork, PADDING, PADDING, width, height);
    haloCtx.filter = 'none';

    cachedNaturalWidth = miamiArtwork.naturalWidth;
    cachedNaturalHeight = miamiArtwork.naturalHeight;
    return true;
  }

  if (!miamiArtwork.complete) {
    miamiArtwork.addEventListener('load', buildLayers, { once: true });
  } else {
    buildLayers();
  }

  function currentLevels(now) {
    const slowPulse = 0.5 + 0.5 * Math.sin(now / 1800);
    const age = now - burstStartedAt;
    const burst = burstDuration > 0 && age >= 0 && age < burstDuration
      ? 1 - age / burstDuration
      : 0;
    return { slowPulse, burst };
  }

  function drawHaloBehind(bounds, slowPulse, burst) {
    if (window.miamiMobilePerformanceMode) return;

    ctx.save();
    ctx.globalAlpha = 0.12 + slowPulse * 0.07 + burst * 0.22;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(
      haloLayer,
      bounds.x - PADDING,
      bounds.y - PADDING,
      bounds.width + PADDING * 2,
      bounds.height + PADDING * 2
    );
    ctx.restore();
  }

  function drawColorBoost(bounds, slowPulse, burst) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = window.miamiMobilePerformanceMode
      ? 0.07 + slowPulse * 0.05 + burst * 0.16
      : 0.10 + slowPulse * 0.08 + burst * 0.30;
    ctx.drawImage(colorLayer, bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  }

  const baseDrawMiamiArtworkWithSunsetGradientGlow = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithSunsetGradientGlow() {
    if (!buildLayers()) {
      baseDrawMiamiArtworkWithSunsetGradientGlow();
      return;
    }

    const bounds = getArtworkBounds();
    const { slowPulse, burst } = currentLevels(performance.now());

    // Bloom first, untouched original art second, color boost last. The original
    // palm silhouettes stay crisp and black while the gradient behind them glows.
    drawHaloBehind(bounds, slowPulse, burst);
    baseDrawMiamiArtworkWithSunsetGradientGlow();
    drawColorBoost(bounds, slowPulse, burst);
  };

  const ordinaryEvents = [
    'miami-pop-bumper',
    'miami-pocket-target',
    'miami-secondary-target',
    'miami-drop-target',
    'miami-loop-complete',
    'miami-ramp-enter',
    'miami-spinner-exit',
    'miami-magnet-capture',
    'miami-neon-palms-hit',
    'miami-cafe-ocho-capture'
  ];

  for (const eventName of ordinaryEvents) {
    window.addEventListener(eventName, () => triggerBurst(900));
  }

  window.addEventListener('miami-reef-complete', () => triggerBurst(1350));
  window.addEventListener('miami-feature-qualified', () => triggerBurst(1500));
  window.addEventListener('miami-captive-ready', () => triggerBurst(1900));
  window.addEventListener('miami-captive-progress-boost', event => {
    const detail = event.detail || {};
    triggerBurst(detail.extraBallAwarded ? 1700 : 1050);
  });
  window.addEventListener('miami-game-start', () => triggerBurst(1250));
})();
