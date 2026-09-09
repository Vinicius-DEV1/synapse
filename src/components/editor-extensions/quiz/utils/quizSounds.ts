interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const SOUND_STORAGE_KEY = 'caderno_quiz_sound_enabled';

/**
 * Persistent AudioContext singleton.
 * Keeping a single shared AudioContext open avoids hardware driver renegotiation
 * on Linux (PipeWire/PulseAudio) and maintains 0ms latency with 0% idle CPU usage.
 */
let sharedAudioContext: AudioContext | null = null;

// Multi-gesture user audio unlocker for WebKitGTK, Chromium and Safari
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext(false);
      if (ctx && ctx.state !== 'running') {
        ctx
          .resume()
          .then(() => {
            if (ctx.state === 'running') {
              window.removeEventListener('click', unlockAudio);
              window.removeEventListener('mouseup', unlockAudio);
              window.removeEventListener('keydown', unlockAudio);
              window.removeEventListener('touchend', unlockAudio);
              window.removeEventListener('pointerdown', unlockAudio);
            }
          })
          .catch(() => {});
      }
    } catch {
      // safe
    }
  };

  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('mouseup', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchend', unlockAudio, { passive: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
}

function getAudioContext(onlyIfRunning?: boolean): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextClass) return null;

    // If the context was closed (terminal state), recreate
    if (sharedAudioContext && (sharedAudioContext.state as string) === 'closed') {
      sharedAudioContext = null;
    }

    if (!sharedAudioContext) {
      // Prevent creating AudioContext during non-gesture events like hover
      if (onlyIfRunning) {
        return null;
      }
      sharedAudioContext = new AudioContextClass();
    }

    // Always attempt resume if not running and not in onlyIfRunning mode
    if (!onlyIfRunning && sharedAudioContext.state !== 'running') {
      sharedAudioContext.resume().catch(() => {});
    }

    return sharedAudioContext;
  } catch (err) {
    console.debug('[QuizSounds] Failed to get AudioContext:', err);
    return null;
  }
}

/**
 * Executes an audio synthesis callback against an active, running AudioContext.
 * 
 * On Linux (WebKitGTK / PipeWire / PulseAudio), AudioContext can be suspended on
 * initial load or after idle timeout (PipeWire module-suspend-on-idle).
 * 
 * If the context is currently 'running', callback(ctx) executes immediately (0ms latency).
 * If the context is 'suspended' or 'interrupted', ctx.resume() is awaited first, and then
 * callback(ctx) reads the fresh hardware ctx.currentTime to prevent scheduling in the past.
 * If onlyIfRunning is true (e.g. for mouse hover ticks), it skips execution if the context
 * has not yet been unlocked by a legitimate user gesture, preventing autoplay policy blocks.
 */
function withAudioContext(
  callback: (ctx: AudioContext) => void,
  options?: { onlyIfRunning?: boolean }
): void {
  if (!isQuizSoundEnabled() || typeof window === 'undefined') return;

  const ctx = getAudioContext(options?.onlyIfRunning);
  if (!ctx) return;

  if (ctx.state === 'running') {
    try {
      callback(ctx);
    } catch (err) {
      console.debug('[QuizSounds] Callback execution error on running context:', err);
    }
    return;
  }

  // If onlyIfRunning requested, do not force-resume on non-gesture events (e.g. pointerenter)
  if (options?.onlyIfRunning) {
    return;
  }

  // Context is suspended or interrupted: wake up before scheduling
  ctx
    .resume()
    .then(() => {
      if (ctx.state === 'running') {
        callback(ctx);
      } else {
        recoverAndPlay(callback);
      }
    })
    .catch((err) => {
      console.debug('[QuizSounds] AudioContext resume failed, attempting recovery:', err);
      recoverAndPlay(callback);
    });
}

function recoverAndPlay(callback: (ctx: AudioContext) => void): void {
  try {
    if (sharedAudioContext) {
      try {
        sharedAudioContext.close().catch(() => {});
      } catch {
        // safe
      }
      sharedAudioContext = null;
    }
    const freshCtx = getAudioContext(false);
    if (!freshCtx) return;
    freshCtx
      .resume()
      .then(() => {
        if (freshCtx.state === 'running') {
          callback(freshCtx);
        }
      })
      .catch(() => {});
  } catch (err) {
    console.debug('[QuizSounds] Recovery failed:', err);
  }
}

