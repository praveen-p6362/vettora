import { Request, Response } from 'express';

import { Assessment } from '../models/Assessment';
import { Application } from '../models/Application';

import {
  askGemini,
  parseJsonLoose,
} from '../utils/gemini';

import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

import {
  sendAssessmentApprovedEmail,
  sendAssessmentRejectedEmail,
} from '../utils/email';

/*
 * ============================================================
 * GEMINI PROMPTS
 * ============================================================
 */

const ASSESSMENT_GENERATION_PROMPT = `
You are creating an online recruitment assessment.

Create exactly 10 questions for the candidate based ONLY on the job information provided.

Requirements:
- Create a mixture of multiple-choice and short-answer questions.
- Focus on the actual skills and responsibilities in the job.
- Questions should test practical understanding, not trivia.
- Do not ask questions unrelated to the job.
- MCQ questions must have exactly 4 options.
- Short-answer questions must have an empty options array.
- Every question must have a correctAnswer.
- Difficulty should be appropriate for a real job screening assessment.
- The correctAnswer must be clear enough for later AI evaluation.

Return ONLY valid JSON in exactly this shape:

{
  "questions": [
    {
      "type": "MCQ",
      "question": "string",
      "options": [
        "string",
        "string",
        "string",
        "string"
      ],
      "correctAnswer": "string"
    },
    {
      "type": "ShortAnswer",
      "question": "string",
      "options": [],
      "correctAnswer": "string"
    }
  ]
}
`;

const ASSESSMENT_EVALUATION_PROMPT = `
You are evaluating a candidate's online recruitment assessment.

Evaluate every answer against the question and expected answer.

For MCQ:
- Full credit if the candidate answer matches the correct answer.
- Zero if the answer is incorrect.

For ShortAnswer:
- Evaluate technical correctness.
- Evaluate relevance.
- Evaluate completeness.
- Evaluate practical understanding.

Return ONLY valid JSON in exactly this shape:

{
  "score": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "feedback": "string",
  "questionResults": [
    {
      "index": number,
      "score": number,
      "feedback": "string"
    }
  ]
}

Rules:
- Overall score must be between 0 and 100.
- Each question score must be between 0 and 100.
- index is zero-based.
- Do not invent information about the candidate.
`;

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function ensureCandidate(
  req: Request,
  application: any
) {
  if (!req.user) {
    throw new ApiError(
      401,
      'Authentication required.'
    );
  }

  if (
    application.candidate.toString() !==
    req.user.userId
  ) {
    throw new ApiError(
      403,
      'This assessment does not belong to you.'
    );
  }
}

/*
 * Check whether the 7-day deadline has passed.
 */
function isAssessmentExpired(
  application: any
): boolean {
  if (
    !application.assessmentExpiresAt
  ) {
    return false;
  }

  return (
    new Date(
      application.assessmentExpiresAt
    ).getTime() <= Date.now()
  );
}

/*
 * Candidate-safe response.
 *
 * correctAnswer is NEVER sent to candidate.
 */
function toCandidateAssessment(
  assessment: any
) {
  const completed =
    assessment.status === 'Submitted' ||
    assessment.status === 'Reviewed' ||
    assessment.status === 'Approved' ||
    assessment.status === 'Rejected';

  return {
    _id: assessment._id,

    application:
      assessment.application,

    candidate:
      assessment.candidate,

    job:
      assessment.job,

    status:
      assessment.status,

    score: completed
      ? assessment.score
      : null,

    strengths: completed
      ? assessment.strengths
      : [],

    weaknesses: completed
      ? assessment.weaknesses
      : [],

    aiFeedback: completed
      ? assessment.aiFeedback
      : '',

    startedAt:
      assessment.startedAt,

    submittedAt:
      assessment.submittedAt,

    reviewedAt:
      assessment.reviewedAt,

    expiresAt:
      assessment.expiresAt,

    questions:
      assessment.questions.map(
        (question: any) => ({
          _id:
            question._id,

          type:
            question.type,

          question:
            question.question,

          options:
            question.options,

          answer:
            question.answer,

          score: completed
            ? question.score
            : null,

          feedback: completed
            ? question.feedback
            : '',
        })
      ),
  };
}

/*
 * ============================================================
 * START ASSESSMENT
 * ============================================================
 */

