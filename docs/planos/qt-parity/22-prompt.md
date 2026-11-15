# Prompt — Qt Desktop Parity Agent

> Copy everything below the line and paste it to your autonomous agent.

---

## 🎯 Missão

Você é o agente responsável por trazer o app desktop nativo Qt (`apps/desktop-qt/`) à **paridade completa de features** com o app web React (`apps/web-react/src/`). Cada feature visível ao usuário no React deve ter um equivalente funcional e visualmente fiel no Qt — sem exceção.

## 📋 Plano de Execução

O plano completo está documentado em **`docs/planos/qt-parity/`**. Ele contém:

### Arquivo Principal
- **`00-master-plan.md`** — Visão geral, tabela de status de todos os 21 módulos, ordem de execução em 4 fases, 20 regras obrigatórias, e comandos de build/verificação. **Leia este arquivo PRIMEIRO antes de qualquer coisa.**

### Arquivos de Módulo (um por módulo)
Cada arquivo contém: referência dos arquivos React, status atual do Qt, tabela de paridade feature-a-feature, e especificações de implementação detalhadas para cada feature faltante.

| Arquivo | Módulos |
|---------|---------|
| `01-notes-editor.md` | Notes & Editor (~74 features) |
| `02-anki.md` | Anki / Flashcards (38 features) |
| `03-questions.md` | Questions / Quiz (18 features) |
| `04-finance.md` | Finance (25 features) |
| `05-habits.md` | Habits (10 features) |
| `06-calendar.md` | Calendar (16 features) |
| `07-video.md` | Video (30 features) |
| `08-library.md` | Library (57 features) |
| `09-files.md` | Files (48 features) |
| `10-vault.md` | Vault / Encryption (20 features) |
| `11-focus.md` | Focus Timer (25 features) |
| `12-diagrams.md` | Diagrams / Whiteboard (22 features) |
| `13-culture.md` | Culture / Media Tracking (35 features) |
| `14-17-home-settings-trash-notifications.md` | Home, Settings, Trash, Notifications (28 features) |
| `18-layout-shell.md` | Layout & App Shell (25 features) |
| `19-workspace-auth.md` | Workspace, Auth, Sharing (22 features) |
| `20-21-practice-ai-sidebar.md` | Practice (AI Voice) & AI Sidebar (35 features) |

## ⚙️ Fluxo de Trabalho Obrigatório

Para **cada módulo**, siga este ciclo rigorosamente:

### 1. LEIA o Plano
```
Abrir: docs/planos/qt-parity/<NN>-<modulo>.md
```

### 2. LEIA o Código React de Referência
Antes de escrever qualquer linha de Qt, leia os arquivos React listados na seção "React Reference" do plano. Entenda **completamente** a lógica, estados, fluxos, edge cases, empty states, loading states, e error states.

### 3. VERIFIQUE o Qt Existente
Leia os arquivos Qt já existentes listados na seção "Qt Existing" para não duplicar trabalho.

### 4. IMPLEMENTE as Features Faltantes
Siga as especificações de implementação na seção "Implementation Specs" do plano. Cada spec detalha:
- QML views a criar
- C++ controllers a criar/atualizar
- Bridge functions a chamar/criar
- Core functions necessárias

### 5. VERIFIQUE
```bash
# Build DEVE passar
cmake --build apps/desktop-qt/build --target synapse-desktop -j$(nproc)

# Tests DEVEM passar
ctest --test-dir apps/desktop-qt/build -R '^native-' --output-on-failure --parallel 2

# QML lint DEVE passar
find apps/desktop-qt/qml/<modulo>/ -name "*.qml" -exec qmllint {} +

# Rust core e bridge DEVEM compilar
cd core/synapse-core && cargo check
cd bridges/bridge-qt && cargo check
```

### 6. ATUALIZE o Tracker de Paridade
```
Atualizar: docs/native-desktop-parity.md
```
Marque as features completadas e atualize porcentagens.

