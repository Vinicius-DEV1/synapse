#!/usr/bin/env bash
# ==============================================================================
# Synapse Universal Multi-Platform Build Pipeline
# Compiles:
# 1. synapse-core (Rust workspace core)
# 2. synapse-bridge-qt (C-ABI bridge)
# 3. synapse-bridge-uniffi (Android UniFFI bridge)
# 4. synapse-bridge-wasm (WebAssembly engine)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=================================================="
echo " Synapse 2.0 Universal Ecosystem Build Pipeline"
echo "=================================================="

echo "[1/4] Building Rust Core & Bridges (Native Release)..."
cargo build --release -p synapse-core -p synapse-bridge-qt -p synapse-bridge-uniffi --manifest-path "$PROJECT_ROOT/Cargo.toml"

echo "[2/4] Building WebAssembly Bridge (wasm32-unknown-unknown)..."
cargo build --target wasm32-unknown-unknown --release -p synapse-bridge-wasm --manifest-path "$PROJECT_ROOT/Cargo.toml"

echo "[3/4] Preparing Desktop Qt 6 assets..."
"$PROJECT_ROOT/tools/scripts/build-desktop.sh"

echo "[4/4] Building Android NDK bridge and UniFFI bindings..."
"$PROJECT_ROOT/tools/scripts/build-android.sh"

echo "=================================================="
echo " [✓] Synapse Universal Build Completed Successfully!"
echo "=================================================="

