# 📓 O Caderno - Manual do Desenvolvedor

**🌍 Link Oficial da Versão Web:** [https://fourth-cirrus-468923-h7.web.app](https://fourth-cirrus-468923-h7.web.app)

Bem-vindo ao manual do seu Super App! Este documento foi criado para servir como um mapa completo caso você queira modificar o código, recriar o banco de dados ou entender como as peças se encaixam no futuro.

---

## 🏛️ 1. Arquitetura do Projeto

O aplicativo é um híbrido (Desktop + Web) com foco em Privacidade Total (Criptografia de Ponta-a-Ponta).

- **Desktop (Electron)**: Roda em NodeJS, usa **SQLite** para salvar os dados no seu HD. Não precisa de internet para nada (Offline-First).
- **Web (React/Vite)**: Roda no navegador, usa **IndexedDB** para salvar os dados localmente no navegador.
- **Nuvem (Firebase)**: Usado *apenas* como uma ponte de sincronização. O banco de dados do Firebase (Firestore) guarda apenas textos embaralhados (criptografados). Ninguém (nem o Google) consegue ler seus dados sem a sua Senha Mestra.

---

## 🚀 2. Como Rodar e Construir

Sempre que baixar o projeto em um computador novo:

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Rodar em Modo de Desenvolvimento (Desktop + Web)**:
   ```bash
   npm run dev
   ```
   *Isso abre o Electron (Desktop) e também inicia um servidor local para você abrir no Chrome (geralmente http://localhost:35174).*

3. **Construir para a Web (Primeiro Deploy)**:
   ```bash
   npm run build:web
   npx firebase-tools login
   npx firebase-tools deploy --only hosting
   ```
   *Isso pega o código e joga no Firebase Hosting pela primeira vez.*

4. **Enviar Atualizações para a Nuvem**:
   Sempre que você alterar o código-fonte (corrigir um bug ou adicionar um recurso) e quiser que as mudanças apareçam no site oficial, rode a Dupla Dinâmica:
   ```bash
   npm run build:web
   npx firebase-tools deploy --only hosting
   ```

---

## 🗄️ 3. Como Resetar / Recriar os Bancos de Dados

Se você quiser apagar tudo e começar do zero (ou se o banco de dados corromper):

### No Desktop (SQLite)
1. Feche o aplicativo.
2. Aperte `Win + R`, digite `%APPDATA%` e dê Enter.
3. Procure a pasta `caderno`.
4. Apague o arquivo `caderno.sqlite`.
5. Ao abrir o app novamente, ele criará um banco zerado e pedirá para você criar uma nova Senha Mestra.

### Na Web (IndexedDB)
1. Abra o site no navegador.
2. Aperte `F12` para abrir as Ferramentas de Desenvolvedor.
3. Vá na aba **Application** (Aplicativo).
4. No menu esquerdo, clique em **Storage** (Armazenamento) e depois no botão **Clear site data** (Limpar dados do site).

### Na Nuvem (Firebase Firestore)
1. Acesse o painel do [Firebase Console](https://console.firebase.google.com).
2. Vá em **Firestore Database**.
3. Exclua as coleções (clique nos 3 pontinhos ao lado de cada coleção como `pages`, `transactions`, etc., e escolha "Excluir coleção").

---

## 🛠️ 4. Como Adicionar Novos Recursos / Tabelas

Se no futuro você quiser adicionar, por exemplo, um "Diário de Sonhos", você precisará atualizar 3 lugares:

1. **No Desktop (`electron/main.ts`)**:
   Encontre a função `setupTables()` e adicione o comando SQL para criar a sua nova tabela (ex: `CREATE TABLE sonhos (...)`).

2. **Na Web (`src/services/db-web.ts`)**:
   Encontre a função `openDB('caderno_web', 1, ...)`. Você precisará aumentar a versão de `1` para `2`, e dentro do `upgrade(db)` adicionar o código para criar a loja:
   ```javascript
   if (!db.objectStoreNames.contains('sonhos')) {
     db.createObjectStore('sonhos', { keyPath: 'id' });
   }
   ```

3. **Na Sincronização (`src/services/sync.ts`)**:
   Encontre a constante `SYNC_TABLES` no topo do arquivo e adicione o nome da sua nova tabela (`'sonhos'`). O robô de sincronização fará o resto da mágica sozinho!

---

## 📝 5. Limitações e "Cases" Conhecidos

- **Upload de PDFs (Firebase Storage)**:
  Atualmente, o app Web não baixa PDFs automaticamente. Isso ocorre porque o Google Firebase passou a exigir um cartão de crédito cadastrado (Plano Blaze) para ativar o Storage. Como optamos por não usar cartão, a leitura de PDFs fica restrita ao arquivo local no Desktop.
  - *Solução Futura*: Caso mude de ideia, basta ativar o Storage no Firebase e o código atual já voltará a funcionar magicamente. Outra alternativa seria implementar o salvamento do PDF em Base64 no IndexedDB.

---

## 🔑 6. A Senha Mestra (Criptografia)

**NUNCA PERCA SUA SENHA MESTRA!**
O aplicativo não tem botão de "Esqueci minha senha". O processo de criptografia (`AES-GCM`) usa a sua senha para derivar uma chave criptográfica forte no momento do login. Sem essa exata senha, os dados no SQLite e no Firebase serão para sempre apenas um monte de texto embaralhado.

---

## 🛠️ 7. Tutorial: Como Criar um Novo Módulo (Aba Lateral)

Quer criar algo novo, como um "Rastreador de Hábitos"? Siga este passo a passo:

### Passo 1: Criar o Componente Visual (React)
1. Crie uma pasta em `src/components/habitos/`
2. Crie o arquivo `HabitosView.tsx` com a interface da sua tela.

### Passo 2: Adicionar ao Menu Lateral (Sidebar)
1. Abra `src/components/Sidebar.tsx`.
2. Importe um ícone novo do `lucide-react` (ex: `CheckCircle`).
3. Adicione o botão no menu apontando para o módulo `'habitos'`:
   ```javascript
   <button onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', module: 'habitos' })}>
     <CheckCircle /> Hábitos
   </button>
   ```

### Passo 3: Registrar no Estado Global (Store)
1. Abra `src/types.ts`.
2. Adicione `'habitos'` no tipo `ActiveModule`: 
   `export type ActiveModule = 'notes' | 'library' | 'finance' | 'habitos';`

### Passo 4: Exibir na Tela Principal
1. Abra `src/App.tsx`.
2. Encontre a seção `{/* Main Area */}`.
3. Adicione a condição para renderizar o seu componente:
   ```javascript
   {state.activeModule === 'notes' ? (
     <PageView />
   ) : state.activeModule === 'library' ? (
     <LibraryView />
   ) : state.activeModule === 'finance' ? (
     <FinanceView />
   ) : (
     <HabitosView />
   )}
   ```

### Passo 5: Banco de Dados (Opcional)
Se o seu novo módulo precisar salvar dados, volte no **Capítulo 4** deste manual e adicione a tabela `habitos` no SQLite, no IndexedDB e no Robô de Sincronização. Use a função genérica `upsertRow` ou adicione funções específicas no `window.api`.
