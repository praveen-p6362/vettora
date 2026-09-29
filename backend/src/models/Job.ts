import { Schema, model, Document, Types } from 'mongoose';

export interface IJob extends Document {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  company: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experience: string;
  education: string;
  location: string;
  employmentType: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    experience: { type: String, default: '' },
    education: { type: String, default: '' },
    location: { type: String, default: '' },
    employmentType: { type: String, default: 'Full-time' },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Job = model<IJob>('Job', jobSchema);
