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

// Global user-gesture audio unlocker for WebKitGTK / Chromium
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state !== 'running') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // safe
    }
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

function getAudioContext(): AudioContext | null {
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
      sharedAudioContext = new AudioContextClass();
    }

    // Always attempt resume — covers 'suspended', 'interrupted' on Linux
    if (sharedAudioContext.state !== 'running') {
      sharedAudioContext.resume().catch(() => {});
    }

    return sharedAudioContext;
  } catch (err) {
    console.debug('[QuizSounds] Failed to get AudioContext:', err);
    return null;
  }
}

export function isQuizSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    // Explicit: only disabled if specifically 'false'
    return saved !== 'false';
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
 * Uses the same proven pattern as the Anki module: reads ctx.currentTime
 * inline at each scheduling call to stay in sync with the hardware clock.
 */
export function playQuizSuccessSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = Math.max(ctx.currentTime, 0.001);

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
        try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(523.25, 0, 0.35);    // C5
    playNote(659.25, 0.08, 0.35); // E5
    playNote(783.99, 0.15, 0.40); // G5
  } catch (err) {
    console.debug('[QuizSounds] Success sound error:', err);
  }
}

/**
 * Plays a soft, gentle descending tone for an incorrect answer.
 */
export function playQuizFailureSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = Math.max(ctx.currentTime, 0.001);

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(261.63, 0, 0.22);   // C4
    playNote(220.0, 0.09, 0.26); // A3
  } catch (err) {
    console.debug('[QuizSounds] Failure sound error:', err);
  }
}

/**
 * Plays a subtle, ultra-short "tick" sound for UI interactions.
 */
export function playQuizTickSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = Math.max(ctx.currentTime, 0.001);

    osc.type = 'sine';
    // Start high, drop fast to simulate a "click" transient
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.025);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.10, t + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
    };

    osc.start(t);
    osc.stop(t + 0.045);
  } catch (err) {
    console.debug('[QuizSounds] Failed to play tick sound:', err);
  }
}

/**
 * Plays a delicate, affirmative chime when submitting an open answer for AI evaluation.
 */
export function playQuizSubmitSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = Math.max(ctx.currentTime, 0.001);

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
        try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(440.0, 0, 0.22);     // A4
    playNote(659.25, 0.08, 0.26); // E5
  } catch (err) {
    console.debug('[QuizSounds] Submit sound error:', err);
  }
}

/**
 * Plays a soft, velvet-like slide click when navigating between questions
 * (<, >, arrow keys, or number stepper pills). Perfectly audible yet subtle.
 */
export function playQuizSlideSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = Math.max(ctx.currentTime, 0.001);

    osc.type = 'sine';
    // Gentle downward pitch sweep (480Hz -> 300Hz) simulating a smooth page turn
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.045);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.14, t + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
    };

    osc.start(t);
    osc.stop(t + 0.07);
  } catch (err) {
    console.debug('[QuizSounds] Slide sound error:', err);
  }
}

/**
 * Plays a warm, subtle two-tone unfold chime when toggling the gabarito/explanation.
 */
export function playQuizGabaritoSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = Math.max(ctx.currentTime, 0.001);

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
        try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(392.0, 0, 0.10, 0.16);    // G4
    playNote(523.25, 0.045, 0.14, 0.18); // C5
  } catch (err) {
    console.debug('[QuizSounds] Gabarito sound error:', err);
  }
}

/**
 * Plays a calm harmonic presence tone (432Hz) when opening the AI assistant discussion.
 */
export function playQuizAiOpenSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = Math.max(ctx.currentTime, 0.001);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, t);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.18, t + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
    };

    osc.start(t);
    osc.stop(t + 0.12);
  } catch (err) {
    console.debug('[QuizSounds] AI open sound error:', err);
  }
}

/**
 * Plays a tranquil ascending pentatonic chime when completing the quiz session or viewing summary.
 */
export function playQuizCompletionSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = Math.max(ctx.currentTime, 0.001);

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = baseTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(0.24, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(523.25, 0, 0.28);    // C5
    playNote(659.25, 0.07, 0.32); // E5
    playNote(880.0, 0.14, 0.38);  // A5
  } catch (err) {
    console.debug('[QuizSounds] Completion sound error:', err);
  }
}
