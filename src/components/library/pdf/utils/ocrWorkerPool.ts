import Tesseract from 'tesseract.js';

class OcrWorkerPool {
  private workerPromise: Promise<Tesseract.Worker> | null = null;
  private queue: Promise<any> = Promise.resolve();

  private async getWorker(): Promise<Tesseract.Worker> {
    if (!this.workerPromise) {
      this.workerPromise = (async () => {
        try {
          const worker = await Tesseract.createWorker('por');
          return worker;
        } catch (err) {
          this.workerPromise = null;
          throw err;
        }
      })();
    }
    return this.workerPromise;
  }

  /**
   * Enfileira o reconhecimento de imagem de forma serializada no worker singleton,
   * evitando sobrecarga de threads WASM e alocação excessiva de memória RAM.
   */
  public async recognize(imageSource: string | HTMLCanvasElement): Promise<Tesseract.RecognizeResult> {
    return new Promise<Tesseract.RecognizeResult>((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          const worker = await this.getWorker();
          const result = await worker.recognize(imageSource);
          resolve(result);
        })
        .catch((err) => {
          // If worker fails, reinitialize singleton on subsequent request
          this.terminate();
          reject(err);
        });
    });
  }

  public async terminate(): Promise<void> {
    if (this.workerPromise) {
      try {
        const worker = await this.workerPromise;
        await worker.terminate();
      } catch (err) {
        console.error('[OCR Worker Pool] Erro ao encerrar worker:', err);
      } finally {
        this.workerPromise = null;
      }
    }
  }
}

export const ocrWorkerPool = new OcrWorkerPool();
