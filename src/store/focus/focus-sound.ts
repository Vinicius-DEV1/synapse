/**
 * Web Audio procedural synthesis for Focus timers and alarms.
 */

export function playAlarmSound(): void {
  const isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!isSoundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.30);

    gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('Failed to play alarm sound', e);
  }
}

/**
 * Starts continuous repeating procedural alarm sounds (beep, retro, bell).
 * Returns a cleanup/stop function.
 */
export function startProceduralAlarm(ctx: AudioContext, type: string = 'beep'): () => void {
  if (localStorage.getItem('soundEnabled') === 'false') {
    return () => {};
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 30);
  masterGain.connect(ctx.destination);

  let intervalId: number | null = null;

  if (type === 'beep') {
    intervalId = window.setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }, 500);
  } else if (type === 'retro') {
    intervalId = window.setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }, 250);
  } else if (type === 'bell') {
    intervalId = window.setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 3);
    }, 4000);
  }

  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };
}
