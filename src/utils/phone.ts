/**
 * Sanitizes and cleans a raw phone number for tel: protocol and phone dialing.
 */
export function cleanPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  return rawPhone.trim().replace(/[^\d+*#]/g, '');
}