### 7. COMMIT Atômico
```bash
git add -A
git commit -m "feat(desktop-qt/<modulo>): implement <feature description>"
```
Um commit por feature ou grupo lógico coeso. Nunca um commit monolítico com o módulo inteiro.

### 8. PRÓXIMO MÓDULO
Repita o ciclo para o próximo módulo na ordem de execução.

## 🚨 20 Regras Invioláveis

> **VIOLAÇÃO = REFAZER O TRABALHO**

### Arquitetura (Regras 1-5)
1. **Controllers são orquestradores FINOS** — `Q_PROPERTY`, `Q_INVOKABLE`, `emit signals`. Eles NÃO devem montar SQL, calcular métricas de negócio, ou implementar lógica de domínio.
2. **Toda lógica de domínio** passa por `bridges/bridge-qt/` → `core/synapse-core/`.
3. **Views QML** cuidam APENAS de apresentação — sem chamadas ao banco, sem cálculos.
4. **Theme.qml** centraliza todos os design tokens. Usar `Theme.*` em todo QML.
5. **Mesmos IDs canônicos de módulo** — React `components/finance/` → Qt `qml/finance/` + `src/controllers/finance/`.

### Organização (Regras 6-10)
6. **Views QML**: `apps/desktop-qt/qml/<modulo>/<ComponentName>.qml`
7. **Controllers C++**: `apps/desktop-qt/src/controllers/<modulo>/<name>_controller.cpp`
8. **Testes**: `apps/desktop-qt/tests/<modulo>/`
9. **Atualizar CMakeLists.txt** sempre que adicionar ou remover arquivos.
10. **Máximo ~300 linhas por arquivo** — decompor em sub-componentes.

### Qualidade (Regras 11-15)
11. **Build deve passar** — sempre.
12. **Testes devem passar** — sempre.
13. **QML lint deve passar** — sempre.
14. **Sem equivalentes de `window.confirm`** — usar diálogos estilizados com Theme.
15. **Todos os comentários em inglês**.

### Paridade (Regras 16-20)
16. **Ler o arquivo React PRIMEIRO** antes de implementar o equivalente Qt.
17. **Toda feature visível ao usuário** deve ter contraparte Qt — empty states, loading states, error states, keyboard shortcuts, context menus.
18. **NÃO simplificar ou remover features** — se o React tem, o Qt deve ter.
19. **Atualizar `docs/native-desktop-parity.md`** ao fechar um gap.
20. **Atualizar `docs/security/native-encryption-audit.md`** quando houver mudanças em vault/crypto.

## 📐 Ordem de Execução (4 Fases)

### Fase 1 — Estrutura Core & Shell (P0-P1)
1. **Layout & Shell** (`18-layout-shell.md`) — sidebar, tabs, navegação global
2. **Vault** (`10-vault.md`) — criptografia deve funcionar antes de qualquer módulo com dados sensíveis
3. **Notes & Editor** (`01-notes-editor.md`) — maior módulo; começar pelas extensões de editor faltantes

### Fase 2 — Core de Estudos (P1)
4. **Anki** (`02-anki.md`) — flashcards com todos os tipos de card e sessão de estudo
5. **Questions** (`03-questions.md`) — sistema de quiz com modo foco
6. **Practice** (`20-21-practice-ai-sidebar.md`, seção Practice) — agrega anki + quiz + voz IA

### Fase 3 — Módulos de Dados (P2)
7. **Finance** (`04-finance.md`)
8. **Habits** (`05-habits.md`)
9. **Calendar** (`06-calendar.md`)
10. **Culture** (`13-culture.md`)
11. **Video** (`07-video.md`)
12. **Library** (`08-library.md`)
13. **Files** (`09-files.md`)
14. **Settings** (`14-17-home-settings-trash-notifications.md`, seção Settings)

