/**
 * Motor de sonido sintetizado (WebAudio, cero assets externos).
 * Sonidos cortos y suaves: feedback inmediato sin ensuciar el aula.
 * Mute persistente por dispositivo.
 */

const MUTE_KEY = "ml_muted";

class SfxEngine {
  private ctx: AudioContext | null = null;

  get muted(): boolean {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  }

  toggleMuted(): boolean {
    const next = !this.muted;
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* modo privado */
    }
    return next;
  }

  /** El AudioContext se crea recién en el primer gesto del usuario. */
  private ensure(): AudioContext | null {
    if (typeof window === "undefined" || this.muted) return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(
    freq: number,
    opts: { dur?: number; type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {},
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const { dur = 0.14, type = "triangle", gain = 0.1, delay = 0, slideTo } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Toque genérico de UI. */
  tap() {
    this.tone(520, { dur: 0.06, gain: 0.07 });
  }
  /** Nota pentatónica por índice (Simon: cada celda tiene su voz). */
  note(i: number) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    this.tone(scale[((i % scale.length) + scale.length) % scale.length]!, { dur: 0.18, gain: 0.09 });
  }
  /** Acierto: tercera ascendente, alegre y breve. */
  success() {
    this.tone(659.25, { dur: 0.1, gain: 0.09 });
    this.tone(987.77, { dur: 0.16, gain: 0.09, delay: 0.09 });
  }
  /** Error: zumbido grave corto — claro pero nunca estridente. */
  error() {
    this.tone(180, { dur: 0.22, type: "sawtooth", gain: 0.08, slideTo: 120 });
  }
  /** Estímulo "¡ahora!" del reaction time. */
  go() {
    this.tone(880, { dur: 0.09, type: "sine", gain: 0.12 });
  }
  /** Récord personal: arpegio triunfal. */
  record() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, { dur: 0.16, gain: 0.1, delay: i * 0.09 }),
    );
  }
  /** Carta que se da vuelta / transición corta. */
  flip() {
    this.tone(330, { dur: 0.08, gain: 0.07, slideTo: 520 });
  }
  /** Tic del countdown. */
  tick() {
    this.tone(990, { dur: 0.04, type: "square", gain: 0.05 });
  }
}

export const sfx = new SfxEngine();
