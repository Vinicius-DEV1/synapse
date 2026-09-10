interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const SOUND_STORAGE_KEY = 'caderno_quiz_sound_enabled';

function withAudioContext(
  callback: (ctx: AudioContext) => void,
  options?: { onlyIfRunning?: boolean }
): void {
  if (!isQuizSoundEnabled() || typeof window === 'undefined') return;

  // Drop hover ticks (onlyIfRunning) to guarantee AudioContext hardware stability
  // and prevent autoplay policy console spam outside of user gestures.
  if (options?.onlyIfRunning) return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextClass) return;

    // Create a fresh AudioContext every time (identical to focus-sound.ts)
    // This forces Linux PipeWire to wake up the sink, bypassing WebKitGTK's
    // bug where ctx.state says 'running' but the hardware sink is sleeping.
    const ctx = new AudioContextClass();
    
    callback(ctx);

    // Safely close the context after 2 seconds to prevent hitting the 
    // browser's maximum active AudioContexts limit (usually 6).
    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {
        // safe
      }
    }, 2000);
  } catch (err) {
    console.debug('[QuizSounds] Execution error:', err);
  }
}

/**
 * Get the current time slightly in the future to prevent dropped notes 
 * due to immediate/past scheduling in WebKit.
 */
function getSafeBaseTime(ctx: AudioContext): number {
  return ctx.currentTime + 0.015; // 15ms is optimal for eliminating pops without noticeable UI lag
}

export function isQuizSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    if (saved !== null) {
      return saved !== 'false';
    }
    // Bootstrap: default to true for the quiz explicitly, independent of global Focus settings
    localStorage.setItem(SOUND_STORAGE_KEY, 'true');
    return true;
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
    const baseTime = getSafeBaseTime(ctx);

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.001, t + dur);

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
    const baseTime = getSafeBaseTime(ctx);

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.30, t + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.0001, t + dur);

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
      osc.stop(t + dur + 0.05); // Pad stop by 50ms to let zero-gain stabilize without clipping
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
      const t = getSafeBaseTime(ctx);

      osc.type = 'sine';
      // Fast transient simulating a tactile click
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(140, t + 0.03);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.18, t + 0.008);
      gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.055);

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
      osc.stop(t + 0.1); // Pad stop by 50ms (0.055 + ~0.05)
    },
    { onlyIfRunning }
  );
}

/**
 * Plays a delicate, affirmative chime when submitting an open answer for AI evaluation.
 */
export function playQuizSubmitSound(): void {
  withAudioContext((ctx) => {
    const baseTime = getSafeBaseTime(ctx);

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.0001, t + dur);

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
      osc.stop(t + dur + 0.05); // Pad stop by 50ms to let zero-gain stabilize without clipping
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
    const t = getSafeBaseTime(ctx);

    osc.type = 'sine';
    // Gentle downward pitch sweep (480Hz -> 280Hz) simulating a smooth page transition
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.linearRampToValueAtTime(280, t + 0.05);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.20, t + 0.015);
    gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.08);

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
    osc.stop(t + 0.13); // Pad stop by 50ms
  });
}

/**
 * Plays a warm, subtle two-tone unfold chime when toggling the gabarito/explanation.
 */
export function playQuizGabaritoSound(): void {
  withAudioContext((ctx) => {
    const baseTime = getSafeBaseTime(ctx);

    const playNote = (freq: number, delay: number, dur: number, gainLevel: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(gainLevel, t + 0.015);
      gainNode.gain.linearRampToValueAtTime(0.0001, t + dur);

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
      osc.stop(t + dur + 0.05);
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
    const t = getSafeBaseTime(ctx);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, t);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.24, t + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.14);

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
    osc.stop(t + 0.2); // Pad stop by 50ms
  });
}

/**
 * Plays a tranquil ascending pentatonic chime when completing the quiz session or viewing summary.
 */
export function playQuizCompletionSound(): void {
  withAudioContext((ctx) => {
    const baseTime = getSafeBaseTime(ctx);

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.0001, t + dur);

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
      osc.stop(t + dur + 0.05); // Pad stop by 50ms to let zero-gain stabilize without clipping
    };

    playNote(523.25, 0, 0.28);    // C5
    playNote(659.25, 0.07, 0.32); // E5
    playNote(880.0, 0.14, 0.38);  // A5
  });
}
