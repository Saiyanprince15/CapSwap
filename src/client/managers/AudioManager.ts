// ─── CapSwap: Audio Manager (Web Audio API Chiptune Synth) ────────────────────
// One global mute gate: masterGain sits in front of EVERYTHING (music + SFX),
// so toggleMute() silences all current and future audio in one place.
//
// Music is a pattern-based step sequencer with lookahead scheduling —
// composed loops instead of drones, so tracks loop seamlessly.

// ─── Note frequencies (Hz) ───────────────────────────────────────────────────
const N = {
  F2: 87.31, G2: 98.0, A2: 110.0, C3: 130.81, E3: 164.81, F3: 174.61,
  G3: 196.0, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
  G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26,
  G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5, G6: 1568.0,
} as const;

type Wave = OscillatorType | 'noise';

interface Lane {
  wave: Wave;
  volume: number;
  /** Note length in seconds. */
  duration: number;
  /** One entry per step; null = rest. */
  notes: (number | null)[];
}

interface Track {
  /** Seconds per sequencer step (16th note). */
  stepDuration: number;
  steps: number;
  lanes: Lane[];
}

export type MusicName = 'menu' | 'game';

// ─── Menu: relaxed chiptune lullaby, C major pentatonic, ~62 BPM feel ────────
const MENU_TRACK: Track = {
  stepDuration: 0.24,
  steps: 32,
  lanes: [
    {
      // Gentle triangle arpeggio
      wave: 'triangle',
      volume: 0.11,
      duration: 0.4,
      notes: [
        N.C4, null, N.E4, null, N.G4, null, N.C5, null,
        N.G4, null, N.E4, null, N.D4, null, N.E4, null,
        N.A3, null, N.C4, null, N.E4, null, N.A4, null,
        N.G4, null, N.E4, null, N.D4, null, N.C4, null,
      ],
    },
    {
      // Soft sine bass, one note per half-bar
      wave: 'sine',
      volume: 0.15,
      duration: 1.7,
      notes: [
        N.C3, null, null, null, null, null, null, null,
        N.G2, null, null, null, null, null, null, null,
        N.A2, null, null, null, null, null, null, null,
        N.G2, null, null, null, null, null, null, null,
      ],
    },
  ],
};

// ─── Gameplay: energetic but unobtrusive, A minor, ~120 BPM ──────────────────
const GAME_TRACK: Track = {
  stepDuration: 0.125,
  steps: 32,
  lanes: [
    {
      // Square lead melody
      wave: 'square',
      volume: 0.055,
      duration: 0.11,
      notes: [
        N.A4, null, N.A4, null, N.C5, null, N.E5, null,
        N.D5, null, N.C5, null, N.B4, null, N.C5, null,
        N.A4, null, N.A4, null, N.C5, null, N.E5, null,
        N.G5, null, N.E5, null, N.D5, null, N.B4, null,
      ],
    },
    {
      // Triangle bass line: i — VI — VII pulse
      wave: 'triangle',
      volume: 0.16,
      duration: 0.22,
      notes: [
        N.A2, null, null, null, N.A2, null, null, null,
        N.A2, null, null, null, N.A2, null, null, null,
        N.F2, null, null, null, N.F2, null, null, null,
        N.G2, null, null, null, N.G2, null, null, null,
      ],
    },
    {
      // Noise hats on the off-beats
      wave: 'noise',
      volume: 0.035,
      duration: 0.03,
      notes: [
        null, null, 1, null, null, null, 1, null,
        null, null, 1, null, null, null, 1, null,
        null, null, 1, null, null, null, 1, null,
        null, null, 1, null, null, null, 1, null,
      ],
    },
  ],
};

const TRACKS: Record<MusicName, Track> = {
  menu: MENU_TRACK,
  game: GAME_TRACK,
};

