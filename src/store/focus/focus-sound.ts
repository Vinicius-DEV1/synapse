export function playAlarmSound() {
  const isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!isSoundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
