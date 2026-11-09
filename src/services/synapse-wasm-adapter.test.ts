import { describe, it, expect } from 'vitest';
import { initSynapseWasm, isWasmAccelerated, getSynapseWasm } from './synapse-wasm-adapter';

describe('Synapse WASM Adapter', () => {
  it('reports wasm not accelerated by default in unit test environment', () => {
    expect(isWasmAccelerated()).toBe(false);
    expect(getSynapseWasm()).toBeNull();
  });

  it('handles invalid or empty wasm gracefully without crashing', async () => {
    const result = await initSynapseWasm();
    expect(result).toBeNull();
    expect(isWasmAccelerated()).toBe(false);
  });
});

