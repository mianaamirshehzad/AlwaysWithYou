import { isValidEmail, isValidName, getPasswordError, getPasswordConfirmationError, getAuthErrorMessage } from '../services/auth';

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co')).toBe(true);
  });
  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
  });
});

describe('isValidName', () => {
  it('accepts non-empty names', () => {
    expect(isValidName('John')).toBe(true);
    expect(isValidName('  Jane  ')).toBe(true);
  });
  it('rejects empty names', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
  });
});

describe('getPasswordError', () => {
  it('returns null for valid password', () => {
    expect(getPasswordError('password123')).toBeNull();
  });
  it('returns error for empty password', () => {
    expect(getPasswordError('')).toBeTruthy();
  });
  it('returns error for short password', () => {
    expect(getPasswordError('123')).toBeTruthy();
  });
});

describe('getPasswordConfirmationError', () => {
  it('returns null for matching passwords', () => {
    expect(getPasswordConfirmationError('pass', 'pass')).toBeNull();
  });
  it('returns error for mismatched passwords', () => {
    expect(getPasswordConfirmationError('pass', 'wrong')).toBeTruthy();
  });
  it('returns error for empty confirmation', () => {
    expect(getPasswordConfirmationError('pass', '')).toBeTruthy();
  });
});

describe('getAuthErrorMessage', () => {
  it('returns user-friendly message for known errors', () => {
    const error = { code: 'auth/email-already-in-use' } as any;
    expect(getAuthErrorMessage(error)).toContain('already exists');
  });
  it('returns generic message for unknown errors', () => {
    expect(getAuthErrorMessage(new Error('random'))).toBeTruthy();
  });
  it('returns generic message for non-Error values', () => {
    expect(getAuthErrorMessage('string error')).toBeTruthy();
  });
});
