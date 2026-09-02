// Miami Nights photorealistic exotic-car toys beneath the center logo.
// The late-loaded file also carries one tiny compatibility fix for the right
// outlane seam so the approved visuals can stay untouched.

(() => {
  const whiteFront = new Image();
  const nightFront = new Image();
  let whiteCarCache = null;
  let nightCarCache = null;

  whiteFront.decoding = 'async';
  nightFront.decoding = 'async';

  function buildCarCache(image, width, height, rotation, filter, cyanWeight) {
    if (!image.complete || !image.naturalWidth) return null;

    const padding = 18;
    const cache = document.createElement('canvas');
    cache.width = Math.ceil(width + padding * 2);
    cache.height = Math.ceil(height + padding * 2);
    const cacheCtx = cache.getContext('2d');

    cacheCtx.save();
    cacheCtx.translate(cache.width / 2, cache.height / 2);
    cacheCtx.rotate(rotation);

    // Bake the approved contact shadow and tiny neon grounding into the static
    // cache once instead of rebuilding ellipses and compositing every frame.
    cacheCtx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    cacheCtx.beginPath();
    cacheCtx.ellipse(0, height * 0.25, width * 0.44, height * 0.20, 0, 0, Math.PI * 2);
    cacheCtx.fill();

    cacheCtx.globalCompositeOperation = 'screen';
    cacheCtx.fillStyle = cyanWeight
      ? 'rgba(32, 225, 255, 0.075)'
      : 'rgba(255, 39, 154, 0.065)';
    cacheCtx.beginPath();
    cacheCtx.ellipse(0, height * 0.22, width * 0.39, height * 0.14, 0, 0, Math.PI * 2);
    cacheCtx.fill();

    cacheCtx.globalCompositeOperation = 'source-over';
    cacheCtx.globalAlpha = 0.97;
    cacheCtx.imageSmoothingEnabled = true;
    cacheCtx.imageSmoothingQuality = 'high';
    cacheCtx.filter = filter;
    cacheCtx.drawImage(image, -width / 2, -height / 2, width, height);
    cacheCtx.filter = 'none';
    cacheCtx.restore();

    return cache;
  }

  function rebuildWhiteCache() {
    whiteCarCache = buildCarCache(
      whiteFront,
      96,
      70,
      -0.03,
      'saturate(0.92) contrast(0.98) brightness(1.02)',
      false
    );
  }

  function rebuildNightCache() {
    nightCarCache = buildCarCache(
      nightFront,
      104,
      58,
      0.015,
      'saturate(0.92) contrast(1.04) brightness(1.10)',
      true
    );
  }

  whiteFront.addEventListener('load', rebuildWhiteCache, { once: true });
  nightFront.addEventListener('load', rebuildNightCache, { once: true });

  // Restore the known-good white-car artwork and keep the cleaned Ferrari.
  // Cache bust the assets together with this static render pass.
  whiteFront.src = 'assets/countach-front-white.svg?v=20260902-displaycache';
  nightFront.src = 'assets/ferrari-front-clean-edgefix.webp?v=20260902-displaycache';

  if (whiteFront.complete && whiteFront.naturalWidth) rebuildWhiteCache();
  if (nightFront.complete && nightFront.naturalWidth) rebuildNightCache();

  function drawCachedCar(cache, centerX, centerY) {
    if (!cache) return;
    ctx.drawImage(
      cache,
      centerX - cache.width / 2,
      centerY - cache.height / 2
    );
  }

  function drawMiamiExotics() {
    // Preserve the approved positions, scale, stagger and forward 3/4 stance.
    // Expensive image filters/rotations are already baked into the tiny caches.
    drawCachedCar(whiteCarCache, 150, 550);
    drawCachedCar(nightCarCache, 268, 534);
  }

  const baseDrawBallWithPhotoExotics = drawBall;
  drawBall = function drawBallWithPhotoExotics() {
    drawMiamiExotics();
    baseDrawBallWithPhotoExotics();
  };

  // PASSFIX2: the first repair made the cyan guide and pink sling meet at the
  // same point, but their collision radii were still 4px versus 10px. That left
  // a small physical step around the shared endpoint where a slow ball could
  // settle. Give the joined guide the same collider radius as the sling so the
  // two capsules form one continuous downhill surface instead of a tiny cup.
  function applyRightPocketFix() {
    if (
      typeof sideBumpers === 'undefined' ||
      typeof lowerGuides === 'undefined' ||
      !sideBumpers[1]
    ) return;

    const rightPinkSling = sideBumpers[1];
    const rightOutlaneTopGuide = lowerGuides.find(guide =>
      Math.abs(guide.x2 - 414) < 0.01 &&
      Math.abs(guide.y2 - 548) < 0.01
    );
    if (!rightOutlaneTopGuide) return;

    rightOutlaneTopGuide.x1 = rightPinkSling.x1;
    rightOutlaneTopGuide.y1 = rightPinkSling.y1;
    rightOutlaneTopGuide.radius = rightPinkSling.radius;
  }

  // Run once now and again after the older load-time PASSFIX has had a chance
  // to finish. The late loader owns the visible build label.
  applyRightPocketFix();
  window.setTimeout(applyRightPocketFix, 100);
  window.setTimeout(applyRightPocketFix, 300);
})();
