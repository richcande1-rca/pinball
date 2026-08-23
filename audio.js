// Event-driven synthesized machine sounds. Gameplay state is observed only.

(() => {
  let audioContext = null;
  let masterGain = null;
  let noiseBuffer = null;
  let chargeVoice = null;

  const audioState = {
    flippers: flippers.map(flipper => flipper.pressed),
    slings: sideBumpers.map(bumper => bumper.armed),
    charge: plunger.charge,
    ready: ball.ready,
    ballY: ball.y,
    ballVy: ball.vy,
    zipArmed: ball.ready,
    manualResetPending: false
  };

  function activateAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(audioContext.destination);

      noiseBuffer = audioContext.createBuffer(1, Math.round(audioContext.sampleRate * 0.12), audioContext.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }
    }

    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function envelope(gain, now, peak, duration, floor = 0.0001) {
    gain.setValueAtTime(floor, now);
    gain.exponentialRampToValueAtTime(peak, now + 0.003);
    gain.exponentialRampToValueAtTime(floor, now + duration);
  }

  function tone(frequency, peak, duration, options = {}) {
    if (!audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + duration);
    }
    envelope(gain.gain, now, peak, duration);
    oscillator.connect(gain).connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  function noise(peak, duration, frequency = 1800) {
    if (!audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    envelope(gain.gain, now, peak, duration);
    source.connect(filter).connect(gain).connect(masterGain);
    source.start(now);
    source.stop(now + duration + 0.01);
  }

  function playFlipper(index) {
    tone(index ? 125 : 115, 0.36, 0.05, { type: 'triangle', endFrequency: 72 });
    noise(0.4, 0.04, index ? 1900 : 1750);
  }

  function playSling(index) {
    noise(0.38, 0.065, index ? 2600 : 2350);
    tone(index ? 720 : 670, 0.25, 0.085, { type: 'square', endFrequency: 430 });
  }

  function playImpact({ type, strength = 0.2, index = 0 }) {
    const force = Math.max(0.05, Math.min(1, strength));
    if (type === 'post') {
      const frequency = 1100 + force * 1000 + index * 45;
      tone(frequency, 0.08 + force * 0.2, 0.11, { endFrequency: frequency * 0.82 });
      return;
    }
    noise(0.015 + force * 0.1, 0.025 + force * 0.025, 900 + force * 1000);
    tone(260 + force * 220, 0.012 + force * 0.07, 0.045, { type: 'triangle', endFrequency: 190 });
  }

  function startCharge() {
    if (!audioContext || audioContext.state !== 'running' || chargeVoice) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 85;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.03);
    oscillator.connect(gain).connect(masterGain);
    oscillator.start(now);
    chargeVoice = { oscillator, gain };
  }

  function updateCharge(charge) {
    if (!chargeVoice || !audioContext) return;
    const now = audioContext.currentTime;
    chargeVoice.oscillator.frequency.setTargetAtTime(85 + charge * 95, now, 0.025);
    chargeVoice.gain.gain.setTargetAtTime(0.018 + charge * 0.035, now, 0.025);
  }

  function stopCharge() {
    if (!chargeVoice || !audioContext) return;
    const voice = chargeVoice;
    chargeVoice = null;
    const now = audioContext.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, 0.012);
    voice.oscillator.stop(now + 0.07);
  }

  function playLaunch() {
    tone(125, 0.4, 0.11, { type: 'triangle', endFrequency: 65 });
    tone(310, 0.22, 0.16, { endFrequency: 760 });
    noise(0.2, 0.045, 2800);
  }

  function playZip() {
    tone(900, 0.12, 0.095, { type: 'triangle', endFrequency: 1850 });
    noise(0.045, 0.055, 3200);
  }

  function playDrain() {
    tone(105, 0.34, 0.18, { type: 'triangle', endFrequency: 52 });
    noise(0.09, 0.055, 480);
  }

  function observeAudioEvents() {
    flippers.forEach((flipper, index) => {
      if (flipper.pressed && !audioState.flippers[index]) playFlipper(index);
      audioState.flippers[index] = flipper.pressed;
    });

    sideBumpers.forEach((bumper, index) => {
      if (audioState.slings[index] && !bumper.armed) playSling(index);
      audioState.slings[index] = bumper.armed;
    });

    if (plunger.charge > 0 && ball.ready && !chargeVoice) startCharge();
    if (plunger.charge > 0) updateCharge(plunger.charge);

    const launched = audioState.charge > 0 && plunger.charge === 0 && audioState.ready && !ball.ready;
    if (launched) {
      stopCharge();
      playLaunch();
    } else if (audioState.charge > 0 && plunger.charge === 0) {
      stopCharge();
    }

    if (ball.ready) audioState.zipArmed = true;
    if (audioState.zipArmed && !ball.ready && ball.x > shooterDivider.x1 && ball.y < 620 && ball.vy < -500) {
      playZip();
      audioState.zipArmed = false;
    }

    const genuinelyDrained =
      !audioState.ready && ball.ready &&
      audioState.ballY > canvas.height - 28 && audioState.ballVy > 0;
    if (genuinelyDrained && !audioState.manualResetPending) playDrain();

    audioState.charge = plunger.charge;
    audioState.ready = ball.ready;
    audioState.ballY = ball.y;
    audioState.ballVy = ball.vy;
    audioState.manualResetPending = false;
    requestAnimationFrame(observeAudioEvents);
  }

  window.addEventListener('keydown', activateAudio, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.code === 'KeyR') audioState.manualResetPending = true;
  }, { passive: true });
  window.addEventListener('pointerdown', activateAudio, { passive: true });
  window.addEventListener('miami-impact', event => playImpact(event.detail));
  requestAnimationFrame(observeAudioEvents);
})();
