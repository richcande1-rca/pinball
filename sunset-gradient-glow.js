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

    colorLayer = document.createElement('canvas');
    colorLayer.width = width;
    colorLayer.height = height;
    const colorCtx = colorLayer.getContext('2d');
    colorCtx.imageSmoothingEnabled = true;
    colorCtx.imageSmoothingQuality = 'high';
    colorCtx.filter = 'saturate(1.55) brightness(1.12)';
    colorCtx.drawImage(miamiArtwork, 0, 0, width, height);
    colorCtx.filter = 'none';

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

  function drawSunsetGradientGlow() {
    if (!buildLayers()) return;

    const bounds = getArtworkBounds();
    const now = performance.now();
    const slowPulse = 0.5 + 0.5 * Math.sin(now / 1800);
    const age = now - burstStartedAt;
    const burst = burstDuration > 0 && age >= 0 && age < burstDuration
      ? 1 - age / burstDuration
      : 0;
    const mobile = Boolean(window.miamiMobilePerformanceMode);

    // Cached bloom behind the original art. Desktop gets the soft halo; mobile
    // keeps the effect to the inexpensive color-boost pass below.
    if (!mobile) {
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

    // Screen-blend the saturated copy over the original art. Black source pixels
    // do not brighten under screen blending, so the palm silhouettes stay dark
    // while the pink/orange/purple sunset itself visibly lights up.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = mobile
      ? 0.07 + slowPulse * 0.05 + burst * 0.16
      : 0.10 + slowPulse * 0.08 + burst * 0.30;
    ctx.drawImage(colorLayer, bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  }

  const baseDrawMiamiArtworkWithSunsetGradientGlow = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithSunsetGradientGlow() {
    // Halo first, then the untouched original silhouettes, then the screen color
    // boost. This keeps the palms crisp and black rather than turning them neon.
    if (buildLayers() && !window.miamiMobilePerformanceMode) {
      const bounds = getArtworkBounds();
      const now = performance.now();
      const slowPulse = 0.5 + 0.5 * Math.sin(now / 1800);
      const age = now - burstStartedAt;
      const burst = burstDuration > 0 && age >= 0 && age < burstDuration
        ? 1 - age / burstDuration
        : 0;
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

    baseDrawMiamiArtworkWithSunsetGradientGlow();
    drawSunsetGradientGlow();
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
