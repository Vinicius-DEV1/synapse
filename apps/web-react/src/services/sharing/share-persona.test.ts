import { describe, it, expect, beforeEach } from 'vitest';
import { getOrGeneratePersona } from './share-persona';

describe('share-persona generator', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('generates a clever English animal pun persona with harmonic color', () => {
    const persona = getOrGeneratePersona('fingerprint-abc-123', 'token-xyz-456');

    expect(persona).toBeDefined();
    expect(typeof persona.name).toBe('string');
    expect(persona.name.length).toBeGreaterThan(3);
    expect(typeof persona.animal).toBe('string');
    expect(persona.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof persona.tagline).toBe('string');
  });

  it('produces identical persona deterministically for the same device identity', () => {
    const p1 = getOrGeneratePersona('device-hash-1', 'token-1');
    const p2 = getOrGeneratePersona('device-hash-1', 'token-1');

    expect(p1.name).toEqual(p2.name);
    expect(p1.animal).toEqual(p2.animal);
    expect(p1.color).toEqual(p2.color);
  });

  it('distributes varied personas across distinct device identities', () => {
    // Clear localStorage to force re-derivation
    window.localStorage.clear();
    const p1 = getOrGeneratePersona('device-alpha', 'token-alpha');

    window.localStorage.clear();
    const p2 = getOrGeneratePersona('device-beta', 'token-beta');

    window.localStorage.clear();
    const p3 = getOrGeneratePersona('device-gamma', 'token-gamma');

    const names = new Set([p1.name, p2.name, p3.name]);
    expect(names.size).toBeGreaterThan(1);
  });
});
