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

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextClass) return null;

    // If the context was closed (terminal state), discard it and create a fresh one
    if (sharedAudioContext && sharedAudioContext.state === 'closed') {
      console.debug('[QuizSounds] AudioContext was closed, recreating');
      sharedAudioContext = null;
    }

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
      console.debug('[QuizSounds] Created new AudioContext, state:', sharedAudioContext.state);
    }

    // Always attempt resume — covers 'suspended', 'interrupted', and
    // any non-standard states from WebKitGTK / Tauri WebView on Linux
    if (sharedAudioContext.state !== 'running') {
      console.debug('[QuizSounds] Resuming context from state:', sharedAudioContext.state);
      sharedAudioContext.resume();
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
    return saved === null ? true : saved === 'true';
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

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = ctx.currentTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + dur);

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
    playNote(783.99, 0.15, 0.4);  // G5
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

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = ctx.currentTime + delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + dur);

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
 * Plays a subtle, ultra-short "tick" sound for UI interactions (e.g. option clicks or hover).
 */
export function playQuizTickSound(): void {
  if (!isQuizSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = ctx.currentTime;

    osc.type = 'sine';
    // Start high, drop fast to simulate a "click" transient
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.02);

    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.05, t + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
    };

    osc.start(t);
    osc.stop(t + 0.04);
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

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = ctx.currentTime + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try { osc.disconnect(); gainNode.disconnect(); } catch { /* safe */ }
      };

      osc.start(t);
      osc.stop(t + dur);
    };

    playNote(440.0, 0, 0.2);     // A4
    playNote(659.25, 0.08, 0.24); // E5
  } catch (err) {
    console.debug('[QuizSounds] Submit sound error:', err);
  }
}
