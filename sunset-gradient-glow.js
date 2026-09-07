// Miami Nights: animate only the striped sunset disk behind the palm silhouettes.
// Presentation only. No outside halo/frame: the sun itself moves through deep
// midnight-to-sunset gradients in step with the twelve insert lamps around it.

(() => {
  if (window.miamiSunsetGradientGlowInstalled) return;
  window.miamiSunsetGradientGlowInstalled = true;

  const SUN_X = 210;
  const SUN_Y = 350;
  const SUN_RX = 45;
  const SUN_RY = 43;
  const PAD = 3;
  const LAMP_COUNT = 12;
  const palette = {
    black: '#010207',
    midnight: '#050817',
    navy: '#08152c',
    violet: '#40105f',
    lavender: MIAMI_COLORS.lavender,
    magenta: MIAMI_COLORS.magenta,
    cyan: MIAMI_COLORS.cyan,
    hotPink: '#ff2f9f',
    orange: '#ff8a32',
    yellow: '#ffd96a',
    white: '#f4ffff'
  };

  let sunMask = null;
  let sunPaint = null;
  let maskNaturalWidth = 0;
  let maskNaturalHeight = 0;
  let override = {
    kind: 'none',
    startedAt: -Infinity,
    until: -Infinity,
    origin: 0
  };

  // The old theme layer painted a large magenta/purple radial bloom around the
  // motif. Keep all animation confined to the striped sun disk.
  if (typeof drawSunsetGlow === 'function') {
    drawSunsetGlow = function drawSunsetGlowDisabled() {};
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function wrapIndex(index) {
    return ((index % LAMP_COUNT) + LAMP_COUNT) % LAMP_COUNT;
  }

  function trigger(kind, duration, origin = 0) {
    const now = performance.now();
    override = {
      kind,
      startedAt: now,
      until: now + duration,
      origin: wrapIndex(origin)
    };
  }

  function mode2xActive() {
    return (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    );
  }

  function buildSunMask() {
    if (!miamiArtwork.complete || !miamiArtwork.naturalWidth) return false;
    if (
      sunMask &&
      sunPaint &&
      maskNaturalWidth === miamiArtwork.naturalWidth &&
      maskNaturalHeight === miamiArtwork.naturalHeight
    ) return true;

    const width = Math.ceil(SUN_RX * 2 + PAD * 2);
    const height = Math.ceil(SUN_RY * 2 + PAD * 2);
    const left = SUN_X - SUN_RX - PAD;
    const top = SUN_Y - SUN_RY - PAD;
    const bounds = getArtworkBounds();

    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceCtx = source.getContext('2d', { willReadFrequently: true });
    sourceCtx.imageSmoothingEnabled = true;
    sourceCtx.imageSmoothingQuality = 'high';
    sourceCtx.drawImage(
      miamiArtwork,
      bounds.x - left,
      bounds.y - top,
      bounds.width,
      bounds.height
    );

    const image = sourceCtx.getImageData(0, 0, width, height);
    const data = image.data;
    const centerX = width / 2;
    const centerY = height / 2;

    // Retain only the colored sunset stripes. The palm silhouettes and dark gaps
    // stay untouched, so the gradient reads as the sun changing rather than a
    // glowing panel placed behind the artwork.
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const dx = (x - centerX) / SUN_RX;
        const dy = (y - centerY) / SUN_RY;
        if (dx * dx + dy * dy > 1) {
          data[index + 3] = 0;
          continue;
        }

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const chroma = max - min;
        const brightMask = clamp01((brightness - 20) / 74);
        const colorMask = clamp01((chroma - 5) / 32);

        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = Math.round(
          255 * brightMask * (0.58 + colorMask * 0.42)
        );
      }
    }

    sourceCtx.putImageData(image, 0, 0);
    sunMask = source;
    sunPaint = document.createElement('canvas');
    sunPaint.width = width;
    sunPaint.height = height;
    maskNaturalWidth = miamiArtwork.naturalWidth;
    maskNaturalHeight = miamiArtwork.naturalHeight;
    return true;
  }

  if (!miamiArtwork.complete) {
    miamiArtwork.addEventListener('load', buildSunMask, { once: true });
  } else {
    buildSunMask();
  }

  function syncState(now) {
    let head = (now / 125) % LAMP_COUNT;
    let energy = 0.88;
    let primary = palette.cyan;
    let secondary = palette.magenta;
    let flash = 0;

    if (now < override.until) {
      const age = now - override.startedAt;
      const step = Math.floor(age / 75);
      const fastStep = Math.floor(age / 55);
      flash = 1;

      switch (override.kind) {
        case 'pocket':
          head = wrapIndex(override.origin + step);
          energy = 0.95;
          break;
        case 'pop':
          head = wrapIndex(step * 3);
          energy = 1;
          break;
        case 'drop':
          head = wrapIndex(step * 2);
          energy = 0.98;
          break;
        case 'bank':
          head = Math.floor(age / 90) % 2 === 0 ? 0 : 6;
          primary = palette.white;
          secondary = palette.magenta;
          energy = 1;
          break;
        case 'loop':
          head = wrapIndex(-fastStep);
          primary = palette.cyan;
          secondary = palette.lavender;
          energy = 1;
          break;
        case 'ramp':
          head = wrapIndex(fastStep);
          energy = 1;
          break;
        case 'spinner':
          head = wrapIndex(fastStep);
          energy = 1;
          break;
        case 'magnet':
          head = Math.floor(age / 115) % 2 === 0 ? 3 : 9;
          primary = palette.magenta;
          secondary = palette.white;
          energy = 1;
          break;
        case 'reef':
          head = Math.floor(age / 110) % 2 === 0 ? 0 : 6;
          primary = palette.cyan;
          secondary = palette.magenta;
          energy = 1;
          break;
        case 'extra':
          head = Math.floor(age / 70) % 2 === 0 ? 0 : 6;
          primary = palette.white;
          secondary = palette.cyan;
          energy = 1;
          break;
        case 'two-x':
          head = Math.floor(age / 100) % 2 === 0 ? 0 : 6;
          primary = palette.cyan;
          secondary = palette.magenta;
          energy = 1;
          break;
        case 'drain':
          head = 6;
          primary = palette.magenta;
          secondary = palette.violet;
          energy = Math.max(
            0.28,
            1 - age / Math.max(1, override.until - override.startedAt)
          );
          break;
        default:
          break;
      }
    } else if (gameOver) {
      head = ((now / 220) % LAMP_COUNT);
      primary = palette.lavender;
      secondary = palette.magenta;
      energy = 0.72;
    } else if (ball.ready) {
      head = ((now / 360) % LAMP_COUNT);
      primary = palette.cyan;
      secondary = palette.magenta;
      energy = 0.70 + (0.5 + 0.5 * Math.sin(now / 520)) * 0.16;
    } else if (mode2xActive()) {
      head = ((now / 145) % LAMP_COUNT);
      energy = 1;
    } else {
      // Normal play follows the same clockwise lamp chase, but continuously so
      // the gradient travels instead of hopping between flat color states.
      primary = Math.floor(head) % 2 ? palette.magenta : palette.cyan;
      secondary = Math.floor(head + 6) % 2 ? palette.magenta : palette.cyan;
    }

    return { head, primary, secondary, energy, flash };
  }

  function drawSyncedSunGradient() {
    if (!buildSunMask()) return;

    const now = performance.now();
    const state = syncState(now);
    const angle =
      -Math.PI / 2 +
      state.head * Math.PI * 2 / LAMP_COUNT +
      Math.sin(now / 2400) * 0.18;
    const width = sunPaint.width;
    const height = sunPaint.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const reach = Math.max(width, height) * 0.72;
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach;
    const paintCtx = sunPaint.getContext('2d');

    paintCtx.clearRect(0, 0, width, height);

    // A real moving dusk-to-sunset gradient: black and midnight tones are part
    // of the color field itself, not an outside shadow or halo. Rotating the
    // gradient makes the dark region migrate through the disk while the hot
    // sunset colors follow the lamp chase.
    const gradient = paintCtx.createLinearGradient(
      centerX - dx,
      centerY - dy,
      centerX + dx,
      centerY + dy
    );
    gradient.addColorStop(0, palette.black);
    gradient.addColorStop(0.14, palette.midnight);
    gradient.addColorStop(0.27, palette.navy);
    gradient.addColorStop(0.40, palette.violet);
    gradient.addColorStop(0.53, state.secondary);
    gradient.addColorStop(0.64, palette.hotPink);
    gradient.addColorStop(0.75, palette.orange);
    gradient.addColorStop(0.84, palette.yellow);
    gradient.addColorStop(0.92, state.primary);
    gradient.addColorStop(1, palette.midnight);

    paintCtx.globalCompositeOperation = 'source-over';
    paintCtx.globalAlpha = 1;
    paintCtx.fillStyle = gradient;
    paintCtx.fillRect(0, 0, width, height);

    // A broad, soft warm transition travels independently through the disk. It
    // keeps the gradient alive without restoring the fizzy white hotspot look.
    const warmY = centerY + Math.sin(now / 900 + angle) * SUN_RY * 0.42;
    const warmBand = paintCtx.createLinearGradient(0, warmY - 18, 0, warmY + 18);
    warmBand.addColorStop(0, 'rgba(255,120,54,0)');
    warmBand.addColorStop(
      0.5,
      `rgba(255,145,62,${0.10 + state.energy * 0.10 + state.flash * 0.08})`
    );
    warmBand.addColorStop(1, 'rgba(255,220,120,0)');
    paintCtx.fillStyle = warmBand;
    paintCtx.fillRect(0, warmY - 18, width, 36);

    paintCtx.globalCompositeOperation = 'destination-in';
    paintCtx.globalAlpha = 1;
    paintCtx.drawImage(sunMask, 0, 0);
    paintCtx.globalCompositeOperation = 'source-over';

    const left = SUN_X - SUN_RX - PAD;
    const top = SUN_Y - SUN_RY - PAD;

    // Normal blend does the color work. Keep the screen pass tiny so the result
    // reads as a transitioning sunset, not a glowing beverage label.
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = window.miamiMobilePerformanceMode
      ? 0.76 + state.energy * 0.08 + state.flash * 0.04
      : 0.84 + state.energy * 0.08 + state.flash * 0.05;
    ctx.drawImage(sunPaint, left, top);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = window.miamiMobilePerformanceMode
      ? 0.025 + state.flash * 0.02
      : 0.045 + state.flash * 0.025;
    ctx.drawImage(sunPaint, left, top);
    ctx.restore();
  }

  const baseDrawMiamiArtworkWithSunsetGradientGlow = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithSunsetGradientGlow() {
    baseDrawMiamiArtworkWithSunsetGradientGlow();
    drawSyncedSunGradient();
  };

  // Mirror palm-ring.js event timing so the sun and its twelve lamps continue to
  // behave as one lighting feature.
  window.addEventListener('miami-pocket-target', event => {
    const detail = event.detail || {};
    trigger('pocket', 850, 3 + Number(detail.index || 0));
  });
  window.addEventListener('miami-pop-bumper', () => trigger('pop', 620));
  window.addEventListener('miami-drop-target', event => {
    const detail = event.detail || {};
    trigger(detail.bankComplete ? 'bank' : 'drop', detail.bankComplete ? 1250 : 720);
  });
  window.addEventListener('miami-loop-complete', () => trigger('loop', 950));
  window.addEventListener('miami-ramp-enter', () => trigger('ramp', 900));
  window.addEventListener('miami-spinner-exit', () => trigger('spinner', 1100));
  window.addEventListener('miami-magnet-capture', () => trigger('magnet', 900));
  window.addEventListener('miami-reef-complete', () => trigger('reef', 1500));

  window.addEventListener('miami-impact', event => {
    const detail = event.detail || {};
    const index = Number(detail.index);

    if (detail.type === 'post' && index === 8) {
      const earnedExtra =
        typeof captiveExtraBallAwarded !== 'undefined' &&
        typeof captiveHitProgress !== 'undefined' &&
        captiveExtraBallAwarded &&
        captiveHitProgress >= 5;
      trigger(earnedExtra ? 'extra' : 'pop', earnedExtra ? 1500 : 520);
      return;
    }

    if (
      detail.type === 'post' &&
      index >= 11 &&
      index <= 13 &&
      mode2xActive()
    ) {
      trigger('two-x', 1250);
    }
  });

  window.addEventListener('miami-drain', () => trigger('drain', 850, 6));
})();