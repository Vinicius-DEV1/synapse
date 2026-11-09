# Mapa do Banco de Dados Canônico SQLite (`caderno.sqlite`)

> **Documento Oficial de Engenharia de Dados**  
> **Localização Canônica:** `/home/vini/.local/share/com.caderno.app/caderno.sqlite`  
> **Tamanho Real Verificado:** 114 MB  
> **Total de Tabelas:** 51 tabelas existentes  
> **Padrão de Exclusão:** Soft Delete obrigatório (`deleted_at IS NULL`)

---

## 1. Visão Geral das Entidades e Volumetria Real

O banco de dados SQLite existente contém dados de produção acumulados pelo usuário. Qualquer operação de leitura deve respeitar estritamente a cláusula `deleted_at IS NULL` para ocultar registros arquivados ou deletados.

| Entidade / Tabela | Linhas Ativas (Aprox) | Descrição do Domínio |
|---|:---:|---|
| `pages` | 162 | Documentos e notas de estudo (formato TipTap JSON / Markdown) |
| `videos` | 28 | Mídias de vídeo, aulas gravadas e progressos de visualização |
| `anki_decks` | 10 | Baralhos hierárquicos de flashcards (Tecnologia, React, Laravel, etc.) |
| `anki_cards` | 0+ | Cartões de estudo frente/verso com tags |
| `anki_srs_state` | 0+ | Estado FSRS (estabilidade, dificuldade, repetições, lapsos, due_date) |
| `anki_reviews` | 0+ | Histórico de avaliações de repetição espaçada |
| `quiz_batteries` | 0+ | Baterias de simulados e questões de concurso / estudos |
| `quiz_questions` | 0+ | Questões de múltipla escolha com opções em JSON e gabarito |
| `quiz_attempts` | 0+ | Registro de tentativas, respostas do usuário e métricas de tempo |
| `transactions` | 10 | Transações financeiras (receitas, despesas, empréstimos) |
| `finance_accounts`| 2 | Contas bancárias e carteiras |
| `wishlist` | 22 | Lista de desejos com preços, prioridades e links |
| `habits` | 0+ | Hábitos diários com metas semanais |
| `habit_logs` | 0+ | Check-ins diários de hábitos executados |
| `calendar_events` | 13 | Compromissos e aulas ao vivo na agenda |
| `library_books` | 27 | Livros e E-pubs com progresso de leitura |
| `culture_items` | 37 | Filmes, séries, animes e leituras culturais com pôsteres |
| `culture_episodes`| 65 | Registro individual de episódios/capítulos assistidos |
| `focus_sessions` | 0+ | Sessões registradas de Pomodoro com tags |
| `lofis` | 3 | Trilhas de áudio Lofi para foco |
| `vault_groups` | 4 | Grupos de credenciais e senhas |
| `vault_items` | 37 | Credenciais seguras (usuários, senhas, notas e URLs) |

---

## 2. Esquemas Detalhados por Módulo

### 2.1. Páginas & Notas (`pages`)
```sql
CREATE TABLE pages (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,          -- Armazena o documento TipTap em JSON ou texto
    icon TEXT,             -- Emoji ou ícone representativo (ex: "📄", "🚀")
    parent_id TEXT,        -- UUID da pasta pai (para árvore hierárquica)
    sort_order INTEGER,    -- Ordem de exibição na barra lateral
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT        -- NULL se ativo
);
```

### 2.2. Baralhos e Cartões Anki (`anki_decks`, `anki_cards`, `anki_srs_state`)
```sql
CREATE TABLE anki_decks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT,        -- Permite sub-baralhos hierárquicos
    color TEXT,            -- Código Hex (#4F46E5, etc.)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE anki_cards (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL,
    front TEXT NOT NULL,   -- Texto ou enunciado da frente
    back TEXT NOT NULL,    -- Resposta ou explicação do verso
    extra_note TEXT,
    tags TEXT,             -- Tags separadas por vírgula ou JSON
    card_type TEXT DEFAULT 'basic',
    validation_mode TEXT DEFAULT 'default',
    media_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE anki_srs_state (
    id TEXT PRIMARY KEY,   -- Mesmo ID do anki_cards correspondente
    due_date TEXT NOT NULL,
    stability REAL NOT NULL,
    difficulty REAL NOT NULL,
    elapsed_days INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    lapses INTEGER NOT NULL,
    state TEXT NOT NULL,   -- 'new', 'learning', 'review', 'relearning'
    last_review TEXT,
    scheduled_days INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
```

