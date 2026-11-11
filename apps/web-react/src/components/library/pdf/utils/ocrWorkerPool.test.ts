import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Tesseract from 'tesseract.js';
import { ocrWorkerPool } from './ocrWorkerPool';

vi.mock('tesseract.js', () => {
  return {
    default: {
      createWorker: vi.fn(),
    },
  };
});

describe('ocrWorkerPool Utility', () => {
  const mockRecognize = vi.fn();
  const mockTerminate = vi.fn();

  beforeEach(() => {
    mockRecognize.mockReset();
    mockTerminate.mockReset();

    mockRecognize.mockResolvedValue({
      data: {
        text: 'Texto reconhecido via OCR',
        words: [{ text: 'Texto', bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } }],
      },
    });
    mockTerminate.mockResolvedValue(undefined);

    (Tesseract.createWorker as any).mockResolvedValue({
      recognize: mockRecognize,
      terminate: mockTerminate,
    });
  });

  afterEach(async () => {
    await ocrWorkerPool.terminate();
    vi.clearAllMocks();
  });

  it('lazily initializes a single worker and reuses it for subsequent recognition requests', async () => {
    const result1 = await ocrWorkerPool.recognize('data:image/png;base64,page1');
    const result2 = await ocrWorkerPool.recognize('data:image/png;base64,page2');

    expect(Tesseract.createWorker).toHaveBeenCalledTimes(1);
    expect(Tesseract.createWorker).toHaveBeenCalledWith('por');
    expect(mockRecognize).toHaveBeenCalledTimes(2);
    expect(result1.data.text).toBe('Texto reconhecido via OCR');
    expect(result2.data.text).toBe('Texto reconhecido via OCR');
  });

  it('terminates worker cleanly and allows re-creation on future calls', async () => {
    await ocrWorkerPool.recognize('data:image/png;base64,page1');
    expect(Tesseract.createWorker).toHaveBeenCalledTimes(1);

    await ocrWorkerPool.terminate();
    expect(mockTerminate).toHaveBeenCalledTimes(1);

    await ocrWorkerPool.recognize('data:image/png;base64,page2');
    expect(Tesseract.createWorker).toHaveBeenCalledTimes(2);
  });
});