export function isQuizSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    if (saved !== null) {
      return saved !== 'false';
    }
    // Fallback to global sound preference if specific quiz sound key is unset
    const globalSound = localStorage.getItem('soundEnabled');
    return globalSound !== 'false';
  } catch {
    return true;
  }
}

export function setQuizSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore localStorage access restrictions
  }
}

/**
 * Plays a warm, bright harmonic chime for a correct answer.
 * Uses inline ctx.currentTime after hardware confirmation to ensure 100% audibility.
 */
export function playQuizSuccessSound(): void {
  withAudioContext((ctx) => {
    const baseTime = ctx.currentTime;

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch {
          // safe
        }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(523.25, 0, 0.35);    // C5
    playNote(659.25, 0.08, 0.35); // E5
    playNote(783.99, 0.15, 0.40); // G5
  });
}

/**
 * Plays a soft, gentle descending tone for an incorrect answer.
 */
export function playQuizFailureSound(): void {
  withAudioContext((ctx) => {
    const baseTime = ctx.currentTime;

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.30, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch {
          // safe
        }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(261.63, 0, 0.22);   // C4
    playNote(220.0, 0.09, 0.26); // A3
  });
}

/**
 * Plays a subtle "tick" sound for UI interactions.
 * If onlyIfRunning is true, skips when AudioContext is suspended to avoid autoplay blocks.
 */
export function playQuizTickSound(onlyIfRunning: boolean = false): void {
  withAudioContext(
    (ctx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = ctx.currentTime;

      osc.type = 'sine';
      // Fast transient simulating a tactile click
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.03);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.18, t + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch {
          // safe
        }
      };

      osc.start(t);
      osc.stop(t + 0.06);
    },
    { onlyIfRunning }
  );
}

/**
 * Plays a delicate, affirmative chime when submitting an open answer for AI evaluation.
 */
export function playQuizSubmitSound(): void {
  withAudioContext((ctx) => {
    const baseTime = ctx.currentTime;

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch {
          // safe
        }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(440.0, 0, 0.22);     // A4
    playNote(659.25, 0.08, 0.26); // E5
  });
}

/**
 * Plays a soft, velvet-like slide click when navigating between questions
 * (<, >, arrow keys, or number stepper pills). Perfectly audible yet subtle.
 */
export function playQuizSlideSound(): void {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = ctx.currentTime;

    osc.type = 'sine';
    // Gentle downward pitch sweep (480Hz -> 280Hz) simulating a smooth page transition
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.05);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.20, t + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch {
        // safe
      }
    };

    osc.start(t);
    osc.stop(t + 0.085);
  });
}

/**
 * Plays a warm, subtle two-tone unfold chime when toggling the gabarito/explanation.
 */
export function playQuizGabaritoSound(): void {
  withAudioContext((ctx) => {
    const baseTime = ctx.currentTime;

    const playNote = (freq: number, delay: number, dur: number, gainLevel: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(gainLevel, t + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch {
          // safe
        }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(392.0, 0, 0.12, 0.22);    // G4
    playNote(523.25, 0.05, 0.16, 0.26); // C5
  });
}

/**
 * Plays a calm harmonic presence tone (432Hz) when opening the AI assistant discussion.
 */
export function playQuizAiOpenSound(): void {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, t);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.24, t + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch {
        // safe
      }
    };

    osc.start(t);
    osc.stop(t + 0.15);
  });
}

/**
 * Plays a tranquil ascending pentatonic chime when completing the quiz session or viewing summary.
 */
export function playQuizCompletionSound(): void {
  withAudioContext((ctx) => {
    const baseTime = ctx.currentTime;

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch {
          // safe
        }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(523.25, 0, 0.28);    // C5
    playNote(659.25, 0.07, 0.32); // E5
    playNote(880.0, 0.14, 0.38);  // A5
  });
}
