import { Request, Response } from 'express';

import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { Resume } from '../models/Resume';
import { User } from '../models/User';

import { askGemini, parseJsonLoose } from '../utils/gemini';
import { getMatchTier } from '../utils/matchTier';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

import {
  sendAssessmentInvitationEmail,
} from '../utils/email';

const MATCH_SYSTEM_PROMPT = `You compare a candidate resume against a job description. Respond with ONLY valid JSON of this exact shape:
{"overallMatch": number(0-100), "skillMatch": number, "keywordMatch": number, "experienceMatch": number, "educationMatch": number, "projectRelevance": number, "missingRequirements": [string], "matchingRequirements": [string]}
Base every score strictly on the actual resume and job description content given — do not use round default numbers.`;

/* ============================================================
   CANDIDATE APPLIES FOR JOB
   ============================================================ */

/**
 * POST /api/applications/:jobId/apply
 */
export const applyToJob = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(
        401,
        'Authentication required.'
      );
    }

    const job = await Job.findById(
      req.params.jobId
    );

    if (!job) {
      throw new ApiError(
        404,
        'Job not found.'
      );
    }

    const resume = await Resume.findOne({
      user: req.user.userId,
    });

    if (!resume) {
      throw new ApiError(
        400,
        'Upload your resume before applying — your match score is calculated from it.'
      );
    }

    const prompt = `RESUME SKILLS: ${(resume.parsed.skills || []).join(', ')}
RESUME EXPERIENCE: ${(resume.parsed.experience || []).join(' | ')}
RESUME EDUCATION: ${(resume.parsed.education || []).join(' | ')}
RESUME PROJECTS: ${(resume.parsed.projects || []).join(' | ')}

JOB TITLE: ${job.title}
JOB DESCRIPTION: ${job.description}
REQUIRED SKILLS: ${(job.requiredSkills || []).join(', ')}
PREFERRED SKILLS: ${(job.preferredSkills || []).join(', ')}
EXPERIENCE REQUIRED: ${job.experience}
EDUCATION REQUIRED: ${job.education}`;

    const raw = await askGemini(
      prompt,
      MATCH_SYSTEM_PROMPT
    );

    const parsed = parseJsonLoose<any>(raw);

    if (!parsed) {
      throw new ApiError(
        502,
        'Could not compute a match score. Please try again.'
      );
    }

    const match = {
      overallMatch: parsed.overallMatch,
      skillMatch: parsed.skillMatch,
      keywordMatch: parsed.keywordMatch,
      experienceMatch: parsed.experienceMatch,
      educationMatch: parsed.educationMatch,
      projectRelevance: parsed.projectRelevance,
      missingRequirements:
        parsed.missingRequirements || [],
      matchingRequirements:
        parsed.matchingRequirements || [],
      tier: getMatchTier(
        parsed.overallMatch
      ),
    };

    const application =
      await Application.findOneAndUpdate(
        {
          candidate: req.user.userId,
          job: job._id,
        },
        {
          candidate: req.user.userId,
          job: job._id,
          match,

          $setOnInsert: {
            status: 'Applied',
            appliedAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

    res.status(200).json({
      application,
    });
  }
);

/* ============================================================
   CANDIDATE — MY APPLICATIONS
   ============================================================ */

/**
 * GET /api/applications/mine
 */
export const getMyApplications = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(
        401,
        'Authentication required.'
      );
    }

    const applications =
      await Application.find({
        candidate: req.user.userId,
      })
        .populate('job')
        .populate('assessment')
        .sort({
          appliedAt: -1,
        });

    res.status(200).json({
      applications,
    });
  }
);

/* ============================================================
   HR — APPLICATIONS FOR JOB
   ============================================================ */

/**
 * GET /api/applications/job/:jobId
 */
export const getApplicationsForJob =
  asyncHandler(
    async (req: Request, res: Response) => {
      if (!req.user) {
        throw new ApiError(
          401,
          'Authentication required.'
        );
      }

      const job = await Job.findById(
        req.params.jobId
      );

      if (!job) {
        throw new ApiError(
          404,
          'Job not found.'
        );
      }

      if (
        job.createdBy.toString() !==
        req.user.userId
      ) {
        throw new ApiError(
          403,
          'You can only view applicants for your own job postings.'
        );
      }

      const applications =
        await Application.find({
          job: job._id,
        })
          .populate(
            'candidate',
            'name email'
          )
          .populate('assessment')
          .sort({
            'match.overallMatch': -1,
          });

      res.status(200).json({
        applications,
      });
    }
  );

/* ============================================================
   HR — APPLICATIONS FOR CANDIDATE
   ============================================================ */

/**
 * GET /api/applications/candidate/:candidateId
 */
