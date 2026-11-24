/**
 * Procedural Web Audio synthesizer for ArchePaw MMORPG prototype.
 * Includes footsteps, chopping, mining, rain ambience, thunder, anvil forging,
 * quest fanfare, and an adaptive Day/Night crossfading BGM engine.
 */

// Musical note frequencies (Hz)
const N = {
  A2: 110.0,
  B2: 123.47,
  Cs3: 138.59,
  D3: 146.83,
  E3: 164.81,
  Fs3: 185.0,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  Cs4: 277.18,
  D4: 293.66,
  E4: 329.63,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  Cs5: 554.37,
  D5: 587.33,
  E5: 659.25,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  D6: 1174.66,
};

// Day Theme: Pastoral Sunlit Frontier in D Major (8 bars, 4 eighth-note steps per bar = 32 steps)
const DAY_CHORDS: number[][] = [
  [N.D3, N.A3, N.D4, N.Fs4], // D
  [N.A2, N.E3, N.A3, N.Cs4], // A
  [N.B2, N.Fs3, N.B3, N.D4], // Bm
  [N.G3, N.B3, N.D4, N.G4],  // G
  [N.D3, N.A3, N.D4, N.Fs4], // D
  [N.E3, N.B3, N.E4, N.G4],  // Em
  [N.G3, N.B3, N.D4, N.Fs4], // Gmaj7
  [N.A2, N.E3, N.A3, N.D4],  // Asus4
];

// Gentle airy flute melody notes (0 = rest) across 32 eighth-note steps
const DAY_MELODY: number[] = [
  N.Fs5, 0, N.A5, N.G5,
  N.E5, 0, N.Cs5, 0,
  N.D5, 0, N.Fs5, N.E5,
  N.D5, 0, N.B4, 0,
  N.A4, N.D5, N.Fs5, 0,
  N.G5, 0, N.E5, N.D5,
  N.B4, N.D5, N.Fs5, 0,
  N.E5, 0, 0, 0,
];

// Night Theme: Tranquil Moonlit Fireflies in B Minor / Dorian (8 bars, 4 slow steps per bar = 32 steps)
const NIGHT_CHORDS: number[][] = [
  [N.B2, N.Fs3, N.A3, N.D4], // Bm7
  [N.G3, N.B3, N.D4, N.Fs4], // Gmaj7
  [N.E3, N.B3, N.D4, N.G4],  // Em7
  [N.Fs3, N.A3, N.Cs4, N.E4],// F#m7
  [N.B2, N.Fs3, N.Cs4, N.D4],// Bm9
  [N.G3, N.B3, N.E4, N.Fs4], // Gmaj13
  [N.E3, N.B3, N.Fs4, N.G4], // Em9
  [N.Fs3, N.A3, N.Cs4, N.Fs4],// F#m
];

