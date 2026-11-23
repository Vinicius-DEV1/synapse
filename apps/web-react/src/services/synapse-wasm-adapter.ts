/**
 * Synapse WebAssembly Acceleration Adapter
 * Bridges Core FSRS-6 primitives and cryptographic operations to browser React
 */

export interface WasmFsrsResult {
  stability: number;
  difficulty: number;
  scheduled_days: number;
  retrievability: number;
  state: number;
}

export interface SynapseWasmExports {
  wasm_fsrs_calculate: (
    stability: number,
    difficulty: number,
    state: number,
    rating: number,
    elapsed_days: number
  ) => WasmFsrsResult;
  wasm_fsrs_retrievability: (elapsed_days: number, stability: number) => number;
  wasm_fsrs_next_interval: (stability: number) => number;
  wasm_derive_master_key: (password: string) => string;
  wasm_hash_auth_password: (password: string) => string;
  wasm_encrypt_module_key: (module_key: string, password: string) => string;
  wasm_decrypt_module_key: (encrypted_payload: string, password: string) => string;
}

let wasmInstance: SynapseWasmExports | null = null;
let isInitializing = false;

/**
 * Initializes the Synapse WASM module if available in browser/Node
 */
export async function initSynapseWasm(wasmBinaryOrUrl?: ArrayBuffer | string): Promise<SynapseWasmExports | null> {
  if (wasmInstance) return wasmInstance;
  if (isInitializing) return null;

  isInitializing = true;
  try {
    if (typeof WebAssembly === 'undefined') {
      console.info('[Synapse WASM] WebAssembly not supported in this environment.');
      return null;
    }

    // In web runtime or tests, if binary is provided:
    if (wasmBinaryOrUrl && typeof wasmBinaryOrUrl !== 'string') {
      const module = await WebAssembly.instantiate(wasmBinaryOrUrl, {});
      wasmInstance = module.instance.exports as unknown as SynapseWasmExports;
      return wasmInstance;
    }

    return null;
  } catch (err) {
    console.warn('[Synapse WASM] WASM initialization skipped or failed:', err);
    return null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Returns whether Synapse WASM acceleration is active
 */
export function isWasmAccelerated(): boolean {
  return wasmInstance !== null;
}

/**
 * Gets the active WASM exports if loaded
 */
export function getSynapseWasm(): SynapseWasmExports | null {
  return wasmInstance;
}

