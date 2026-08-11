# Arquitetura do Sistema Caderno

O **Caderno** é um aplicativo focado em Privacidade Total e Criptografia de Ponta-a-Ponta (E2EE). O aplicativo possui uma arquitetura híbrida (Desktop + Web) com sincronização transparente P2P-like usando o Google Drive do próprio usuário como backbone seguro.

## Stack Tecnológico

1. **Frontend / Web App:**
   - **Framework:** React com Vite (TypeScript).
   - **Estilização:** TailwindCSS (via `index.css`).
   - **Banco de Dados Local (Web):** IndexedDB (via `idb`).
   - **Sincronização:** Yjs (CRDTs para conflitos) + Firebase (WebRTC-like sinalização) + Google Drive API.

2. **Backend / Desktop App:**
   - **Framework:** Tauri v2.
   - **Core:** Rust.
   - **Banco de Dados Local (Desktop):** SQLite (banco principal, rápido e persistente).
   - **Manipulação de Arquivos Mídia:** `ffmpeg` e `yt-dlp` embutidos.

## Criptografia e Segurança

- Todo o conteúdo gerado pelo usuário (texto, notas, finanças, hábitos) é encriptado antes de ser persistido, seja no SQLite ou no IndexedDB.
- **Master Key:** Derivada da senha do usuário usando PBKDF2. **NUNCA** armazenada no banco. Mantida apenas na RAM (no estado do Rust ou no estado da Window no Web).
- **Module Keys:** Cada módulo tem uma chave própria. Essas chaves são encriptadas usando a Master Key e guardadas na tabela `keychain`.
- **Criptografia Simétrica:** Uso de `AES-GCM` (12-byte IV padrão) para encriptar blocos.
- **Streaming Seguro (Vídeos/Lofi):** Arquivos gigantes não podem ser carregados na memória de uma vez. O Backend divide os arquivos de vídeo em blocos (Chunks) definidos e encripta cada bloco de forma independente via `crypto_stream.rs`. Quando o frontend solicita o arquivo, o Rust intercepta via protocolo `encrypted://` e descriptografa o bloco on-the-fly.

## Estratégia de Deploy e Cross-Platform

- O mesmo repositório atende Web e Desktop.
- O código do Frontend detecta onde está rodando via `window.__TAURI__`. Se rodar em Desktop, invoca comandos do Rust para persistência pesada. Se rodar na Web, aciona fallback do IndexedDB.
- No Desktop, o aplicativo atua como o **Servidor Primário de Sincronização** para garantir durabilidade total e gerir o upload criptografado de arquivos físicos pesados.
