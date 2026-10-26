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
- [Testes & Garantia de Qualidade](#-testes--garantia-de-qualidade)
- [Segurança & Divulgação Responsável](#-segurança--divulgação-responsável)
- [Autor & Licença](#-autor--licença)

---

## 💡 Visão & Filosofia Central

Aplicativos modernos de gestão de conhecimento pessoal frequentemente forçam uma escolha entre **conveniência** e **privacidade**, ou entre **velocidade** e **recursos ricos**. O Synapse elimina esse dilema com base em cinco pilares fundamentais:

1. **Privacidade Absoluta & Zero-Knowledge por Padrão**: Seus dados pertencem unicamente a você. Todo o conteúdo (anotações, senhas, finanças, flashcards, arquivos) é criptografado localmente no dispositivo usando **AES-256-GCM** antes de qualquer gravação em disco ou nuvem. Servidores remotos (Firebase / Google Drive) atuam como meros repetidores cegos de dados criptografados.
2. **Local-First & Resiliência Offline**: O aplicativo lê e escreve imediatamente em bancos de dados locais de latência zero (**SQLite** no Desktop, **IndexedDB** na Web). Você trabalha sem depender de internet, e os dados se reconciliam deterministamente quando conectado.
3. **Latência Percebida de Microssegundos**: Construído com cache Stale-While-Revalidate (SWR) e aceleração de CSS por hardware (GPU), eliminando re-renderizações desnecessárias do React e garantindo transições a 60 FPS.
4. **Eficiência Nativa sem Bloatware Web**: Utilizando **Tauri v2 e Rust** em vez do pesado Electron, o Synapse consome apenas ~30–50 MB de RAM (contra mais de 300 MB do Electron) com instaladores até 10 vezes menores.
5. **Aceleração Cognitiva**: Integrado ao moderno algoritmo de repetição espaçada **FSRS** e à inteligência contextual do **Google Gemini AI**, transformando anotações passivas em um motor ativo de aprendizagem e retenção de longo prazo.

---

## 🌐 Matriz de Suporte Multiplataforma

| Plataforma | Runtime | Motor de Persistência | Recursos Nativos | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Linux** (Desktop) | Tauri v2 / WebKitGTK / Rust | SQLite Nativo (`rusqlite`) | Sistema de arquivos direto, streaming HTTP local (`axum`), FFmpeg / yt-dlp nativo | **Produção** |
| **Windows** (Desktop) | Tauri v2 / WebView2 / Rust | SQLite Nativo (`rusqlite`) | Sistema de arquivos direto, streaming HTTP local (`axum`), integração shell Windows | **Produção** |
| **macOS** (Desktop) | Tauri v2 / WebKit / Rust | SQLite Nativo (`rusqlite`) | Sistema de arquivos direto, streaming HTTP local (`axum`), binário universal Apple Silicon | **Produção** |
| **Web / PWA** (Navegador) | Navegadores Modernos | IndexedDB (`idb`) | Service Worker (`sw.js`) com descriptografia sob demanda, Web Crypto API | **Produção** |
| **Docker / Self-Hosted** | Contêiner Linux (Alpine + Nginx) | IndexedDB + Nuvem | Hospedagem estática independente com cabeçalhos de segurança endurecidos | **Produção** |
| **Mobile Companion** | React Native 0.81 / Expo SDK 54 | IndexedDB + Cache Offline | Haptics nativos (`expo-haptics`), interceptação do botão voltar, Safe Areas | **Beta Ativo** |

---

## 📦 Módulos do Sistema

### 1. 📝 Synapse Notes (Motor de Escrita & Segundo Cérebro)
- Editor em blocos baseado em TipTap v3 e ProseMirror com fórmulas LaTeX, realce de código (`lowlight`), tabelas e tarefas.
- Árvore hierárquica dinâmica com organização por arrastar e soltar (`@dnd-kit`).
- Colaboração e sincronização em tempo real sem conflitos alimentada por **Yjs CRDTs**.
- Histórico visual de revisões com diffs detalhados (`htmldiff-js`).

### 2. 🔐 Vault (Cofre Zero-Knowledge de Senhas e Credenciais)
- Gerenciador seguro com criptografia em nível de campo (AES-256-GCM).
- Gerador de senhas de alta entropia e verificação de vazamentos via API k-Anonymity do Have I Been Pwned (HIBP).

### 3. 🧠 Anki & Repetição Espaçada (Motor FSRS)
- Algoritmo moderno Free Spaced Repetition Scheduler (`ts-fsrs` v5) calculando estabilidade e recuperabilidade de memória.
- Métricas visuais, mapa de calor e geração de flashcards contextuais com Gemini AI.

### 4. 🎯 Baterias de Questões & Simulado de Foco
- Ambiente de resolução de questões em tela cheia (canvas zen) para foco absoluto.
- Navegação rápida orientada a teclado (`A`, `B`, `C`, `D`, `Enter`, `Esc`).

### 5. 📚 Biblioteca Digital & Leitor de Documentos (PDF & EPUB)
- Leitor integrado de EPUB (`epubjs`) e PDF (`pdfjs-dist`) com visão de página dupla e progresso.
- Reconhecimento óptico de caracteres (OCR) no próprio dispositivo via **Tesseract OCR**.

### 6. 🎬 Estúdio de Vídeo & Cultura
- Player de vídeo de alta definição para contêineres criptografados **ENC1** com legendas (VTT/SRT).
- Downloader e extrator de áudio do YouTube integrado (`yt-dlp` / `ffmpeg`).

### 7. 🗣️ Prática de Imersão em Idiomas (Gemini AI)
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

### Instalação & Início Rápido

```bash
# 1. Clone o repositório
git clone https://github.com/Vinicius-DEV1/synapse.git
cd synapse

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente (opcional para uso local)
cp .env.example .env

# 4. Inicie o servidor Web de desenvolvimento (porta 35174)
npm run dev

# 5. Ou inicie o aplicativo Desktop nativo (Tauri v2 + Rust)
npm run tauri dev
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

## 👤 Autor & Licença

Desenvolvido e arquitetado por **Vinicius Calado** ([@Vinicius-DEV1](https://github.com/Vinicius-DEV1)).

Licenciado sob a **Business Source License 1.1 (BSL 1.1)**.  
Livre e gratuito para todo uso pessoal não-comercial, estudos, pesquisa acadêmica e instâncias pessoais auto-hospedadas. Uso comercial, revenda como serviço (SaaS) ou redistribuição em código fechado são estritamente proibidos sem licença comercial do autor. Converte-se na licença **GNU General Public License v3.0 ou posterior (GPL-3.0-or-later)** em 01/01/2030.

Consulte o arquivo [**`LICENSE`**](./LICENSE) para ver o texto integral.

Copyright (c) 2026 Vinicius Calado ([@Vinicius-DEV1](https://github.com/Vinicius-DEV1)). Todos os direitos reservados.
