export const UI_SOUND_STORAGE_KEY = 'caderno_ui_sound_enabled';

export function isUiSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(UI_SOUND_STORAGE_KEY);
    if (saved !== null) {
      return saved !== 'false';
    }
    localStorage.setItem(UI_SOUND_STORAGE_KEY, 'true');
    return true;
  } catch {
    return true;
  }
}

export function setUiSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UI_SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore localStorage access restrictions
  }
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function withAudioContext(callback: (ctx: AudioContext) => void): void {
  if (!isUiSoundEnabled() || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    callback(ctx);

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
    console.debug('[UiSounds] Execution error:', err);
  }
}

function getSafeBaseTime(ctx: AudioContext): number {
  return ctx.currentTime + 0.015;
}

/**
 * A dry, light tactile click for secondary buttons, menus, and simple interactions.
 */
export function playUiClickSound(): void {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = getSafeBaseTime(ctx);

    osc.type = 'sine';
    // Very fast transient imitating a physical switch click
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.02);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.05, t + 0.005);
    gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.04);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (err: unknown) {
        console.debug('[uiSounds] Disconnect cleanup ignored:', err);
      }
    };

    osc.start(t);
    osc.stop(t + 0.09); // Pad stop by 50ms
  });
}

/**
 * A dual-tone sound for switches and checkboxes.
 * Ascends when turned on, descends when turned off.
 */
export function playUiToggleSound(isOn: boolean): void {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = getSafeBaseTime(ctx);

    osc.type = 'triangle';
    
    if (isOn) {
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.05);
    } else {
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.05);
    }

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.06, t + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (err: unknown) {
        console.debug('[uiSounds] Disconnect cleanup ignored:', err);
      }
    };

    osc.start(t);
    osc.stop(t + 0.13); // Pad stop by 50ms
  });
}

/**
 * A bright, short chime for positive or creation actions (e.g., creating a file/folder).
 */
export function playUiActionSound(): void {
  withAudioContext((ctx) => {
    const t = getSafeBaseTime(ctx);

    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const startTime = t + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch (err: unknown) {
          console.debug('[uiSounds] Disconnect cleanup ignored:', err);
        }
      };

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    };

    playNote(659.25, 0, 0.15);    // E5
    playNote(880.00, 0.05, 0.25); // A5
  });
}

/**
 * A low, damped thud for deletions or closing critical panels.
 */
export function playUiDeleteSound(): void {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const t = getSafeBaseTime(ctx);

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.08);

    // Use a lowpass filter to make it sound muffled ("thud" instead of "beep")
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.08);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.08, t + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (err: unknown) {
        console.debug('[uiSounds] Disconnect cleanup ignored:', err);
      }
    };

    osc.start(t);
    osc.stop(t + 0.17); // Pad stop by 50ms
  });
}
