/**
 * Normalizes phone numbers:
 * 1. Remove all non-digits
 * 2. Strip leading 91 or 0 country prefix
 * 3. Keep last 10 digits
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');

  // Strip leading country code 91 if followed by 10 digits
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  }
  // Strip leading 0 prefix if longer than 10 digits
  while (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }
  // Keep last 10 digits
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
}

/**
 * Validates phone number strictly for 10 digits after normalization.
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required.' };
  }

  const normalized = normalizePhone(phone);

  if (normalized.length !== 10) {
    return { 
      isValid: false, 
      error: 'Enter a valid 10-digit phone number' 
    };
  }

  return { isValid: true };
}

/**
 * Validates student name.
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Name is required.' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters.' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Name must be under 50 characters.' };
  }
  return { isValid: true };
}

/**
 * Raw phone number display without formatting.
 */
export function formatPhoneForDisplay(phone: string): string {
  return (phone || '').trim();
}

