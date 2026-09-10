import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './error';

describe('error utility', () => {
  it('extracts message from Error instance', () => {
    expect(getErrorMessage(new Error('Test failure'))).toBe('Test failure');
  });

  it('returns string errors as is', () => {
    expect(getErrorMessage('Raw string error')).toBe('Raw string error');
  });

  it('extracts message property from objects', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
  });

  it('returns fallback for unknown types or empty inputs', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
    expect(getErrorMessage(123)).toBe('An unexpected error occurred');
  });
});
