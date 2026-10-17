/**
 * Validation utilities for AlwaysWithYou profile editing and input handling.
 */

export type ValidationResult = {
  isValid: boolean;
  error?: string;
  value: string;
};

export function validateDisplayName(rawName?: string | null): ValidationResult {
  const trimmed = (rawName ?? '').trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Name cannot be empty.',
      value: trimmed,
    };
  }
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters.',
      value: trimmed,
    };
  }
  if (trimmed.length > 50) {
    return {
      isValid: false,
      error: 'Name cannot exceed 50 characters.',
      value: trimmed,
    };
  }
  return {
    isValid: true,
    value: trimmed,
  };
}

export function validatePhoneNumber(rawPhone?: string | null): ValidationResult {
  const trimmed = (rawPhone ?? '').trim();
  if (trimmed.length === 0) {
    return {
      isValid: true,
      value: '',
    };
  }

  // Check for allowed characters: numbers, plus, hyphens, parentheses, spaces
  const allowedCharsRegex = /^[\d\s+\-()]+$/;
  if (!allowedCharsRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Phone number contains invalid characters.',
      value: trimmed,
    };
  }

  // Count actual digits
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount < 7) {
    return {
      isValid: false,
      error: 'Phone number must contain at least 7 digits.',
      value: trimmed,
    };
  }
  if (digitCount > 15) {
    return {
      isValid: false,
      error: 'Phone number cannot exceed 15 digits.',
      value: trimmed,
    };
  }

  return {
    isValid: true,
    value: trimmed,
  };
}

