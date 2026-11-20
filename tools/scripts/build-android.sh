#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ANDROID_PROJECT="$PROJECT_ROOT/apps/mobile-android"
NDK_VERSION_FILE="$ANDROID_PROJECT/ndk.version"
BRIDGE_MANIFEST="$PROJECT_ROOT/bridges/bridge-uniffi/Cargo.toml"
BRIDGE_CONFIG="$PROJECT_ROOT/bridges/bridge-uniffi/uniffi.toml"
GENERATED_ROOT="$ANDROID_PROJECT/app/build/generated"
JNI_LIBS_DIR="$GENERATED_ROOT/jniLibs/main"
KOTLIN_OUT_DIR="$GENERATED_ROOT/source/uniffi/main/java"

fail() {
    printf '[Synapse Android] Error: %s\n' "$1" >&2
    exit 1
}

command -v cargo >/dev/null || fail "Rust Cargo is required."
command -v rustup >/dev/null || fail "rustup is required to verify Android targets."
command -v cargo-ndk >/dev/null || fail "Install the pinned cross-build helper with: cargo install cargo-ndk --version 4.1.2 --locked"

CARGO_NDK_VERSION="$(cargo ndk --version 2>&1)"
[[ "$CARGO_NDK_VERSION" == *"4.1.2"* ]] || fail "Expected cargo-ndk 4.1.2, found: $CARGO_NDK_VERSION"

IFS= read -r NDK_VERSION < "$NDK_VERSION_FILE" || fail "Missing Android NDK version file: $NDK_VERSION_FILE"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$SDK_ROOT" && -f "$ANDROID_PROJECT/local.properties" ]]; then
    SDK_ROOT="$(sed -n 's/^sdk\.dir=//p' "$ANDROID_PROJECT/local.properties" | sed 's/\\:/:/g; s/\\ / /g' | head -n 1)"
fi
[[ -n "$SDK_ROOT" ]] || fail "Set ANDROID_SDK_ROOT or ANDROID_HOME, or configure sdk.dir in apps/mobile-android/local.properties."

ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-${ANDROID_NDK_ROOT:-$SDK_ROOT/ndk/$NDK_VERSION}}"
[[ -f "$ANDROID_NDK_HOME/source.properties" ]] || fail "Android NDK $NDK_VERSION is missing at $ANDROID_NDK_HOME. Install the pinned NDK through Android SDK Manager."
grep -Fq "Pkg.Revision = $NDK_VERSION" "$ANDROID_NDK_HOME/source.properties" || fail "NDK at $ANDROID_NDK_HOME does not match pinned version $NDK_VERSION."
export ANDROID_NDK_HOME

ANDROID_TARGETS=(aarch64-linux-android x86_64-linux-android armv7-linux-androideabi)
INSTALLED_TARGETS="$(rustup target list --installed)"
for target in "${ANDROID_TARGETS[@]}"; do
    grep -Fqx "$target" <<< "$INSTALLED_TARGETS" || fail "Rust target $target is missing. Install Android targets with rustup target add."
done

printf '[Synapse Android] Building UniFFI bridge for arm64-v8a, x86_64, and armeabi-v7a...\n'
cargo ndk \
    -t arm64-v8a \
    -t x86_64 \
    -t armeabi-v7a \
    -P 26 \
    -o "$JNI_LIBS_DIR" \
    --manifest-path "$PROJECT_ROOT/Cargo.toml" \
    build --release -p synapse-bridge-uniffi

for abi in arm64-v8a x86_64 armeabi-v7a; do
    rm -f "$JNI_LIBS_DIR/$abi/libsynapse_core.so"
    library="$JNI_LIBS_DIR/$abi/libsynapse_bridge_uniffi.so"
    [[ -s "$library" ]] || fail "Native bridge output is missing for $abi: $library"
done

printf '[Synapse Android] Generating version-matched Kotlin bindings...\n'
cargo run \
    --locked \
    --manifest-path "$BRIDGE_MANIFEST" \
    --features bindgen-cli \
    --bin uniffi-bindgen \
    -- generate \
    --library "$JNI_LIBS_DIR/x86_64/libsynapse_bridge_uniffi.so" \
    --language kotlin \
    --out-dir "$KOTLIN_OUT_DIR" \
    --config "$BRIDGE_CONFIG"

[[ -s "$KOTLIN_OUT_DIR/com/synapse/core/synapse_bridge_uniffi.kt" ]] || fail "UniFFI Kotlin binding generation did not produce the expected source file."
printf '[Synapse Android] Native libraries and Kotlin bindings are ready.\n'
