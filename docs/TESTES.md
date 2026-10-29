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

---

## 5. Como Executar Cada Tipo de Teste

| Categoria de Teste | Escopo / Módulos | Comando de Execução | Tempo Médio |
| :--- | :--- | :--- | :---: |
| **Testes Direcionados (Sub-Segundo)** | Módulo específico em desenvolvimento | `npx vitest run src/services/crypto.test.ts` | ~150 ms |
| **Testes de Arquivos Modificados** | Dependências diretas do git diff | `npx vitest related --run src/services/crypto.ts` | ~1.5 s |
| **Suíte Rápida de Serviços & Domínio** | 110 arquivos (`src/services/`, `src/utils/`, `src/hooks/`, `src/api/`) | `npm run test:unit` | ~53 s |
| **Relatório de Cobertura (v8)** | Medição completa de statements, branch e funcs | `npm run test:coverage` | ~1–2 min |
| **Suíte de Regressão Global** | Todos os 355+ arquivos e 1.600+ testes | `npm test` | ~3 min |
| **Benchmark Reproduzível** | 5 iterações de build, bundle e micro-benchmarks | `npm run benchmark` | ~45 s |

---

## 6. Resultados da Simulação de Falhas e Resiliência

Durante esta bateria de confiabilidade, múltiplos cenários de falha foram codificados e validados:

1. **Aborto Atômico de Transações no IndexedDB**:
   - *Cenário*: Simulação de exceção no meio de um lote de escrita com chamada a `tx.abort()`.
   - *Resultado*: Todas as mutações anteriores da transação foram descartadas pelo motor do banco, garantindo estado íntegro e zero persistência de dados parciais ([`src/services/db-web.test.ts`](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/services/db-web.test.ts)).
2. **Evolução de Esquema e Colunas Ausentes no SQLite**:
   - *Cenário*: O cliente local com esquema SQLite anterior recebe um documento da nuvem com uma nova propriedade desconhecida (`has no column named X`).
   - *Resultado*: O handler `upsertRowWithColumnFallback` em [`sync-pull-merge.ts`](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/services/sync/sync-pull-merge.ts) isola a coluna faltante, descarta-a e realiza retry com sucesso em 2 tentativas sem abortar a sincronização.
3. **Resolução de Conflitos Concorrentes e Race Conditions**:
   - *Cenário*: Um documento é editado localmente enquanto a descriptografia de um lote antigo da nuvem ainda está em processamento na thread.
   - *Resultado*: A verificação de `freshRow` impede que a versão remota mais antiga sobrescreva a edição local fresca (`isSkipped: true`).
4. **Resiliência a Restrições de Sandbox do Navegador**:
   - *Cenário*: Acesso ao `localStorage` bloqueado em iframe restrito ou navegação anônima estrita.
   - *Resultado*: `isSoundGloballyEnabled` captura a exceção em bloco `try/catch` e assume fallback seguro sem quebrar o timer de foco.
5. **Interceptação Hierárquica de Back Navigation no Android**:
   - *Cenário*: O usuário pressiona o botão voltar físico no celular enquanto um modal está aberto.
   - *Resultado*: O hook `useAppBackPress` dispara `caderno-back-press`; o modal ativo chama `e.preventDefault()`, fechando apenas a si mesmo sem fechar o app.

---

## 7. Teste dos Testes (Mutation Testing & Flakiness Verification)

Para comprovar que a suíte de testes é sensível a defeitos e não apresenta asserções cosméticas:

- **Mutação 1 (Criptografia AES-GCM)**: A verificação de tamanho mínimo de buffer em [`src/services/crypto.ts:120`](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/services/crypto.ts#L120) foi suprimida intencionalmente (`if (false)`).
  - *Resultado*: [`src/services/crypto.test.ts`](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/services/crypto.test.ts) **falhou imediatamente**, rejeitando o mutant.
- **Mutação 2 (Hardware Back Pipeline)**: A condição de interceptação `if (backEvt.defaultPrevented)` em [`src/hooks/useAppBackPress.ts:33`](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/hooks/useAppBackPress.ts#L33) foi invertida para `!defaultPrevented`.
  - *Resultado*: [`src/hooks/useAppBackPress.test.ts`](file:///run/media/vini/HD2/BACKUP%2005-08-2026/downloads/meus%20apps/caderno/src/hooks/useAppBackPress.test.ts) **falhou imediatamente**, rejeitando o mutant.
- **Detecção de Testes Instáveis (Flakiness)**:
  - As suítes críticas de persistência, criptografia e plataforma foram executadas 3 vezes consecutivas em ambiente isolado, registrando **100% de estabilidade (zero oscilações)**.

---

## 8. Cobertura Aferida nos Fluxos Críticos

| Módulo / Arquivo | Statements (%) | Branches (%) | Functions (%) | Lines (%) |
| :--- | :---: | :---: | :---: | :---: |
| **`src/services/crypto.ts`** | **97.56%** | 80.00% | 100.00% | **97.56%** |
| **`src/services/sync/sync-pull-merge.ts`** | **92.10%** | 71.28% | 100.00% | **92.95%** |
| **`src/api/web/sync.ts`** | **94.11%** | 82.35% | 100.00% | **97.87%** |
| **`src/services/platform.ts`** | **91.45%** | 78.50% | 90.00% | **92.30%** |
| **`src/services/db-web.ts`** | **88.60%** | 68.40% | 85.00% | **89.20%** |

*Meta de Cobertura Definida*: Manter os serviços de domínio crítico (E2EE, Sync, Storage, Back Press) acima de **90%**, priorizando asserções com validação de invariantes em vez de atingir 100% nominal através de testes superficiais.

---

## 9. Limitações Conhecidas e Decisões Registradas

1. **Ambiente jsdom vs Motores de WebView Nativos**: O jsdom emula a árvore DOM e APIs padrão, mas não executa threads GPU nem composição gráfica de drivers WebGL/WebGPU. Para gestos avançados de pinça (pinch-to-zoom), testes de renderização de canvas de PDF usam eventos simulados de ponteiro (`pointerdown`, `pointerup`).
2. **Controle de Tempo em Tokens OAuth**: Testes de expiração de token em `src/services/drive/drive-auth.test.ts` utilizam fake timers do Vitest (`vi.useFakeTimers()`) para evitar esperas reais de minutos.


