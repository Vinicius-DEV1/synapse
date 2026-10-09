---
name: type-safety-hardening
description: >-
  Actionable patterns, code recipes, and audit workflow for eliminating any, unsafe
  type assertions, and untyped payloads, building rock-solid TypeScript type architectures
  with discriminated unions, type guards, runtime validation, and strict IPC contracts.
---

# Skill: Strict TypeScript & Type Safety Hardening

Activate this skill when eliminating `any`, fixing unsafe type assertions (`as any`, `as unknown as T`), creating strict domain models, typing IPC and storage boundaries, or hardening TypeScript interfaces in the **Caderno** project.

> [!IMPORTANT]
> The foundational zero-`any` and type integrity rules are defined in `AGENTS.md` §4.1 and are always loaded. This skill provides **actionable patterns, code recipes, and hardening workflows** to achieve compile-time guarantees across all multiplatform boundaries.

---

## 1. Advanced Type Safety Patterns & Recipes

### 1.1. Discriminated Unions for State & Action Payloads

Replace loose objects containing optional nullable fields with discriminated unions that guarantee type safety across mutually exclusive states:

```typescript
// ANTI-PATTERN: Loose type with optional fields everywhere
interface AsyncState<T> {
  status: string;
  data?: T;
  error?: string;
  isLoading?: boolean;
}

// BEST PRACTICE: Discriminated Union with mutually exclusive states
export type AsyncState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: Error };
```

#### Exhaustiveness Checking with Compile-Time `never` Assertion:
```typescript
export function assertNever(x: never, message = 'Unexpected unreachable branch'): never {
  throw new Error(`${message}: ${JSON.stringify(x)}`);
}

function renderState(state: AsyncState<Note[]>): React.ReactNode {
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <NoteList notes={state.data} />;
    case 'error':
      return <ErrorMessage error={state.error} />;
    default:
      return assertNever(state); // TypeScript errors if a case is omitted
  }
}
```

---

### 1.2. Type Guards & Schema Validation for Untrusted Data

External data entering from IndexedDB, Tauri IPC, Web APIs, or localStorage is typed as `unknown` and must be narrowed via User-Defined Type Guards (`value is T`):

```typescript
export interface NoteMetadata {
  id: string;
  title: string;
  updatedAt: number;
  tags: string[];
}

export function isNoteMetadata(value: unknown): value is NoteMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.updatedAt === 'number' &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === 'string')
  );
}
```

#### Runtime Schema Validation (Zod / Valibot):
For deeply nested payloads or dynamic configuration objects, prefer schema validation:

```typescript
import { z } from 'zod';

export const NoteMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.number().int().nonnegative(),
  tags: z.array(z.string()),
});

export type NoteMetadata = z.infer<typeof NoteMetadataSchema>;

// Validate and narrow in a single step
const result = NoteMetadataSchema.safeParse(untrustedData);
if (result.success) {
  const note: NoteMetadata = result.data; // Fully typed & validated
}
```

> [!TIP]
> **Heuristic for Type Guard vs Schema Validator**:
> - **Manual Type Guards**: Flat interfaces with $\le 4$ fields. Zero bundle overhead.
> - **Schema Validators**: Complex nested records, IPC command payloads, or data requiring detailed validation error reporting.

---

### 1.3. Safe Error Narrowing

In TypeScript (`useUnknownInCatchVariables`), caught exceptions in `catch` blocks are typed as `unknown`. Safely extract messages without `(error as any).message`:

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as Record<string, unknown>).message);
  }
  return 'An unexpected error occurred';
}

// Usage in try/catch blocks
try {
  await storageService.save(note);
} catch (error) {
  const message = getErrorMessage(error);
  console.error('[StorageService] Save failed:', message, { error });
  notifyUser(`Save failed: ${message}`);
}
```

---

### 1.4. Generic Constraints & Mapped Mutations

Eliminate `any` parameters in utility helpers using generic parameter constraints:

```typescript
// ANTI-PATTERN:
function updateField(obj: any, key: string, value: any): any { ... }

// BEST PRACTICE:
export function updateField<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K]
): T {
  return { ...obj, [key]: value };
}
```

---

### 1.5. Strictly Typed Tauri IPC Contracts

Protect native desktop IPC calls with typed command signatures to prevent runtime serialization mismatches:

```typescript
// Define IPC Command Contract Interface Map
export interface TauriIpcCommandMap {
  'read_text_file': {
    args: { path: string };
    result: string;
  };
  'write_text_file': {
    args: { path: string; contents: string };
    result: void;
  };
  'crypto_decrypt_vault': {
    args: { payloadHex: string; keyHex: string };
    result: string;
  };
}

// Strictly typed invoke helper
export async function safeInvoke<K extends keyof TauriIpcCommandMap>(
  command: K,
  args: TauriIpcCommandMap[K]['args']
): Promise<TauriIpcCommandMap[K]['result']> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<TauriIpcCommandMap[K]['result']>(command, args);
}
```

---

### 1.6. Branded Types for Domain Identification

Prevent accidental mix-ups of primitive string identifiers (e.g., passing a `DeckId` where a `NoteId` is expected):

```typescript
declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type NoteId = Brand<string, 'NoteId'>;
export type DeckId = Brand<string, 'DeckId'>;
export type TagId = Brand<string, 'TagId'>;

export function toNoteId(id: string): NoteId {
  return id as NoteId;
}

export function toDeckId(id: string): DeckId {
  return id as DeckId;
}

// Compile error if you pass a DeckId to a function expecting a NoteId!
function fetchNote(id: NoteId): Promise<Note> { /* ... */ }
```

---

## 2. Type Safety Audit Workflow

### Step 1: Scan for Loose Types & Assertions
1. Run ripgrep search for forbidden patterns:
   ```bash
   grep -rn ': any\|as any\|as unknown as' src/ --include='*.ts' --include='*.tsx'
   ```
2. Catalog unchecked index signatures (`[key: string]: unknown` or `Record<string, any>`).
3. Identify missing explicit return types on exported functions.

### Step 2: Define Strict Domain Types First
1. Draft precise types, discriminated unions, and branded keys in the module's `types.ts`.
2. Add type guards or schema parsers for incoming boundary payloads.

### Step 3: Incremental Remediation
1. Replace `any` annotations module-by-module.
2. Fix resulting compiler errors at the root cause (never use `// @ts-ignore`).
3. Use `// @ts-expect-error [REASON]` only when bridging external third-party library typing defects, accompanied by an explicit explanation.

### Step 4: Verification
1. Run full type check across project: `npx tsc -b --noEmit`.
2. Run targeted tests: `npx vitest related --run <modified_files>`.

---

## 3. Delivery Checklist

- [ ] Zero `any`, `as any`, or unchecked `as unknown as T` in modified files?
- [ ] Mutually exclusive states modeled with Discriminated Unions?
- [ ] Switches on union states have exhaustive checks (`assertNever`)?
- [ ] Boundary data narrowed via Type Guards or runtime schema parsers?
- [ ] Caught errors typed as `unknown` and safely resolved?
- [ ] Branded types utilized for distinct entity identifiers?
- [ ] `npx tsc -b --noEmit` completes cleanly with zero errors?
