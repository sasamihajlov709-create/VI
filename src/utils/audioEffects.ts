/**
 * Self-contained synthesized audio effects using Web Audio API.
 * Pure code-synthesized futuristic sounds for high-end UI responsiveness.
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const playTapSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    // Clean high freq tiny tap
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);

    gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Fail silently to avoid blocking user interaction if audio is blocked
  }
};

export const playUnlockSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, start: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.1, ctx.currentTime + start + duration);
      
      gainNode.gain.setValueAtTime(vol, ctx.currentTime + start);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Uplifting futuristic double chime
    playTone(523.25, 0, 0.15, 0.1);    // C5
    playTone(659.25, 0.08, 0.22, 0.1);  // E5
    playTone(783.99, 0.16, 0.3, 0.08);  // G5
  } catch (e) {}
};

export const playLockSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, start: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + start + duration);
      
      gainNode.gain.setValueAtTime(vol, ctx.currentTime + start);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Elegant locking slide chime
    playTone(659.25, 0, 0.15, 0.08);   // E5 -> downwards slide
    playTone(440.00, 0.08, 0.25, 0.08); // A4 -> downwards slide
  } catch (e) {}
};

export const playErrorSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Soft double warning buzz
    const playBuzz = (start: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime + start);
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime + start);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.12);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.13);
    };

    playBuzz(0);
    playBuzz(0.15);
  } catch (e) {}
};

export const playBubbleReactionSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    // Quick ascending bubble frequency sweep
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch (e) {}
};
