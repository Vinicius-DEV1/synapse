# Guia de Instalação e Build (Setup)

Este guia cobre a instalação e a geração dos executáveis de desenvolvimento e produção do aplicativo Caderno.

## Pré-requisitos (Desktop & Web)

1. **Node.js**: (Recomendado v18+).
2. **Rust**: (Recomendado versão estável atual). Instale via `rustup`.
3. **C++ Build Tools / Visual Studio** (Apenas para Windows).
4. **Dependências do Tauri** (Apenas Linux): Instale as bibliotecas GTK+ e WebKit. (Ver documentação oficial do Tauri).

## Instalação do Projeto

Clone o repositório e instale as dependências NPM (isso irá satisfazer o Vite e React):

```bash
npm install
```

## Desenvolvimento

### Executando em ambiente Web Puro (Mock/Fallback)
Para rodar apenas o frontend sem as bibliotecas do Tauri, use:

```bash
npm run dev
```

### Executando o aplicativo Híbrido Completo (Desktop)
Para inicializar o backend Rust e atrelar a janela do Tauri ao servidor do Vite, execute:

```bash
npm run tauri dev
```
> O primeiro build do Rust pode demorar alguns minutos para compilar as dependências (como aes-gcm e reqwest).

## Build para Produção

Para compilar o aplicativo final otimizado, use:

```bash
npm run tauri build
```
O executável final estará disponível em `src-tauri/target/release/`.

## Variáveis de Ambiente
Crie um `.env` na raiz do projeto (se necessário) para substituir a URL de Redirecionamento do Google Drive OAuth:
```env
VITE_DRIVE_CLIENT_SECRET=YOUR_SECRET
VITE_DRIVE_REDIRECT_URI=http://localhost:5173
```
