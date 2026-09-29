import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import {
  EmptyState,
  Spinner,
} from '../../components/ui';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  employmentType: string;
  description: string;
  requiredSkills: string[];
}

interface Match {
  overallMatch: number;
  skillMatch: number;
  keywordMatch: number;
  experienceMatch: number;
  educationMatch: number;
  projectRelevance: number;
  missingRequirements: string[];
  tier: string;
}

interface Application {
  _id: string;
  job:
    | string
    | {
        _id: string;
      };
  status: string;
  match?: Match;
  assessment?: string;
}

export default function Jobs() {
  const [jobs, setJobs] =
    useState<Job[]>([]);

  const [applications, setApplications] =
    useState<Application[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [matches, setMatches] =
    useState<
      Record<
        string,
        Match | 'loading' | 'error'
      >
    >({});

  const [errorMsg, setErrorMsg] =
    useState<Record<string, string>>({});

  const navigate = useNavigate();

  useEffect(() => {
    loadJobsAndApplications();
  }, []);

  async function loadJobsAndApplications() {
    try {
      setLoading(true);

      const [
        jobsResponse,
        applicationsResponse,
      ] = await Promise.all([
        api.get('/jobs'),
        api.get('/applications/mine'),
      ]);

      setJobs(
        jobsResponse.data.jobs || []
      );

      const loadedApplications =
        applicationsResponse.data
          .applications || [];

      setApplications(
        loadedApplications
      );

      /*
       * Restore previously calculated match
       * scores when the page is refreshed.
       */
      const restoredMatches: Record<
        string,
        Match
      > = {};

      loadedApplications.forEach(
        (application: Application) => {
          const jobId =
            typeof application.job ===
            'string'
              ? application.job
              : application.job?._id;

          if (
            jobId &&
            application.match
          ) {
            restoredMatches[jobId] =
              application.match;
          }
        }
      );

      setMatches(
        restoredMatches
      );
    } catch (err: any) {
      console.error(
        'Failed to load jobs:',
        err
      );
    } finally {
      setLoading(false);
    }
  }

  function getApplicationForJob(
    jobId: string
  ) {
    return applications.find(
      (application) => {
        const applicationJobId =
          typeof application.job ===
          'string'
            ? application.job
            : application.job?._id;

        return applicationJobId === jobId;
      }
    );
  }

  async function checkMatch(
    jobId: string
  ) {
    setMatches((m) => ({
      ...m,
      [jobId]: 'loading',
    }));

    try {
      const res = await api.post(
        `/applications/${jobId}/apply`
      );

      const application =
        res.data.application;

      setMatches((m) => ({
        ...m,
        [jobId]:
          application.match,
      }));

      /*
       * Refresh applications so we know the
       * latest application status.
       */
      setApplications(
        (current) => {
          const withoutCurrent =
            current.filter(
              (a) => {
                const currentJobId =
                  typeof a.job ===
                  'string'
                    ? a.job
                    : a.job?._id;

                return (
                  currentJobId !==
                  jobId
                );
              }
            );

          return [
            ...withoutCurrent,
            application,
          ];
        }
      );
    } catch (err: any) {
      setMatches((m) => ({
        ...m,
        [jobId]: 'error',
      }));

      setErrorMsg((e) => ({
        ...e,
        [jobId]:
          err.message ||
          'Could not calculate your match.',
      }));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-[26px] font-bold mb-1">
        Jobs
      </h1>

      <p className="text-ink-500 text-[14px] mb-7">
        Open roles posted by HR teams on Aptura.
      </p>

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs posted yet"
          subtitle="Check back once HR teams have listed open roles."
        />
      ) : (
        jobs.map((job) => {
          const match =
            matches[job._id];

          const application =
            getApplicationForJob(
              job._id
            );

          const status =
            application?.status;

          const assessmentPending =
            status ===
            'Assessment Pending';

          const assessmentInProgress =
            status ===
            'Assessment In Progress';

          const assessmentSubmitted =
            status ===
            'Assessment Submitted';

          return (
            <div
              key={job._id}
              className="card p-6 mb-4"
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="font-display font-semibold text-[16px]">
                    {job.title}
                  </p>

                  <p className="text-[13px] text-ink-500 mt-0.5">
                    {job.company} ·{' '}
                    {job.location ||
                      '—'}{' '}
                    ·{' '}
                    {job.employmentType}
                  </p>
                </div>

                {!application && (
                  <button
                    className="btn btn-primary"
                    disabled={
                      match ===
                      'loading'
                    }
                    onClick={() =>
                      checkMatch(
                        job._id
                      )
                    }
                  >
                    {match ===
                    'loading'
                      ? 'Checking…'
                      : 'Check my match'}
                  </button>
                )}
              </div>

              <p className="text-[13.5px] text-ink-700 mt-3 leading-relaxed">
                {job.description.slice(
                  0,
                  220
                )}
                {job.description
                  .length > 220
                  ? '…'
                  : ''}
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                {job.requiredSkills.map(
                  (skill) => (
                    <span
                      key={skill}
                      className="badge bg-indigo-100 text-indigo-600"
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>

              {/* Application status */}
              {application && (
                <div className="bg-surf-50 rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[12px] text-ink-500">
                        Application status
                      </p>

                      <p className="font-semibold text-[14px] mt-0.5">
                        {status}
                      </p>
                    </div>

                    {assessmentPending && (
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          navigate(
                            `/assessment/${application._id}`
                          )
                        }
                      >
                        Start Online Assessment
                      </button>
                    )}

                    {assessmentInProgress && (
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          navigate(
                            `/assessment/${application._id}`
                          )
                        }
                      >
                        Continue Assessment
                      </button>
                    )}

                    {assessmentSubmitted && (
                      <span className="badge bg-good-100 text-good-600">
                        Assessment Submitted
                      </span>
                    )}

                    {status ===
                      'Interviewing' && (
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          navigate(
                            '/interview',
                            {
                              state: {
                                jobId:
                                  job._id,
                              },
                            }
                          )
                        }
                      >
                        Go to Interview
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Match result */}
              {match &&
                match !==
                  'loading' &&
                match !==
                  'error' && (
                  <div className="bg-surf-50 rounded-xl p-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-[14px]">
                        Your match:{' '}
                        <span className="mono">
                          {
                            match.overallMatch
                          }
                          %
                        </span>
                      </span>

                      <span
                        className={`badge ${
                          match.overallMatch >=
                          80
                            ? 'bg-good-100 text-good-600'
                            : match.overallMatch >=
                              70
                            ? 'bg-warn-100 text-warn-600'
                            : 'bg-bad-100 text-bad-600'
                        }`}
                      >
                        {match.tier}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px] mb-3">
                      <div>
                        Skills
                        <span className="mono font-semibold block">
                          {
                            match.skillMatch
                          }
                          %
                        </span>
                      </div>

                      <div>
                        Keywords
                        <span className="mono font-semibold block">
                          {
                            match.keywordMatch
                          }
                          %
                        </span>
                      </div>

                      <div>
                        Experience
                        <span className="mono font-semibold block">
                          {
                            match.experienceMatch
                          }
                          %
                        </span>
                      </div>

                      <div>
                        Education
                        <span className="mono font-semibold block">
                          {
                            match.educationMatch
                          }
                          %
                        </span>
                      </div>

                      <div>
                        Projects
                        <span className="mono font-semibold block">
                          {
                            match.projectRelevance
                          }
                          %
                        </span>
                      </div>
                    </div>

                    {match
                      .missingRequirements
                      ?.length >
                      0 && (
                      <>
                        <p className="text-[12.5px] font-semibold mb-1">
                          Missing requirements
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {match.missingRequirements.map(
                            (skill) => (
                              <span
                                key={
                                  skill
                                }
                                className="badge bg-bad-100 text-bad-600"
                              >
                                {
                                  skill
                                }
                              </span>
                            )
                          )}
                        </div>
                      </>
                    )}

                    <button
                      className="btn btn-secondary mt-3"
                      onClick={() =>
                        navigate(
                          '/interview',
                          {
                            state: {
                              jobId:
                                job._id,
                            },
                          }
                        )
                      }
                    >
                      Practice interview for this role
                    </button>
                  </div>
                )}

              {match ===
                'error' && (
                <div className="bg-warn-100 text-warn-600 rounded-xl p-3 text-[13px] mt-4">
                  {
                    errorMsg[
                      job._id
                    ]
                  }{' '}
                  {errorMsg[
                    job._id
                  ]
                    ?.toLowerCase()
                    .includes(
                      'resume'
                    ) && (
                    <button
                      className="underline font-semibold"
                      onClick={() =>
                        navigate(
                          '/resume'
                        )
                      }
                    >
                      Go to Resume &amp;
                      ATS
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}