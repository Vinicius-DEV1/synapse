# Synapse

> **Personal Knowledge Management, Cognitive Study Station & Zero-Knowledge Vault**

Synapse é um ecossistema de produtividade pessoal e segundo cérebro para leitura, anotações, estudo ativo e segurança de dados, unindo **Desktop (Tauri v2 + Rust)**, **Web** e **Mobile**.

---

## 📑 Módulos Principais

### 1. Caderno (Editor & Gestão de Conhecimento)
- **Editor Rico Baseado em ProseMirror/TipTap**: Formatação completa, blocos de código com destaque de sintaxe, listas de tarefas, tabelas e links bidirecionais.
- **Hierarquia e Navegação**: Organização em árvore de páginas, tags dinâmicas, busca instantânea em memória e histórico de versões.
- **Colaboração em Tempo Real**: Suporte a CRDT via **Yjs** para sincronização livre de conflitos.

### 2. Vault (Cofre Seguro & Senhas)
- **Cofre Blindado**: Armazenamento seguro de senhas, credenciais, notas confidenciais e chaves de acesso.
- **Zero-Knowledge Architecture**: Nem o servidor em nuvem nem terceiros têm acesso aos seus dados descriptografados.
- **Gerador de Senhas Integrado**: Criação de credenciais de alta entropia categorizadas por grupos e tags.

### 3. Arquivos, Documentos & Leitor
- **Leitor Multiformato (PDF & EPUB)**: Leitor imersivo com controle de progresso, grifos coloridos, marcadores e extração de texto via OCR (Tesseract).
- **Player de Vídeo & Áudio para Estudos**: Reprodutor com transcrição interativa de legendas, sincronização de vocabulário e integração de download do YouTube.
- **Diagramas e Esboços**: Canvas visual infinito integrado (Tldraw) para diagramação de ideias.

---

## 🔐 Criptografia & Segurança da Aplicação

Synapse foi concebido sob o princípio de **privacidade em primeiro lugar (Privacy-First)**:

| Camada | Tecnologia / Padrão | Descrição |
| :--- | :--- | :--- |
| **Derivação de Chave** | **PBKDF2-HMAC-SHA256** | 600.000 iterações com salt criptográfico exclusivo para resistência contra ataques de força bruta. |
| **Cifra Simétrica** | **AES-256-GCM** | Criptografia autenticada com IV único de 12 bytes gerado via CSPRNG para cada operação. |
| **Integridade dos Dados** | **Tag de Autenticação 128-bit** | Detecção e rejeição imediata de qualquer modificação ou adulteração de dados (*wire format*: `iv:auth_tag:ciphertext`). |
| **Segurança em Memória** | **`auth_lock` / Zeroize** | Zeramento seguro de chaves mestras e buffers sensíveis na memória RAM após expiração ou bloqueio de sessão. |
| **Proteção de Interface** | **DOMPurify & CSP Estrito** | Sanitização contra injeção de scripts (XSS) e Content Security Policy rígido no Tauri e na Web. |

---

## ☁️ Sincronização em Nuvem (Firebase & Google Drive)

### 1. Firebase (Firestore & Auth)
- Sincronização em tempo real de notas, flashcards, metadados e configurações entre dispositivos.
- Todos os registros sensíveis são armazenados no Firestore **já cifrados ponta a ponta (E2EE)** antes de saírem do cliente.
- Mecanismo resiliente com fila de sincronização offline e resolução determinística por timestamp de atualização.

### 2. Google Drive (Storage de Alta Capacidade)
- Integração nativa via **OAuth2 com PKCE** (Proof Key for Code Exchange) para autenticação segura sem expor credenciais fixas.
- Armazenamento de mídias pesadas (vídeos de estudo, bibliotecas de PDFs e backups completos de banco de dados).
- Suporte a upload resumível (*Resumable Sessions*) com reconexão automática e tolerância a falhas de rede.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19, TypeScript, TailwindCSS, TipTap (ProseMirror), Yjs, Lucide Icons.
- **Desktop (Backend)**: Tauri v2, Rust (`aes-gcm`, SQLite, plugins de shell e filesystem).
- **Armazenamento Local**: IndexedDB (`idb`) no navegador e SQLite nativo no desktop.
- **Mídia & Utilitários**: FFmpeg, PDF.js, EpubJS, Tesseract OCR, Tldraw, Canvas Confetti.

---

## 🚀 Como Executar

### 1. Pré-requisitos
- Node.js 18+ e npm
- Rust e Cargo (para o runtime Tauri no Desktop)

### 2. Instalação e Configuração
```bash
# Clone o repositório privado
git clone https://github.com/Vinicius-DEV1/synapse.git
cd synapse

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
```

Preencha o `.env` com suas credenciais do Firebase e Google Drive conforme o `.env.example`.

### 3. Executando em Desenvolvimento
```bash
# Modo Web
npm run dev

# Modo Desktop (Tauri)
npm run tauri dev
```

---

## 📄 Licença
Propriedade privada de Vinicius Calado (@Vinicius-DEV1). Todos os direitos reservados.
