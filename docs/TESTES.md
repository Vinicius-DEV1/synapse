# Plano de Testes, Mapa de Risco e Confiabilidade do Synapse

Este documento estabelece a estratégia de garantia de qualidade (QA), resiliência de dados e testes automatizados do **Synapse**, estruturando a matriz de criticidade dos fluxos e o plano de cobertura para tolerância a falhas.

---

## 1. Estado Inicial do Diagnóstico (Linha de Base)

A avaliação da suíte existente em `testes/confiabilidade` (a partir da tag `pre-testes`) registrou:
- **Total de Arquivos de Teste**: 353 arquivos (`.test.ts` e `.test.tsx`).
- **Total de Testes Unitários e de Integração**: 1.589 testes.
- **Taxa de Sucesso Inicial**: **100% (1.589 passando, 0 falhas)**.
- **Tempo Médio de Execução Global**: ~184 segundos em máquina de referência (AMD Ryzen 5 3500U, Linux x64).
- **TypeScript Strict Check (`tsc -b --noEmit`)**: Aprovado com 0 erros.
- **ESLint (`npm run lint`)**: Aprovado com 0 erros e 0 warnings.
- **Build de Produção (`npm run build`)**: Aprovado com sucesso em ~7.4s.

---

## 2. Mapa de Risco dos Fluxos Críticos

Os fluxos do sistema são categorizados e ordenados decrescentemente pelo **impacto potencial de uma falha** para o usuário (perda de dados > corrupção silenciosa > falha de privacidade > indisponibilidade de interface):

| Nível de Risco | Fluxo / Módulo | Componentes & Serviços Chave | Impacto em Caso de Falha |
| :---: | :--- | :--- | :--- |
| **Nível 1 (Crítico)** | **Criptografia E2EE & Gestão de Chaves** | `src/services/crypto.ts`, `src/services/vault-crypto.ts`, `src/services/sharing/share-crypto.ts` | Perda permanente de acesso a dados (irrecuperabilidade do cofre) ou vazamento de dados em texto puro na nuvem. |
| **Nível 2 (Crítico)** | **Sincronização Nuvem & Resolução CRDT** | `src/services/sync/sync-pull-merge.ts`, `src/services/sync/sync-push.ts`, `src/services/sync/sync-pull.ts`, `src/utils/yjs-utils.ts` | Conflitos silenciosos sobrescrevendo edições offline mais recentes, perda de blocos em notas ou desagregação de árvores. |
| **Nível 3 (Alto)** | **Camada de Persistência Híbrida** | `src/services/db-web.ts`, `src/api/web/sync.ts`, `src/api/tauri/`, `src/api/web/` | Corrupção de IndexedDB/SQLite local por queda repentina de energia, fechamento abrupto ou esgotamento de quota. |
| **Nível 4 (Médio-Alto)** | **Streaming de Vídeo Criptografado (ENC1)** | `src-tauri/src/modules/video/`, `src/components/video-player/`, `public/sw.js` | Falhas em seeks aleatórios, vazamento de memória em streaming longo ou falha de descriptografia de fragmentos de 1 MB. |
| **Nível 5 (Médio)** | **Repetição Espaçada FSRS & Flashcards** | `src/services/anki/`, `src/components/anki/`, `ts-fsrs` | Cálculo errôneo de intervalos mnemônicos, perda de histórico de retenção e heatmaps defasados. |
| **Nível 6 (Médio)** | **Upload e Integração com Nuvem (Google Drive)** | `src/services/drive/drive-auth.ts`, `src/services/sync/sync-pdf.ts` | Uploads truncados de PDFs/EPUBs com consumo de banda desnecessário ou perda de tokens OAuth. |

---

## 3. Mapeamento de Fronteiras e Pontos de Persistência

A aplicação isola todas as operações de persistência e comunicação externa nas seguintes fronteiras:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             APLICAÇÃO REACT                              │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
     ┌───────────────────────┐               ┌───────────────────────┐
     │  Desktop (Tauri IPC)  │               │   Web / PWA (Browser) │
     └───────────┬───────────┘               └───────────┬───────────┘
                 │                                       │
     ┌───────────┴───────────┐               ┌───────────┴───────────┐
     ▼                       ▼               ▼                       ▼
┌──────────────┐     ┌──────────────┐ ┌──────────────┐       ┌──────────────┐
│ SQLite Local │     │ Filesystem   │ │  IndexedDB   │       │ LocalStorage │
│ (rusqlite)   │     │ (tokio fs)   │ │  (idb v27)   │       │ (tokens/keys)│
└──────────────┘     └──────────────┘ └──────────────┘       └──────────────┘
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                     ┌───────────────────────────────┐
                     │       Fronteiras de Rede      │
                     │  - Firestore (E2EE sync)      │
                     │  - Google Drive (PDF / ENC1)  │
                     │  - HIBP API (k-Anonymity)     │
                     └───────────────────────────────┘
```

---

## 4. Plano Estratégico de Implementação

### Etapa 2: Testes Unitários e de Integração
- **Lógica de Merge e Resolução de Conflitos CRDT**: Criar `src/services/sync/sync-pull-merge.test.ts` cobrindo normalização de carimbos de tempo, união de estados Yjs concorrentes, soft-deletes cruzados e retry automático em divergência de esquema (`upsertRowWithColumnFallback`).
- **Camada de Persistência Web Sync**: Expandir `src/api/web/sync.test.ts` para validar fusão idempotente de campos, deleção em cascata de arquivos de livros órfãos e falhas simuladas de transação.
- **Casos de Borda**: Strings Unicode de 4 bytes, emojis compostos, cargas gigantes (> 1 MB), caracteres de controle, formatações de data mistas (`ISO 8601` vs `YYYY-MM-DD HH:MM:SS` do SQLite) e números com representação nula.

### Etapa 3: Resiliência de Dados e Simulação de Falhas
- **Falha Concorrente e Retry**: Simular timeout de rede durante a transmissão de lote e validar que o mecanismo não duplica registros nem gera estados inconsistentes.
- **Recuperação de Banco Corrompido / Rejeição de Transação**: Simular `DOMException: QuotaExceededError` e encerramento abrupto no meio de um lote de escrita, garantindo rollback limpo.
- **Migração de Esquema**: Simular documentos da nuvem contendo colunas ausentes na tabela local do SQLite e comprovar a resiliência do fallback sem quebrar a sincronização.

### Etapa 4: Testes de Ponta a Ponta (E2E) e Multiplataforma
- Testes E2E de navegação e preenchimento nos três viewports (Mobile: 375x667, Tablet: 768x1024, Desktop: 1440x900).
- Verificação de touch targets, back-press listener e atalhos de teclado.

### Etapa 5: Teste dos Testes (Mutation & Flakiness Detection)
- Mutação intencional em amostras de código de persistência e criptografia para atestar a sensibilidade das asserções.
- Execução tripla da suíte em pipeline isolado para verificação de estabilidade (zero flaky tests).

### Etapa 6: Integração Contínua e Governança
- Atualização do `.github/workflows/ci.yml` incluindo threshold de qualidade e relatórios consolidados.
