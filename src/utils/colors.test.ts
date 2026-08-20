import { describe, it, expect } from 'vitest';
import { TEXT_COLORS, BG_COLORS } from './colors';

describe('colors constants', () => {
  it('defines valid text colors palette with names and hex codes', () => {
    expect(TEXT_COLORS.length).toBeGreaterThan(0);
    TEXT_COLORS.forEach(color => {
      expect(color).toHaveProperty('name');
      expect(color).toHaveProperty('value');
      expect(color).toHaveProperty('hex');
    });
  });

  it('defines valid background colors palette with names and hex codes', () => {
    expect(BG_COLORS.length).toBeGreaterThan(0);
    BG_COLORS.forEach(color => {
      expect(color).toHaveProperty('name');
      expect(color).toHaveProperty('value');
      expect(color).toHaveProperty('hex');
    });
  });
});
