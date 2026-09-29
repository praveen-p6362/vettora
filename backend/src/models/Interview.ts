import { Schema, model, Document, Types } from 'mongoose';

export type InterviewRound = 'HR' | 'Technical' | 'Behavioral' | 'Problem-Solving';

export interface IInterviewQuestion {
  round: InterviewRound;
  tag: string;
  text: string;
  answer: string;
  score: number | null;
  feedback: string;
}

export interface IInterview extends Document {
  _id: Types.ObjectId;
  candidate: Types.ObjectId;
  job?: Types.ObjectId;
  role: string;
  company?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: IInterviewQuestion[];
  scores: {
    technical: number;
    communication: number;
    confidence: number;
    problemSolving: number;
    overall: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  date: Date;
}

const interviewSchema = new Schema<IInterview>({
  candidate: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  job: { type: Schema.Types.ObjectId, ref: 'Job' },
  role: { type: String, required: true },
  company: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  questions: [
    {
      round: { type: String, enum: ['HR', 'Technical', 'Behavioral', 'Problem-Solving'], required: true },
      tag: String,
      text: { type: String, required: true },
      answer: { type: String, default: '' },
      score: { type: Number, default: null },
      feedback: { type: String, default: '' },
    },
  ],
  scores: {
    technical: Number,
    communication: Number,
    confidence: Number,
    problemSolving: Number,
    overall: Number,
  },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  recommendation: { type: String, default: '' },
  date: { type: Date, default: () => new Date() },
});

export const Interview = model<IInterview>('Interview', interviewSchema);
