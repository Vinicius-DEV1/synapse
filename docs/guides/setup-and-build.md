# 🛠️ Developer Setup, Build & Operations Guide

This guide provides instructions for setting up the local development environment, compiling for multiple target platforms, configuring environment credentials, and building release artifacts for **Synapse**.

---

## 1. Prerequisites

Ensure your host development machine meets the following requirements:

### 1.1. Core Runtimes (All Platforms)
- **Node.js**: `v20.x` or `v22.x` (LTS recommended, minimum `v18.18+`).
- **Rust**: Latest stable toolchain (`1.78+`). Install via [rustup](https://rustup.rs/):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup default stable
  ```

### 1.2. Platform-Specific System Dependencies

#### Linux (Debian / Ubuntu / Mint)
Tauri v2 requires GTK3, WebKit2GTK 4.1, and appindicator libraries:
```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libwebkit2gtk-4.1-dev
```

#### Linux (Fedora / RHEL)
```bash
sudo dnf install -y \
  gcc \
  gcc-c++ \
  webkit2gtk4.1-devel \
  openssl-devel \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

#### Linux (Arch / Manjaro)
```bash
sudo pacman -S --needed \
  base-devel \
  curl \
  wget \
  webkit2gtk-4.1 \
  gtk3 \
  libappindicator-gtk3 \
  librsvg
```

#### Windows
- **Microsoft C++ Build Tools**: Install via the [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++").
- **WebView2 Runtime**: Pre-installed on Windows 10/11; evergreen installer required on older builds.

#### macOS
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```

---

## 2. Installation & Quick Start

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Vinicius-DEV1/synapse.git
   cd synapse
   ```

2. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

---

## 3. Development Workflows

Synapse has four app targets. The root npm scripts operate the React workspace; the Expo shell has its own package and lockfile. The native Qt and Compose apps use CMake and Gradle respectively.

### 3.1. React Web App

For browser development with HMR and IndexedDB-backed web storage:

```bash
npm run dev
```

Vite serves the app at `http://localhost:35174`.

### 3.2. React + Tauri Desktop App

For the hybrid desktop target with native IPC, SQLite persistence, and OS integrations:

```bash
npm run tauri -- dev
```

The first Rust build compiles the cryptography and networking dependencies; subsequent builds use Cargo's root `target/` cache.

### 3.3. Native Qt Desktop App

The fully native desktop client is in `apps/desktop-qt/` and uses Qt 6, QML, C++17, and the Rust Qt bridge. Install Qt 6 development packages, CMake, libmpv, and libarchive, then configure and build it:

```bash
cmake -S apps/desktop-qt -B apps/desktop-qt/build -DCMAKE_BUILD_TYPE=Release
cmake --build apps/desktop-qt/build --config Release
```

### 3.4. Native Android App

The Kotlin/Jetpack Compose app is in `apps/mobile-android/`. Open that directory in Android Studio or build with the Gradle wrapper after installing the Android SDK and NDK:

```bash
cd apps/mobile-android
./gradlew assembleDebug
```

### 3.5. Android WebView Shell

The Expo shell is a separate package in `apps/mobile-webview/`:

```bash
npm --prefix apps/mobile-webview install
npm --prefix apps/mobile-webview run start
```

Use `npm --prefix apps/mobile-webview run android` to launch it on an emulator or connected device.

## 4. Environment Variables Configuration

Create `apps/web-react/.env` to configure cloud sync, OAuth, and AI features:

```bash
cp apps/web-react/.env.example apps/web-react/.env
```

| Variable | Description | Default / Example |
| :------- | :---------- | :---------------- |
| `VITE_DRIVE_CLIENT_ID` | Google Drive OAuth 2.0 Client ID (Public App / PKCE) | `your-client-id.apps.googleusercontent.com` |
| `VITE_DRIVE_CLIENT_SECRET` | Google Drive Client Secret (Optional with PKCE) | Optional |
| `VITE_DRIVE_REDIRECT_URI` | Authorized OAuth Redirect URI | `http://localhost:35174` |
| `VITE_FIREBASE_API_KEY` | Firebase API Key for web signaling and sync | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project Identifier | `your-project-id` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:123456789:web:...` |
| `VITE_FIREBASE_SHARE_DOMAIN` | Custom domain for encrypted note sharing viewer | `synapse-dev.web.app` |
| `VITE_GEMINI_API_KEY` | Google Gemini API Key for conversational AI & study cards | `AIzaSy...` |

> [!NOTE]
> Cloud, AI, and online metadata integrations require configuration and connectivity. Local workflows may remain available offline, depending on the app and feature.

---

## 5. Quality Verification & Testing Gates

Synapse enforces strict quality gates. Run targeted checks to ensure zero regressions:

### 5.1. Fast Targeted Unit Testing
> [!TIP]
> Do not run `npm test` on every turn. Run specific test suites with sub-second feedback:
```bash
# Cryptographic service test suite
npm run test -- src/services/crypto.test.ts

# Storage and API adapter test suites
npm run test -- src/api/

# Run tests related to modified/uncommitted files
npm run test:related -- src/services/crypto.ts
```

### 5.2. Strict TypeScript Contract Verification
Verify type safety across all frontend and IPC boundaries without running heavy DOM harnesses:
```bash
npm run typecheck
```

### 5.3. Static Analysis & Linting
```bash
npm run lint
```

---

## 6. Production Builds & Packaging

### 6.1. Desktop Native Release Packaging
To build an optimized, stripped production binary:
```bash
npm run tauri -- build
```

This generates native installers in the root Cargo workspace output at `target/release/bundle/`:
- **Linux**: `.AppImage` (portable) and `.deb` (Debian/Ubuntu package).
- **Windows**: `.msi` (Windows Installer) and `.exe` (NSIS setup).
- **macOS**: `.dmg` (Disk Image) and `.app` bundle (Universal binary).

### 6.2. Web PWA Static Bundle
To build the standalone Progressive Web App for hosting on static edge CDNs (Cloudflare Pages, Vercel, Netlify):
```bash
npm run build:web
```
The optimized production bundle will be generated in `apps/web-react/dist-web/`.

---

## 7. Troubleshooting & Common Issues

| Issue | Cause | Solution |
| :---- | :---- | :------- |
| `failed to run webkit2gtk-4.1 build script` | Missing development headers on Linux | Run the package manager command in §1.2 to install `libwebkit2gtk-4.1-dev`. |
| `GLIBCXX / libstdc++ not found` | Outdated C++ runtime | Update GCC and system libraries via package manager. |
| Tauri window renders blank white screen | WebView2 missing or WebKitGTK crash | On Linux, check graphics drivers; on Windows, install the Evergreen WebView2 runtime. |
| Port 35174 already in use | Stale Vite dev server process | Stop the process listening on the port or change it in `apps/web-react/vite.config.ts`. |
