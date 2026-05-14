import { AppError } from './AppError';

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(error.message, 'UNKNOWN', error);
  return new AppError('Something went wrong.', 'UNKNOWN', error);
}

