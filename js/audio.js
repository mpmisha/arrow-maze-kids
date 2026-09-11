// Synthesized sound and haptics for Arrow Maze Kids.
// Uses Web Audio API — nothing is loaded from disk.

const CUES = {
  step: { notes: [[523.25, 0.05]], volume: 0.3 },
  backtrack: { notes: [[440.0, 0.05]], volume: 0.25 },
  invalid: { notes: [[220.0, 0.08]], volume: 0.25 },
  hint: { notes: [[659.25, 0.08], [880.0, 0.1]], volume: 0.35 },
  button: { notes: [[880.0, 0.05]], volume: 0.3 },
  levelUp: {
    notes: [[523.25, 0.08], [659.25, 0.08], [783.99, 0.08], [1046.5, 0.12], [1318.51, 0.22]],
    volume: 0.5,
  },
};

class SoundPlayer {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.primed = false;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (!this.primed) {
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        this.primed = true;
      } catch (e) { /* ignore */ }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name) {
    if (!this.settings.isSoundEnabled) return;
    this.unlock();
    if (!this.ctx) return;

    const cue = CUES[name];
    if (!cue) return;
    let when = this.ctx.currentTime;
    for (const [freq, duration] of cue.notes) {
      this.scheduleNote(freq, duration, when, cue.volume);
      when += duration;
    }
  }

  scheduleNote(freq, duration, startTime, volume) {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const attack = 0.006;
    const peak = volume * 0.85;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + Math.min(attack, duration));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const fundamental = ctx.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(freq, startTime);

    const octave = ctx.createOscillator();
    octave.type = 'sine';
    octave.frequency.setValueAtTime(freq * 2, startTime);
    const octaveGain = ctx.createGain();
    octaveGain.gain.setValueAtTime(0.25, startTime);
    fundamental.connect(gain);
    octave.connect(octaveGain).connect(gain);

    fundamental.start(startTime);
    octave.start(startTime);
    fundamental.stop(startTime + duration + 0.02);
    octave.stop(startTime + duration + 0.02);
  }
}

class Haptics {
  constructor(settings) {
    this.settings = settings;
  }
  vibrate(pattern) {
    if (!this.settings.areHapticsEnabled) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }
  step() { this.vibrate(8); }
  backtrack() { this.vibrate(6); }
  invalid() { this.vibrate([0, 20, 40, 20]); }
  levelUp() { this.vibrate([0, 30, 60, 30, 60, 40]); }
}

export { SoundPlayer, Haptics };
