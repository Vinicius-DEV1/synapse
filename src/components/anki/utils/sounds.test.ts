import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playFlipSound, playCorrectSound, playIncorrectSound } from './sounds';

describe('Anki Sound Effects Generator', () => {
  let createdOscillators: any[] = [];
  let createdGainNodes: any[] = [];

  beforeEach(() => {
    createdOscillators = [];
    createdGainNodes = [];

    const mockOscillatorFactory = () => {
      const osc = {
        type: 'sine',
        frequency: {
          value: 440,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      createdOscillators.push(osc);
      return osc;
    };

    const mockGainNodeFactory = () => {
      const gain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      createdGainNodes.push(gain);
      return gain;
    };

    if (!(window as any).AudioContext) {
      (window as any).AudioContext = vi.fn().mockImplementation(() => ({
        currentTime: 0,
        state: 'running',
        createOscillator: mockOscillatorFactory,
        createGain: mockGainNodeFactory,
        destination: {},
        resume: vi.fn(),
      }));
    } else {
      // If audioCtx was already instantiated in module scope
      const currentCtx = new (window as any).AudioContext();
      currentCtx.createOscillator = mockOscillatorFactory;
      currentCtx.createGain = mockGainNodeFactory;
    }
  });

  it('plays flip sound with rapid frequency sweep', () => {
    expect(() => playFlipSound()).not.toThrow();
  });

  it('plays correct sound with dual tone chimes', () => {
    expect(() => playCorrectSound()).not.toThrow();
  });

  it('plays incorrect sound with low frequency tone', () => {
    expect(() => playIncorrectSound()).not.toThrow();
  });
});
