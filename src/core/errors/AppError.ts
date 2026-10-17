export type AppErrorCode =
  | 'UNKNOWN'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'FIREBASE'
  | 'TIMEOUT';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;
  readonly isRetryable: boolean;

  constructor(message: string, code: AppErrorCode = 'UNKNOWN', cause?: unknown, isRetryable = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
    this.isRetryable = isRetryable;
  }
}

