// Miami Nights: animate only the horizontal sunset bands inside the palm motif.
// Presentation only. The circle and palm silhouettes stay fixed; the existing
// horizontal stripes slowly cycle through midnight and sunset colors.

(() => {
  if (window.miamiSunsetGradientGlowInstalled) return;
  window.miamiSunsetGradientGlowInstalled = true;

  const SUN_X = 210;
  const SUN_Y = 350;
  const SUN_RX = 45;
  const SUN_RY = 43;
  const PAD = 3;

  const cyclePalette = [
    '#010207',
    '#050817',
    '#08152c',
    '#40105f',
    MIAMI_COLORS.magenta,
    '#ff2f9f',
    '#ff7244',
    '#ffad42',
    '#ffd96a',
    MIAMI_COLORS.cyan,
    '#16315a',
    '#050817'
  ];

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

  // Keep the old broad halo disabled. All motion belongs inside the motif.
  if (typeof drawSunsetGlow === 'function') {
    drawSunsetGlow = function drawSunsetGlowDisabled() {};
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function wrap01(value) {
    return ((value % 1) + 1) % 1;
  }

  function trigger(kind, duration, origin = 0) {
    const now = performance.now();
    override = {
      kind,
      startedAt: now,
      until: now + duration,
      origin
    };
  }

  function mode2xActive() {
    return (
      typeof centerDoubleScoreRemaining !== 'undefined' &&
      centerDoubleScoreRemaining > 0
    );
  }

  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function mixHex(a, b, amount) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const t = clamp01(amount);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function sampleCycle(position) {
    const wrapped = wrap01(position);
    const scaled = wrapped * cyclePalette.length;
    const index = Math.floor(scaled) % cyclePalette.length;
    const next = (index + 1) % cyclePalette.length;
    return mixHex(cyclePalette[index], cyclePalette[next], scaled - Math.floor(scaled));
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

    // Keep only the existing colored horizontal stripes. Dark palm silhouettes
    // and the dark gaps between stripes remain transparent in this mask.
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

  function getCycleState(now) {
    // Normal motion is deliberately slow. The bands never rotate or move; only
    // the colors flowing through their fixed horizontal positions change.
    let phase = wrap01(now / 8500);
    let energy = 0.82;
    let flash = 0;

    if (now < override.until) {
      const age = now - override.startedAt;
      flash = 1;

      switch (override.kind) {
        case 'pocket':
          phase += age / 1500 + override.origin / 12;
          energy = 0.96;
          break;
        case 'pop':
          phase += age / 650;
          energy = 1;
          break;
        case 'drop':
          phase += age / 900;
          energy = 0.98;
          break;
        case 'bank':
          phase += age / 500;
          energy = 1;
          break;
        case 'loop':
          phase -= age / 850;
          energy = 1;
          break;
        case 'ramp':
        case 'spinner':
          phase += age / 700;
          energy = 1;
          break;
        case 'magnet':
          phase += 0.42 + Math.sin(age / 110) * 0.06;
          energy = 1;
          break;
        case 'reef':
          phase += age / 760;
          energy = 1;
          break;
        case 'extra':
          phase += age / 420;
          energy = 1;
          break;
        case 'two-x':
          phase += age / 520;
          energy = 1;
          break;
        case 'orbit':
          phase += age / 240 + Math.sin(age / 72) * 0.09;
          energy = 1;
          break;
        case 'drain':
          phase += 0.08;
          energy = Math.max(
            0.30,
            1 - age / Math.max(1, override.until - override.startedAt)
          );
          break;
        default:
          break;
      }
    } else if (gameOver) {
      phase = wrap01(now / 12000);
      energy = 0.62;
    } else if (ball.ready) {
      phase = wrap01(now / 10500);
      energy = 0.72 + (0.5 + 0.5 * Math.sin(now / 850)) * 0.10;
    } else if (mode2xActive()) {
      phase = wrap01(now / 2400);
      energy = 1;
    }

    return { phase: wrap01(phase), energy, flash };
  }

  function drawSyncedSunBands() {
    if (!buildSunMask()) return;

    const now = performance.now();
    const state = getCycleState(now);
    const width = sunPaint.width;
    const height = sunPaint.height;
    const paintCtx = sunPaint.getContext('2d');

    paintCtx.clearRect(0, 0, width, height);

    // Fixed top-to-bottom gradient = horizontal color bands. Only the palette
    // phase changes, so the motif never spins and the stripe geometry never moves.
    const gradient = paintCtx.createLinearGradient(0, 0, 0, height);
    const stopCount = 9;
    for (let index = 0; index < stopCount; index += 1) {
      const position = index / (stopCount - 1);
      const palettePosition = state.phase + position * 0.42;
      gradient.addColorStop(position, sampleCycle(palettePosition));
    }

    paintCtx.globalCompositeOperation = 'source-over';
    paintCtx.globalAlpha = 1;
    paintCtx.fillStyle = gradient;
    paintCtx.fillRect(0, 0, width, height);

    paintCtx.globalCompositeOperation = 'destination-in';
    paintCtx.drawImage(sunMask, 0, 0);
    paintCtx.globalCompositeOperation = 'source-over';

    const left = SUN_X - SUN_RX - PAD;
    const top = SUN_Y - SUN_RY - PAD;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = window.miamiMobilePerformanceMode
      ? 0.76 + state.energy * 0.08 + state.flash * 0.03
      : 0.84 + state.energy * 0.08 + state.flash * 0.04;
    ctx.drawImage(sunPaint, left, top);
    ctx.restore();
  }

  const baseDrawMiamiArtworkWithSunsetGradientGlow = drawMiamiArtwork;
  drawMiamiArtwork = function drawMiamiArtworkWithSunsetBands() {
    baseDrawMiamiArtworkWithSunsetGradientGlow();
    drawSyncedSunBands();
  };

  // Use the same playfield events as the surrounding palm-ring lamps so their
  // color energy remains coordinated without imposing a rotating direction.
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
  window.addEventListener('miami-sunset-orbit-complete', () => trigger('orbit', 1800));

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

  window.addEventListener('miami-drain', () => trigger('drain', 850));
})();