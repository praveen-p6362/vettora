import { Schema, model, Document } from 'mongoose';

export type OtpPurpose = 'register' | 'reset_password';

export interface IOtp extends Document {
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  // Pending registration payload is stashed here so the account is only
  // created in the Users collection once the OTP is verified.
  pendingName?: string;
  pendingPasswordHash?: string;
  pendingRole?: 'candidate' | 'hr';
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  lastSentAt: Date;
  consumed: boolean;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: ['register', 'reset_password'], required: true },
    codeHash: { type: String, required: true },
    pendingName: { type: String },
    pendingPasswordHash: { type: String },
    pendingRole: { type: String, enum: ['candidate', 'hr'] },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

otpSchema.index({ email: 1, purpose: 1 });

export const Otp = model<IOtp>('Otp', otpSchema);
