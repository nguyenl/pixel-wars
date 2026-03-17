/**
 * src/audio/sound.ts
 *
 * Synthesized audio feedback using the Web Audio API.
 * All public methods silently catch and discard errors — sound failures must not break gameplay.
 * AudioContext is created lazily on first play call (browser autoplay policy).
 */

export class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      return this.ctx;
    } catch {
      return null;
    }
  }

  playSelect(): void {
    try {
      const ctx = this.getCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // silently discard
    }
  }

  playMove(): void {
    try {
      const ctx = this.getCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.value = 0.12;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // silently discard
    }
  }

  playAttack(): void {
    try {
      const ctx = this.getCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 220;
      gain.gain.value = 0.18;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // silently discard
    }
  }
}
