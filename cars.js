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

  const ferrariSilhouette = [
    [0.1423, 0.2724],
    [0.1394, 0.3086],
    [0.2048, 0.4086],
    [0.2067, 0.8],
    [0.2183, 0.8241],
    [0.2442, 0.8121],
    [0.3231, 0.9155],
    [0.4346, 0.9086],
    [0.4885, 0.9362],
    [0.7048, 0.9155],
    [0.8375, 0.8638],
    [0.8538, 0.7724],
    [0.9298, 0.7552],
    [0.9423, 0.7155],
    [0.926, 0.6086],
    [0.851, 0.4793],
    [0.7346, 0.3552],
    [0.6279, 0.1483],
    [0.549, 0.0672],
    [0.3673, 0.0517],
    [0.326, 0.0845],
    [0.2212, 0.0966]
  ];

  function drawCarArtwork(
    targetCtx,
    image,
    width,
    height,
    filter,
    trimSoftAlpha = false
  ) {
    if (!trimSoftAlpha) {
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.imageSmoothingQuality = 'high';
      targetCtx.filter = filter;
      targetCtx.drawImage(image, -width / 2, -height / 2, width, height);
      targetCtx.filter = 'none';
      return;
    }

    // Ferrari only: the source image contains a visible magenta/blue outer
    // reflection that can remain even when its alpha is fairly strong. Clip the
    // source to the actual car silhouette first, then soften only the remaining
    // translucent fringe. This does not change the approved size or placement.
    const sprite = document.createElement('canvas');
    sprite.width = Math.ceil(width);
    sprite.height = Math.ceil(height);
    const spriteCtx = sprite.getContext('2d');
    spriteCtx.imageSmoothingEnabled = true;
    spriteCtx.imageSmoothingQuality = 'high';

    spriteCtx.save();
    spriteCtx.beginPath();
    ferrariSilhouette.forEach(([x, y], index) => {
      const px = x * sprite.width;
      const py = y * sprite.height;
      if (index === 0) spriteCtx.moveTo(px, py);
      else spriteCtx.lineTo(px, py);
    });
    spriteCtx.closePath();
    spriteCtx.clip();
    spriteCtx.filter = filter;
    spriteCtx.drawImage(image, 0, 0, sprite.width, sprite.height);
    spriteCtx.filter = 'none';
    spriteCtx.restore();

    const imageData = spriteCtx.getImageData(
      0,
      0,
      sprite.width,
      sprite.height
    );
    const pixels = imageData.data;

    for (let offset = 3; offset < pixels.length; offset += 4) {
      const alpha = pixels[offset];
      if (alpha < 24) {
        pixels[offset] = 0;
      } else if (alpha < 128) {
        const normalized = (alpha - 24) / 104;
        pixels[offset] = Math.round(alpha * normalized * normalized);
      }
    }

    spriteCtx.putImageData(imageData, 0, 0);
    targetCtx.drawImage(sprite, -width / 2, -height / 2);
  }

  function buildCarCache(
    image,
    width,
    height,
    rotation,
    filter,
    cyanWeight,
    trimSoftAlpha = false
  ) {
    if (!image.complete || !image.naturalWidth) return null;

    const padding = 18;
    const cache = document.createElement('canvas');
    cache.width = Math.ceil(width + padding * 2);
    cache.height = Math.ceil(height + padding * 2);
    const cacheCtx = cache.getContext('2d');

    cacheCtx.save();
    cacheCtx.translate(cache.width / 2, cache.height / 2);
    cacheCtx.rotate(rotation);

    // Bake the approved contact shadow into the static cache once instead of
    // rebuilding it every frame.
    cacheCtx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    cacheCtx.beginPath();
    cacheCtx.ellipse(0, height * 0.25, width * 0.44, height * 0.20, 0, 0, Math.PI * 2);
    cacheCtx.fill();

    // Keep the approved tiny neon grounding on cars that use it. The Ferrari
    // passes null here so no cyan/magenta ellipse can protrude beyond its edge.
    if (cyanWeight !== null) {
      cacheCtx.globalCompositeOperation = 'screen';
      cacheCtx.fillStyle = cyanWeight
        ? 'rgba(32, 225, 255, 0.075)'
        : 'rgba(255, 39, 154, 0.065)';
      cacheCtx.beginPath();
      cacheCtx.ellipse(0, height * 0.22, width * 0.39, height * 0.14, 0, 0, Math.PI * 2);
      cacheCtx.fill();
    }

    cacheCtx.globalCompositeOperation = 'source-over';
    cacheCtx.globalAlpha = 0.97;
    drawCarArtwork(
      cacheCtx,
      image,
      width,
      height,
      filter,
      trimSoftAlpha
    );
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
      null,
      true
    );
  }

  whiteFront.addEventListener('load', rebuildWhiteCache, { once: true });
  nightFront.addEventListener('load', rebuildNightCache, { once: true });

  // Keep the approved car artwork; the Ferrari-only silhouette clip removes
  // the baked outer reflection at render time.
  whiteFront.src = 'assets/countach-front-white.svg?v=20260902-displaycache';
  nightFront.src = 'assets/ferrari-front-clean-edgefix.webp?v=20260903-ferrarimask';

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
