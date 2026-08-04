/**
 * Jordanian mobile phone validation.
 *
 * Accepts local format (07XXXXXXXX) and international format
 * (+9627XXXXXXXX / 009627XXXXXXXX), where X is 7 digits and the network
 * prefix is 7, 8, or 9 (Zain/Orange/Umniah ranges).
 */
const JORDAN_PHONE_REGEX = /^(?:\+962|00962|0)?7[789]\d{7}$/;

/** Strips spaces/dashes so users can type numbers however they like. */
export function normalizePhoneInput(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export function isValidJordanPhone(value: string): boolean {
  return JORDAN_PHONE_REGEX.test(normalizePhoneInput(value));
}