const MASTER_VOLUME = 0.32;
const LOOKAHEAD_SEC = 0.15;
const SCHEDULER_MS = 40;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null; // ← global mute gate
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private _muted = false;

  // Sequencer state
  private schedulerId: number | null = null;
  private currentTrack: MusicName | null = null;
  private desiredTrack: MusicName | null = null;
  private step = 0;
  private nextStepTime = 0;

  constructor() {
    // Browsers block audio until a user gesture. Listen globally (React DOM
    // buttons never reach the Phaser canvas) and start pending music then.
    window.addEventListener('pointerdown', this.unlock, true);
    window.addEventListener('keydown', this.unlock, true);
  }

  get muted(): boolean {
    return this._muted;
  }

  /** Toggle GLOBAL mute — silences music AND all sound effects. */
  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this._muted ? 0 : MASTER_VOLUME,
        this.ctx.currentTime,
        0.02
      );
    }
    return this._muted;
  }

  // ─── Context / unlock ───────────────────────────────────────────────────────

  private unlock = (): void => {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => this.tryStartDesired());
    } else {
      this.tryStartDesired();
    }
  };

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : MASTER_VOLUME;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 1;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.masterGain);

      // Short white-noise buffer for hats / percussive SFX
      const len = Math.floor(this.ctx.sampleRate * 0.1);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private get running(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // ─── Low-level voices ────────────────────────────────────────────────────────

  private scheduleVoice(
    wave: Wave,
    freq: number,
    startAt: number,
    duration: number,
    volume: number,
    out: GainNode,
    rampTo?: number
  ): void {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    gain.connect(out);

    if (wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer!;
      src.connect(gain);
      src.start(startAt);
      src.stop(startAt + Math.min(duration, 0.1));
    } else {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, startAt);
      if (rampTo !== undefined) {
        osc.frequency.linearRampToValueAtTime(rampTo, startAt + duration);
      }
      osc.connect(gain);
      osc.start(startAt);
      osc.stop(startAt + duration);
    }
  }

  /** Immediate SFX tone (routed through the global mute gate). */
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.5,
    rampTo?: number,
    delaySec = 0
  ): void {
    const ctx = this.ensureContext();
    if (!this.running) return;
    this.scheduleVoice(
      type,
      freq,
      ctx.currentTime + delaySec,
      duration,
      volume,
      this.sfxGain!,
      rampTo
    );
  }

  private playNoise(duration: number, volume: number, delaySec = 0): void {
    const ctx = this.ensureContext();
    if (!this.running) return;
    this.scheduleVoice(
      'noise',
      1,
      ctx.currentTime + delaySec,
      duration,
      volume,
      this.sfxGain!
    );
  }

  // ─── Music sequencer ─────────────────────────────────────────────────────────

  /** Start (or switch to) a looping music track. Safe to call before unlock. */
  playMusic(name: MusicName): void {
    this.desiredTrack = name;
    this.ensureContext();
    this.tryStartDesired();
  }

  /** Stop looping music (one-shot jingles are unaffected). */
  stopMusic(): void {
    this.desiredTrack = null;
    this.currentTrack = null;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private tryStartDesired(): void {
    if (!this.desiredTrack || !this.running) return;
    if (this.currentTrack === this.desiredTrack && this.schedulerId !== null)
      return;

    // Switch tracks: reset the sequencer
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.currentTrack = this.desiredTrack;
    this.step = 0;
    this.nextStepTime = this.ctx!.currentTime + 0.05;
    this.schedulerId = window.setInterval(() => this.tick(), SCHEDULER_MS);
    this.tick();
  }

  private tick(): void {
    if (!this.ctx || !this.currentTrack) return;
    const track = TRACKS[this.currentTrack];
    while (this.nextStepTime < this.ctx.currentTime + LOOKAHEAD_SEC) {
      for (const lane of track.lanes) {
        const note = lane.notes[this.step % lane.notes.length];
        if (note != null) {
          this.scheduleVoice(
            lane.wave,
            note,
            this.nextStepTime,
            lane.duration,
            lane.volume,
            this.musicGain!
          );
        }
      }
      this.nextStepTime += track.stepDuration;
      this.step = (this.step + 1) % track.steps;
    }
  }

  // ─── SFX ─────────────────────────────────────────────────────────────────────

  playHover(): void {
    this.playTone(950, 0.04, 'square', 0.12);
  }

  playClick(): void {
    this.playTone(800, 0.06, 'square', 0.3, 1200);
  }

  playSelect(): void {
    this.playTone(400, 0.12, 'sine', 0.4, 700);
  }

  playSwap(): void {
    this.playTone(300, 0.15, 'triangle', 0.35, 500);
    this.playTone(500, 0.1, 'triangle', 0.3, 300, 0.08);
  }

  playConfirm(): void {
    this.playTone(600, 0.08, 'square', 0.3);
    this.playTone(800, 0.08, 'square', 0.3, undefined, 0.1);
  }

  playShuffle(): void {
    this.playTone(250, 0.08, 'triangle', 0.2, 400);
  }

  /** Short celebratory retro jingle (one-shot). */
  playVictoryJingle(): void {
    const ctx = this.ensureContext();
    if (!this.running) return;
    const t0 = ctx.currentTime + 0.02;
    const run: [number, number][] = [
      [N.C5, 0.0],
      [N.E5, 0.14],
      [N.G5, 0.28],
      [N.C6, 0.42],
    ];
    for (const [freq, at] of run) {
      this.scheduleVoice('square', freq, t0 + at, 0.16, 0.16, this.sfxGain!);
      this.scheduleVoice('triangle', freq / 2, t0 + at, 0.16, 0.12, this.sfxGain!);
    }
    // Final held chord + sparkle
    for (const freq of [N.C6, N.E6, N.G6]) {
      this.scheduleVoice('square', freq, t0 + 0.6, 0.7, 0.07, this.sfxGain!);
    }
    this.scheduleVoice('triangle', N.C4, t0 + 0.6, 0.7, 0.14, this.sfxGain!);
    this.scheduleVoice('sine', N.C6, t0 + 0.72, 0.5, 0.08, this.sfxGain!, N.G6);
  }

  /** Short arcade failure sting (one-shot). */
  playGameOver(): void {
    const ctx = this.ensureContext();
    if (!this.running) return;
    const t0 = ctx.currentTime + 0.02;
    const run: [number, number, number][] = [
      [N.E4, 0.0, 0.22],
      [N.C4, 0.22, 0.22],
      [N.A3, 0.44, 0.22],
      [N.F3, 0.66, 0.55],
    ];
    for (const [freq, at, dur] of run) {
      this.scheduleVoice('sawtooth', freq, t0 + at, dur, 0.14, this.sfxGain!);
      this.scheduleVoice('square', freq / 2, t0 + at, dur, 0.08, this.sfxGain!);
    }
    // Low thud
    this.scheduleVoice('sine', 70, t0 + 0.9, 0.5, 0.22, this.sfxGain!, 40);
    this.playNoise(0.2, 0.06, 0.9);
  }

  destroy(): void {
    this.stopMusic();
    window.removeEventListener('pointerdown', this.unlock, true);
    window.removeEventListener('keydown', this.unlock, true);
    void this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
  }
}