export const startAssessment =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new ApiError(
          401,
          'Authentication required.'
        );
      }

      const application =
        await Application.findById(
          req.params.applicationId
        ).populate('job');

      if (!application) {
        throw new ApiError(
          404,
          'Application not found.'
        );
      }

      ensureCandidate(
        req,
        application
      );

      /*
       * Candidate must be in assessment stage.
       */
      if (
        application.status !==
          'Assessment Pending' &&
        application.status !==
          'Assessment In Progress'
      ) {
        throw new ApiError(
          400,
          `Assessment cannot be started while application status is "${application.status}".`
        );
      }

      /*
       * Check 7-day expiry BEFORE generating
       * or returning an assessment.
       */
      if (
        isAssessmentExpired(
          application
        )
      ) {
        throw new ApiError(
          400,
          'Your online assessment has expired. The 7-day deadline has passed. Please contact HR if you need another opportunity.'
        );
      }

      /*
       * Existing assessment.
       */
      let assessment =
        await Assessment.findOne({
          application:
            application._id,
        });

      if (assessment) {
        /*
         * Keep the assessment expiry synchronized
         * with the application deadline.
         */
        if (
          application.assessmentExpiresAt &&
          !assessment.expiresAt
        ) {
          assessment.expiresAt =
            application.assessmentExpiresAt;

          await assessment.save();
        }

        /*
         * Check assessment-level expiry too.
         */
        if (
          assessment.expiresAt &&
          new Date(
            assessment.expiresAt
          ).getTime() <= Date.now()
        ) {
          throw new ApiError(
            400,
            'Your online assessment has expired. The 7-day deadline has passed.'
          );
        }

        if (
          assessment.status ===
          'InProgress'
        ) {
          if (
            application.status !==
            'Assessment In Progress'
          ) {
            application.status =
              'Assessment In Progress';

            await application.save();
          }
        }

        res.status(200).json({
          assessment:
            toCandidateAssessment(
              assessment
            ),
        });

        return;
      }

      const job =
        application.job as any;

      if (!job) {
        throw new ApiError(
          404,
          'Job information not found.'
        );
      }

      /*
       * Generate assessment questions.
       */
      const prompt = `
JOB TITLE:
${job.title}

JOB DESCRIPTION:
${job.description}

REQUIRED SKILLS:
${(
        job.requiredSkills || []
      ).join(', ')}

PREFERRED SKILLS:
${(
        job.preferredSkills || []
      ).join(', ')}

EXPERIENCE REQUIRED:
${job.experience || 'Not specified'}

EDUCATION REQUIRED:
${job.education || 'Not specified'}
`;

      const raw =
        await askGemini(
          prompt,
          ASSESSMENT_GENERATION_PROMPT
        );

      const parsed =
        parseJsonLoose<any>(
          raw
        );

      if (
        !parsed ||
        !Array.isArray(
          parsed.questions
        ) ||
        parsed.questions.length === 0
      ) {
        throw new ApiError(
          502,
          'Could not generate the online assessment. Please try again.'
        );
      }

      const questions =
        parsed.questions
          .slice(0, 10)
          .map(
            (question: any) => ({
              type:
                question.type ===
                'ShortAnswer'
                  ? 'ShortAnswer'
                  : 'MCQ',

              question:
                String(
                  question.question ||
                    ''
                ).trim(),

              options:
                Array.isArray(
                  question.options
                )
                  ? question.options.map(
                      (option: any) =>
                        String(
                          option
                        )
                  )
                  : [],

              correctAnswer:
                String(
                  question.correctAnswer ||
                    ''
                ).trim(),

              answer: '',

              score: null,

              feedback: '',
            })
          )
          .filter(
            (question: any) =>
              question.question &&
              question.correctAnswer
          );

      if (
        questions.length < 10
      ) {
        throw new ApiError(
          502,
          'Gemini did not generate enough valid assessment questions. Please try again.'
        );
      }

      /*
       * Create assessment.
       */
      try {
        assessment =
          await Assessment.create({
            application:
              application._id,

            candidate:
              application.candidate,

            job: job._id,

            questions,

            status:
              'InProgress',

            score: null,

            strengths: [],

            weaknesses: [],

            aiFeedback: '',

            startedAt:
              new Date(),

            /*
             * IMPORTANT:
             * Use the expiry created when HR
             * shortlisted the candidate.
             */
            expiresAt:
              application.assessmentExpiresAt,
          });
      } catch (err: any) {
        if (
          err?.code === 11000
        ) {
          assessment =
            await Assessment.findOne({
              application:
                application._id,
            });

          if (!assessment) {
            throw new ApiError(
              500,
              'Assessment was created but could not be retrieved. Please refresh and try again.'
            );
          }
        } else {
          throw err;
        }
      }

      application.status =
        'Assessment In Progress';

      (
        application as any
      ).assessment =
        assessment._id;

      await application.save();

      res.status(201).json({
        assessment:
          toCandidateAssessment(
            assessment
          ),
      });
    }
  );

/*
 * ============================================================
 * GET ASSESSMENT
 * ============================================================
 */

