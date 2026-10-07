/**
 * Normalizes phone numbers to digits only.
 */
export function normalizePhone(rawPhone: string): string {
  return (rawPhone || '').replace(/\D/g, '').trim();
}

/**
 * Validates phone number strictly for 10 digits.
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required.' };
  }

  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length !== 10) {
    return { 
      isValid: false, 
      error: `Phone number must be exactly 10 digits (currently ${digitsOnly.length}).` 
    };
  }

  // Ensure digits only
  if (/[^\d\s\-]/.test(phone.trim())) {
    return {
      isValid: false,
      error: 'Phone number must contain digits only.'
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

