import { AppError, normalizeError } from '../core/errors';

describe('AppError', () => {
  it('creates error with message', () => {
    const error = new AppError('test message');
    expect(error.message).toBe('test message');
    expect(error.code).toBe('UNKNOWN');
    expect(error.name).toBe('AppError');
  });

  it('creates error with custom code', () => {
    const error = new AppError('network error', 'NETWORK');
    expect(error.code).toBe('NETWORK');
  });
});

describe('normalizeError', () => {
  it('returns AppError unchanged', () => {
    const original = new AppError('test');
    expect(normalizeError(original)).toBe(original);
  });

  it('wraps Error in AppError', () => {
    const error = new Error('standard error');
    const normalized = normalizeError(error);
    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.message).toBe('standard error');
  });

  it('wraps unknown values', () => {
    const normalized = normalizeError('string');
    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.message).toBe('Something went wrong.');
    expect(normalized.isRetryable).toBe(true);
  });

  it('classifies unavailable/network Firebase errors as retryable NETWORK errors', () => {
    const err = { code: 'unavailable', message: 'The service is currently unavailable.' };
    const normalized = normalizeError(err);
    expect(normalized.code).toBe('NETWORK');
    expect(normalized.isRetryable).toBe(true);
    expect(normalized.message).toContain('internet connection');
  });

  it('classifies permission-denied as non-retryable FORBIDDEN errors', () => {
    const err = { code: 'permission-denied', message: 'Missing or insufficient permissions.' };
    const normalized = normalizeError(err);
    expect(normalized.code).toBe('FORBIDDEN');
    expect(normalized.isRetryable).toBe(false);
  });

  it('classifies auth errors as non-retryable UNAUTHORIZED errors', () => {
    const err = { code: 'auth/user-not-found', message: 'There is no user record.' };
    const normalized = normalizeError(err);
    expect(normalized.code).toBe('UNAUTHORIZED');
    expect(normalized.isRetryable).toBe(false);
  });

  it('classifies not-found errors as non-retryable NOT_FOUND errors', () => {
    const err = { code: 'not-found', message: 'Document not found.' };
    const normalized = normalizeError(err);
    expect(normalized.code).toBe('NOT_FOUND');
    expect(normalized.isRetryable).toBe(false);
  });

  it('classifies general Firebase errors as retryable FIREBASE errors', () => {
    const err = { code: 'firestore/aborted', message: 'The operation was aborted.' };
    const normalized = normalizeError(err);
    expect(normalized.code).toBe('FIREBASE');
    expect(normalized.isRetryable).toBe(true);
    expect(normalized.message).toBe('The operation was aborted.');
  });
});