### 2.3. Baterias de Questões & Simulado Zen (`quiz_batteries`, `quiz_questions`)
```sql
CREATE TABLE quiz_batteries (
    id TEXT PRIMARY KEY,
    page_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    layout TEXT DEFAULT 'zen',
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE quiz_questions (
    id TEXT PRIMARY KEY,
    battery_id TEXT NOT NULL,
    type TEXT DEFAULT 'multiple_choice',
    question TEXT NOT NULL,
    options TEXT NOT NULL,        -- JSON array de strings: ["Opção A", "Opção B", ...]
    correct_index INTEGER NOT NULL, -- Índice da alternativa correta (0, 1, 2...)
    expected_answer TEXT,
    explanation TEXT,             -- Explicação/Gabarito comentado
    tags TEXT,
    sort_order INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
```

### 2.4. Finanças & Wishlist (`transactions`, `finance_accounts`, `wishlist`)
```sql
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,           -- 'income', 'expense', 'loan_made', 'loan_taken'
    category TEXT NOT NULL,       -- 'Alimentação', 'Moradia', 'Geral', etc.
    date TEXT NOT NULL,           -- Formato 'YYYY-MM-DD'
    status TEXT DEFAULT 'pending',-- 'completed', 'pending'
    account_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    deleted_at TEXT
);

CREATE TABLE wishlist (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price REAL NOT NULL,
    priority TEXT NOT NULL,       -- 'low', 'medium', 'high'
    category TEXT NOT NULL,
    link TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    deleted_at TEXT
);
```

### 2.5. Biblioteca de Livros (`library_books`)
```sql
CREATE TABLE library_books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    file_path TEXT NOT NULL,
    cover_color TEXT,
    cover_image TEXT,
    total_pages INTEGER DEFAULT 0,
    current_page INTEGER DEFAULT 0,
    reading_status TEXT DEFAULT 'reading', -- 'reading', 'completed', 'unread'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
```

### 2.6. Cultura & Mídia (`culture_items`, `culture_episodes`)
```sql
CREATE TABLE culture_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'filme', 'serie', 'anime', 'manga', 'livro'
    synopsis TEXT,
    cover_image TEXT,             -- URL HTTP da capa/pôster
    status TEXT NOT NULL,         -- 'watching', 'completed', 'planned', 'dropped'
    progress INTEGER DEFAULT 0,   -- Episódios ou capítulos consumidos
    total_episodes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
```

### 2.7. Cofre E2EE (`vault_groups`, `vault_items`)
```sql
CREATE TABLE vault_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    position INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    deleted_at TEXT
);

CREATE TABLE vault_items (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    label TEXT NOT NULL,
    username TEXT,
    email TEXT,
    password TEXT NOT NULL,       -- Cifrada com AES-GCM ou em texto se cofre desbloqueado
    url TEXT,
    notes TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    deleted_at TEXT
);
```

---

## 3. Diretrizes de Consulta para Desenvolvedores e Agentes

1. **Nunca use consultas destrutivas (`DROP`, `TRUNCATE`).**
2. **Ao deletar um item, utilize soft delete:**
   ```sql
   UPDATE <tabela> SET deleted_at = '2026-11-09T...' WHERE id = '...';
   ```
3. **Escaping e Injeção:** Em C++, utilize o método `escapeSql(str)` do `SynapseDataController` para duplicar aspas simples (`'` -> `''`).
4. **Geração de Chaves:** Em C++, use `QUuid::createUuid().toString(QUuid::WithoutBraces)`. No Rust, use `uuid::Uuid::new_v4().to_string()`.

