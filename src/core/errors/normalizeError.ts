import { AppError } from './AppError';

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: string }).code);
    if (code.includes('network') || code === 'unavailable') {
      return new AppError('Unable to connect. Please check your internet connection.', 'NETWORK', error, true);
    }
    if (code === 'permission-denied') {
      return new AppError('You do not have permission to perform this action.', 'FORBIDDEN', error, false);
    }
    if (code === 'unauthenticated' || code.startsWith('auth/')) {
      return new AppError('Your session has expired or is unauthorized. Please sign in.', 'UNAUTHORIZED', error, false);
    }
    if (code === 'not-found') {
      return new AppError('The requested resource was not found.', 'NOT_FOUND', error, false);
    }
    const message =
      error instanceof Error
        ? error.message
        : typeof (error as Record<string, unknown>).message === 'string'
        ? String((error as Record<string, unknown>).message)
        : 'A database error occurred.';
    return new AppError(message, 'FIREBASE', error, true);
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('connection')) {
      return new AppError('Unable to connect. Please check your internet connection.', 'NETWORK', error, true);
    }
    return new AppError(error.message, 'UNKNOWN', error, false);
  }

  return new AppError('Something went wrong.', 'UNKNOWN', error, true);
}

