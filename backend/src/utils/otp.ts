import crypto from 'crypto';

/** Generates a cryptographically secure 6-digit numeric OTP as a string. */
export function generateOtp(): string {
  // crypto.randomInt is cryptographically secure and avoids modulo bias.
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(6, '0');
}
