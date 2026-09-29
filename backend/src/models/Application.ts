import { Schema, model, Document, Types } from 'mongoose';

export type ApplicationStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Assessment Pending'
  | 'Assessment In Progress'
  | 'Assessment Submitted'
  | 'HR Review'
  | 'Interviewing'
  | 'Rejected';

export interface IJobMatch {
  overallMatch: number;
  skillMatch: number;
  keywordMatch: number;
  experienceMatch: number;
  educationMatch: number;
  projectRelevance: number;
  missingRequirements: string[];
  matchingRequirements: string[];
  tier:
    | 'Strong Match'
    | 'Good Match'
    | 'Moderate Match'
    | 'Needs Improvement';
}

export interface IHrNote {
  by: Types.ObjectId;
  byName: string;
  text: string;
  at: Date;
}

export interface IApplication extends Document {
  _id: Types.ObjectId;

  candidate: Types.ObjectId;
  job: Types.ObjectId;

  status: ApplicationStatus;

  match: IJobMatch;

  assessment?: Types.ObjectId;

  /*
   * Online assessment deadline.
   * Set when HR shortlists the candidate.
   */
  assessmentExpiresAt?: Date;

  scheduledAt?: string;

  notes: IHrNote[];

  appliedAt: Date;
  updatedAt: Date;
}

const applicationSchema =
  new Schema<IApplication>(
    {
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

      status: {
        type: String,
        enum: [
          'Applied',
          'Shortlisted',
          'Assessment Pending',
          'Assessment In Progress',
          'Assessment Submitted',
          'HR Review',
          'Interviewing',
          'Rejected',
        ],
        default: 'Applied',
      },

      match: {
        overallMatch: Number,
        skillMatch: Number,
        keywordMatch: Number,
        experienceMatch: Number,
        educationMatch: Number,
        projectRelevance: Number,

        missingRequirements: {
          type: [String],
          default: [],
        },

        matchingRequirements: {
          type: [String],
          default: [],
        },

        tier: {
          type: String,
          enum: [
            'Strong Match',
            'Good Match',
            'Moderate Match',
            'Needs Improvement',
          ],
        },
      },

      assessment: {
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
      },

      /*
       * Candidate has 7 days from shortlist.
       */
      assessmentExpiresAt: {
        type: Date,
      },

      scheduledAt: {
        type: String,
      },

      notes: [
        {
          by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },

          byName: String,

          text: String,

          at: {
            type: Date,
            default: () => new Date(),
          },
        },
      ],

      appliedAt: {
        type: Date,
        default: () => new Date(),
      },
    },

    {
      timestamps: {
        createdAt: false,
        updatedAt: true,
      },
    }
  );

applicationSchema.index(
  { candidate: 1, job: 1 },
  { unique: true }
);

export const Application =
  model<IApplication>(
    'Application',
    applicationSchema
  );