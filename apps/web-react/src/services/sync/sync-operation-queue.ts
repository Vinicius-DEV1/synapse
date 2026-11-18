export type SyncOperationOutcome =
  | { status: 'fulfilled'; value: unknown }
  | { status: 'rejected'; reason: unknown };

export class SyncTimeoutError extends Error {
  readonly operationOutcome: Promise<SyncOperationOutcome>;

  constructor(message: string, operationOutcome: Promise<SyncOperationOutcome>) {
    super(message);
    this.name = 'SyncTimeoutError';
    this.operationOutcome = operationOutcome;
  }
}

export class SyncOperationCancelledError extends Error {
  constructor() {
    super('Sync operation cancelled before it started');
    this.name = 'SyncOperationCancelledError';
  }
}

let syncOperationQueue: Promise<void> = Promise.resolve();

function enqueueSyncOperation<T>(
  shouldRun: () => boolean,
  operation: () => Promise<T>,
): Promise<T> {
  const scheduledOperation = syncOperationQueue.then(() => {
    if (!shouldRun()) throw new SyncOperationCancelledError();
    return operation();
  });
  syncOperationQueue = scheduledOperation.then(
    () => undefined,
    () => undefined,
  );
  return scheduledOperation;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T> {
  const operation = Promise.resolve(promise);
  const operationOutcome = operation.then<SyncOperationOutcome, SyncOperationOutcome>(
    value => ({ status: 'fulfilled', value }),
    reason => ({ status: 'rejected', reason }),
  );
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      reject(new SyncTimeoutError(`Sync timeout após ${timeoutMs / 1000}s`, operationOutcome));
    }, timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

export function runSerializedSyncOperation<T>(
  isClosed: () => boolean,
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let didTimeout = false;
  const queuedOperation = enqueueSyncOperation(
    () => !isClosed() && !didTimeout,
    operation,
  );
  return withTimeout(queuedOperation, timeoutMs, () => {
    didTimeout = true;
  });
}
