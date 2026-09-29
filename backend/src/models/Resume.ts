import { Schema, model, Document, Types } from 'mongoose';

export interface IAtsReport {
  overall: number;
  keywordMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  projectMatch: number;
  formatting: number;
  readability: number;
  matchedSkills: string[];
  missingSkills: string[];
  missingKeywords: string[];
  strengths: string[];
  weakSections: string[];
  suggestions: string[];
}

export interface IResume extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  fileName: string;
  mimeType: string;
  extractedText: string;
  parsed: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    education: string[];
    skills: string[];
    technicalSkills: string[];
    softSkills: string[];
    projects: string[];
    internships: string[];
    experience: string[];
    certifications: string[];
    achievements: string[];
    languages: string[];
    tools: string[];
    github?: string;
    linkedin?: string;
    portfolio?: string;
  };
  ats: IAtsReport;
  uploadedAt: Date;
  analyzedAt: Date;
}

const resumeSchema = new Schema<IResume>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  extractedText: { type: String, required: true },
  parsed: {
    name: String,
    email: String,
    phone: String,
    location: String,
    summary: String,
    education: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    technicalSkills: { type: [String], default: [] },
    softSkills: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    internships: { type: [String], default: [] },
    experience: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    tools: { type: [String], default: [] },
    github: String,
    linkedin: String,
    portfolio: String,
  },
  ats: {
    overall: Number,
    keywordMatch: Number,
    skillsMatch: Number,
    experienceMatch: Number,
    educationMatch: Number,
    projectMatch: Number,
    formatting: Number,
    readability: Number,
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    missingKeywords: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weakSections: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
  },
  uploadedAt: { type: Date, default: () => new Date() },
  analyzedAt: { type: Date, default: () => new Date() },
});

export const Resume = model<IResume>('Resume', resumeSchema);
