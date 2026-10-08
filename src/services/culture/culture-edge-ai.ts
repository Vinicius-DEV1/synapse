import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';

// Set up Edge AI environment:
// CRITICAL: allowLocalModels MUST be false in browser/Tauri.
// If true, Transformers.js tries to fetch `/models/...` from the SPA origin.
// In a SPA, the server returns `index.html` (200 OK), causing:
// SyntaxError: JSON Parse error: Unrecognized token '<'
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

// Single-threaded WASM execution to ensure compatibility without SharedArrayBuffer / COOP requirements
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

export type EdgeAIModelProgress = {
  status: string;
  progress?: number;
  file?: string;
  name?: string;
};

class CultureEdgeAIImpl {
  private extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
  private progressListeners = new Set<(progress: EdgeAIModelProgress) => void>();

  /**
   * Subscribes to model download/loading progress events.
   * Returns an unsubscribe cleanup function.
   */
  onProgress(listener: (progress: EdgeAIModelProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private notifyProgress(data: EdgeAIModelProgress): void {
    for (const listener of this.progressListeners) {
      try {
        listener(data);
      } catch (err) {
        console.warn('[CultureEdgeAI] Erro no listener de progresso:', err);
      }
    }
  }

  /**
   * Initializes and downloads the quantized text embedding model (all-MiniLM-L6-v2)
   * from Hugging Face Hub. Once downloaded, it is permanently cached in the browser's CacheStorage.
   */
  public async initModel(): Promise<FeatureExtractionPipeline> {
    if (!this.extractorPromise) {
      console.log('[CultureEdgeAI] Iniciando download e carregamento do modelo all-MiniLM-L6-v2...');
      this.extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true, // Crucial for Edge performance (~22MB model)
        progress_callback: (progress: EdgeAIModelProgress) => {
          if (progress.status === 'progress' && typeof progress.progress === 'number') {
            console.log(
              `[CultureEdgeAI] Download do Modelo: ${Math.round(progress.progress)}% (${progress.file ?? ''})`
            );
          }
          this.notifyProgress(progress);
        }
      }) as Promise<FeatureExtractionPipeline>;

      this.extractorPromise
        .then(() => {
          console.log('[CultureEdgeAI] Modelo carregado com sucesso na memória.');
          this.notifyProgress({ status: 'ready', progress: 100 });
        })
        .catch((err: unknown) => {
          console.error('[CultureEdgeAI] Falha ao baixar/carregar modelo transformer:', err);
          // Reset promise so subsequent user attempts can retry downloading rather than permanently hanging
          this.extractorPromise = null;
        });
    }
    return this.extractorPromise;
  }

  /**
   * Generates a deterministic-ish random binary vector as a fallback
   * when the embedding model is unavailable (CORS, offline, etc.).
   * Uses a simple string hash to produce semi-stable vectors per input.
   */
  private generateFallbackVector(seed: string, byteLength: number = 48): Uint8Array {
    const vector = new Uint8Array(byteLength);

    // Simple FNV-1a-inspired hash seeding for deterministic-ish output per text
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    for (let i = 0; i < byteLength; i++) {
      hash ^= (i * 31);
      hash = Math.imul(hash, 0x01000193);
      vector[i] = (hash >>> 0) & 0xFF;
    }

    return vector;
  }

  /**
   * Generates a semantic Float32 vector for a given text.
   * Falls back to a random vector if the model fails to load.
   */
  async generateEmbedding(text: string): Promise<Float32Array> {
    try {
      const extractor = await this.initModel();
      // Generate dense vector
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      // output.data is a Float32Array (384 dimensions for all-MiniLM-L6-v2)
      return output.data as Float32Array;
    } catch {
      // Fallback: generate a pseudo-random Float32 vector seeded from the text
      console.warn('[CultureEdgeAI] generateEmbedding fallback: using hash-based vector.');
      const fallback = new Float32Array(384);
      let hash = 0x811c9dc5;
      for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      for (let i = 0; i < 384; i++) {
        hash ^= (i * 17);
        hash = Math.imul(hash, 0x01000193);
        // Normalize to [-1, 1] range
        fallback[i] = ((hash >>> 0) / 0xFFFFFFFF) * 2 - 1;
      }
      return fallback;
    }
  }

  /**
   * Translates a Float32 vector into a 1-bit quantized Uint8Array (Binary Embedding).
   * This compresses a 384-dimensional vector (1536 bytes) into 48 bytes!
   */
  quantizeToBinary(floatVector: Float32Array): Uint8Array {
    const numDimensions = floatVector.length;
    const numBytes = Math.ceil(numDimensions / 8);
    const binaryVector = new Uint8Array(numBytes);

    for (let i = 0; i < numDimensions; i++) {
      if (floatVector[i] > 0) {
        // Set the bit at index i if float value > 0
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        binaryVector[byteIndex] |= (1 << bitIndex);
      }
    }
    return binaryVector;
  }

  /**
   * Generates a "Target Vector" by combining a text-based vibe and (optionally)
   * the exact semantic vectors of movies the user already loves (Centroid).
   * This eliminates the hallucination of the AI just reading the title as a word.
   *
   * Gracefully degrades to hash-based fallback vectors when the embedding model
   * is unavailable (CORS-blocked in Tauri, offline, etc.).
   */
  async generateTargetVector(
    likedTitles: string[],
    preferredGenres: string[],
    referenceVectors: Uint8Array[] = []
  ): Promise<Uint8Array> {

    // Fallback: If we don't have exact vectors, we use the descriptive prompt
    if (referenceVectors.length === 0) {
      const tasteProfile = `A story combining elements of ${preferredGenres.join(', ')}. 
        Similar in vibe to ${likedTitles.slice(0, 5).join(', ')}.`;

      try {
        const floatEmbedding = await this.generateEmbedding(tasteProfile);
        return this.quantizeToBinary(floatEmbedding);
      } catch {
        // Model completely unavailable — use hash-based binary vector
        console.warn('[CultureEdgeAI] generateTargetVector fallback: using hash-based vector.');
        return this.generateFallbackVector(tasteProfile);
      }
    }

    // High Intelligence: Mathematical Centroid (Average) of loved movies
    // For 1-bit vectors, we calculate the majority vote for each bit!
    const numDimensions = referenceVectors[0].length * 8; // bits
    const bitCounts = new Int32Array(numDimensions);

    for (const vector of referenceVectors) {
      for (let i = 0; i < numDimensions; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        const bit = (vector[byteIndex] >> bitIndex) & 1;
        if (bit === 1) bitCounts[i]++;
      }
    }

    // Reconstruct the 1-bit vector using majority rule (> 50% of reference movies have this bit set)
    const threshold = referenceVectors.length / 2;
    const finalBinaryVector = new Uint8Array(referenceVectors[0].length);

    for (let i = 0; i < numDimensions; i++) {
      if (bitCounts[i] > threshold) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        finalBinaryVector[byteIndex] |= (1 << bitIndex);
      }
    }

    return finalBinaryVector;
  }
}

export const CultureEdgeAI = new CultureEdgeAIImpl();
