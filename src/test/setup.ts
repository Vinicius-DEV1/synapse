import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ScrollIntoView mock
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// WebCrypto SubtleCrypto Mock
if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle)) {
  const nodeCrypto = await import('crypto');
  Object.defineProperty(window, 'crypto', {
    value: nodeCrypto.webcrypto,
  });
}

// Window matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
  takeRecords = vi.fn().mockReturnValue([]);
} as any;

// HTMLMediaElement mock
window.HTMLMediaElement.prototype.load = vi.fn();
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();

// Web Audio API mock
class AudioContextMock {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createGain = vi.fn().mockReturnValue({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createOscillator = vi.fn().mockReturnValue({
    type: 'sine',
    frequency: {
      value: 440,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  createAnalyser = vi.fn().mockReturnValue({
    fftSize: 2048,
    frequencyBinCount: 1024,
    minDecibels: -100,
    maxDecibels: -30,
    smoothingTimeConstant: 0.8,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 10,
    length: 441000,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
  });
  close = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
}

(window as any).AudioContext = AudioContextMock;
(window as any).webkitAudioContext = AudioContextMock;

// HTMLCanvasElement 2D context mock
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}) as any;

// Clean storage between tests
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
