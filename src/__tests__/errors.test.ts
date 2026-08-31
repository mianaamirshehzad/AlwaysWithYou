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
  });
});
