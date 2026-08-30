---
name: type-safety-hardening
description: >-
  Systematically eliminates any, unsafe type assertions, and untyped payloads,
  building rock-solid TypeScript type architectures with discriminated unions,
  type guards, and strict contract validation.
---

# Skill: Strict TypeScript & Type Safety Hardening

Activate this skill when eliminating `any`, fixing unsafe type assertions (`as any`, `as unknown as T`), creating strict data models, typing IPC/storage boundaries, or hardening TypeScript interfaces in the **Caderno** project.

---

## 1. Zero `any` Golden Rules

> [!CAUTION]
> ### STRICT PROHIBITIONS
> 1. **No `any` Declarations**: Never declare variables, parameters, or return types as `any`.
> 2. **No Blind Type Casting**: Do not use `as any` or `as unknown as T` to silence compiler errors. Fix the underlying type signature or use a runtime type guard.
> 3. **No Untyped Error Catches**: Never assume caught errors in `catch (e)` have properties like `e.message` without type narrowing (`e instanceof Error`).

---

## 2. Advanced Type Safety Patterns & Recipes

### 2.1. Discriminated Unions for State & Action Payloads

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

function handleState(state: AsyncState<Note[]>) {
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

### 2.2. Custom Type Guards for Dynamic & External Data

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

---

### 2.3. Safe Error Handling & Narrowing

In TypeScript, caught errors are typed as `unknown`. Safely extract error messages and types:

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

### 2.4. Generic Constraints & Mapped Types

Use generics with strict constraints instead of loose types:

```typescript
// BAD
function updateRecord(obj: any, key: string, val: any): any { ... }

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

### 2.5. Typing Multiplatform & IPC Boundaries

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

## 3. Type Safety Audit Workflow

### Step 1: Scan for Loose Types
1. Search for instances of `: any`, `as any`, `as unknown as`, and unchecked index signatures (`[key: string]: any`).
2. Identify all missing function return types and unhandled optional chaining properties.

### Step 2: Formulate Strict Interface Definitions
1. Define the exact shapes, discriminated unions, and generic parameters in the appropriate `types/` file.
2. Provide type guards or validation helpers for untrusted boundaries.

### Step 3: Incremental Replacement
1. Replace `any` annotations one file or module at a time.
2. Fix all resulting type errors at the root cause rather than applying casts.

### Step 4: Verification
1. Run `npx tsc --noEmit` to verify complete type correctness.
2. Run automated test suites to ensure zero runtime regressions.

---

## 4. Delivery Checklist

- [ ] Are all `any` and `as any` occurrences eliminated in the target files?
- [ ] Are dynamic states modeled with Discriminated Unions and exhaustiveness checks?
- [ ] Are all external/IPC payloads validated with Type Guards (`is`)?
- [ ] Are errors caught as `unknown` and safely narrowed?
- [ ] Does `npx tsc --noEmit` pass with zero type errors?