export const getApplicationsForCandidate =
  asyncHandler(
    async (req: Request, res: Response) => {
      const applications =
        await Application.find({
          candidate:
            req.params.candidateId,
        })
          .populate('job')
          .populate('assessment')
          .sort({
            appliedAt: -1,
          });

      res.status(200).json({
        applications,
      });
    }
  );

/* ============================================================
   HR — UPDATE APPLICATION STATUS
   ============================================================ */

/**
 * PATCH /api/applications/:id/status
 *
 * HR can:
 *
 * Shortlisted
 * Rejected
 *
 * Interviewing is deliberately blocked here.
 * Candidate must first pass the assessment approval process.
 */
export const updateApplicationStatus =
  asyncHandler(
    async (req: Request, res: Response) => {
      if (!req.user) {
        throw new ApiError(
          401,
          'Authentication required.'
        );
      }

      const { status } = req.body as {
        status?: string;
      };

      const allowed = [
        'Shortlisted',
        'Rejected',
        'Interviewing',
      ];

      if (
        !status ||
        !allowed.includes(status)
      ) {
        throw new ApiError(
          400,
          'Invalid status.'
        );
      }

      const application =
        await Application.findById(
          req.params.id
        ).populate('job');

      if (!application) {
        throw new ApiError(
          404,
          'Application not found.'
        );
      }

      const job =
        application.job as any;

      if (
        job.createdBy.toString() !==
        req.user.userId
      ) {
        throw new ApiError(
          403,
          'You can only manage applicants for your own job postings.'
        );
      }

      /* ======================================================
         SHORTLIST
         ====================================================== */

      if (status === 'Shortlisted') {
        application.status =
          'Assessment Pending';

        await application.save();

        /*
         * Find candidate information.
         */
        const candidate =
          await User.findById(
            application.candidate
          ).select(
            'name email'
          );

        if (!candidate) {
          throw new ApiError(
            404,
            'Candidate not found.'
          );
        }

        if (!candidate.email) {
          throw new ApiError(
            400,
            'Candidate does not have an email address.'
          );
        }

        /*
         * Assessment expires exactly
         * 7 days from shortlist time.
         */
        const expiresAt =
          new Date(
            Date.now() +
              7 * 24 * 60 * 60 * 1000
          );

        /*
         * IMPORTANT:
         *
         * We use the application ID here.
         *
         * The candidate can log in and
         * access their assessment through
         * the candidate application page.
         *
         * Change this URL later if your
         * frontend uses a different route.
         */
        const frontendUrl =
          process.env.CLIENT_ORIGIN ||
          'http://localhost:5173';

        const assessmentUrl =
          `${frontendUrl}/assessment/${application._id}`;

        /*
         * Send email to candidate.
         *
         * If email fails, the application
         * remains shortlisted. We don't undo
         * the HR action.
         */
        try {
          await sendAssessmentInvitationEmail(
            candidate.email,
            candidate.name,
            job.title,
            job.company,
            assessmentUrl,
            expiresAt
          );
        } catch (emailError) {
          console.error(
            '[email] Failed to send assessment invitation:',
            emailError
          );

          res.status(200).json({
            application,
            emailSent: false,
            message:
              'Candidate shortlisted, but the assessment email could not be sent.',
          });

          return;
        }

        res.status(200).json({
          application,
          emailSent: true,
          message:
            'Candidate shortlisted. Assessment invitation sent to the candidate email. The assessment expires in 7 days.',
        });

        return;
      }

      /* ======================================================
         REJECT
         ====================================================== */

      if (status === 'Rejected') {
        application.status =
          'Rejected';

        await application.save();

        res.status(200).json({
          application,
          message:
            'Candidate rejected.',
        });

        return;
      }

      /* ======================================================
         INTERVIEWING
         ====================================================== */

      if (status === 'Interviewing') {
        throw new ApiError(
          400,
          'Candidate must complete the online assessment and receive HR approval before the real interview.'
        );
      }
    }
  );

/* ============================================================
   HR — ADD NOTE
   ============================================================ */

/**
 * POST /api/applications/:id/notes
 */
export const addNote = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(
        401,
        'Authentication required.'
      );
    }

    const { text } = req.body as {
      text?: string;
    };

    if (!text || !text.trim()) {
      throw new ApiError(
        400,
        'Note text is required.'
      );
    }

    const application =
      await Application.findById(
        req.params.id
      ).populate('job');

    if (!application) {
      throw new ApiError(
        404,
        'Application not found.'
      );
    }

    const job =
      application.job as any;

    if (
      job.createdBy.toString() !==
      req.user.userId
    ) {
      throw new ApiError(
        403,
        'You can only add notes on your own job postings.'
      );
    }

    const hrUser =
      await User.findById(
        req.user.userId
      );

    application.notes.push({
      by:
        req.user.userId as any,
      byName:
        hrUser?.name || 'HR',
      text:
        text.trim(),
      at:
        new Date(),
    });

    await application.save();

    res.status(200).json({
      application,
    });
  }
);