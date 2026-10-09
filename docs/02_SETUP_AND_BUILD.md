# 🛠️ Developer Setup, Build & Operations Guide

This guide provides instructions for setting up the local development environment, compiling for multiple target platforms, configuring environment credentials, and building release artifacts for **Caderno**.

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
   git clone https://github.com/your-username/caderno.git
   cd caderno
   ```

2. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

---

## 3. Development Workflows

Caderno provides two distinct development modes:

### 3.1. Web-Only Development (Instant Startup)
For rapid frontend iteration, UI styling, and component design without building Rust binaries:
```bash
npm run dev
```
- Starts the Vite development server at `http://localhost:5173`.
- Automatically activates the `WebStorageService` fallback (IndexedDB persistence) and Web Crypto API.

### 3.2. Full Hybrid Desktop Development (Tauri v2 + Rust)
For testing native IPC commands, SQLite persistence, custom `encrypted://` streaming, and OS shell integrations:
```bash
npm run tauri dev
```
- Automatically launches the Vite frontend server and compiles the Rust backend in debug mode.
- *Note*: Initial compilation compiles native cryptographic and networking crates (`aes-gcm`, `axum`, `rusqlite`, `reqwest`), which may take 1–3 minutes. Incremental builds execute in seconds.

### 3.3. Multi-Agent Parallel Swarm Development
To execute concurrent modular development across isolated Git Worktrees (as detailed in the `parallel-swarm-audit` playbook):
```bash
# Initialize isolated worktrees with symlinked node_modules
npm run swarm:setup

# Merge and reconcile active swarm branches into master
npm run swarm:merge
```

---

## 4. Environment Variables Configuration

Create a `.env` file in the project root to configure cloud sync, OAuth, and AI features:

```bash
cp .env.example .env # or create manually
```

| Variable | Description | Default / Example |
| :------- | :---------- | :---------------- |
| `VITE_DRIVE_CLIENT_ID` | Google Drive OAuth 2.0 Client ID (Public App / PKCE) | `your-client-id.apps.googleusercontent.com` |
| `VITE_DRIVE_CLIENT_SECRET` | Google Drive Client Secret (Optional if PKCE is used) | Optional |
| `VITE_DRIVE_REDIRECT_URI` | Authorized OAuth Redirect URI | `http://localhost:5173` |
| `VITE_FIREBASE_API_KEY` | Firebase API Key for web signaling and sync | `AIzaSy...` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project Identifier | `caderno-vault` |
| `VITE_GEMINI_API_KEY` | Google Gemini API Key for conversational AI & study cards | `AIzaSy...` |

> [!NOTE]
> All cloud credentials and sync endpoints are strictly opt-in. Caderno functions 100% offline without any API keys or network connection.

---

## 5. Quality Verification & Testing Gates

Caderno adheres to strict Big Tech quality gates. Run targeted checks to ensure zero regressions:

### 5.1. Fast Targeted Unit Testing
Run specific test suites with sub-second feedback:
```bash
# Cryptographic service test suite
npx vitest run src/services/crypto.test.ts

# Storage and API adapter test suites
npx vitest run src/api/

# Run tests related to uncommitted/modified files
npx vitest related --run src/services/crypto.ts
```

### 5.2. Strict TypeScript Contract Verification
Verify type safety across all frontend and IPC boundaries without running heavy DOM harnesses:
```bash
npx tsc -b --noEmit
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
npm run tauri build
```

This generates native installers in `src-tauri/target/release/bundle/`:
- **Linux**: `.AppImage` (portable) and `.deb` (Debian/Ubuntu package).
- **Windows**: `.msi` (Windows Installer) and `.exe` (NSIS setup).
- **macOS**: `.dmg` (Disk Image) and `.app` bundle (Universal binary).

### 6.2. Web PWA Static Bundle
To build the standalone Progressive Web App for hosting on static edge CDNs (Cloudflare Pages, Vercel, Netlify):
```bash
npm run build:web
```
The optimized production bundle will be generated in `dist-web/`.

---

## 7. Troubleshooting & Common Issues

| Issue | Cause | Solution |
| :---- | :---- | :------- |
| `failed to run webkit2gtk-4.1 build script` | Missing development headers on Linux | Run the package manager command in §1.2 to install `libwebkit2gtk-4.1-dev`. |
| `GLIBCXX / libstdc++ not found` | Outdated C++ runtime | Update GCC and system libraries via package manager. |
| Tauri window renders blank white screen | WebView2 missing or WebKitGTK crash | On Linux, check graphics drivers; on Windows, install the Evergreen WebView2 runtime. |
| Port 5173 already in use | Stale Vite dev server process | Run `killall -9 node` or change the port in `vite.config.ts`. |
