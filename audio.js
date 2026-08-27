// Event-driven synthesized machine sounds. Gameplay state is observed only.

(() => {
  let audioContext = null;
  let masterGain = null;
  let noiseBuffer = null;
  let chargeVoice = null;
  let introMusicGain = null;
  let gameplayMusicGain = null;
  let gameplayMusicTimer = null;
  let themeStarted = false;
  let fileThemeStarted = false;

  const themeMusic = document.getElementById('theme-music');
  const musicVolume = document.getElementById('music-volume');
  const musicMute = document.getElementById('music-mute');

  const THEME_TEMPO = 112;
  const THEME_BEAT = 60 / THEME_TEMPO;
  const THEME_BAR = THEME_BEAT * 4;

  const audioState = {
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

      introMusicGain = audioContext.createGain();
      introMusicGain.gain.value = 0.0001;
      introMusicGain.connect(masterGain);

      gameplayMusicGain = audioContext.createGain();
      gameplayMusicGain.gain.value = 0.18;
      gameplayMusicGain.connect(masterGain);

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

  function midiToFrequency(note) {
    return 440 * 2 ** ((note - 69) / 12);
  }

  function scheduleMusicTone(note, when, duration, peak, destination, options = {}) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const attack = Math.min(options.attack || 0.012, duration * 0.25);
    const release = Math.min(options.release || 0.08, duration * 0.45);
    const frequency = midiToFrequency(note);

    oscillator.type = options.type || 'triangle';
    oscillator.frequency.setValueAtTime(frequency, when);
    if (options.endNote !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        midiToFrequency(options.endNote),
        when + duration
      );
    }

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + attack);
    gain.gain.setValueAtTime(peak * 0.78, Math.max(when + attack, when + duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    if (options.filterFrequency) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = options.filterFrequency;
      filter.Q.value = options.filterQ || 0.7;
      oscillator.connect(filter).connect(gain);
    } else {
      oscillator.connect(gain);
    }

    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  function scheduleMusicNoise(when, duration, peak, frequency, destination, type = 'bandpass') {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === 'bandpass' ? 0.9 : 0.5;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(gain).connect(destination);
    source.start(when);
    source.stop(when + duration + 0.01);
  }

  function scheduleDrums(start, bars, destination, level = 1) {
    for (let step = 0; step < bars * 8; step += 1) {
      const when = start + step * THEME_BEAT / 2;
      scheduleMusicNoise(when, 0.025, 0.035 * level, 6900, destination, 'highpass');

      if (step % 2 === 0) {
        scheduleMusicTone(40, when, 0.13, 0.15 * level, destination, {
          type: 'sine',
          endNote: 28,
          attack: 0.003,
          release: 0.09
        });
      }

      if (step % 8 === 2 || step % 8 === 6) {
        scheduleMusicNoise(when, 0.09, 0.105 * level, 1850, destination);
        scheduleMusicTone(43, when, 0.07, 0.035 * level, destination, {
          type: 'triangle',
          endNote: 38,
          attack: 0.002,
          release: 0.05
        });
      }
    }
  }

  function scheduleBass(start, roots, destination, level = 1) {
    const pattern = [0, 0, 12, 0, 7, 0, 12, 7];
    roots.forEach((root, barIndex) => {
      pattern.forEach((offset, step) => {
        scheduleMusicTone(
          root + offset,
          start + barIndex * THEME_BAR + step * THEME_BEAT / 2,
          THEME_BEAT * 0.38,
          0.115 * level,
          destination,
          { type: 'sawtooth', filterFrequency: 390, filterQ: 1.3, release: 0.07 }
        );
      });
    });
  }

  function schedulePads(start, chords, destination, level = 1) {
    chords.forEach((chord, barIndex) => {
      chord.forEach(note => {
        scheduleMusicTone(
          note,
          start + barIndex * THEME_BAR,
          THEME_BAR * 0.94,
          0.028 * level,
          destination,
          { type: 'sawtooth', filterFrequency: 1050, attack: 0.16, release: 0.35 }
        );
      });
    });
  }

  function scheduleLead(start, destination) {
    const melody = [
      [64, null, 67, 71, 74, 71, 67, null],
      [64, 67, 72, 71, 67, 64, null, 67],
      [69, null, 72, 76, 74, 72, 69, null],
      [71, 74, 78, 76, 74, 71, null, 66],
      [76, null, 74, 71, 67, 71, 74, null],
      [74, 71, 69, 66, 69, 71, 74, null],
      [72, null, 71, 67, 64, 67, 71, 72],
      [71, 78, 76, 74, 71, 66, 71, null]
    ];

    melody.forEach((bar, barIndex) => {
      bar.forEach((note, step) => {
        if (note === null) return;
        const when = start + barIndex * THEME_BAR + step * THEME_BEAT / 2;
        scheduleMusicTone(note, when, THEME_BEAT * 0.42, 0.072, destination, {
          type: 'square',
          filterFrequency: 2150,
          filterQ: 1.1,
          release: 0.1
        });
        scheduleMusicTone(note - 12, when + 0.12, THEME_BEAT * 0.3, 0.018, destination, {
          type: 'triangle',
          filterFrequency: 1600,
          release: 0.08
        });
      });
    });
  }

  function scheduleThemeIntro(start) {
    const roots = [40, 36, 33, 35, 40, 38, 36, 35];
    const chords = [
      [52, 55, 59],
      [48, 52, 55],
      [45, 48, 52],
      [47, 50, 54],
      [52, 55, 59],
      [50, 54, 57],
      [48, 52, 55],
      [47, 51, 54]
    ];

    scheduleDrums(start, 8, introMusicGain);
    scheduleBass(start, roots, introMusicGain);
    schedulePads(start, chords, introMusicGain);
    scheduleLead(start, introMusicGain);

    [47, 50, 54, 59].forEach((note, index) => {
      scheduleMusicTone(
        note,
        start + THEME_BAR * 7 + THEME_BEAT * (2.75 + index * 0.25),
        THEME_BEAT * 0.48,
        0.08,
        introMusicGain,
        { type: 'sawtooth', filterFrequency: 1400, release: 0.12 }
      );
    });
  }

  function scheduleGameplayPattern(start) {
    scheduleDrums(start, 4, gameplayMusicGain, 0.55);
    scheduleBass(start, [40, 36, 38, 35], gameplayMusicGain, 0.55);
    schedulePads(start, [
      [52, 55, 59],
      [48, 52, 55],
      [50, 54, 57],
      [47, 51, 54]
    ], gameplayMusicGain, 0.5);
  }

  function startThemeIntro() {
    activateAudio();
    if (!audioContext || themeStarted) return;
    themeStarted = true;
    const start = audioContext.currentTime + 0.06;
    introMusicGain.gain.cancelScheduledValues(start);
    introMusicGain.gain.setValueAtTime(0.0001, start);
    introMusicGain.gain.exponentialRampToValueAtTime(0.62, start + 0.12);
    scheduleThemeIntro(start);
  }

  function startGameplayMusic() {
    if (!audioContext || gameplayMusicTimer !== null) return;

    function scheduleNextLoop() {
      scheduleGameplayPattern(audioContext.currentTime + 0.05);
      gameplayMusicTimer = window.setTimeout(
        scheduleNextLoop,
        (THEME_BAR * 4 - 0.1) * 1000
      );
    }

    scheduleNextLoop();
  }

  function endThemeIntro() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    introMusicGain.gain.cancelScheduledValues(now);
    introMusicGain.gain.setValueAtTime(Math.max(0.0001, introMusicGain.gain.value), now);
    introMusicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    startGameplayMusic();
  }

  function tryFileThemePlayback() {
    if (!themeMusic || !fileThemeStarted || !themeMusic.paused) return;
    const playback = themeMusic.play();
    if (playback) playback.catch(() => {});
  }

  function startFileTheme() {
    activateAudio();
    if (!themeMusic || fileThemeStarted) return;
    fileThemeStarted = true;
    themeMusic.currentTime = 0;
    tryFileThemePlayback();
  }

  function updateMusicVolume() {
    if (!themeMusic || !musicVolume) return;
    const value = Math.max(0, Math.min(100, Number(musicVolume.value)));
    themeMusic.volume = value / 100;
    musicVolume.setAttribute('aria-valuetext', `${value} percent`);
  }

  function setMusicMuted(muted) {
    if (!themeMusic || !musicMute) return;
    themeMusic.muted = muted;
    musicMute.setAttribute('aria-pressed', String(muted));
    musicMute.textContent = muted ? 'MUSIC OFF' : 'MUSIC ON';
  }

  function containMusicControlKeys(event) {
    event.stopPropagation();
  }

  function playFlipper(index) {
    tone(index ? 125 : 115, 0.36, 0.05, { type: 'triangle', endFrequency: 72 });
    noise(0.4, 0.04, index ? 1900 : 1750);
  }

  function playSling(index) {
    noise(0.38, 0.065, index ? 2600 : 2350);
    tone(index ? 720 : 670, 0.25, 0.085, { type: 'square', endFrequency: 430 });
  }

  function playPopBumper({ index = 0, combo = 1 } = {}) {
    const baseNotes = [540, 620, 700];
    const rise = Math.max(0, Math.min(2, combo - 1)) * 150;
    const frequency = baseNotes[index % baseNotes.length] + rise;
    tone(frequency, 0.34, 0.095, {
      type: 'square',
      endFrequency: frequency * 1.42
    });
    tone(frequency * 1.95, 0.18, 0.075, {
      type: 'triangle',
      endFrequency: frequency * 1.55
    });
    noise(0.28, 0.045, 2400 + index * 450 + rise);
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

  function playMagnetCapture() {
    tone(185, 0.3, 0.2, { type: 'sawtooth', endFrequency: 72 });
    tone(740, 0.16, 0.16, { type: 'triangle', endFrequency: 310 });
    noise(0.16, 0.055, 2100);
  }

  function playMagnetEject() {
    tone(145, 0.42, 0.12, { type: 'square', endFrequency: 58 });
    tone(420, 0.24, 0.16, { type: 'triangle', endFrequency: 980 });
    noise(0.32, 0.07, 2900);
  }

  function playLoopEnter() {
    tone(420, 0.16, 0.16, { type: 'triangle', endFrequency: 960 });
    noise(0.07, 0.08, 3400);
  }

  function playLoopComplete() {
    tone(760, 0.22, 0.12, { type: 'square', endFrequency: 1120 });
    tone(1140, 0.18, 0.16, { type: 'triangle', endFrequency: 1680 });
    noise(0.12, 0.055, 4200);
  }

  function playDropTarget({ index = 0, bankComplete = false } = {}) {
    const frequency = 520 + index * 95;
    noise(0.34, 0.045, 1500 + index * 320);
    tone(frequency, 0.3, 0.065, {
      type: 'square',
      endFrequency: frequency * 0.58
    });

    if (bankComplete) {
      tone(660, 0.24, 0.16, { type: 'triangle', endFrequency: 880 });
      tone(990, 0.18, 0.2, { type: 'triangle', endFrequency: 1320 });
      tone(1320, 0.14, 0.23, { type: 'triangle', endFrequency: 1760 });
    }
  }

  function playDropBankReset() {
    noise(0.16, 0.055, 1800);
    tone(240, 0.22, 0.09, { type: 'square', endFrequency: 390 });
  }

  function playSpinnerHit({ impactSpeed = 100 } = {}) {
    const force = Math.max(0, Math.min(1, impactSpeed / 700));
    noise(0.12 + force * 0.16, 0.035, 2600 + force * 1700);
    tone(420 + force * 280, 0.12, 0.055, {
      type: 'square',
      endFrequency: 720 + force * 520
    });
  }

  function playSpinnerTick({ speed = 10 } = {}) {
    const velocity = Math.max(0, Math.min(1, speed / 62));
    tone(820 + velocity * 720, 0.1, 0.028, {
      type: 'triangle',
      endFrequency: 610 + velocity * 530
    });
    noise(0.08 + velocity * 0.08, 0.018, 3200 + velocity * 1800);
  }

  function playSpinnerExit() {
    tone(520, 0.16, 0.11, { type: 'triangle', endFrequency: 980 });
    noise(0.07, 0.045, 3600);
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


    audioState.charge = plunger.charge;
    audioState.ready = ball.ready;
    audioState.ballY = ball.y;
    audioState.ballVy = ball.vy;
    audioState.manualResetPending = false;
    requestAnimationFrame(observeAudioEvents);
  }

  window.addEventListener('keydown', () => {
    activateAudio();
    tryFileThemePlayback();
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.code === 'KeyR') audioState.manualResetPending = true;
  }, { passive: true });
  window.addEventListener('pointerdown', () => {
    activateAudio();
    tryFileThemePlayback();
  }, { passive: true });
  window.addEventListener('miami-intro-start', startFileTheme);
  window.addEventListener('miami-flipper', event => playFlipper(event.detail.index));
  window.addEventListener('miami-pop-bumper', event => playPopBumper(event.detail));
  window.addEventListener('miami-impact', event => playImpact(event.detail));
  window.addEventListener('miami-magnet-capture', playMagnetCapture);
  window.addEventListener('miami-magnet-eject', playMagnetEject);
  window.addEventListener('miami-loop-enter', playLoopEnter);
  window.addEventListener('miami-loop-complete', playLoopComplete);
  window.addEventListener('miami-drop-target', event => playDropTarget(event.detail));
  window.addEventListener('miami-drop-bank-reset', playDropBankReset);
  window.addEventListener('miami-spinner-hit', event => playSpinnerHit(event.detail));
  window.addEventListener('miami-spinner-tick', event => playSpinnerTick(event.detail));
  window.addEventListener('miami-spinner-exit', playSpinnerExit);
  window.addEventListener('miami-drain', playDrain);

  if (musicVolume && musicMute) {
    updateMusicVolume();
    setMusicMuted(false);
    musicVolume.addEventListener('input', updateMusicVolume);
    musicMute.addEventListener('click', () => setMusicMuted(!themeMusic.muted));
    musicVolume.addEventListener('keydown', containMusicControlKeys);
    musicVolume.addEventListener('keyup', containMusicControlKeys);
    musicMute.addEventListener('keydown', containMusicControlKeys);
    musicMute.addEventListener('keyup', containMusicControlKeys);
  }

  requestAnimationFrame(observeAudioEvents);
})();
