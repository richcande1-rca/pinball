// Miami Nights: integrate the central palm/sunset art into the playfield.
// Visual only: extend the purple horizon ribs across the full table with a
// soft vertical + horizontal fade, and feather away the old flag-shaped edge.
// The static ribs are precomposed into one opaque playfield backing plate so
// the renderer avoids a full-canvas transparent blend every frame.

(() => {
  if (window.miamiSunsetFieldInstalled) return;
  window.miamiSunsetFieldInstalled = true;

  const STRIPE_CENTER_Y = 350;
  const STRIPE_SPACING = 13;
  const stripeOffsets = [];
  const playfieldWidth = TABLE.right - TABLE.left;
  const playfieldHeight = TABLE.bottom - TABLE.top;

  // Preserve the exact spacing/phase of the original center ribs, then carry
  // that same pattern through the entire playable table.
  for (let offset = 5; STRIPE_CENTER_Y + offset <= TABLE.bottom; offset += STRIPE_SPACING) {
    stripeOffsets.push(offset);
  }
  for (let offset = 5 - STRIPE_SPACING; STRIPE_CENTER_Y + offset >= TABLE.top; offset -= STRIPE_SPACING) {
    stripeOffsets.push(offset);
  }
  stripeOffsets.sort((a, b) => a - b);

  // Opaque playfield backing: base color + all static ribs are composited once.
  // Runtime cost is one opaque drawImage rather than a base fill followed by a
  // large transparent overlay blend.
  const playfieldLayer = document.createElement('canvas');
  playfieldLayer.width = playfieldWidth;
  playfieldLayer.height = playfieldHeight;
  const playfieldCtx = playfieldLayer.getContext('2d', { alpha: false });

  function buildPlayfieldLayer() {
    playfieldCtx.fillStyle = MIAMI_COLORS.playfield;
    playfieldCtx.fillRect(0, 0, playfieldWidth, playfieldHeight);

    const verticalFadeDistance = Math.max(
      STRIPE_CENTER_Y - TABLE.top,
      TABLE.bottom - STRIPE_CENTER_Y
    );

    for (const offset of stripeOffsets) {
      const tableY = STRIPE_CENTER_Y + offset;
      const localY = tableY - TABLE.top;
      const normalizedDistance = Math.min(
        1,
        Math.abs(offset) / Math.max(1, verticalFadeDistance)
      );
      const centerStrength = Math.pow(1 - normalizedDistance, 1.35);
      const bandAlpha = 0.035 + centerStrength * 0.545;
      const phaseIndex = Math.round((offset + 60) / STRIPE_SPACING);
      const bandHeight = Math.abs(phaseIndex) % 2 === 0 ? 4 : 3;

      const fade = playfieldCtx.createLinearGradient(0, 0, playfieldWidth, 0);
      fade.addColorStop(0, 'rgba(126, 82, 207, 0)');
      fade.addColorStop(0.08, `rgba(126, 82, 207, ${bandAlpha * 0.18})`);
      fade.addColorStop(0.24, `rgba(126, 82, 207, ${bandAlpha * 0.55})`);
      fade.addColorStop(0.42, `rgba(142, 89, 226, ${bandAlpha * 0.92})`);
      fade.addColorStop(0.50, `rgba(151, 94, 235, ${bandAlpha})`);
      fade.addColorStop(0.58, `rgba(142, 89, 226, ${bandAlpha * 0.92})`);
      fade.addColorStop(0.76, `rgba(126, 82, 207, ${bandAlpha * 0.55})`);
      fade.addColorStop(0.92, `rgba(126, 82, 207, ${bandAlpha * 0.18})`);
      fade.addColorStop(1, 'rgba(126, 82, 207, 0)');

      playfieldCtx.fillStyle = fade;
      playfieldCtx.fillRect(0, localY - bandHeight / 2, playfieldWidth, bandHeight);
    }
  }

  buildPlayfieldLayer();

  let motifLayer = null;
  let motifNaturalWidth = 0;
  let motifNaturalHeight = 0;

  function buildMotifLayer() {
    if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) return false;

    if (
      motifLayer &&
      motifNaturalWidth === miamiArtwork.naturalWidth &&
      motifNaturalHeight === miamiArtwork.naturalHeight
    ) return true;

    const bounds = getArtworkBounds();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const layerCtx = layer.getContext('2d');

    layerCtx.imageSmoothingEnabled = true;
    layerCtx.imageSmoothingQuality = 'high';
    layerCtx.drawImage(miamiArtwork, 0, 0, width, height);

    // Feather the old rectangular/flag boundary away instead of replacing it
    // with another hard crop. The palms and sunset remain strongest at center.
    layerCtx.globalCompositeOperation = 'destination-in';

    const horizontalFade = layerCtx.createLinearGradient(0, 0, width, 0);
    horizontalFade.addColorStop(0, 'rgba(255,255,255,0)');
    horizontalFade.addColorStop(0.08, 'rgba(255,255,255,0)');
    horizontalFade.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    horizontalFade.addColorStop(0.28, 'rgba(255,255,255,1)');
    horizontalFade.addColorStop(0.72, 'rgba(255,255,255,1)');
    horizontalFade.addColorStop(0.82, 'rgba(255,255,255,0.55)');
    horizontalFade.addColorStop(0.92, 'rgba(255,255,255,0)');
    horizontalFade.addColorStop(1, 'rgba(255,255,255,0)');
    layerCtx.fillStyle = horizontalFade;
    layerCtx.fillRect(0, 0, width, height);

    const verticalFade = layerCtx.createLinearGradient(0, 0, 0, height);
    verticalFade.addColorStop(0, 'rgba(255,255,255,0)');
    verticalFade.addColorStop(0.10, 'rgba(255,255,255,0.18)');
    verticalFade.addColorStop(0.20, 'rgba(255,255,255,0.9)');
    verticalFade.addColorStop(0.27, 'rgba(255,255,255,1)');
    verticalFade.addColorStop(0.73, 'rgba(255,255,255,1)');
    verticalFade.addColorStop(0.82, 'rgba(255,255,255,0.88)');
    verticalFade.addColorStop(0.92, 'rgba(255,255,255,0.16)');
    verticalFade.addColorStop(1, 'rgba(255,255,255,0)');
    layerCtx.fillStyle = verticalFade;
    layerCtx.fillRect(0, 0, width, height);
    layerCtx.globalCompositeOperation = 'source-over';

    motifLayer = layer;
    motifNaturalWidth = miamiArtwork.naturalWidth;
    motifNaturalHeight = miamiArtwork.naturalHeight;
    return true;
  }

  if (!miamiArtwork.complete) {
    miamiArtwork.addEventListener('load', buildMotifLayer, { once: true });
  } else {
    buildMotifLayer();
  }

  // Same table paint order as the core renderer, except the playfield base and
  // ribs arrive as one opaque image. Shooter lane and border remain unchanged.
  drawTable = function drawTableWithPrecomposedSunsetField() {
    ctx.drawImage(playfieldLayer, TABLE.left, TABLE.top);

    ctx.fillStyle = MIAMI_COLORS.shooterLane;
    ctx.fillRect(
      shooterDivider.x1 + shooterDivider.radius,
      shooterDivider.y1,
      TABLE.right - shooterDivider.x1 - shooterDivider.radius,
      TABLE.bottom - shooterDivider.y1
    );

    ctx.strokeStyle = MIAMI_COLORS.structure;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(TABLE.left, TABLE.bottom);
    ctx.lineTo(TABLE.left, TABLE.top);
    ctx.lineTo(TABLE.right, TABLE.top);
    ctx.lineTo(TABLE.right, TABLE.bottom);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = MIAMI_COLORS.cyan;
    ctx.lineWidth = 1;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 3;
    ctx.stroke();
    ctx.restore();
  };

  // Replace only the artwork paint pass. All text, glow, lamp-ring logic and
  // playfield geometry continue to use their existing layers.
  drawMiamiArtwork = function drawMiamiArtworkWithFeatheredSunset() {
    if (buildMotifLayer()) {
      const bounds = getArtworkBounds();
      ctx.drawImage(motifLayer, bounds.x, bounds.y, bounds.width, bounds.height);
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = window.miamiMobilePerformanceMode ? 0 : 5;
    ctx.font = 'italic 24px system-ui, sans-serif';
    ctx.fillStyle = MIAMI_COLORS.magenta;
    ctx.shadowColor = MIAMI_COLORS.magenta;
    ctx.fillText('MIAMI', PLAYFIELD_CENTER, 458);
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = MIAMI_COLORS.cyan;
    ctx.shadowColor = MIAMI_COLORS.cyan;
    ctx.fillText('N I G H T S', PLAYFIELD_CENTER, 478);
    ctx.restore();
  };
})();
