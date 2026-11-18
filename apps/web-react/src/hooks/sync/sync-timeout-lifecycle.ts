import {
  SyncOperationCancelledError,
  SyncTimeoutError,
  type SyncOperationOutcome,
} from '../../services/sync/sync-operation-queue';
import { handleSyncError } from './sync-error-utils';

export function deferSyncMutexReleaseUntilSettled(
  error: unknown,
  isClosed: () => boolean,
  onSettled: (outcome: SyncOperationOutcome) => void,
  onReleased: () => void,
): boolean {
  if (!(error instanceof SyncTimeoutError)) return false;

  void error.operationOutcome.then(outcome => {
    try {
      onSettled(outcome);
      if (
        outcome.status === 'rejected'
        && !(outcome.reason instanceof SyncOperationCancelledError)
        && !isClosed()
      ) {
        handleSyncError(outcome.reason, 'Timed-out operation completion');
      }
    } catch (callbackError: unknown) {
      if (!isClosed()) handleSyncError(callbackError, 'Timed-out operation completion callback');
    } finally {
      onReleased();
    }
  });
  return true;
}
