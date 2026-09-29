import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;

  if (val === undefined || val === '') {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing environment variable: ${name}`);
    return '';
  }

  return val;
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  MONGODB_URI: required(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/aptura'
  ),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Brevo SMTP
  BREVO_SMTP_HOST: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
  BREVO_SMTP_USER: process.env.BREVO_SMTP_USER || '',
  BREVO_SMTP_PASSWORD: process.env.BREVO_SMTP_PASSWORD || '',
  BREVO_FROM_EMAIL: process.env.BREVO_FROM_EMAIL || '',
  BREVO_FROM_NAME: process.env.BREVO_FROM_NAME || 'Aptura AI',

  // OTP
  OTP_EXPIRES_MINUTES: parseInt(
    process.env.OTP_EXPIRES_MINUTES || '5',
    10
  ),
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(
    process.env.OTP_RESEND_COOLDOWN_SECONDS || '60',
    10
  ),
  OTP_MAX_ATTEMPTS: parseInt(
    process.env.OTP_MAX_ATTEMPTS || '5',
    10
  ),

  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.6-flash',

  // Uploads
  MAX_RESUME_SIZE_MB: parseInt(
    process.env.MAX_RESUME_SIZE_MB || '10',
    10
  ),
};

export const isEmailConfigured = () =>
  !!(
    env.BREVO_SMTP_HOST &&
    env.BREVO_SMTP_USER &&
    env.BREVO_SMTP_PASSWORD &&
    env.BREVO_FROM_EMAIL
  );

export const isGeminiConfigured = () =>
  !!env.GEMINI_API_KEY;