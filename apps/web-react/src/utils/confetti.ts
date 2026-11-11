import confetti from 'canvas-confetti';

/**
 * Returns a random floating-point number between min and max.
 */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Dedicated main-thread confetti instance with useWorker disabled to prevent
// fatal WebKitGTK OffscreenCanvas transferControlToOffscreen crashes in Linux/Tauri.
let confettiInstance: ReturnType<typeof confetti.create> | null = null;
let activeCelebrationCleanup: (() => void) | null = null;

function getConfettiInstance(): ReturnType<typeof confetti.create> | null {
  if (typeof window === 'undefined') return null;
  if (!confettiInstance) {
    try {
      const createFn =
        confetti?.create ||
        (confetti as unknown as { create?: typeof confetti.create })?.create ||
        (confetti as unknown as { default?: typeof confetti })?.default?.create;

      if (typeof createFn === 'function') {
        // Explicitly set useWorker: false so canvas rendering stays securely on the main thread
        // via requestAnimationFrame, completely preventing WebKitGTK WebProcess SIGSEGV crashes.
        confettiInstance = createFn(undefined, { useWorker: false, resize: true });
      }
    } catch (err) {
      console.warn('[Confetti] Failed to create dedicated confetti instance:', err);
    }
  }
  return confettiInstance;
}

/**
 * Safely invokes canvas-confetti handling CJS/ESM interop, ensuring main-thread rendering
 * and catching unhandled promise rejections.
 */
export function safeConfetti(options: confetti.Options): void {
  try {
    const instance = getConfettiInstance();
    if (instance) {
      const result = instance(options);
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((err) => {
          console.warn('[Confetti] Asynchronous confetti execution failed:', err);
        });
      }
      return;
    }

    const confettiFunc =
      typeof confetti === 'function'
        ? confetti
        : (confetti as unknown as { default?: typeof confetti })?.default;

    if (typeof confettiFunc === 'function') {
      const result = confettiFunc(options);
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((err) => {
          console.warn('[Confetti] Asynchronous fallback confetti failed:', err);
        });
      }
    }
  } catch (err) {
    console.warn('[Confetti] Failed to trigger confetti effect:', err);
  }
}

/**
 * Stops any ongoing celebration confetti animation immediately and resets the canvas.
 */
export function stopCelebrationConfetti(): void {
  if (activeCelebrationCleanup) {
    const cleanup = activeCelebrationCleanup;
    activeCelebrationCleanup = null;
    try {
      cleanup();
    } catch (err) {
      console.warn('[Confetti] Error while cleaning up active celebration interval:', err);
    }
  }

  try {
    if (confettiInstance && typeof confettiInstance.reset === 'function') {
      confettiInstance.reset();
    } else if (typeof (confetti as unknown as { reset?: () => void })?.reset === 'function') {
      (confetti as unknown as { reset: () => void }).reset();
    }
  } catch {
    // Ignore reset errors on teardown
  }
}

/**
 * Triggers a side-burst celebration animation with confetti.
 * Returns a cleanup function that cancels the active interval.
 * Automatically stops any previously running celebration to prevent concurrent interval stacking.
 */
export function triggerCelebrationConfetti(options?: { durationMs?: number; zIndex?: number }): () => void {
  try {
    // Stop any existing active celebration to prevent concurrent interval stacking and GPU overload
    stopCelebrationConfetti();

    // Respect reduced motion preferences
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return () => {};
    }

    const duration = options?.durationMs ?? 2500;
    const zIndex = options?.zIndex ?? 9999;
    const animationEnd = Date.now() + duration;
    const defaults: confetti.Options = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex,
      disableForReducedMotion: true,
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (activeCelebrationCleanup === cleanup) {
        activeCelebrationCleanup = null;
      }
      try {
        if (confettiInstance && typeof confettiInstance.reset === 'function') {
          confettiInstance.reset();
        }
      } catch {
        // Ignore reset errors on teardown
      }
    };

    intervalId = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        cleanup();
        return;
      }
      const particleCount = Math.max(5, Math.floor(40 * (timeLeft / duration)));
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

    activeCelebrationCleanup = cleanup;
    return cleanup;
  } catch (err) {
    console.warn('[Confetti] Failed to start celebration animation:', err);
    return () => {};
  }
}

