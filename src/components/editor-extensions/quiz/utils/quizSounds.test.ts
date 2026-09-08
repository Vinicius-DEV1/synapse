import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  playQuizSuccessSound,
  playQuizFailureSound,
  playQuizSubmitSound,
  playQuizTickSound,
  playQuizSlideSound,
  playQuizGabaritoSound,
  playQuizAiOpenSound,
  playQuizCompletionSound,
  isQuizSoundEnabled,
  setQuizSoundEnabled,
} from './quizSounds';

describe('quizSounds utility', () => {
  beforeEach(() => {
    localStorage.clear();
    setQuizSoundEnabled(true);
  });

  it('manages sound enabled state via localStorage', () => {
    expect(isQuizSoundEnabled()).toBe(true);
    setQuizSoundEnabled(false);
    expect(isQuizSoundEnabled()).toBe(false);
    setQuizSoundEnabled(true);
    expect(isQuizSoundEnabled()).toBe(true);
  });

  it('plays success sound without throwing', () => {
    expect(() => playQuizSuccessSound()).not.toThrow();
  });

  it('plays failure sound without throwing', () => {
    expect(() => playQuizFailureSound()).not.toThrow();
  });

  it('plays submit sound without throwing', () => {
    expect(() => playQuizSubmitSound()).not.toThrow();
  });

  it('plays tick, slide, gabarito, ai open, and completion sounds without throwing', () => {
    expect(() => playQuizTickSound()).not.toThrow();
    expect(() => playQuizSlideSound()).not.toThrow();
    expect(() => playQuizGabaritoSound()).not.toThrow();
    expect(() => playQuizAiOpenSound()).not.toThrow();
    expect(() => playQuizCompletionSound()).not.toThrow();
  });

  it('suppresses sounds when sound is disabled', () => {
    setQuizSoundEnabled(false);
    expect(() => {
      playQuizSuccessSound();
      playQuizFailureSound();
      playQuizSubmitSound();
      playQuizTickSound();
      playQuizSlideSound();
      playQuizGabaritoSound();
      playQuizAiOpenSound();
      playQuizCompletionSound();
    }).not.toThrow();
  });
});
