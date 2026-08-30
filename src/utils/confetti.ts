import confetti from 'canvas-confetti';

/**
 * Returns a random floating-point number between min and max.
 */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Safely invokes canvas-confetti handling CJS/ESM interop.
 */
export function safeConfetti(options: confetti.Options): void {
  try {
    const confettiFunc = typeof confetti === 'function' ? confetti : (confetti as { default?: typeof confetti })?.default;
    if (typeof confettiFunc === 'function') {
      confettiFunc(options);
    }
  } catch (err) {
    console.warn('[Confetti] Failed to trigger confetti effect:', err);
  }
}

/**
 * Triggers a side-burst celebration animation with confetti.
 * Returns a cleanup function that cancels the active interval.
 */
export function triggerCelebrationConfetti(options?: { durationMs?: number; zIndex?: number }): () => void {
  try {
    const duration = options?.durationMs ?? 2500;
    const zIndex = options?.zIndex ?? 9999;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex };

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      const particleCount = 50 * (timeLeft / duration);
      safeConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 },
      });
      safeConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  } catch (err) {
    console.warn('[Confetti] Failed to start celebration animation:', err);
    return () => {};
  }
}