export const getAssessment =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new ApiError(
          401,
          'Authentication required.'
        );
      }

      const application =
        await Application.findById(
          req.params.applicationId
        );

      if (!application) {
        throw new ApiError(
          404,
          'Application not found.'
        );
      }

      ensureCandidate(
        req,
        application
      );

      const assessment =
        await Assessment.findOne({
          application:
            application._id,
        });

      if (!assessment) {
        throw new ApiError(
          404,
          'Assessment not found.'
        );
      }

      /*
       * If still in progress and expired,
       * don't allow access.
       */
      if (
        assessment.status ===
          'InProgress' &&
        (
          assessment.expiresAt &&
          new Date(
            assessment.expiresAt
          ).getTime() <= Date.now()
        )
      ) {
        throw new ApiError(
          400,
          'Your online assessment has expired.'
        );
      }

      res.status(200).json({
        assessment:
          toCandidateAssessment(
            assessment
          ),
      });
    }
  );

/*
 * ============================================================
 * SUBMIT ASSESSMENT
 * ============================================================
 */

export const submitAssessment =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new ApiError(
          401,
          'Authentication required.'
        );
      }

      const {
        answers,
      } = req.body as {
        answers?: string[];
      };

      if (!Array.isArray(answers)) {
        throw new ApiError(
          400,
          'Answers must be an array.'
        );
      }

      const application =
        await Application.findById(
          req.params.applicationId
        ).populate('job');

      if (!application) {
        throw new ApiError(
          404,
          'Application not found.'
        );
      }

      ensureCandidate(
        req,
        application
      );

      const assessment =
        await Assessment.findOne({
          application:
            application._id,
        });

      if (!assessment) {
        throw new ApiError(
          404,
          'Assessment not found.'
        );
      }

      if (
        assessment.status !==
        'InProgress'
      ) {
        throw new ApiError(
          400,
          'This assessment has already been submitted or reviewed.'
        );
      }

      /*
       * IMPORTANT:
       * Prevent submission after the 7-day deadline.
       */
      if (
        assessment.expiresAt &&
        new Date(
          assessment.expiresAt
        ).getTime() <= Date.now()
      ) {
        throw new ApiError(
          400,
          'Your online assessment has expired and can no longer be submitted.'
        );
      }

      if (
        answers.length !==
        assessment.questions.length
      ) {
        throw new ApiError(
          400,
          `Expected ${assessment.questions.length} answers.`
        );
      }

      /*
       * Save candidate answers.
       */
      assessment.questions.forEach(
        (
          question,
          index
        ) => {
          question.answer =
            String(
              answers[index] || ''
            ).trim();
        }
      );

      const job =
        application.job as any;

      if (!job) {
        throw new ApiError(
          404,
          'Job information not found.'
        );
      }

      /*
       * Gemini evaluation.
       */
      const evaluationPrompt = `
JOB TITLE:
${job.title}

JOB DESCRIPTION:
${job.description}

REQUIRED SKILLS:
${(
        job.requiredSkills ||
        []
      ).join(', ')}

PREFERRED SKILLS:
${(
        job.preferredSkills ||
        []
      ).join(', ')}

ASSESSMENT:

${assessment.questions
  .map(
    (
      question,
      index
    ) => `
QUESTION ${index + 1}

Type:
${question.type}

Question:
${question.question}

Expected Answer:
${question.correctAnswer}

Candidate Answer:
${question.answer}
`
  )
  .join('\n')}
`;

      const raw =
        await askGemini(
          evaluationPrompt,
          ASSESSMENT_EVALUATION_PROMPT
        );

      const parsed =
        parseJsonLoose<any>(
          raw
        );

      if (
        !parsed ||
        typeof parsed.score !==
          'number'
      ) {
        throw new ApiError(
          502,
          'Could not evaluate the assessment. Please try again.'
        );
      }

      assessment.score =
        Math.max(
          0,
          Math.min(
            100,
            parsed.score
          )
        );

      assessment.strengths =
        Array.isArray(
          parsed.strengths
        )
          ? parsed.strengths
          : [];

      assessment.weaknesses =
        Array.isArray(
          parsed.weaknesses
        )
          ? parsed.weaknesses
          : [];

      assessment.aiFeedback =
        String(
          parsed.feedback ||
            ''
        );

      if (
        Array.isArray(
          parsed.questionResults
        )
      ) {
        parsed.questionResults.forEach(
          (result: any) => {
            const index =
              Number(
                result.index
              );

            if (
              Number.isInteger(
                index
              ) &&
              index >= 0 &&
              index <
                assessment.questions
                  .length
            ) {
              assessment
                .questions[
                  index
                ].score =
                Math.max(
                  0,
                  Math.min(
                    100,
                    Number(
                      result.score
                    ) || 0
                  )
                );

              assessment
                .questions[
                  index
                ].feedback =
                String(
                  result.feedback ||
                    ''
                );
            }
          }
        );
      }

      assessment.status =
        'Submitted';

      assessment.submittedAt =
        new Date();

      await assessment.save();

      application.status =
        'Assessment Submitted';

      await application.save();

      res.status(200).json({
        assessment:
          toCandidateAssessment(
            assessment
          ),
      });
    }
  );

