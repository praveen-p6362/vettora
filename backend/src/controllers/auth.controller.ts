import { Request, Response } from 'express';
import { User } from '../models/User';
import { Otp } from '../models/Otp';
import { hashPassword, comparePassword, hashOtp, compareOtp } from '../utils/hash';
import { generateOtp } from '../utils/otp';
import { sendOtpEmail } from '../utils/email';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';

const GMAIL_RE = /^[^\s@]+@gmail\.com$/i;

function otpExpiry(): Date {
  return new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
}

/** POST /api/auth/register — starts registration, sends a real OTP email. */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as {
    name?: string; email?: string; password?: string; role?: 'candidate' | 'hr';
  };

  if (!name || !email || !password || !role) throw new ApiError(400, 'Name, email, password and role are required.');
  if (!GMAIL_RE.test(email)) throw new ApiError(400, 'Please use a valid Gmail address.');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.');
  if (!['candidate', 'hr'].includes(role)) throw new ApiError(400, 'Invalid role.');

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) throw new ApiError(409, 'An account with this email already exists.');

  // Cooldown check against the most recent pending OTP for this email/purpose.
  const recent = await Otp.findOne({ email: normalizedEmail, purpose: 'register' }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.lastSentAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    const waitSec = Math.ceil((env.OTP_RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recent.lastSentAt.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${waitSec}s before requesting another code.`);
  }

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const passwordHash = await hashPassword(password);

  await Otp.deleteMany({ email: normalizedEmail, purpose: 'register' });
  await Otp.create({
    email: normalizedEmail,
    purpose: 'register',
    codeHash,
    pendingName: name.trim(),
    pendingPasswordHash: passwordHash,
    pendingRole: role,
    attempts: 0,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    expiresAt: otpExpiry(),
    lastSentAt: new Date(),
    consumed: false,
  });

  await sendOtpEmail(normalizedEmail, name.trim(), code);

  res.status(200).json({ message: `Verification code sent to ${normalizedEmail}.`, expiresInMinutes: env.OTP_EXPIRES_MINUTES });
});

/** POST /api/auth/resend-otp */
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, purpose } = req.body as { email?: string; purpose?: 'register' | 'reset_password' };
  if (!email || !purpose) throw new ApiError(400, 'Email and purpose are required.');
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await Otp.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });
  if (!existing || existing.consumed) throw new ApiError(400, 'No pending verification found for this email.');

  if (Date.now() - existing.lastSentAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    const waitSec = Math.ceil((env.OTP_RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - existing.lastSentAt.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${waitSec}s before requesting another code.`);
  }

  const code = generateOtp();
  existing.codeHash = await hashOtp(code);
  existing.attempts = 0;
  existing.expiresAt = otpExpiry();
  existing.lastSentAt = new Date();
  await existing.save();

  await sendOtpEmail(normalizedEmail, existing.pendingName || 'there', code);
  res.status(200).json({ message: `A new code was sent to ${normalizedEmail}.` });
});

/** POST /api/auth/verify-otp — completes registration and logs the user in. */
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body as { email?: string; code?: string };
  if (!email || !code) throw new ApiError(400, 'Email and code are required.');
  const normalizedEmail = email.toLowerCase().trim();

  const record = await Otp.findOne({ email: normalizedEmail, purpose: 'register', consumed: false }).sort({ createdAt: -1 });
  if (!record) throw new ApiError(400, 'No pending verification found. Please register again.');
  if (record.expiresAt.getTime() < Date.now()) throw new ApiError(400, 'This code has expired. Please request a new one.');
  if (record.attempts >= record.maxAttempts) throw new ApiError(429, 'Too many incorrect attempts. Please request a new code.');

  const match = await compareOtp(code, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    throw new ApiError(400, 'Incorrect verification code.');
  }

  if (!record.pendingName || !record.pendingPasswordHash || !record.pendingRole) {
    throw new ApiError(400, 'Registration data is missing. Please register again.');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) throw new ApiError(409, 'An account with this email already exists.');

  const user = await User.create({
    name: record.pendingName,
    email: normalizedEmail,
    passwordHash: record.pendingPasswordHash,
    role: record.pendingRole,
    isVerified: true,
  });

  record.consumed = true;
  await record.save();

  const token = signToken({ userId: user._id.toString(), role: user.role, name: user.name, email: user.email });
  res.status(201).json({ token, user: publicUser(user) });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new ApiError(401, 'Incorrect email or password.');
  if (!user.isVerified) throw new ApiError(403, 'Please verify your email before logging in.');

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Incorrect email or password.');

  const token = signToken({ userId: user._id.toString(), role: user.role, name: user.name, email: user.email });
  res.status(200).json({ token, user: publicUser(user) });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const user = await User.findById(req.user.userId);
  if (!user) throw new ApiError(404, 'User not found.');
  res.status(200).json({ user: publicUser(user) });
});

/** POST /api/auth/forgot-password — always responds the same way to avoid account enumeration. */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) throw new ApiError(400, 'Email is required.');
  const normalizedEmail = email.toLowerCase().trim();
  const genericResponse = { message: 'If an account exists for this email, a verification code has been sent.' };

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(200).json(genericResponse);
    return;
  }

  const recent = await Otp.findOne({ email: normalizedEmail, purpose: 'reset_password' }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.lastSentAt.getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    res.status(200).json(genericResponse);
    return;
  }

  const code = generateOtp();
  await Otp.deleteMany({ email: normalizedEmail, purpose: 'reset_password' });
  await Otp.create({
    email: normalizedEmail,
    purpose: 'reset_password',
    codeHash: await hashOtp(code),
    attempts: 0,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    expiresAt: otpExpiry(),
    lastSentAt: new Date(),
    consumed: false,
  });
  await sendOtpEmail(normalizedEmail, user.name, code);

  res.status(200).json(genericResponse);
});

/** POST /api/auth/reset-password */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body as { email?: string; code?: string; newPassword?: string };
  if (!email || !code || !newPassword) throw new ApiError(400, 'Email, code and new password are required.');
  if (newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.');
  const normalizedEmail = email.toLowerCase().trim();

  const record = await Otp.findOne({ email: normalizedEmail, purpose: 'reset_password', consumed: false }).sort({ createdAt: -1 });
  if (!record) throw new ApiError(400, 'No pending password reset found. Please start again.');
  if (record.expiresAt.getTime() < Date.now()) throw new ApiError(400, 'This code has expired. Please request a new one.');
  if (record.attempts >= record.maxAttempts) throw new ApiError(429, 'Too many incorrect attempts. Please request a new code.');

  const match = await compareOtp(code, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    throw new ApiError(400, 'Incorrect verification code.');
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new ApiError(404, 'Account not found.');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  record.consumed = true;
  await record.save();

  res.status(200).json({ message: 'Password updated. You can now log in.' });
});

function publicUser(user: InstanceType<typeof User>) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, isVerified: user.isVerified };
}