// Delicate celesta / music-box shimmer notes (0 = rest)
const NIGHT_MELODY: number[] = [
  N.Fs5, 0, 0, N.D5,
  N.B4, 0, N.Fs5, 0,
  N.G5, 0, N.E5, 0,
  N.Cs5, 0, 0, 0,
  N.D5, 0, N.Fs5, N.A5,
  N.B5, 0, N.Fs5, 0,
  N.G5, 0, N.E5, N.D5,
  N.Cs5, 0, 0, 0,
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmEnabled = true;
  private masterVolume = 0.9;
  private bgmVolume = 0.75;
  private sfxVolume = 0.9;
  private noiseBuffer: AudioBuffer | null = null;

  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private targetRainLevel = 0;

  // Spatial waterfall + dynamic wind + time-of-day forest ambience loops
  private waterfallSource: AudioBufferSourceNode | null = null;
  private waterfallLowFilter: BiquadFilterNode | null = null;
  private waterfallSprayFilter: BiquadFilterNode | null = null;
  private waterfallGain: GainNode | null = null;
  private currentWaterfallLevel = 0;

  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private currentWindLevel = 0;

  private forestSource: AudioBufferSourceNode | null = null;
  private forestFilter: BiquadFilterNode | null = null;
  private forestGain: GainNode | null = null;
  private currentForestLevel = 0;

  private forestCricketTimer = 2.2;
  private forestOwlTimer = 11.5;
  private forestDayBirdTimer = 4.5;

  // Adaptive Day/Night BGM graph
  private bgmMasterGain: GainNode | null = null;
  private bgmDayGain: GainNode | null = null;
  private bgmNightGain: GainNode | null = null;
  private bgmDelay: DelayNode | null = null;
  private bgmSchedulerId: number | null = null;
  private bgmStarted = false;
  private bgmDuckFactor = 1.0;
  private currentNightFactor = 0;

  private dayNextStepTime = 0;
  private dayStepIdx = 0;
  private nightNextStepTime = 0;
  private nightStepIdx = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.noiseBuffer) {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 2.0);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.18) * 1.4));
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  private ensureBgmGraph(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.bgmMasterGain) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);

    // Subtle dreamy echo / reverb tail for harp, flute & celesta
    const delay = ctx.createDelay(1.0);
    delay.delayTime.setValueAtTime(0.36, ctx.currentTime);
    const delayLp = ctx.createBiquadFilter();
    delayLp.type = 'lowpass';
    delayLp.frequency.setValueAtTime(2100, ctx.currentTime);
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.28, ctx.currentTime);
    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.34, ctx.currentTime);

    delay.connect(delayLp);
    delayLp.connect(delayFeedback);
    delayFeedback.connect(delay);
    delayLp.connect(wetGain);
    wetGain.connect(master);

    const dayBus = ctx.createGain();
    dayBus.gain.setValueAtTime(1 - this.currentNightFactor, ctx.currentTime);
    dayBus.connect(master);
    dayBus.connect(delay);

    const nightBus = ctx.createGain();
    nightBus.gain.setValueAtTime(this.currentNightFactor, ctx.currentTime);
    nightBus.connect(master);
    nightBus.connect(delay);

    master.connect(ctx.destination);

    this.bgmMasterGain = master;
    this.bgmDayGain = dayBus;
    this.bgmNightGain = nightBus;
    this.bgmDelay = delay;

    const now = ctx.currentTime + 0.12;
    this.dayNextStepTime = now;
    this.nightNextStepTime = now;

    this.startBgmScheduler();
  }

  private startBgmScheduler(): void {
    if (this.bgmSchedulerId !== null || typeof window === 'undefined') return;
    this.bgmSchedulerId = window.setInterval(() => this.tickBgmScheduler(), 160);
  }

  private tickBgmScheduler(): void {
    if (this.muted || !this.bgmEnabled || !this.bgmStarted || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const lookahead = 0.35;

    // Resync if tab was backgrounded
    if (this.dayNextStepTime < now - 0.5) this.dayNextStepTime = now + 0.05;
    if (this.nightNextStepTime < now - 0.5) this.nightNextStepTime = now + 0.05;

    // 1. Schedule Day Theme (Sunlit Meadow — 92 BPM eighth notes ≈ 0.326s)
    const dayStepDur = 0.335;
    while (this.dayNextStepTime < now + lookahead) {
      if (1 - this.currentNightFactor > 0.03 && this.bgmDayGain) {
        this.scheduleDayStep(this.dayStepIdx, this.dayNextStepTime);
      }
      this.dayStepIdx = (this.dayStepIdx + 1) % 32;
      this.dayNextStepTime += dayStepDur;
    }

    // 2. Schedule Night Theme (Moonlit Fireflies — tranquil 66 BPM ≈ 0.54s per step)
    const nightStepDur = 0.56;
    while (this.nightNextStepTime < now + lookahead) {
      if (this.currentNightFactor > 0.03 && this.bgmNightGain) {
        this.scheduleNightStep(this.nightStepIdx, this.nightNextStepTime);
      }
      this.nightStepIdx = (this.nightStepIdx + 1) % 32;
      this.nightNextStepTime += nightStepDur;
    }
  }

  private scheduleDayStep(step: number, time: number): void {
    const ctx = this.ctx;
    const bus = this.bgmDayGain;
    if (!ctx || !bus) return;

    const bar = Math.floor(step / 4);
    const beatInBar = step % 4;
    const chord = DAY_CHORDS[bar];

    // Warm plucked lute / harp arpeggio
    const arpOrder = [0, 1, 2, 3];
    const arpFreq = chord[arpOrder[beatInBar]];
    this.playPluck(ctx, bus, arpFreq, time, 0.72, 0.095, 1950);

    // Gentle cello/acoustic root warmth on downbeat
    if (beatInBar === 0) {
      this.playWarmPadVoice(ctx, bus, chord[0] * 0.5, time, 1.32, 0.065, 420);
      // Soft secondary chord shimmer on beat 0
      this.playPluck(ctx, bus, chord[2] * 2, time + 0.02, 0.55, 0.035, 2200);
    }

    // Breathy pastoral flute melody
    const melFreq = DAY_MELODY[step];
    if (melFreq > 0) {
      this.playFluteNote(ctx, bus, melFreq, time, 0.62, 0.068);
    }
  }

  private scheduleNightStep(step: number, time: number): void {
    const ctx = this.ctx;
    const bus = this.bgmNightGain;
    if (!ctx || !bus) return;

    const bar = Math.floor(step / 4);
    const beatInBar = step % 4;
    const chord = NIGHT_CHORDS[bar];

    // Lush slow nocturnal pad on every bar start
    if (beatInBar === 0) {
      this.playWarmPadVoice(ctx, bus, chord[0], time, 2.35, 0.068, 540);
      this.playWarmPadVoice(ctx, bus, chord[1], time + 0.04, 2.3, 0.042, 620);
      this.playWarmPadVoice(ctx, bus, chord[2], time + 0.08, 2.25, 0.034, 680);
    }

    // Soft glass-harp / lullaby arpeggio
    if (beatInBar === 1 || beatInBar === 3) {
      const note = chord[beatInBar === 1 ? 2 : 3];
      this.playCelestaNote(ctx, bus, note * 2, time, 1.25, 0.045);
    }

    // Crystalline nocturnal celesta / music-box melody
    const melFreq = NIGHT_MELODY[step];
    if (melFreq > 0) {
      this.playCelestaNote(ctx, bus, melFreq, time, 1.65, 0.072);
    }
  }

  private playPluck(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    dur: number,
    vol: number,
    cutoff: number,
  ): void {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, time);
    lp.frequency.exponentialRampToValueAtTime(Math.max(260, cutoff * 0.28), time + dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    osc.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  private playFluteNote(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    dur: number,
    vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    vib.type = 'sine';
    vib.frequency.setValueAtTime(4.8, time);
    vibGain.gain.setValueAtTime(2.4, time);
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.09);
    g.gain.setValueAtTime(vol * 0.85, time + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    osc.connect(g);
    g.connect(dest);
    osc.start(time);
    vib.start(time);
    osc.stop(time + dur + 0.04);
    vib.stop(time + dur + 0.04);
  }

  private playCelestaNote(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    dur: number,
    vol: number,
  ): void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    const g2 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.0, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    g2.gain.setValueAtTime(0.0001, time);
    g2.gain.linearRampToValueAtTime(vol * 0.24, time + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0004, time + dur * 0.35);

    osc1.connect(g);
    osc2.connect(g2);
    g.connect(dest);
    g2.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.04);
    osc2.stop(time + dur * 0.4 + 0.04);
  }

  private playWarmPadVoice(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    dur: number,
    vol: number,
    cutoff: number,
  ): void {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + Math.min(0.45, dur * 0.3));
    g.gain.setValueAtTime(vol * 0.85, time + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    osc.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  /**
   * Smoothly crossfade between Daytime pastoral theme and Nighttime firefly lullaby.
   */
  public updateBgm(nightFactor: number, activeGameplay: boolean): void {
    this.currentNightFactor = Math.max(0, Math.min(1, nightFactor));
    this.bgmDuckFactor = activeGameplay ? 1.0 : 0.42;

    if (!this.ctx || !this.bgmMasterGain || !this.bgmDayGain || !this.bgmNightGain) return;
    const now = this.ctx.currentTime;
    const targetMaster =
      !this.muted && this.bgmEnabled && this.bgmStarted
        ? Math.max(0.0001, 0.56 * this.bgmDuckFactor * this.masterVolume * this.bgmVolume)
        : 0.0001;
    this.bgmMasterGain.gain.setTargetAtTime(targetMaster, now, 0.45);
    this.bgmDayGain.gain.setTargetAtTime(1 - this.currentNightFactor, now, 0.85);
    this.bgmNightGain.gain.setTargetAtTime(this.currentNightFactor, now, 0.85);
  }

  public setVolumes(master: number, bgm: number, sfx: number): void {
    this.masterVolume = Math.max(0, Math.min(1, master));
    this.bgmVolume = Math.max(0, Math.min(1, bgm));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.bgmMasterGain) {
        const target =
          !this.muted && this.bgmEnabled && this.bgmStarted
            ? Math.max(0.0001, 0.56 * this.bgmDuckFactor * this.masterVolume * this.bgmVolume)
            : 0.0001;
        this.bgmMasterGain.gain.setTargetAtTime(target, now, 0.12);
      }
      if (this.rainGain) {
        const rainVol = this.muted ? 0 : this.targetRainLevel * this.masterVolume * this.sfxVolume;
        this.rainGain.gain.setTargetAtTime(rainVol, now, 0.15);
      }
      const sfxScale = this.muted ? 0 : this.masterVolume * this.sfxVolume;
      if (this.waterfallGain) {
        this.waterfallGain.gain.setTargetAtTime(this.currentWaterfallLevel * sfxScale, now, 0.12);
      }
      if (this.windGain) {
        this.windGain.gain.setTargetAtTime(this.currentWindLevel * sfxScale, now, 0.15);
      }
      if (this.forestGain) {
        this.forestGain.gain.setTargetAtTime(this.currentForestLevel * sfxScale, now, 0.15);
      }
    }
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (this.bgmEnabled && this.bgmStarted) {
      this.ensureBgmGraph();
    }
    this.updateBgm(this.currentNightFactor, true);
  }

  public startBgm(): void {
    this.bgmStarted = true;
    const ctx = this.ensureContext();
    if (ctx) {
      this.ensureBgmGraph();
      this.updateBgm(this.currentNightFactor, true);
    }
  }

  public toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled && this.bgmStarted) {
      this.ensureBgmGraph();
    }
    this.updateBgm(this.currentNightFactor, true);
    return this.bgmEnabled;
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(
        muted ? 0 : this.targetRainLevel * this.masterVolume * this.sfxVolume,
        this.ctx.currentTime,
        0.15,
      );
    }
    if (this.bgmMasterGain && this.ctx) {
      const target =
        !muted && this.bgmEnabled && this.bgmStarted
          ? Math.max(0.0001, 0.56 * this.bgmDuckFactor * this.masterVolume * this.bgmVolume)
          : 0.0001;
      this.bgmMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.18);
    }
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const sfxScale = muted ? 0 : this.masterVolume * this.sfxVolume;
      if (this.waterfallGain) {
        this.waterfallGain.gain.setTargetAtTime(this.currentWaterfallLevel * sfxScale, now, 0.12);
      }
      if (this.windGain) {
        this.windGain.gain.setTargetAtTime(this.currentWindLevel * sfxScale, now, 0.15);
      }
      if (this.forestGain) {
        this.forestGain.gain.setTargetAtTime(this.currentForestLevel * sfxScale, now, 0.15);
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx) {
      if (this.targetRainLevel > 0.005) {
        this.ensureRainLoop();
      }
      if (this.bgmStarted && this.bgmEnabled) {
        this.ensureBgmGraph();
      }
    }
  }

  private ensureRainLoop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer || this.rainSource) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, ctx.currentTime);
    filter.Q.setValueAtTime(0.65, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    this.rainSource = src;
    this.rainFilter = filter;
    this.rainGain = gain;
  }

  public setRainAmbience(intensity: number): void {
    this.targetRainLevel = Math.max(0, Math.min(1, intensity)) * 0.085;
    if (this.muted || !this.ctx || this.masterVolume * this.sfxVolume <= 0.01) return;

    if (this.targetRainLevel > 0.002 && !this.rainSource) {
      this.ensureRainLoop();
    }
    if (this.rainGain && this.rainFilter) {
      const now = this.ctx.currentTime;
      this.rainGain.gain.setTargetAtTime(
        this.targetRainLevel * this.masterVolume * this.sfxVolume,
        now,
        0.35,
      );
      this.rainFilter.frequency.setTargetAtTime(intensity > 0.7 ? 950 : 1450, now, 0.4);
    }
  }

  private ensureNatureLoops(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // 1. Spatial Waterfall loop: deep water plunge rumble + bright cascading mist spray
    if (!this.waterfallSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      const lowLp = ctx.createBiquadFilter();
      lowLp.type = 'lowpass';
      lowLp.frequency.setValueAtTime(520, now);
      lowLp.Q.setValueAtTime(0.65, now);

      const sprayBp = ctx.createBiquadFilter();
      sprayBp.type = 'bandpass';
      sprayBp.frequency.setValueAtTime(2150, now);
      sprayBp.Q.setValueAtTime(0.7, now);

      const lowMix = ctx.createGain();
      lowMix.gain.setValueAtTime(0.75, now);
      const sprayMix = ctx.createGain();
      sprayMix.gain.setValueAtTime(0.45, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      src.connect(lowLp);
      lowLp.connect(lowMix);
      lowMix.connect(gain);

      src.connect(sprayBp);
      sprayBp.connect(sprayMix);
      sprayMix.connect(gain);

      gain.connect(ctx.destination);
      src.start(now, 0.15);

      this.waterfallSource = src;
      this.waterfallLowFilter = lowLp;
      this.waterfallSprayFilter = sprayBp;
      this.waterfallGain = gain;
    }

    // 2. Dynamic Wind loop: sweeping resonant bandpass air gust
    if (!this.windSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(380, now);
      bp.Q.setValueAtTime(2.6, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start(now, 0.72);

      this.windSource = src;
      this.windFilter = bp;
      this.windGain = gain;
    }

    // 3. Time-of-day Forest Canopy rustle loop
    if (!this.forestSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2550, now);
      bp.Q.setValueAtTime(1.15, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start(now, 1.35);

      this.forestSource = src;
      this.forestFilter = bp;
      this.forestGain = gain;
    }
  }

  /**
   * Updates continuous spatial waterfall volume (by 3D camera distance),
   * wind swoosh, and time-of-day forest ambience (day rustle/birds, night crickets/owl).
   * Zero per-frame audio-node allocations.
   */
  public updateNatureAmbience(params: {
    dt: number;
    elapsed: number;
    waterfallDist: number;
    windStrength: number;
    nightFactor: number;
    rainBlend: number;
    active: boolean;
  }): void {
    const { dt, elapsed, waterfallDist, windStrength, nightFactor, rainBlend, active } = params;
    const sfxScale = this.muted || !active ? 0 : this.masterVolume * this.sfxVolume;

    // 1. Waterfall spatial distance attenuation (full at <= 10m, smooth quadratic rolloff to 0 at 72m)
    const clampedDist = Math.max(0, waterfallDist);
    const proximity =
      clampedDist <= 10
        ? 1
        : clampedDist >= 72
          ? 0
          : Math.pow(1 - (clampedDist - 10) / 62, 2);
    this.currentWaterfallLevel = proximity * 0.23;

    // 2. Wind intensity with slow organic gust swell
    const gust = 0.55 + 0.45 * Math.sin(elapsed * 0.37) * Math.cos(elapsed * 0.19);
    const windNorm = Math.max(0.12, Math.min(1.3, windStrength));
    this.currentWindLevel = (0.012 + windNorm * 0.042 * (0.72 + gust * 0.45));

    // 3. Forest canopy rustling (brighter & fuller during daytime breeze, softer hushed at night)
    const dayAmount = Math.max(0, 1 - nightFactor);
    this.currentForestLevel = (0.008 + dayAmount * 0.014 + windNorm * 0.011) * (1 - rainBlend * 0.45);

    if (!this.ctx || this.ctx.state !== 'running') return;
    if (sfxScale > 0.005) {
      this.ensureNatureLoops();
    }

    const now = this.ctx.currentTime;
    if (this.waterfallGain && this.waterfallLowFilter && this.waterfallSprayFilter) {
      this.waterfallGain.gain.setTargetAtTime(this.currentWaterfallLevel * sfxScale, now, 0.1);
      // Closer to waterfall = brighter crisp mist & deeper rumble; farther = muffled low rush
      this.waterfallLowFilter.frequency.setTargetAtTime(340 + proximity * 320, now, 0.16);
      this.waterfallSprayFilter.frequency.setTargetAtTime(1450 + proximity * 1150, now, 0.16);
    }

    if (this.windGain && this.windFilter) {
      this.windGain.gain.setTargetAtTime(this.currentWindLevel * sfxScale, now, 0.25);
      const windFreq = 250 + windNorm * 310 + Math.sin(elapsed * 0.48) * 95;
      this.windFilter.frequency.setTargetAtTime(Math.max(180, windFreq), now, 0.25);
    }

    if (this.forestGain && this.forestFilter) {
      this.forestGain.gain.setTargetAtTime(this.currentForestLevel * sfxScale, now, 0.3);
      const forestFreq = 1950 + dayAmount * 750 + Math.sin(elapsed * 0.72) * 260;
      this.forestFilter.frequency.setTargetAtTime(forestFreq, now, 0.3);
    }

    if (sfxScale <= 0.01) return;

    // 4. Time-of-day procedural forest wildlife voices (suppressed in heavy storm)
    if (rainBlend < 0.65) {
      if (nightFactor > 0.52) {
        // Nighttime forest: gentle rhythmic cricket chorus + occasional distant owl
        this.forestCricketTimer -= dt;
        if (this.forestCricketTimer <= 0) {
          this.forestCricketTimer = 2.3 + Math.random() * 2.9;
          this.playNightCricket(nightFactor);
        }
        this.forestOwlTimer -= dt;
        if (this.forestOwlTimer <= 0) {
          this.forestOwlTimer = 11.0 + Math.random() * 10.5;
          this.playNightOwl(nightFactor);
        }
      } else {
        // Daytime / Dawn / Dusk forest: soft distant woodland songbird / wood-dove calls
        this.forestDayBirdTimer -= dt;
        if (this.forestDayBirdTimer <= 0) {
          this.forestDayBirdTimer = 5.5 + Math.random() * 5.8;
          if (Math.random() < 0.65) {
            this.playBirdChirp(0.55 + dayAmount * 0.3);
          } else {
            this.playForestDove(0.45 + dayAmount * 0.35);
          }
        }
      }
    }
  }

  private playForestDove(scale = 0.7): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.min(0.045, 0.03 * this.masterVolume * this.sfxVolume * scale);
    const notes = [
      { delay: 0, dur: 0.22, f0: 540, f1: 495 },
      { delay: 0.28, dur: 0.34, f0: 455, f1: 425 },
    ];
    for (const n of notes) {
      const t = now + n.delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f0, t);
      osc.frequency.exponentialRampToValueAtTime(n.f1, t + n.dur);
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0005, t + n.dur + 0.03);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.dur + 0.04);
    }
  }

  private playNightCricket(nightFactor: number): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.min(0.028, 0.018 * nightFactor * this.masterVolume * this.sfxVolume);
    const baseFreq = 4150 + Math.random() * 550;
    const pulses = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pulses; i++) {
      const t = now + i * 0.058;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.linearRampToValueAtTime(baseFreq + 90, t + 0.032);
      g.gain.setValueAtTime(0.0003, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0003, t + 0.044);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.048);
    }
  }

  private playNightOwl(nightFactor: number): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.min(0.04, 0.028 * nightFactor * this.masterVolume * this.sfxVolume);
    const hoots = [
      { delay: 0, dur: 0.24, f0: 410, f1: 375 },
      { delay: 0.34, dur: 0.42, f0: 365, f1: 318 },
    ];
    for (const h of hoots) {
      const t = now + h.delay;
      const osc = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(h.f0, t);
      osc.frequency.exponentialRampToValueAtTime(h.f1, t + h.dur);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(750, t);
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.055);
      g.gain.exponentialRampToValueAtTime(0.0005, t + h.dur + 0.05);
      osc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + h.dur + 0.06);
    }
  }

  public playEatFood(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const volScale = this.masterVolume * this.sfxVolume;

    // Two crisp crunch bites
    if (this.noiseBuffer) {
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.11;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1650 + i * 320, t);
        bp.Q.setValueAtTime(1.8, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.11 * volScale, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
        src.connect(bp);
        bp.connect(g);
        g.connect(ctx.destination);
        src.start(t, Math.random() * 0.5, 0.09);
      }
    }

    // Warm nourishing chime
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((f, idx) => {
      const t = now + 0.18 + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.065 * volScale, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playThunder(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(190, now);
    lp.frequency.exponentialRampToValueAtTime(62, now + 2.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.55);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.85);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.5);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 2.6);
  }

  public playQuestComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [N.D5, N.Fs5, N.A5, N.D6];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 3 ? 'triangle' : 'sine';
      const t = now + i * 0.075;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + (i === 3 ? 0.65 : 0.32));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.7);
    });
  }

  public playForgeAnvil(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const strikes = [0, 0.16];
    strikes.forEach((offset, sIdx) => {
      const t = now + offset;
      const partials = [740, 1485, 2240];
      partials.forEach((freq, pIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = pIdx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq * (sIdx === 1 ? 1.12 : 1.0), t);
        const amp = (sIdx === 1 ? 0.13 : 0.1) / (pIdx + 1);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(amp, t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0006, t + 0.45 / (pIdx * 0.5 + 1));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    });

    if (this.noiseBuffer) {
      const hiss = ctx.createBufferSource();
      hiss.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2200, now + 0.28);
      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0.001, now + 0.28);
      hGain.gain.linearRampToValueAtTime(0.075, now + 0.34);
      hGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
      hiss.connect(hp);
      hp.connect(hGain);
      hGain.connect(ctx.destination);
      hiss.start(now + 0.28, 0.1, 0.4);
    }
  }

  public playEquipSwap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playFootstep(sprinting: boolean, wetGround = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = wetGround ? 820 : sprinting ? 480 : 340;
    filter.frequency.setValueAtTime(baseFreq + Math.random() * 140, now);
    filter.Q.setValueAtTime(wetGround ? 2.1 : 1.4, now);

    const gain = ctx.createGain();
    const vol = sprinting ? 0.08 : 0.045;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.075);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now, Math.random() * 0.4, 0.09);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(490, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playLand(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playWoodChop(isFinal: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isFinal ? 190 : 250 + Math.random() * 35, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + (isFinal ? 0.16 : 0.09));

    oscGain.gain.setValueAtTime(isFinal ? 0.22 : 0.16, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.18 : 0.11));

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1100, now);
    bp.Q.setValueAtTime(2.0, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.11, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now, Math.random() * 0.4, 0.08);
  }

  public playStoneMine(isCrystal: boolean, isFinal: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const baseFreq = isCrystal ? 920 : 620;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq + Math.random() * 90, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, now + 0.14);

    osc2.frequency.setValueAtTime(baseFreq * 1.52, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, now + 0.16);

    gain.gain.setValueAtTime(isFinal ? 0.17 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCrystal ? 0.24 : 0.15));

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  public playCollectChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [587.33, 880.0];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playPlantOrPlace(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [392.0, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playWorldExpand(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [293.66, 440.0, 554.37, 659.25, 880.0];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.085;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 1.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  }

  public playMonsterHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210 + Math.random() * 45, now);
    osc.frequency.exponentialRampToValueAtTime(82, now + 0.11);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playMonsterDefeat(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.095, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  public playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playHealPotion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  public playEmoteChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    g.gain.setValueAtTime(0.065, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playUiError(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSkillWhirlwind(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280 + i * 95, t);
      osc.frequency.exponentialRampToValueAtTime(720 + i * 110, t + 0.09);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    }
  }

  public playSkillDash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playSkillSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.38);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(480, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.18, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      src.connect(lp);
      lp.connect(ng);
      ng.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.34);
    }
  }

  public playSkillWarcry(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [293.66, 440.0, 587.33, 739.99];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  public playBossRoar(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.72);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, now);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.78);
  }

  public playBossSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.48);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.54);
  }

  public playMasteryUp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.095, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /**
   * Soft procedural daytime songbird / flock chirps (2-3 melodic high-register trills).
   * Only plays when AudioContext is already running so it stays unobtrusive.
   */
  public playBirdChirp(volumeScale = 1): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.max(0.008, Math.min(0.065, 0.042 * this.masterVolume * this.sfxVolume * volumeScale));

    // Pick one of 3 natural melodic bird call contours
    const pattern = Math.floor(Math.random() * 3);
    const baseFreq = 2550 + Math.random() * 950;
    const notes =
      pattern === 0
        ? [
            { delay: 0, dur: 0.085, f0: baseFreq, f1: baseFreq * 1.38, f2: baseFreq * 1.12 },
            { delay: 0.115, dur: 0.11, f0: baseFreq * 1.15, f1: baseFreq * 1.52, f2: baseFreq * 1.24 },
          ]
        : pattern === 1
          ? [
              { delay: 0, dur: 0.065, f0: baseFreq * 1.22, f1: baseFreq * 0.94, f2: baseFreq * 1.18 },
              { delay: 0.085, dur: 0.07, f0: baseFreq * 1.3, f1: baseFreq * 1.02, f2: baseFreq * 1.28 },
              { delay: 0.18, dur: 0.125, f0: baseFreq * 1.1, f1: baseFreq * 1.55, f2: baseFreq * 1.32 },
            ]
          : [
              { delay: 0, dur: 0.13, f0: baseFreq * 0.92, f1: baseFreq * 1.35, f2: baseFreq * 0.98 },
              { delay: 0.22, dur: 0.09, f0: baseFreq * 1.18, f1: baseFreq * 1.46, f2: baseFreq * 1.26 },
            ];

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const t = now + n.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(n.f0, t);
      osc.frequency.exponentialRampToValueAtTime(n.f1, t + n.dur * 0.55);
      osc.frequency.exponentialRampToValueAtTime(n.f2, t + n.dur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(n.f1, t);
      filter.Q.setValueAtTime(2.2, t);

      gain.gain.setValueAtTime(0.0005, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + n.dur + 0.02);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + n.dur + 0.03);
    }
  }

  public dispose(): void {
    if (this.bgmSchedulerId !== null) {
      clearInterval(this.bgmSchedulerId);
      this.bgmSchedulerId = null;
    }
    if (this.bgmDelay) {
      try {
        this.bgmDelay.disconnect();
      } catch {
        // ignore
      }
      this.bgmDelay = null;
    }
    if (this.rainSource) {
      try {
        this.rainSource.stop();
      } catch {
        // ignore
      }
      this.rainSource = null;
    }
    for (const src of [this.waterfallSource, this.windSource, this.forestSource]) {
      if (src) {
        try {
          src.stop();
        } catch {
          // ignore
        }
      }
    }
    this.waterfallSource = null;
    this.windSource = null;
    this.forestSource = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
