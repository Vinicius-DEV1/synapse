---
name: type-safety-hardening
description: >-
  Actionable patterns, code recipes, and audit workflow for eliminating any, unsafe
  type assertions, and untyped payloads, building rock-solid TypeScript type architectures
  with discriminated unions, type guards, runtime validation, and strict IPC contracts.
---

# Skill: Strict TypeScript & Type Safety Hardening

Activate this skill when eliminating `any`, fixing unsafe type assertions (`as any`, `as unknown as T`), creating strict data models, typing IPC/storage boundaries, or hardening TypeScript interfaces in the **Caderno** project.

> [!IMPORTANT]
> The foundational zero-`any` rules are defined in `AGENTS.md` §4.1 and are always loaded. This skill provides **practical recipes, patterns, and workflow** for implementing those rules — it does not repeat them.

---

## 1. Advanced Type Safety Patterns & Recipes

### 1.1. Discriminated Unions for State & Action Payloads

Replace loose objects with discriminated unions that guarantee type safety across all states:

```typescript
// BAD: Loose type with optional fields everywhere
interface AsyncState {
  status: string;
  data?: Note[];
  error?: string;
  isLoading?: boolean;
}

// GOOD: Discriminated Union with mutually exclusive states
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

#### Exhaustiveness Checking in Switches:
```typescript
export function assertNever(x: never, message = 'Unexpected unreachable branch'): never {
  throw new Error(`${message}: ${JSON.stringify(x)}`);
}

function handleState(state: AsyncState<Note[]>): React.ReactNode {
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
      return assertNever(state);
  }
}
```

---

### 1.2. Custom Type Guards for Dynamic & External Data

When receiving data from IndexedDB, Tauri IPC, Web APIs, or JSON parsing, type it initially as `unknown` and narrow it with Type Guards:

```typescript
export interface BookMetadata {
  id: string;
  title: string;
  pageCount: number;
  tags: string[];
}

export function isBookMetadata(value: unknown): value is BookMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.pageCount === 'number' &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === 'string')
  );
}
```

**For complex or deeply nested structures**, consider using a runtime schema validation library (e.g., Zod, Valibot) instead of hand-written type guards:

```typescript
import { z } from 'zod';

const BookMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  pageCount: z.number().int().nonnegative(),
  tags: z.array(z.string()),
});

export type BookMetadata = z.infer<typeof BookMetadataSchema>;

// Usage: validates AND narrows in one step
const parsed = BookMetadataSchema.safeParse(unknownData);
if (parsed.success) {
  const book: BookMetadata = parsed.data; // fully typed
}
```

> [!TIP]
> **When to use manual Type Guards vs schema validators:**
> - **Manual guards**: Simple, flat structures with < 5 fields. Zero bundle size cost.
> - **Schema validators (Zod/Valibot)**: Complex nested structures, API responses, IPC payloads with many fields, or when you need detailed error messages for debugging.

---

### 1.3. Safe Error Handling & Narrowing

In TypeScript, caught errors are typed as `unknown`. Safely extract error messages:

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
  await storage.save(note);
} catch (error) {
  const message = getErrorMessage(error);
  console.error('[StorageError] Failed to save note:', message, { error });
  notifyUser(`Error: ${message}`);
}
```

---

### 1.4. Generic Constraints & Mapped Types

Use generics with strict constraints instead of loose types:

```typescript
// BAD
function updateRecord(obj: any, key: string, val: any): any { /* ... */ }

// GOOD
function updateRecord<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K,
  val: T[K]
): T {
  return { ...obj, [key]: val };
}
```

---

### 1.5. Typing Multiplatform & IPC Boundaries

Wrap native Tauri invocations in strictly typed helper functions:

```typescript
// Define IPC Command Contract Map
export interface TauriIpcMap {
  'read_text_file': { args: { path: string }; result: string };
  'write_text_file': { args: { path: string; contents: string }; result: void };
  'get_app_version': { args: Record<string, never>; result: string };
}

// Strictly typed invoke wrapper
export async function safeInvoke<K extends keyof TauriIpcMap>(
  command: K,
  args: TauriIpcMap[K]['args']
): Promise<TauriIpcMap[K]['result']> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<TauriIpcMap[K]['result']>(command, args);
}
```

---

### 1.6. Utility Types for Common Patterns

```typescript
/** Make specific keys required while keeping others optional */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Create a strictly typed event map for custom event emitters */
export type EventMap = Record<string, (...args: never[]) => void>;

/** Extract the resolved type from a Promise */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** Branded types for IDs to prevent accidental mixing */
export type NoteId = string & { readonly __brand: 'NoteId' };
export type DeckId = string & { readonly __brand: 'DeckId' };

// Prevents accidentally passing a NoteId where DeckId is expected
function getDeck(id: DeckId): Promise<Deck> { /* ... */ }
```

---

## 2. Type Safety Audit Workflow

### Step 1: Scan for Loose Types
1. Search for instances of `: any`, `as any`, `as unknown as`, and unchecked index signatures (`[key: string]: any`).
2. Identify all missing function return types and unhandled optional chaining properties.
3. **Quick scan command**: `grep -rn ': any\|as any\|as unknown as' src/ --include='*.ts' --include='*.tsx'`

### Step 2: Formulate Strict Interface Definitions
1. Define exact shapes, discriminated unions, and generic parameters in the appropriate `types/` file.
2. Provide type guards or validation helpers for untrusted boundaries.

### Step 3: Incremental Replacement
1. Replace `any` annotations one file or module at a time.
2. Fix all resulting type errors at the root cause rather than applying casts.
3. Use `// @ts-expect-error [REASON]` only as a temporary bridge with a tracked TODO, never as a permanent workaround.

### Step 4: Verification
1. Run `npx tsc --noEmit` to verify complete type correctness.
2. Run targeted tests to ensure zero runtime regressions.

---

## 3. Delivery Checklist

- [ ] All `any` and `as any` occurrences eliminated in the target files?
- [ ] Dynamic states modeled with Discriminated Unions and exhaustiveness checks?
- [ ] External/IPC payloads validated with Type Guards or schema validators?
- [ ] Errors caught as `unknown` and safely narrowed?
- [ ] Branded types used for distinct ID domains where mixing is risky?
- [ ] `npx tsc --noEmit` passes with zero type errors?
