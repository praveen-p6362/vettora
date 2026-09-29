import { Schema, model, Document, Types } from 'mongoose';

export type AssessmentStatus =
  | 'Pending'
  | 'InProgress'
  | 'Submitted'
  | 'Reviewed'
  | 'Approved'
  | 'Rejected';

export type AssessmentQuestionType =
  | 'MCQ'
  | 'ShortAnswer';

export interface IAssessmentQuestion {
  type: AssessmentQuestionType;
  question: string;
  options: string[];
  correctAnswer?: string;
  answer: string;
  score: number | null;
  feedback: string;
}

export interface IAssessment extends Document {
  _id: Types.ObjectId;

  application: Types.ObjectId;
  candidate: Types.ObjectId;
  job: Types.ObjectId;

  questions: IAssessmentQuestion[];

  status: AssessmentStatus;

  score: number | null;
  strengths: string[];
  weaknesses: string[];
  aiFeedback: string;

  startedAt?: Date;
  submittedAt?: Date;
  reviewedAt?: Date;

  /*
   * Candidate must complete the assessment
   * before this date/time.
   */
  expiresAt?: Date;

  reviewedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const assessmentQuestionSchema =
  new Schema<IAssessmentQuestion>(
    {
      type: {
        type: String,
        enum: [
          'MCQ',
          'ShortAnswer',
        ],
        required: true,
      },

      question: {
        type: String,
        required: true,
      },

      options: {
        type: [String],
        default: [],
      },

      correctAnswer: {
        type: String,
      },

      answer: {
        type: String,
        default: '',
      },

      score: {
        type: Number,
        default: null,
      },

      feedback: {
        type: String,
        default: '',
      },
    },
    {
      _id: false,
    }
  );

const assessmentSchema =
  new Schema<IAssessment>(
    {
      application: {
        type: Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
        unique: true,
        index: true,
      },

      candidate: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true,
      },

      questions: {
        type: [assessmentQuestionSchema],
        default: [],
      },

      status: {
        type: String,
        enum: [
          'Pending',
          'InProgress',
          'Submitted',
          'Reviewed',
          'Approved',
          'Rejected',
        ],
        default: 'Pending',
      },

      score: {
        type: Number,
        default: null,
      },

      strengths: {
        type: [String],
        default: [],
      },

      weaknesses: {
        type: [String],
        default: [],
      },

      aiFeedback: {
        type: String,
        default: '',
      },

      startedAt: {
        type: Date,
      },

      submittedAt: {
        type: Date,
      },

      reviewedAt: {
        type: Date,
      },

      /*
       * Assessment expiry.
       */
      expiresAt: {
        type: Date,
      },

      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    {
      timestamps: true,
    }
  );

export const Assessment =
  model<IAssessment>(
    'Assessment',
    assessmentSchema
  );