# 📓 O Caderno - Manual do Desenvolvedor

**🌍 Link Oficial da Versão Web:** [https://fourth-cirrus-468923-h7.web.app](https://fourth-cirrus-468923-h7.web.app)

Bem-vindo ao manual do seu Super App! Este documento foi criado para servir como um mapa completo caso você queira modificar o código, recriar o banco de dados ou entender como as peças se encaixam no futuro.

---

## 🏛️ 1. Arquitetura do Projeto

O aplicativo é um híbrido (Desktop + Web) com foco em Privacidade Total (Criptografia de Ponta-a-Ponta).

- **Desktop (Tauri/Rust)**: Roda usando Tauri (Rust no backend e WebView no frontend). Usa **SQLite** (rusqlite) para salvar os dados no seu HD. Não precisa de internet para nada (Offline-First).
- **Web (React/Vite)**: Roda no navegador, usa **IndexedDB** para salvar os dados localmente no navegador.
- **Nuvem (Firebase)**: Usado *apenas* como uma ponte de sincronização. O banco de dados do Firebase (Firestore) guarda apenas textos embaralhados (criptografados) ou via Google Drive. Ninguém consegue ler seus dados sem a sua Senha Mestra.

---

## 🚀 2. Como Rodar e Construir

Sempre que baixar o projeto em um computador novo:

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Rodar em Modo de Desenvolvimento (Desktop Tauri)**:
   ```bash
   npm run tauri dev
   ```
   *Isso compila o backend Rust e abre o aplicativo Desktop em modo de desenvolvimento.*

3. **Rodar em Modo de Desenvolvimento (Somente Web)**:
   ```bash
   npm run dev
   ```
   *Inicia um servidor local para abrir no Chrome (geralmente http://localhost:5173).*

4. **Construir para a Web (Deploy)**:
   ```bash
   npm run build:web
   npx firebase-tools deploy --only hosting
   ```
   *Isso pega o código e joga no Firebase Hosting.*

5. **Construir Executável Desktop**:
   ```bash
   npm run tauri build
   ```

---

## 🗄️ 3. Como Resetar / Recriar os Bancos de Dados

Se você quiser apagar tudo e começar do zero:

### No Desktop (SQLite Tauri)
1. Feche o aplicativo.
2. A pasta de dados fica relativa ao executável. Em dev, costuma ser `src-tauri/target/debug/data`. Em produção, fica na mesma pasta do `.exe` dentro da subpasta `data`.
3. Apague o arquivo `caderno.sqlite` dentro dessa pasta `data`.
4. Ao abrir o app novamente, ele criará um banco zerado.

### Na Web (IndexedDB)
1. Abra o site no navegador.
2. Aperte `F12` para abrir as Ferramentas de Desenvolvedor.
3. Vá na aba **Application** (Aplicativo).
4. No menu esquerdo, clique em **Storage** (Armazenamento) e depois no botão **Clear site data** (Limpar dados do site).

### Na Nuvem (Firebase Firestore)
1. Acesse o painel do [Firebase Console](https://console.firebase.google.com).
2. Vá em **Firestore Database**.
3. Exclua as coleções relevantes.

---

## 🛠️ 4. Como Adicionar Novos Recursos / Tabelas

Se no futuro você quiser adicionar uma nova tabela (ex: `sonhos`):

1. **No Desktop (`src-tauri/src/db.rs`)**:
   Encontre a inicialização do banco e adicione o comando SQL para criar a sua nova tabela (ex: `CREATE TABLE IF NOT EXISTS sonhos (...)`). Você também precisará expor um comando em `lib.rs` chamando as funções do banco.

2. **Na Web (`src/services/db-web.ts`)**:
   Você precisará aumentar a versão do banco e dentro do `upgrade(db)` adicionar o código para criar a loja de objetos.

3. **Na Sincronização (`src/services/sync/sync-utils.ts`)**:
   Adicione sua tabela à constante `MODULE_TABLES` no módulo correto. O motor CRDT de sincronização (push/pull) se encarregará do resto magicamente!

---

## 🔑 5. A Senha Mestra (Criptografia)

**NUNCA PERCA SUA SENHA MESTRA!**
O aplicativo não tem botão de "Esqueci minha senha". O processo de criptografia (`AES-GCM`) usa a sua senha para derivar uma chave criptográfica forte no momento do login. Sem essa exata senha, os dados no SQLite e no Firebase serão para sempre apenas um monte de texto embaralhado.

---

## 🛠️ 6. Tutorial: Como Criar um Novo Módulo (Aba Lateral)

1. Crie uma pasta em `src/components/habitos/` e faça a UI (`HabitosView.tsx`).
2. Adicione ao `Sidebar.tsx` o botão de atalho, configurando-o no `ViewFactory.tsx` para gerenciar as abas.
3. Se precisar de persistência, configure os contratos em `src/api/` e implemente a ponte Web (IndexedDB) e Tauri (Rust).
