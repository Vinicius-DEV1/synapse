# Synapse

<div align="center">

**Gestão Pessoal do Conhecimento, Estação de Aprendizagem Cognitiva & Cofre Zero-Knowledge**

[![Plataforma](https://img.shields.io/badge/Plataforma-Desktop%20%7C%20Web%20%7C%20Mobile-blue?style=for-the-badge)](https://github.com/Vinicius-DEV1/synapse)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-Edição_2021-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/Vinicius-DEV1/synapse/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/Vinicius-DEV1/synapse/actions/workflows/ci.yml)
[![Licença: BSL 1.1](https://img.shields.io/badge/Licença-BSL_1.1-indigo?style=for-the-badge)](./LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Pronto-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<p align="center">
  Uma plataforma de aceleração cognitiva e segundo cérebro de alta performance construída com <strong>criptografia de ponta a ponta Zero-Knowledge</strong>, <strong>durabilidade de dados local-first</strong> e <strong>onipresença multiplataforma</strong> no Linux, Windows, macOS, Web e Mobile.
</p>

[🇺🇸 Read in English](./README.md) • [📚 Hub de Documentação Técnica](./docs/README.md) • [🤝 Guia de Contribuição](./CONTRIBUTING.md)

</div>

---

## 📑 Índice

- [Visão & Filosofia Central](#-visão--filosofia-central)
- [Matriz de Suporte Multiplataforma](#-matriz-de-suporte-multiplataforma)
- [Visão Geral da Arquitetura](#-visão-geral-da-arquitetura)
- [Arquitetura de Segurança Zero-Knowledge](#-arquitetura-de-segurança-zero-knowledge)
- [Streaming de Vídeo Criptografado ENC1](#-streaming-de-vídeo-criptografado-enc1)
- [Módulos do Sistema](#-módulos-do-sistema)
- [Começando](#-começando)
  - [Pré-requisitos](#pré-requisitos)
  - [Instalação & Início Rápido](#instalação--início-rápido)
  - [Executando em Modo Web](#executando-em-modo-web)
  - [Executando em Modo Desktop (Tauri v2)](#executando-em-modo-desktop-tauri-v2)
  - [Executando com Docker (Self-Hosting)](#executando-com-docker-self-hosting)
  - [Executando o Mobile Companion](#executando-o-mobile-companion)
- [Testes & Garantia de Qualidade](#-testes--garantia-de-qualidade)
- [Segurança & Divulgação Responsável](#-segurança--divulgação-responsável)
- [Comunidade & Suporte](#-comunidade--suporte)
- [Autor & Licença](#-autor--licença)

---

## 💡 Visão & Filosofia Central

Aplicativos modernos de gestão de conhecimento pessoal frequentemente forçam uma escolha entre **conveniência** e **privacidade**, ou entre **velocidade** e **recursos ricos**. O Synapse elimina esse dilema com base em cinco pilares fundamentais:

1. **Privacidade Absoluta & Zero-Knowledge por Padrão**: Seus dados pertencem unicamente a você. Todo o conteúdo (anotações, senhas, finanças, flashcards, arquivos) é criptografado localmente no dispositivo usando **AES-256-GCM** antes de qualquer gravação em disco ou nuvem. Servidores remotos (Firebase / Google Drive) atuam como meros repetidores cegos de dados criptografados—eles nunca possuem as chaves de descriptografia nem visualizam dados em texto puro.
2. **Resiliência Local-First & Offline**: A aplicação lê e escreve imediatamente em bancos locais de latência zero (**SQLite** no Desktop, **IndexedDB** na Web). Você pode trabalhar continuamente sem conexão à internet, e as alterações se reconciliam deterministicamente ao reconectar.
3. **Latência Percebida de Microssegundos (UI Zero-Lag)**: Projetado com caching Stale-While-Revalidate (SWR) e transições CSS aceleradas por GPU, evitando re-renderizações desnecessárias do React e mantendo transições a 60 FPS em todos os fluxos.
4. **Eficiência Nativa sem Bloat**: Utilizando **Tauri v2 e Rust** em vez de empacotadores pesados baseados em Electron, o Synapse consome uma fração mínima de memória (~30–50 MB RAM contra 300+ MB) com executáveis até 10 vezes menores.
5. **Aceleração Cognitiva**: Integrado ao algoritmo de ponta **FSRS** (Free Spaced Repetition Scheduler) e ao contexto de IA do **Google Gemini**, transformando anotações passivas em um motor ativo de aprendizagem.

---

## 🌐 Matriz de Suporte Multiplataforma

O Synapse foi arquitetado com uma base de código unificada capaz de rodar em sistemas operacionais desktop, navegadores web modernos, contêineres e dispositivos móveis:

| Plataforma | Runtime Alvo | Mecanismo de Persistência | Recursos Nativos | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Linux** (Desktop) | Tauri v2 / WebKitGTK / Rust | SQLite Nativo (`rusqlite`) | Sistema de arquivos direto, streaming HTTP local (`axum`), FFmpeg / yt-dlp nativo | **Produção** |
| **Windows** (Desktop) | Tauri v2 / WebView2 / Rust | SQLite Nativo (`rusqlite`) | Sistema de arquivos direto, streaming HTTP local (`axum`), integração shell Windows | **Produção** |
| **macOS** (Desktop) | Tauri v2 / WebKit / Rust | SQLite Nativo (`rusqlite`) | Sistema de arquivos direto, streaming HTTP local (`axum`), binário Apple Silicon | **Produção** |
| **Web / PWA** (Navegador) | Navegadores Modernos (Chromium, Firefox, Safari) | IndexedDB (`idb`) | Service Worker (`sw.js`) para streaming decriptado on-the-fly, Web Crypto API | **Produção** |
| **Docker / Self-Hosted** | Contêiner Linux (Alpine + Nginx) | IndexedDB + Cloud Sync | Hospedagem estática independente com headers de segurança customizados | **Produção** |
| **Mobile Companion** | React Native 0.81 / Expo SDK 54 | IndexedDB + Cache Offline | Haptics nativo (`expo-haptics`), navegação de botão voltar, Safe Area insets | **Beta Ativo** |

---

## 🏛️ Visão Geral da Arquitetura

O Synapse adota uma arquitetura estrita em **4 camadas** (Apresentação, Orquestração, Domínio e Infraestrutura de Plataforma) garantindo desacoplamento completo e intercambialidade:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA SYNAPSE                             │
├────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE APRESENTAÇÃO                                                │
│  React 19  •  TypeScript 6.0  •  TailwindCSS  •  Radix UI  •  Lucide   │
├────────────────────────────────────────────────────────────────────────┤
│  MOTOR DE TEXTO RICO & COLABORAÇÃO                                     │
│  TipTap v3  •  ProseMirror  •  Yjs CRDTs  •  Lowlight  •  Mermaid.js    │
├────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE ADAPTAÇÃO MULTIPLATAFORMA                                   │
│  Contrato window.api  •  Detector de Plataforma  •  Ponte Web/Desktop  │
├──────────────────────────────────┬─────────────────────────────────────┤
│  RUNTIME DESKTOP (Tauri v2)      │  RUNTIME WEB & PWA                  │
│  Rust 2021  •  Tokio  •  Axum    │  Vite 8  •  Service Worker (sw.js)  │
│  Rusqlite (SQLite)  •  PBKDF2    │  IndexedDB (idb)  •  WebCrypto API  │
│  AES-256-GCM  •  FFmpeg/yt-dlp   │  WebAssembly (FFmpeg / Tesseract)   │
├──────────────────────────────────┴─────────────────────────────────────┤
│  INFRAESTRUTURA DE NUVEM & ZERO-KNOWLEDGE                              │
│  Firebase Firestore (E2EE)  •  Google Drive API (OAuth2 PKCE Resumível)│
├────────────────────────────────────────────────────────────────────────┤
│  DEVOPS & CONTAINERIZAÇÃO                                              │
│  Docker  •  Docker Compose  •  Build Multi-Stage Nginx Alpine          │
└────────────────────────────────────────────────────────────────────────┘
```

Para o blueprint arquitetural completo, consulte [**`docs/architecture/overview.md`**](./docs/architecture/overview.md).

---

## 🔐 Arquitetura de Segurança Zero-Knowledge

O Synapse foi concebido sob princípios criptográficos **Zero-Knowledge**:

```
Senha-Mestre do Usuário
        │
        ▼ (PBKDF2-HMAC-SHA256 • 600.000 Iterações + Salt)
Chave-Mestre Efêmera (armazenada EXCLUSIVAMENTE em RAM volátil / limpa no bloqueio)
        │
        ├──▶ Descriptografa o Keychain ──▶ Chaves de Módulo (Notas, Cofre, Finanças, Arquivos)
        │
        └──▶ AES-256-GCM (IV CSPRNG de 12 bytes + Tag de Autenticação de 128 bits)
                 │
                 ├──▶ Armazenamento Local (SQLite / IndexedDB) [Criptografado em Repouso]
                 └──▶ Sincronização em Nuvem (Firebase / Google Drive) [Criptografado em Trânsito e Nuvem]
```

### Padrões Criptográficos

| Mecanismo | Padrão | Garantia de Segurança |
| :--- | :--- | :--- |
| **Derivação de Chave** | **PBKDF2-HMAC-SHA256** | 600.000 iterações com salt aleatório seguro, superando as recomendações do OWASP contra força bruta. |
| **Cifra Simétrica** | **AES-256-GCM** | Criptografia autenticada com dados associados (AEAD) usando IVs de 96 bits (12 bytes) gerados por CSPRNG. |
| **Integridade dos Dados** | **Tag de Autenticação 128-bit** | Detecção e rejeição imediata de adulterações (*formato*: `iv:auth_tag:ciphertext`). |
| **Keychain Two-Tier** | **Chave-Mestre + Chaves de Módulo** | Chaves simétricas dedicadas por módulo seladas pela chave-mestre. |
| **Higiene de Memória** | **`auth_lock` / Zeroize** | Chaves residem apenas na memória RAM e são zeradas ao bloquear a sessão. |
| **Defesa contra XSS** | **DOMPurify & CSP Rígido** | Sanitização estrita de inputs dinâmicos e Content Security Policy nas versões Desktop e Web. |

---

## 🎥 Streaming de Vídeo Criptografado ENC1

Fazer streaming de vídeos de aula criptografados de vários gigabytes dentro de tags `<video>` HTML5 é um desafio: a descriptografia padrão exige carregar o arquivo inteiro na memória, causando travamento do navegador.

O Synapse resolve isso através do formato proprietário **ENC1**:

```
Formato do Arquivo ENC1:
┌──────────────┬─────────────────────────┬─────────────────────────┬──────────────────────┐
│ Header (16B) │ Bloco 0 (IV + Cifra)    │ Bloco 1 (IV + Cifra)    │ Bloco N ...          │
│ Magic: "ENC1"│ 12B IV + AES-256-GCM    │ 12B IV + AES-256-GCM    │ 12B IV + AES-256-GCM │
│ Tamanho: 8B  │ Tag: 16B • Dados: ~1MB  │ Tag: 16B • Dados: ~1MB  │ Tag: 16B • Dados: ~1MB│
│ TamBloco: 4B │                         │                         │                      │
└──────────────┴─────────────────────────┴─────────────────────────┴──────────────────────┘
```

1. **Avanço Aleatório (Seek Instantâneo)**: Como cada bloco de ~1 MB possui IV e tag independentes, o player avança (`Range: bytes=X-Y`) para qualquer momento do vídeo sem descriptografar o arquivo completo.
2. **Implementação Desktop (Tauri + Rust)**: Um servidor interno **Axum HTTP** atende em loopback local, descriptografa faixas de bytes on-the-fly e transmite com consumo estável de memória.
3. **Implementação Web (PWA + Service Worker)**: No navegador, `sw.js` intercepta requisições de vídeo, baixa blocos do Google Drive, descriptografa via **Web Crypto API** e transmite através de `ReadableStream`.

Para a documentação completa do protocolo, consulte [**`docs/protocols/enc1-streaming.md`**](./docs/protocols/enc1-streaming.md).

---

## 📦 Módulos do Sistema

### 1. 📝 Synapse Notes (Escrita em Texto Rico & Segundo Cérebro)
- Editor em blocos baseado em TipTap v3 / ProseMirror com syntax highlighting (`lowlight`), fórmulas LaTeX dinâmicas, tabelas e listas de tarefas.
- Árvore de notas com reordenação por arrastar e soltar (`@dnd-kit`) e grafo bidirecional de links.

### 2. 🔐 Cofre de Senhas Zero-Knowledge & Gerador de Credenciais
- Cofre seguro para credenciais com gerador criptográfico de senhas e medidor de entropia.
- Detecção local de vazamentos via API k-Anonymity do HaveIBeenPwned (sem expor hashes).

### 3. 🧠 Cartões Mnemônicos FSRS & Flashcards Anki
- Motor de repetição espaçada de ponta baseado no algoritmo **FSRS** (Free Spaced Repetition Scheduler).
- Geração inteligente de flashcards por IA a partir de notas, PDFs e transcrições de vídeo.

### 4. 📚 Leitor Acadêmico de PDF & EPUB
- Visualizadores integrados para PDF (`pdfjs-dist`) e EPUB (`epubjs`) com marcadores, destaques coloridos e anotações.
- OCR integrado no navegador via **Tesseract.js** para capturar trechos de imagens e digitalizações.

### 5. 🎬 Cinema Studio & Player Educacional de Vídeo
- Reprodução fluida de mídias criptografadas em ENC1, com controle de velocidade, anotações sincronizadas no tempo e legendas.

### 6. 📅 Calendário de Estudos & Linha do Tempo
- Visão mensal e semanal integrada com tarefas, lembretes de revisões FSRS e eventos recorrentes.

### 7. 🤖 Estúdio de Conversação & Prática Oral (Gemini AI)
- Simulação conversacional por voz e texto com extração de memória persistente entre sessões.

### 8. 🎨 Quadro Branco Infinito & Diagramas (Tldraw)
- Tela infinita para mapas mentais, esboços arquiteturais e pensamento visual.

### 9. ⏱️ Estúdio de Foco & Áudio Lo-Fi
- Temporizador Pomodoro personalizável e gerador de paisagens sonoras relaxantes (chuva, vinil, synthwave).

### 10. 📁 Nuvem & Arquivos Criptografados
- Armazenamento em nuvem pessoal com criptografia local prévia e transferências resumíveis no Google Drive (OAuth2 PKCE).

### 11. 💰 Gestão Financeira Pessoal
- Controle de receitas, despesas e orçamentos com gráficos interativos (`recharts`).

### 12. 🏢 Workspaces Colaborativos no Estilo Notion & Multiusuário
- **Identidade Multiusuário com Modo Duplo**: Login e cadastro seguro com Firebase Authentication (E-mail/Senha) e fallback transparente para desbloqueio local offline com senha-mestre.
- **Seletor de Workspaces Estilo Notion**: Alternância ágil entre workspaces pessoais e de equipe com cache de latência zero e reconexão dinâmica de sinais em tempo real.
- **Criptografia E2EE Colaborativa Zero-Knowledge**: Cada workspace possui uma chave simétrica AES-256-GCM embalada individualmente com a chave-mestre pessoal de cada membro, mantendo o servidor cego ao conteúdo.
- **Controle de Acesso Baseado em Funções (RBAC)**: Permissões refinadas (`owner`, `admin`, `editor`, `viewer`) estritamente aplicadas pelas Regras de Segurança do Cloud Firestore.
- **Migração Segura com Perda Zero de Dados**: Mecanismo idempotente não-destrutivo que clona coleções legadas para workspaces privados com suporte total a rollback.

---

## 🚀 Começando

### Pré-requisitos

- **Node.js**: `18.0+` (Node 20 ou 22 LTS recomendado)
- **Gerenciador de Pacotes**: `npm` (v9+)
- **Toolchain Rust**: `1.77.2+` (Necessário apenas para desenvolvimento Desktop/Tauri; instale via [rustup.rs](https://rustup.rs/))
- **Docker**: Docker Engine 24+ & Docker Compose v2 (Opcional, para auto-hospedagem)

---

### Instalação & Início Rápido

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/Vinicius-DEV1/synapse.git
   cd synapse
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente (Opcional)**:
   ```bash
   cp .env.example .env
   ```
   *Nota: O Synapse funciona 100% offline sem qualquer chave de API ou configuração.*

---

### Executando em Modo Web

Inicia o cliente web com Hot Module Replacement (HMR) instantâneo do Vite:
```bash
npm run dev
```
Acesse `http://localhost:35174` no navegador.

Para gerar uma compilação de produção web otimizada:
```bash
npm run build:web
```
Os arquivos gerados estarão no diretório `dist-web`.

---

### Executando em Modo Desktop (Tauri v2)

Certifique-se de ter o Rust e as dependências do sistema operacional instaladas:
```bash
# Executar em modo desenvolvimento desktop com hot reload
npm run tauri dev

# Compilar o binário de produção otimizado
npm run tauri build
```
Os instaladores serão gerados em `src-tauri/target/release/bundle/` (`.deb`, `.AppImage`, `.msi`, `.exe`, `.dmg`).

---

### Executando com Docker (Self-Hosting)

O Synapse inclui um `Dockerfile` multi-stage e `docker-compose.yml`:
```bash
# Compilar e iniciar em segundo plano
docker compose up -d --build

# Visualizar logs
docker compose logs -f

# Parar os serviços
docker compose down
```
Acesse o Synapse Web em `http://localhost:8080`. Para detalhes, consulte [**`docs/guides/docker-self-hosting.md`**](./docs/guides/docker-self-hosting.md).

---

### Executando o Mobile Companion

O Synapse inclui o shell móvel baseado em Expo em `caderno-mobile-webview`:
```bash
cd caderno-mobile-webview
npm install

# Iniciar servidor Expo
npm run start

# Executar no Emulador Android ou dispositivo conectado
npm run android
```

---

## 🧪 Testes & Garantia de Qualidade

```bash
# Executar testes direcionados ultrarrápidos (Vitest)
npx vitest run src/services/crypto.test.ts

# Testar arquivos modificados
npx vitest related --run src/services/crypto.ts

# Verificar integridade de tipagem TypeScript sem emitir código
npx tsc -b --noEmit

# Analisar código e boas práticas
npm run lint
```

Para mais detalhes de contribuição, leia o [**`CONTRIBUTING.md`**](./CONTRIBUTING.md).

---

## 🛡️ Segurança & Divulgação Responsável

Vulnerabilidades de segurança e preocupações criptográficas devem ser reportadas através dos nossos canais privados de assessoria. Consulte o [**`SECURITY.md`**](./SECURITY.md) para detalhes da política de divulgação.

---

## 💬 Comunidade & Suporte

- **Relatórios de Bugs & Problemas**: [GitHub Issues](https://github.com/Vinicius-DEV1/synapse/issues)
- **Sugestões & Discussões**: [GitHub Discussions](https://github.com/Vinicius-DEV1/synapse/discussions)
- **Histórico de Lançamentos**: [CHANGELOG.md](./CHANGELOG.md)

---

## 👤 Autor & Licença

Desenvolvido e arquitetado por **Vinicius Calado** ([@Vinicius-DEV1](https://github.com/Vinicius-DEV1)).

Licenciado sob a **Business Source License 1.1 (BSL 1.1)**.  
Livre e gratuito para todo uso pessoal não-comercial, estudos, pesquisa acadêmica e instâncias pessoais auto-hospedadas. Uso comercial, revenda como serviço (SaaS) ou redistribuição em código fechado são estritamente proibidos sem licença comercial do autor. Converte-se na licença **GNU General Public License v3.0 ou posterior (GPL-3.0-or-later)** em 01/01/2030.

Consulte o arquivo [**`LICENSE`**](./LICENSE) para ver o texto integral.

Copyright (c) 2026 Vinicius Calado ([@Vinicius-DEV1](https://github.com/Vinicius-DEV1)). Todos os direitos reservados.