### Fase 4 — Polimento & Extras (P3)
15. **Home** (`14-17-home-settings-trash-notifications.md`, seção Home)
16. **Focus** (`11-focus.md`)
17. **Diagrams** (`12-diagrams.md`)
18. **Trash** (`14-17-home-settings-trash-notifications.md`, seção Trash)
19. **Notifications** (`14-17-home-settings-trash-notifications.md`, seção Notifications)
20. **Workspace & Auth** (`19-workspace-auth.md`)
21. **AI Sidebar** (`20-21-practice-ai-sidebar.md`, seção AI Sidebar)

## 🏗️ Referências Arquiteturais Importantes

### Estrutura de Diretórios
```
apps/desktop-qt/
├── qml/                  # Views QML organizadas por módulo
│   ├── Theme.qml         # Design tokens (cores, tipografia, espaçamento)
│   ├── Main.qml           # Entry point
│   ├── layout/            # App shell, sidebar, tabs, navigation
│   ├── notes/             # Editor e navegação de notas
│   ├── anki/              # Flashcards
│   ├── finance/           # Finanças
│   └── ...                # Demais módulos
├── src/
│   ├── main.cpp           # Entry point C++
│   ├── controllers/       # Controllers C++ organizados por módulo
│   │   ├── layout/
│   │   ├── notes/
│   │   ├── anki/
│   │   └── ...
│   └── utils/             # Utilitários C++ compartilhados
├── tests/                 # Testes organizados por módulo
└── CMakeLists.txt         # Build system

bridges/bridge-qt/         # Rust FFI bridge
├── src/lib.rs             # Exports
├── synapse_bridge.h       # Header C++ gerado
└── database_parameters.rs # Parâmetros tipados

core/synapse-core/         # Rust SSOT
├── src/
│   ├── domain/            # Entidades e lógica por módulo
│   ├── db/                # SQLite WAL, migrations, repositories
│   ├── crypto/            # PBKDF2, AES-256-GCM, keychain
│   └── fsrs/              # Spaced repetition algorithm
```

### Padrão Controller → Bridge → Core
```cpp
// ❌ ERRADO — lógica de negócio no controller
double FinanceController::calculateBalance() {
    double total = 0;
    for (auto& t : transactions_) total += t.amount;
    return total;
}

// ✅ CORRETO — delegação ao bridge/core
double FinanceController::balance() const {
    return synapse_finance_get_balance(db_handle_);
}
```

### Padrão QML View
```qml
// ✅ CORRETO — view usa controller, Theme, e é puramente apresentacional
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    color: Theme.background
    
    ColumnLayout {
        Label {
            text: controller.title
            color: Theme.textPrimary
            font.pixelSize: Theme.fontSizeLarge
        }
        
        Button {
            text: qsTr("Save")
            onClicked: controller.save()
        }
    }
}
```

## 📊 Métricas de Escala

| Métrica | React (Referência) | Qt (Atual) | Gap |
|---------|-------------------|------------|-----|
| Linhas de código | ~195,500 | ~62,300 | ~133,200 |
| Arquivos de componente | ~1,316 .ts/.tsx | ~271 .qml + ~133 .cpp/.h | ~912 |
| Features mapeadas no plano | — | — | ~470+ features |

## ✅ Checklist de Conclusão

Quando **TODOS** os módulos estiverem implementados:

- [ ] Todas as features listadas nas tabelas de paridade estão ✅ Done
- [ ] `docs/native-desktop-parity.md` está 100% atualizado
- [ ] `docs/security/native-encryption-audit.md` está atualizado
- [ ] Build passa sem warnings
- [ ] Todos os testes passam
- [ ] QML lint passa em todos os arquivos
- [ ] Cargo check passa para `synapse-core` e `bridge-qt`
- [ ] Nenhum arquivo excede ~300 linhas
- [ ] Nenhum controller contém SQL bruto ou lógica de domínio
- [ ] Todos os commits seguem conventional commits

## 🔑 Regra de Ouro

> **Se o React tem, o Qt DEVE ter.**
> Não simplifique. Não remova. Não pule.
> Leia o React, entenda, implemente no Qt fielmente.

---

*Comece lendo `docs/planos/qt-parity/00-master-plan.md` e depois vá para o primeiro módulo da Fase 1: `18-layout-shell.md`.*
