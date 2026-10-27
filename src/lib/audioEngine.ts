import { SoundAsset } from '@/types/platformer';

/**
 * Web Audio API & Media Engine for Platformer
 * Supports both procedural synthesized sound effects / BGM presets
 * and custom uploaded / URL audio files (MP3, WAV, OGG, etc.).
 */
class PlatformerAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;

  // BGM states
  private isBgmActive: boolean = false;
  private bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  private bgmStep: number = 0;
  private customBgmAudio: HTMLAudioElement | null = null;

  // Rate-limiting for footsteps and idle
  private lastFootstepTime: number = 0;
  private lastIdleTime: number = 0;

  // Preview state
  private previewAudio: HTMLAudioElement | null = null;
  private previewIntervalId: ReturnType<typeof setInterval> | null = null;

  // Initialize Audio Context on user gesture
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // BGM Gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  // Set Mute state
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.6, this.ctx.currentTime);
    }
    if (this.customBgmAudio) {
      this.customBgmAudio.muted = muted;
    }
    if (this.previewAudio) {
      this.previewAudio.muted = muted;
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Play a simple synthesized note
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    dest: 'sfx' | 'bgm' = 'sfx',
    delay: number = 0,
    peakGain: number = 0.3
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    const targetGainNode = dest === 'bgm' ? this.bgmGain : this.sfxGain;
    osc.connect(gain);
    gain.connect(targetGainNode || ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // Helper to play a custom audio file (URL or Data URI)
  private playCustomAudio(url: string, volume: number = 1.0, loop: boolean = false): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume * (this.isMuted ? 0 : 0.7)));
      audio.muted = this.isMuted;
      audio.loop = loop;
      audio.play().catch(() => {
        // Silently catch autoplay restrictions
      });
      return audio;
    } catch {
      return null;
    }
  }

  // ==========================================
  // BACKGROUND MUSIC (BGM)
  // ==========================================
  public startBGM(bgmAsset?: SoundAsset) {
    this.stopBGM();
    this.ensureContext();
    this.isBgmActive = true;

    // Check if user specified a custom audio file URL or data URI
    if (bgmAsset?.url) {
      const vol = bgmAsset.volume ?? 0.8;
      this.customBgmAudio = this.playCustomAudio(bgmAsset.url, vol, bgmAsset.loop !== false);
      return;
    }

    const presetId = bgmAsset?.presetId || 'preset-bgm-wedding';
    this.bgmStep = 0;

    if (presetId === 'preset-bgm-celebration') {
      // Upbeat celebration progression
      const notes = [
        { bass: 146.83, lead: 587.33, arp: 880.00 }, // D
        { bass: 146.83, lead: 659.25, arp: 783.99 }, // E
        { bass: 164.81, lead: 739.99, arp: 880.00 }, // F#
        { bass: 196.00, lead: 880.00, arp: 987.77 }, // G
        { bass: 220.00, lead: 987.77, arp: 1174.66 }, // A
        { bass: 196.00, lead: 880.00, arp: 987.77 },
        { bass: 164.81, lead: 739.99, arp: 880.00 },
        { bass: 146.83, lead: 659.25, arp: 587.33 },
      ];
      this.bgmIntervalId = setInterval(() => {
        if (!this.isBgmActive) return;
        const step = notes[this.bgmStep % notes.length];
        this.bgmStep++;
        this.playTone(step.bass, 0.28, 'triangle', 'bgm', 0, 0.25);
        this.playTone(step.lead, 0.25, 'sine', 'bgm', 0.04, 0.22);
        this.playTone(step.arp, 0.18, 'triangle', 'bgm', 0.08, 0.18);
      }, 260);
      return;
    }

    if (presetId === 'preset-bgm-peaceful') {
      // Gentle harp lullaby
      const chords = [
        [261.63, 329.63, 392.00, 523.25], // C
        [220.00, 261.63, 329.63, 440.00], // Am
        [174.61, 220.00, 261.63, 349.23], // F
        [196.00, 246.94, 293.66, 392.00], // G
      ];
      this.bgmIntervalId = setInterval(() => {
        if (!this.isBgmActive) return;
        const chordIndex = Math.floor(this.bgmStep / 4) % chords.length;
        const noteIndex = this.bgmStep % 4;
        const freq = chords[chordIndex][noteIndex];
        this.bgmStep++;
        this.playTone(freq, 0.55, 'sine', 'bgm', 0, 0.22);
      }, 340);
      return;
    }

    if (presetId === 'preset-bgm-retro8bit') {
      // Fast classic 8-bit style arcade progression
      const notes = [
        261.63, 293.66, 329.63, 349.23, 392.00, 329.63, 392.00, 523.25,
        493.88, 392.00, 440.00, 349.23, 392.00, 329.63, 293.66, 261.63
      ];
      this.bgmIntervalId = setInterval(() => {
        if (!this.isBgmActive) return;
        const freq = notes[this.bgmStep % notes.length];
        this.bgmStep++;
        this.playTone(freq, 0.16, 'square', 'bgm', 0, 0.18);
      }, 190);
      return;
    }

    // Default Romantic Wedding sequence
    const notes: { bass: number; arp: number[]; lead: number }[] = [
      { bass: 130.81, arp: [261.63, 329.63, 392.00, 523.25], lead: 523.25 },
      { bass: 130.81, arp: [392.00, 329.63, 261.63, 392.00], lead: 587.33 },
      { bass: 130.81, arp: [329.63, 392.00, 523.25, 659.25], lead: 659.25 },
      { bass: 130.81, arp: [392.00, 523.25, 659.25, 783.99], lead: 783.99 },
      { bass: 98.00, arp: [196.00, 246.94, 293.66, 392.00], lead: 783.99 },
      { bass: 98.00, arp: [293.66, 246.94, 196.00, 293.66], lead: 659.25 },
      { bass: 98.00, arp: [246.94, 293.66, 392.00, 493.88], lead: 587.33 },
      { bass: 98.00, arp: [293.66, 392.00, 493.88, 587.33], lead: 493.88 },
      { bass: 110.00, arp: [220.00, 261.63, 329.63, 440.00], lead: 659.25 },
      { bass: 110.00, arp: [329.63, 261.63, 220.00, 329.63], lead: 523.25 },
      { bass: 110.00, arp: [261.63, 329.63, 440.00, 523.25], lead: 440.00 },
      { bass: 110.00, arp: [329.63, 440.00, 523.25, 659.25], lead: 523.25 },
      { bass: 87.31, arp: [174.61, 220.00, 261.63, 349.23], lead: 587.33 },
      { bass: 87.31, arp: [261.63, 220.00, 174.61, 261.63], lead: 523.25 },
      { bass: 87.31, arp: [220.00, 261.63, 349.23, 440.00], lead: 392.00 },
      { bass: 87.31, arp: [261.63, 349.23, 440.00, 523.25], lead: 493.88 },
    ];

    this.bgmIntervalId = setInterval(() => {
      if (!this.isBgmActive) return;
      const stepData = notes[this.bgmStep % notes.length];
      this.bgmStep++;

      this.playTone(stepData.bass, 0.45, 'triangle', 'bgm', 0);
      const arpNote = stepData.arp[this.bgmStep % stepData.arp.length];
      this.playTone(arpNote, 0.35, 'sine', 'bgm', 0.05);
      this.playTone(stepData.lead, 0.38, 'triangle', 'bgm', 0.1);
    }, 380);
  }

  public stopBGM() {
    this.isBgmActive = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    if (this.customBgmAudio) {
      try {
        this.customBgmAudio.pause();
        this.customBgmAudio.currentTime = 0;
      } catch {}
      this.customBgmAudio = null;
    }
  }

  // ==========================================
  // SOUND EFFECTS (SFX)
  // ==========================================

  // 1. JUMP
  public playJump(asset?: SoundAsset) {
    if (asset?.url) {
      this.playCustomAudio(asset.url, asset.volume ?? 0.85);
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;
    const presetId = asset?.presetId || 'preset-jump-classic';

    if (presetId === 'preset-jump-boing') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(540, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain || ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.23);
      return;
    }

    if (presetId === 'preset-jump-soft') {
      this.playTone(280, 0.14, 'sine', 'sfx', 0, 0.28);
      this.playTone(420, 0.15, 'sine', 'sfx', 0.04, 0.2);
      return;
    }

    // Default classic sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(460, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  // 2. FOOTSTEP
  public playFootstep(asset?: SoundAsset) {
    const now = Date.now();
    if (now - this.lastFootstepTime < 240) return;
    this.lastFootstepTime = now;

    if (asset?.url) {
      this.playCustomAudio(asset.url, asset.volume ?? 0.7);
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;
    const presetId = asset?.presetId || 'preset-footstep-soft';

    if (presetId === 'preset-footstep-click') {
      this.playTone(480, 0.04, 'triangle', 'sfx', 0, 0.18);
      return;
    }

    if (presetId === 'preset-footstep-grass') {
      this.playTone(180, 0.06, 'triangle', 'sfx', 0, 0.14);
      return;
    }

    // Default soft step
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const randomFreq = 90 + Math.random() * 25;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(randomFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  }

  // 3. IDLE
  public playIdle(asset?: SoundAsset) {
    const now = Date.now();
    if (now - this.lastIdleTime < 6000) return;
    this.lastIdleTime = now;

    if (asset?.url) {
      this.playCustomAudio(asset.url, asset.volume ?? 0.75);
      return;
    }

    const presetId = asset?.presetId || 'preset-idle-chime';

    if (presetId === 'preset-idle-magic') {
      this.playTone(659.25, 0.35, 'triangle', 'sfx', 0, 0.2); // E5
      this.playTone(830.61, 0.4, 'sine', 'sfx', 0.08, 0.22); // G#5
      this.playTone(987.77, 0.45, 'sine', 'sfx', 0.16, 0.25); // B5
      this.playTone(1318.51, 0.55, 'sine', 'sfx', 0.24, 0.2); // E6
      return;
    }

    if (presetId === 'preset-idle-birds') {
      this.playTone(1046.50, 0.15, 'sine', 'sfx', 0, 0.18);
      this.playTone(1318.51, 0.2, 'sine', 'sfx', 0.08, 0.2);
      this.playTone(1046.50, 0.15, 'sine', 'sfx', 0.18, 0.16);
      return;
    }

    // Default dual chime
    this.playTone(783.99, 0.4, 'sine', 'sfx', 0);
    this.playTone(1046.50, 0.5, 'sine', 'sfx', 0.12);
  }

  // 4. PROXIMITY
  public playProximityChime(asset?: SoundAsset) {
    if (asset?.url) {
      this.playCustomAudio(asset.url, asset.volume ?? 0.85);
      return;
    }

    const presetId = asset?.presetId || 'preset-prox-bell';

    if (presetId === 'preset-prox-ping') {
      this.playTone(1174.66, 0.4, 'triangle', 'sfx', 0, 0.25);
      return;
    }

    if (presetId === 'preset-prox-heart') {
      this.playTone(120, 0.12, 'sine', 'sfx', 0, 0.3);
      this.playTone(150, 0.14, 'sine', 'sfx', 0.12, 0.3);
      return;
    }

    // Default pleasant bell
    this.playTone(659.25, 0.25, 'triangle', 'sfx', 0);
    this.playTone(987.77, 0.35, 'sine', 'sfx', 0.08);
  }

  // 5. INTERACTION
  public playInteraction(asset?: SoundAsset) {
    if (asset?.url) {
      this.playCustomAudio(asset.url, asset.volume ?? 0.9);
      return;
    }

    const presetId = asset?.presetId || 'preset-interact-fanfare';

    if (presetId === 'preset-interact-magic') {
      this.playTone(523.25, 0.3, 'sine', 'sfx', 0, 0.2);
      this.playTone(659.25, 0.3, 'sine', 'sfx', 0.05, 0.2);
      this.playTone(783.99, 0.35, 'sine', 'sfx', 0.1, 0.22);
      this.playTone(1046.50, 0.4, 'sine', 'sfx', 0.15, 0.25);
      this.playTone(1318.51, 0.5, 'sine', 'sfx', 0.2, 0.25);
      return;
    }

    if (presetId === 'preset-interact-blip') {
      this.playTone(698.46, 0.12, 'triangle', 'sfx', 0, 0.28);
      this.playTone(880.00, 0.18, 'sine', 'sfx', 0.08, 0.28);
      return;
    }

    // Default fanfare
    this.playTone(523.25, 0.2, 'triangle', 'sfx', 0);
    this.playTone(659.25, 0.2, 'triangle', 'sfx', 0.06);
    this.playTone(783.99, 0.25, 'triangle', 'sfx', 0.12);
    this.playTone(1046.50, 0.45, 'sine', 'sfx', 0.18);
  }

  // ==========================================
  // PREVIEW / PLAYBACK FOR SOUND PICKER MODAL
  // ==========================================
  public previewSound(asset: SoundAsset, onEnd?: () => void) {
    this.stopPreview();
    this.ensureContext();

    if (asset.url) {
      const audio = new Audio(asset.url);
      audio.volume = Math.max(0, Math.min(1, (asset.volume ?? 0.85) * (this.isMuted ? 0 : 0.7)));
      audio.muted = this.isMuted;
      audio.onended = () => {
        if (this.previewAudio === audio) {
          this.previewAudio = null;
        }
        onEnd?.();
      };
      this.previewAudio = audio;
      audio.play().catch(() => {
        onEnd?.();
      });
      return;
    }

    // Preview procedural sound
    if (asset.category === 'bgm') {
      // Play a short 3-second sample of BGM preset
      let stepsPlayed = 0;
      this.previewIntervalId = setInterval(() => {
        stepsPlayed++;
        if (stepsPlayed >= 8) {
          this.stopPreview();
          onEnd?.();
          return;
        }
        this.playTone(261.63 + (stepsPlayed % 4) * 80, 0.35, 'triangle', 'sfx', 0, 0.25);
      }, 350);
      return;
    }

    switch (asset.category) {
      case 'jump':
        this.playJump(asset);
        break;
      case 'footstep':
        this.lastFootstepTime = 0;
        this.playFootstep(asset);
        break;
      case 'idle':
        this.lastIdleTime = 0;
        this.playIdle(asset);
        break;
      case 'proximity':
        this.playProximityChime(asset);
        break;
      case 'interact':
        this.playInteraction(asset);
        break;
    }

    // Auto clear preview after 1 second for one-shot SFX
    setTimeout(() => {
      onEnd?.();
    }, 700);
  }

  public stopPreview() {
    if (this.previewAudio) {
      try {
        this.previewAudio.pause();
        this.previewAudio.currentTime = 0;
      } catch {}
      this.previewAudio = null;
    }
    if (this.previewIntervalId) {
      clearInterval(this.previewIntervalId);
      this.previewIntervalId = null;
    }
  }
}

// Global Singleton Audio Engine Instance
export const audioEngine = new PlatformerAudioEngine();
