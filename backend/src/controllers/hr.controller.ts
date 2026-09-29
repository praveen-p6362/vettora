import { Request, Response } from 'express';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Application } from '../models/Application';
import { Interview } from '../models/Interview';
import { Resume } from '../models/Resume';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/hr/dashboard
 *
 * Every number here comes from the real database.
 */
export const getDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(
        401,
        'Authentication required.'
      );
    }

    const myJobIds = (
      await Job.find({
        createdBy: req.user.userId,
      }).select('_id')
    ).map((j) => j._id);

    const [
      totalCandidates,
      activeJobs,
      applications,
      shortlisted,
      rejected,
      interviews,
    ] = await Promise.all([
      User.countDocuments({
        role: 'candidate',
      }),

      Job.countDocuments({
        createdBy: req.user.userId,
        published: true,
      }),

      Application.countDocuments({
        job: {
          $in: myJobIds,
        },
      }),

      Application.countDocuments({
        job: {
          $in: myJobIds,
        },
        status: 'Shortlisted',
      }),

      Application.countDocuments({
        job: {
          $in: myJobIds,
        },
        status: 'Rejected',
      }),

      Interview.countDocuments({}),
    ]);

    const atsAgg =
      await Resume.aggregate([
        {
          $group: {
            _id: null,
            avg: {
              $avg: '$ats.overall',
            },
          },
        },
      ]);

    const interviewAgg =
      await Interview.aggregate([
        {
          $group: {
            _id: null,
            avg: {
              $avg: '$scores.overall',
            },
          },
        },
      ]);

    const skillAgg =
      await Resume.aggregate([
        {
          $unwind:
            '$parsed.skills',
        },
        {
          $group: {
            _id: '$parsed.skills',
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
        {
          $limit: 8,
        },
      ]);

    res.status(200).json({
      stats: {
        totalCandidates,
        activeJobs,
        applications,
        shortlisted,
        rejected,
        interviews,

        avgAts:
          atsAgg[0]?.avg ?? null,

        avgInterview:
          interviewAgg[0]?.avg ?? null,
      },

      topSkills:
        skillAgg.map((s) => ({
          skill: s._id,
          count: s.count,
        })),
    });
  }
);

/**
 * GET /api/hr/candidates
 *
 * List real registered candidates.
 */
export const listCandidates =
  asyncHandler(
    async (
      _req: Request,
      res: Response
    ) => {
      const candidates =
        await User.find({
          role: 'candidate',
        })
          .select(
            'name email createdAt'
          )
          .sort({
            createdAt: -1,
          });

      const results =
        await Promise.all(
          candidates.map(
            async (c) => {
              const resume =
                await Resume.findOne({
                  user: c._id,
                }).select(
                  'ats.overall'
                );

              const latestInterview =
                await Interview.findOne({
                  candidate: c._id,
                })
                  .sort({
                    date: -1,
                  })
                  .select(
                    'scores.overall'
                  );

              const bestApplication =
                await Application.findOne({
                  candidate: c._id,
                }).sort({
                  'match.overallMatch':
                    -1,
                });

              return {
                id: c._id,

                name: c.name,

                email: c.email,

                registeredAt:
                  c.createdAt,

                ats:
                  resume?.ats
                    ?.overall ??
                  null,

                interview:
                  latestInterview
                    ?.scores
                    ?.overall ??
                  null,

                bestMatch:
                  bestApplication
                    ?.match
                    ?.overallMatch ??
                  null,

                status:
                  bestApplication
                    ?.status ??
                  'New',
              };
            }
          )
        );

      res.status(200).json({
        candidates: results,
      });
    }
  );

/**
 * GET /api/hr/candidates/:id
 *
 * Full real profile for one candidate.
 *
 * IMPORTANT:
 * Applications whose job document has been deleted
 * are converted into a safe placeholder instead of
 * returning job: null.
 */
export const getCandidateProfile =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        await User.findById(
          req.params.id
        ).select(
          'name email createdAt role'
        );

      if (
        !user ||
        user.role !== 'candidate'
      ) {
        throw new ApiError(
          404,
          'Candidate not found.'
        );
      }

      const [
        resume,
        interviews,
        rawApplications,
      ] = await Promise.all([
        Resume.findOne({
          user: user._id,
        }),

        Interview.find({
          candidate: user._id,
        }).sort({
          date: -1,
        }),

        Application.find({
          candidate: user._id,
        })
          .populate('job')
          .populate('assessment')
          .sort({
            appliedAt: -1,
          }),
      ]);

      /*
       * Convert every application into a safe
       * frontend-friendly object.
       *
       * If the referenced job still exists,
       * return the real job.
       *
       * If the job was deleted, return a placeholder
       * instead of job: null.
       */
      const applications =
        rawApplications.map(
          (application: any) => {
            const job =
              application.job;

            if (job) {
              return application;
            }

            /*
             * Orphaned application.
             *
             * This prevents:
             *
             * app.job.title
             *
             * from crashing the React page.
             */
            return {
              ...application.toObject(),

              job: {
                _id:
                  application.job ??
                  'deleted-job',

                title:
                  'Job no longer available',

                company:
                  'Unavailable',

                location:
                  '',

                employmentType:
                  '',

                description:
                  '',
              },
            };
          }
        );

      res.status(200).json({
        candidate: {
          id: user._id,
          name: user.name,
          email: user.email,
          registeredAt:
            user.createdAt,
        },

        resume,

        interviews,

        applications,
      });
    }
  );

/**
 * GET /api/hr/export
 *
 * Structured CSV-ready export.
 */
export const exportData =
  asyncHandler(
    async (
      _req: Request,
      res: Response
    ) => {
      const candidates =
        await User.find({
          role: 'candidate',
        }).select(
          'name email createdAt'
        );

      const rows =
        await Promise.all(
          candidates.map(
            async (c) => {
              const resume =
                await Resume.findOne({
                  user: c._id,
                }).select(
                  'ats.overall'
                );

              const latestInterview =
                await Interview.findOne({
                  candidate: c._id,
                }).sort({
                  date: -1,
                });

              return {
                name: c.name,

                email: c.email,

                registeredAt:
                  c.createdAt,

                atsScore:
                  resume?.ats
                    ?.overall ??
                  null,

                interviewOverall:
                  latestInterview
                    ?.scores
                    ?.overall ??
                  null,

                interviewTechnical:
                  latestInterview
                    ?.scores
                    ?.technical ??
                  null,

                interviewCommunication:
                  latestInterview
                    ?.scores
                    ?.communication ??
                  null,

                interviewDate:
                  latestInterview?.date ??
                  null,
              };
            }
          )
        );

      res.status(200).json({
        rows,
      });
    }
  );