# Native Qt Desktop Guide

**Status:** The Qt client is implemented as a native app, but its module parity remains partial. Use the [native desktop parity matrix](../native-desktop-parity.md) for current feature gaps.

## Source Layout

- QML presentation: `apps/desktop-qt/qml/<module>/`.
- Feature controllers: `apps/desktop-qt/src/controllers/<module>/`.
- Shared controller, app startup, and media integration: `apps/desktop-qt/src/`.
- Native tests: `apps/desktop-qt/tests/<module>/`.
- Qt bridge: `bridges/bridge-qt/`.

The current CMake project requests Qt 6.2 or newer and sets C++17. Desktop media integration uses libmpv and libarchive. Native PDF rendering currently depends on Poppler command-line tools being available; see the parity matrix for packaging gaps.

## Build

From the repository root:

```bash
cmake -S apps/desktop-qt -B apps/desktop-qt/build -DCMAKE_BUILD_TYPE=Release
cmake --build apps/desktop-qt/build --config Release
```

To enable the optional controller tests:

```bash
cmake -S apps/desktop-qt -B apps/desktop-qt/build \
  -DSYNAPSE_BUILD_NATIVE_TESTS=ON -DCMAKE_BUILD_TYPE=Release
cmake --build apps/desktop-qt/build --config Release --target synapse-desktop-tests
ctest --test-dir apps/desktop-qt/build -R native-priority-modules --output-on-failure
```

Use a disposable database for smoke checks. The application may prefer an existing canonical user database; see [the Qt app guidance](../../apps/desktop-qt/AGENTS.md).
