import { vi } from 'vitest';
import type { SyncRow } from './sync-utils';

export interface MockCloudDocument {
  id: string;
  data: () => Record<string, unknown>;
}

interface MockDocumentReference {
  path: string;
  table: string;
  id: string;
}

const mockFirestoreState = vi.hoisted(() => {
  const documentsByCollection = new Map<string, MockCloudDocument[]>();
  const setDocCalls: Array<{
    reference: MockDocumentReference;
    data: Record<string, unknown>;
    options?: unknown;
  }> = [];

  const getCollectionPath = (value: unknown): string | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    if ('path' in value && typeof value.path === 'string') return value.path;
    if ('args' in value && Array.isArray(value.args)) return getCollectionPath(value.args[0]);
    return undefined;
  };

  return { documentsByCollection, setDocCalls, getCollectionPath };
});

export function getFirestoreMockState(): typeof mockFirestoreState {
  return mockFirestoreState;
}

function buildMockApi() {
  return {
    sync: {
      getTable: vi.fn(async (_table: string): Promise<SyncRow[]> => []),
      getRowsByIds: vi.fn(async (_table: string, _ids: string[]): Promise<SyncRow[]> => []),
      upsertRow: vi.fn(async (_table: string, _row: SyncRow) => ({ success: true })),
      getRow: vi.fn(async (_table: string, _id: string): Promise<SyncRow | null> => null),
    },
    log: vi.fn(),
    savePageHistory: vi.fn(async (_pageId: string, _content: string) => ({ success: true, id: 'history-1' })),
  };
}

export function createMockApi(): ReturnType<typeof buildMockApi> {
  return buildMockApi();
}

export function installMockApi(api: ReturnType<typeof createMockApi>): void {
  Object.defineProperty(window, 'api', { configurable: true, value: api });
}

export function setFirestoreDocuments(collectionPath: string, documents: MockCloudDocument[]): void {
  mockFirestoreState.documentsByCollection.set(`users/test-user/sync/data/${collectionPath}`, documents);
}

export function resetSyncPullMocks(): void {
  vi.clearAllMocks();
  mockFirestoreState.documentsByCollection.clear();
  mockFirestoreState.setDocCalls.length = 0;
}

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
    table: segments.at(-2) || '',
    id: segments.at(-1) || '',
  })),
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/'), table: segments.at(-1) || '' })),
  query: vi.fn((...args: unknown[]) => ({ type: 'query', args })),
  where: vi.fn((field: string, op: string, val: unknown) => ({ field, op, val })),
  orderBy: vi.fn((field: string) => ({ field })),
  limit: vi.fn((n: number) => ({ limit: n })),
  startAfter: vi.fn((doc: unknown) => ({ startAfter: doc })),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  getDocs: vi.fn(async (query: unknown) => {
    const collectionPath = mockFirestoreState.getCollectionPath(query) || '';
    const docs = mockFirestoreState.documentsByCollection.get(collectionPath) || [];
    return { empty: docs.length === 0, docs };
  }),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  setDoc: vi.fn(async (
    reference: MockDocumentReference,
    data: Record<string, unknown>,
    options?: unknown
  ) => {
    mockFirestoreState.setDocCalls.push({ reference, data, options });
  }),
  onSnapshot: vi.fn((
    _docRef: unknown,
    callback: (snapshot: { exists: () => boolean; data: () => Record<string, unknown> }) => void
  ) => {
    callback({ exists: () => true, data: () => ({ deviceId: 'remote-device-123' }) });
    return () => {};
  }),
}));

vi.mock('../firebase', () => ({ db: { type: 'mock-firestore-db' } }));