/*
 * ============================================================
 * HR — GET ASSESSMENT RESULT
 * ============================================================
 */

export const getAssessmentResult =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new ApiError(
          401,
          'Authentication required.'
        );
      }

      const application =
        await Application.findById(
          req.params.applicationId
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
        !job ||
        job.createdBy.toString() !==
          req.user.userId
      ) {
        throw new ApiError(
          403,
          'You can only review assessments for your own job postings.'
        );
      }

      const assessment =
        await Assessment.findOne({
          application:
            application._id,
        }).populate(
          'candidate',
          'name email'
        );

      if (!assessment) {
        throw new ApiError(
          404,
          'Assessment not found.'
        );
      }

      res.status(200).json({
        assessment,
      });
    }
  );

/*
 * ============================================================
 * HR — APPROVE / REJECT
 * ============================================================
 */

export const reviewAssessment =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      if (!req.user) {
        throw new ApiError(
          401,
          'Authentication required.'
        );
      }

      const {
        decision,
      } = req.body as {
        decision?:
          | 'Approved'
          | 'Rejected';
      };

      if (
        decision !==
          'Approved' &&
        decision !==
          'Rejected'
      ) {
        throw new ApiError(
          400,
          'Decision must be Approved or Rejected.'
        );
      }

      const application =
        await Application.findById(
          req.params.applicationId
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
        !job ||
        job.createdBy.toString() !==
          req.user.userId
      ) {
        throw new ApiError(
          403,
          'You can only review assessments for your own job postings.'
        );
      }

      const assessment =
        await Assessment.findOne({
          application:
            application._id,
        });

      if (!assessment) {
        throw new ApiError(
          404,
          'Assessment not found.'
        );
      }

      if (
        assessment.status !==
          'Submitted' &&
        assessment.status !==
          'Reviewed'
      ) {
        throw new ApiError(
          400,
          'The candidate must submit the assessment before HR can review it.'
        );
      }

      /*
       * Candidate information for email.
       */
      const candidate =
        await Application.findById(
          application._id
        ).populate(
          'candidate',
          'name email'
        );

      const candidateUser =
        (candidate as any)?.candidate;

      if (
        !candidateUser ||
        !candidateUser.email
      ) {
        throw new ApiError(
          400,
          'Candidate email address was not found.'
        );
      }

      /*
       * Save assessment decision.
       */
      assessment.status =
        decision;

      assessment.reviewedAt =
        new Date();

      assessment.reviewedBy =
        req.user.userId as any;

      await assessment.save();

      /*
       * APPROVED
       */
      if (
        decision ===
        'Approved'
      ) {
        application.status =
          'Interviewing';

        await application.save();

        /*
         * Send approval email.
         */
        try {
          await sendAssessmentApprovedEmail(
            candidateUser.email,
            candidateUser.name,
            job.title,
            job.company
          );
        } catch (emailError) {
          console.error(
            '[email] Failed to send assessment approval email:',
            emailError
          );

          res.status(200).json({
            application,
            assessment,
            emailSent: false,
            message:
              'Assessment approved and candidate moved to the interview stage, but the approval email could not be sent.',
          });

          return;
        }

        res.status(200).json({
          application,
          assessment,
          emailSent: true,
          message:
            'Assessment approved. Candidate can now proceed to the real interview. Approval email sent.',
        });

        return;
      }

      /*
       * REJECTED
       */
      application.status =
        'Rejected';

      await application.save();

      /*
       * Send rejection email.
       */
      try {
        await sendAssessmentRejectedEmail(
          candidateUser.email,
          candidateUser.name,
          job.title,
          job.company
        );
      } catch (emailError) {
        console.error(
          '[email] Failed to send assessment rejection email:',
          emailError
        );

        res.status(200).json({
          application,
          assessment,
          emailSent: false,
          message:
            'Candidate rejected after assessment review, but the rejection email could not be sent.',
        });

        return;
      }

      res.status(200).json({
        application,
        assessment,
        emailSent: true,
        message:
          'Candidate rejected after assessment review. Rejection email sent.',
      });
    }
  );