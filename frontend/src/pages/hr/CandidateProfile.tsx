import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Avatar, StatusBadge, Spinner } from '../../components/ui';

interface ResumeDoc {
  fileName: string;
  parsed: {
    skills: string[];
    experience: string[];
    projects: string[];
    education: string[];
  };
  ats: {
    overall: number;
  };
}

interface Interview {
  _id: string;
  role: string;
  date: string;
  scores: {
    overall: number;
  };
  recommendation: string;
}

interface Note {
  by: string;
  byName: string;
  text: string;
  at: string;
}

interface Application {
  _id: string;
  job: {
    _id: string;
    title: string;
    company: string;
  };
  status: string;
  match: {
    overallMatch: number;
  };
  scheduledAt?: string;
  notes: Note[];
}

interface AssessmentQuestion {
  _id?: string;
  type: 'MCQ' | 'ShortAnswer';
  question: string;
  options: string[];
  correctAnswer?: string;
  answer: string;
  score: number | null;
  feedback: string;
}

interface Assessment {
  _id: string;
  application: string;
  candidate: any;
  job: any;
  questions: AssessmentQuestion[];
  status:
    | 'Pending'
    | 'InProgress'
    | 'Submitted'
    | 'Reviewed'
    | 'Approved'
    | 'Rejected';
  score: number | null;
  strengths: string[];
  weaknesses: string[];
  aiFeedback: string;
  startedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

interface CandidateInfo {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
}

export default function CandidateProfile() {
  const { id } = useParams();

  const [candidate, setCandidate] =
    useState<CandidateInfo | null>(null);

  const [resume, setResume] =
    useState<ResumeDoc | null>(null);

  const [interviews, setInterviews] =
    useState<Interview[]>([]);

  const [applications, setApplications] =
    useState<Application[]>([]);

  const [assessments, setAssessments] =
    useState<Record<string, Assessment | null>>({});

  const [assessmentLoading, setAssessmentLoading] =
    useState<Record<string, boolean>>({});

  const [reviewing, setReviewing] =
    useState<Record<string, boolean>>({});

  const [tab, setTab] =
    useState<
      'skills' | 'exp' | 'proj' | 'apps' | 'interviews'
    >('skills');

  const [loading, setLoading] =
    useState(true);

  const toast = useToast();

  async function load() {
    if (!id) return;

    setLoading(true);

    try {
      const res = await api.get(
        `/hr/candidates/${id}`
      );

      const candidateData =
        res.data.candidate;

      const resumeData =
        res.data.resume;

      const interviewData =
        res.data.interviews || [];

      const applicationData =
        res.data.applications || [];

      setCandidate(candidateData);
      setResume(resumeData);
      setInterviews(interviewData);
      setApplications(applicationData);

      /*
       * Load the assessment result for every application.
       *
       * If an application does not have an assessment yet,
       * we simply keep it as null.
       */
      const assessmentResults: Record<
        string,
        Assessment | null
      > = {};

      await Promise.all(
        applicationData.map(
          async (app: Application) => {
            setAssessmentLoading(
              (prev) => ({
                ...prev,
                [app._id]: true,
              })
            );

            try {
              const assessmentRes =
                await api.get(
                  `/assessments/${app._id}/result`
                );

              assessmentResults[app._id] =
                assessmentRes.data.assessment ||
                null;
            } catch {
              /*
               * 404 simply means this application
               * does not have an assessment yet.
               */
              assessmentResults[app._id] =
                null;
            } finally {
              setAssessmentLoading(
                (prev) => ({
                  ...prev,
                  [app._id]: false,
                })
              );
            }
          }
        )
      );

      setAssessments(
        assessmentResults
      );
    } catch (err: any) {
      toast(
        err?.message ||
          'Could not load candidate profile.',
        'bad'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /*
   * ----------------------------------------------------------
   * Normal application status update
   * ----------------------------------------------------------
   */
  async function updateStatus(
    appId: string,
    status: string
  ) {
    try {
      await api.patch(
        `/applications/${appId}/status`,
        { status }
      );

      toast(
        `Marked as ${status}`,
        status === 'Rejected'
          ? 'bad'
          : 'good'
      );

      await load();
    } catch (err: any) {
      toast(
        err?.message ||
          'Could not update application status.',
        'bad'
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * Schedule real interview
   * ----------------------------------------------------------
   */
  async function schedule(
    appId: string
  ) {
    const when = prompt(
      'Enter interview date/time (e.g. Aug 25, 2026 3:00 PM):'
    );

    if (!when) return;

    try {
      await api.patch(
        `/applications/${appId}/status`,
        {
          status: 'Interviewing',
          scheduledAt: when,
        }
      );

      toast(
        'Interview scheduled for ' + when,
        'good'
      );

      await load();
    } catch (err: any) {
      toast(
        err?.message ||
          'Could not schedule interview.',
        'bad'
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * Approve assessment
   * ----------------------------------------------------------
   */
  async function approveAssessment(
    appId: string
  ) {
    setReviewing(
      (prev) => ({
        ...prev,
        [appId]: true,
      })
    );

    try {
      await api.patch(
        `/assessments/${appId}/review`,
        {
          decision: 'Approved',
        }
      );

      toast(
        'Assessment approved. Candidate can proceed to the real interview.',
        'good'
      );

      await load();
    } catch (err: any) {
      toast(
        err?.message ||
          'Could not approve assessment.',
        'bad'
      );
    } finally {
      setReviewing(
        (prev) => ({
          ...prev,
          [appId]: false,
        })
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * Reject assessment
   * ----------------------------------------------------------
   */
  async function rejectAssessment(
    appId: string
  ) {
    const confirmed =
      window.confirm(
        'Reject this candidate based on the online assessment?'
      );

    if (!confirmed) return;

    setReviewing(
      (prev) => ({
        ...prev,
        [appId]: true,
      })
    );

    try {
      await api.patch(
        `/assessments/${appId}/review`,
        {
          decision: 'Rejected',
        }
      );

      toast(
        'Candidate rejected after assessment review.',
        'bad'
      );

      await load();
    } catch (err: any) {
      toast(
        err?.message ||
          'Could not reject assessment.',
        'bad'
      );
    } finally {
      setReviewing(
        (prev) => ({
          ...prev,
          [appId]: false,
        })
      );
    }
  }

  if (
    loading ||
    !candidate
  ) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* =====================================================
          CANDIDATE HEADER
          ===================================================== */}
      <div className="card p-7 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">

          <div className="flex items-center gap-4">

            <Avatar
              name={candidate.name}
              size={64}
            />

            <div>
              <h1 className="font-display text-[22px] font-bold">
                {candidate.name}
              </h1>

              <p className="text-ink-500 text-[13.5px] mt-0.5">
                {candidate.email}
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          STATS
          ===================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

        <Stat
          label="ATS"
          val={
            resume?.ats?.overall ??
            '—'
          }
        />

        <Stat
          label="Best Job Match"
          val={
            applications.length
              ? `${Math.max(
                  ...applications.map(
                    (a) =>
                      a.match?.overallMatch ||
                      0
                  )
                )}%`
              : '—'
          }
        />

        <Stat
          label="Latest Interview"
          val={
            interviews[0]?.scores?.overall ??
            '—'
          }
        />

        <Stat
          label="Applications"
          val={
            applications.length
          }
        />

      </div>

      {/* =====================================================
          NO RESUME
          ===================================================== */}
      {!resume ? (
        <div className="card empty-state mb-6">

          <p className="font-display font-semibold text-[16px]">
            No resume uploaded yet
          </p>

          <p className="text-ink-500 text-[13.5px] mt-1">
            This candidate hasn't uploaded a resume.
          </p>

        </div>
      ) : null}

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}
      <div className="card p-6">

        {/* TABS */}
        <div className="flex gap-6 border-b border-ink-100 mb-5 overflow-x-auto">

          <div
            className={`tab-btn ${
              tab === 'skills'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab('skills')
            }
          >
            Skills
          </div>

          <div
            className={`tab-btn ${
              tab === 'exp'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab('exp')
            }
          >
            Experience
          </div>

          <div
            className={`tab-btn ${
              tab === 'proj'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab('proj')
            }
          >
            Projects
          </div>

          <div
            className={`tab-btn ${
              tab === 'apps'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab('apps')
            }
          >
            Applications &amp; Notes
          </div>

          <div
            className={`tab-btn ${
              tab === 'interviews'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab('interviews')
            }
          >
            Interview History
          </div>

        </div>

        {/* =================================================
            SKILLS
            ================================================= */}
        {tab === 'skills' && (
          resume ? (
            <div className="flex flex-wrap gap-2">

              {resume.parsed.skills.map(
                (s) => (
                  <span
                    key={s}
                    className="badge bg-indigo-100 text-indigo-600"
                  >
                    {s}
                  </span>
                )
              )}

            </div>
          ) : (
            <p className="text-ink-500 text-[13px]">
              No resume uploaded.
            </p>
          )
        )}

        {/* =================================================
            EXPERIENCE
            ================================================= */}
        {tab === 'exp' && (
          resume?.parsed.experience.length ? (
            resume.parsed.experience.map(
              (x, i) => (
                <p
                  key={i}
                  className="text-[13.5px] text-ink-700 mb-2"
                >
                  {x}
                </p>
              )
            )
          ) : (
            <p className="text-ink-500 text-[13px]">
              No experience extracted.
            </p>
          )
        )}

        {/* =================================================
            PROJECTS
            ================================================= */}
        {tab === 'proj' && (
          resume?.parsed.projects.length ? (
            resume.parsed.projects.map(
              (x, i) => (
                <p
                  key={i}
                  className="text-[13.5px] text-ink-700 mb-2"
                >
                  {x}
                </p>
              )
            )
          ) : (
            <p className="text-ink-500 text-[13px]">
              No projects extracted.
            </p>
          )
        )}

        {/* =================================================
            APPLICATIONS
            ================================================= */}
        {tab === 'apps' && (
          applications.length === 0 ? (
            <p className="text-ink-500 text-[13px]">
              No applications yet.
            </p>
          ) : (
            <div className="space-y-5">

              {applications.map(
                (application) => (
                  <ApplicationCard
                    key={application._id}
                    app={application}
                    assessment={
                      assessments[
                        application._id
                      ]
                    }
                    assessmentLoading={
                      assessmentLoading[
                        application._id
                      ]
                    }
                    reviewing={
                      reviewing[
                        application._id
                      ]
                    }
                    onStatus={
                      updateStatus
                    }
                    onSchedule={
                      schedule
                    }
                    onApproveAssessment={
                      approveAssessment
                    }
                    onRejectAssessment={
                      rejectAssessment
                    }
                  />
                )
              )}

            </div>
          )
        )}

        {/* =================================================
            INTERVIEW HISTORY
            ================================================= */}
        {tab === 'interviews' && (
          interviews.length === 0 ? (
            <p className="text-ink-500 text-[13px]">
              No interviews completed yet.
            </p>
          ) : (
            <div className="space-y-3">

              {interviews.map(
                (iv) => (
                  <div
                    key={iv._id}
                    className="flex items-center justify-between py-2 border-b border-ink-100 last:border-0"
                  >

                    <div>

                      <p className="font-medium text-[13.5px]">
                        {iv.role}
                      </p>

                      <p className="text-[12px] text-ink-500">
                        {new Date(
                          iv.date
                        ).toLocaleDateString()}
                      </p>

                    </div>

                    <span className="mono font-semibold text-[14px]">
                      {iv.scores?.overall ??
                        '—'}
                    </span>

                  </div>
                )
              )}

            </div>
          )
        )}

      </div>
    </div>
  );
}

/* ============================================================
   STAT
   ============================================================ */

function Stat({
  label,
  val,
}: {
  label: string;
  val: string | number;
}) {
  return (
    <div className="card p-4 text-center">

      <p className="text-[12px] text-ink-500 font-medium">
        {label}
      </p>

      <p className="font-display font-bold text-[22px] mono mt-1">
        {val}
      </p>

    </div>
  );
}

/* ============================================================
   APPLICATION CARD
   ============================================================ */

function ApplicationCard({
  app,
  assessment,
  assessmentLoading,
  reviewing,
  onStatus,
  onSchedule,
  onApproveAssessment,
  onRejectAssessment,
}: {
  app: Application;
  assessment?: Assessment | null;
  assessmentLoading?: boolean;
  reviewing?: boolean;
  onStatus: (
    id: string,
    status: string
  ) => void;
  onSchedule: (
    id: string
  ) => void;
  onApproveAssessment: (
    id: string
  ) => void;
  onRejectAssessment: (
    id: string
  ) => void;
}) {
  const [noteText, setNoteText] =
    useState('');

  const toast = useToast();

  async function addNote(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!noteText.trim()) return;

    try {
      await api.post(
        `/applications/${app._id}/notes`,
        {
          text: noteText.trim(),
        }
      );

      setNoteText('');

      toast(
        'Note added',
        'good'
      );

      window.location.reload();
    } catch (err: any) {
      toast(
        err?.message ||
          'Could not add note.',
        'bad'
      );
    }
  }

  const assessmentSubmitted =
    assessment?.status ===
      'Submitted' ||
    assessment?.status ===
      'Reviewed';

  const assessmentApproved =
    assessment?.status ===
    'Approved';

  const assessmentRejected =
    assessment?.status ===
    'Rejected';

  const canSchedule =
    app.status ===
      'Interviewing' ||
    assessmentApproved;

  return (
    <div className="bg-surf-50 rounded-xl p-4">

      {/* ======================================================
          APPLICATION HEADER
          ====================================================== */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">

        <div>

          <p className="font-semibold text-[14px]">
            {app.job.title}
            {' — '}
            {app.job.company}
          </p>

          <p className="text-[12.5px] text-ink-500">

            Match:

            {' '}

            <span className="mono font-semibold">
              {app.match?.overallMatch ??
                '—'}
              %
            </span>

            {app.scheduledAt
              ? ` · Scheduled: ${app.scheduledAt}`
              : ''}

          </p>

        </div>

        <StatusBadge
          status={app.status}
        />

      </div>

      {/* ======================================================
          ASSESSMENT STATUS
          ====================================================== */}
      <div className="bg-white rounded-xl p-4 mb-4 border border-ink-100">

        <div className="flex items-center justify-between gap-3 flex-wrap">

          <div>

            <p className="font-semibold text-[14px]">
              Online Assessment
            </p>

            {assessmentLoading ? (
              <p className="text-[12.5px] text-ink-500 mt-1">
                Checking assessment status...
              </p>
            ) : !assessment ? (
              <p className="text-[12.5px] text-ink-500 mt-1">
                Assessment has not been started yet.
              </p>
            ) : (
              <p className="text-[12.5px] text-ink-500 mt-1">
                Status:{' '}
                <span className="font-semibold text-ink-700">
                  {assessment.status}
                </span>

                {assessment.score !== null &&
                assessment.score !== undefined
                  ? ` · Score: ${assessment.score}%`
                  : ''}
              </p>
            )}

          </div>

          {/* STATUS BADGE */}
          {assessment && (
            <span
              className={`badge ${
                assessment.status ===
                'Approved'
                  ? 'bg-good-100 text-good-600'
                  : assessment.status ===
                    'Rejected'
                  ? 'bg-bad-100 text-bad-600'
                  : assessment.status ===
                    'Submitted'
                  ? 'bg-warn-100 text-warn-600'
                  : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              {assessment.status}
            </span>
          )}

        </div>

        {/* ====================================================
            SUBMITTED ASSESSMENT REVIEW
            ==================================================== */}
        {assessmentSubmitted && (
          <div className="mt-4">

            {/* SCORE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

              <div className="bg-surf-50 rounded-lg p-3">

                <p className="text-[11px] text-ink-500 font-medium">
                  Assessment Score
                </p>

                <p className="font-display font-bold text-[24px] mono mt-1">
                  {assessment.score ??
                    '—'}
                  %
                </p>

              </div>

              <div className="bg-surf-50 rounded-lg p-3">

                <p className="text-[11px] text-ink-500 font-medium">
                  Strengths
                </p>

                <p className="text-[13px] mt-1">
                  {assessment.strengths
                    ?.length
                    ? assessment.strengths.join(
                        ', '
                      )
                    : '—'}
                </p>

              </div>

              <div className="bg-surf-50 rounded-lg p-3">

                <p className="text-[11px] text-ink-500 font-medium">
                  Weaknesses
                </p>

                <p className="text-[13px] mt-1">
                  {assessment.weaknesses
                    ?.length
                    ? assessment.weaknesses.join(
                        ', '
                      )
                    : '—'}
                </p>

              </div>

            </div>

            {/* AI FEEDBACK */}
            {assessment.aiFeedback && (
              <div className="bg-indigo-50 rounded-lg p-3 mb-4">

                <p className="text-[12px] font-semibold text-indigo-700 mb-1">
                  AI Assessment Feedback
                </p>

                <p className="text-[13px] text-ink-700 leading-relaxed">
                  {assessment.aiFeedback}
                </p>

              </div>
            )}

            {/* QUESTIONS / ANSWERS */}
            <details className="mb-4">

              <summary className="cursor-pointer text-[13px] font-semibold text-indigo-600">
                View candidate answers
              </summary>

              <div className="space-y-3 mt-3">

                {assessment.questions.map(
                  (
                    question,
                    index
                  ) => (
                    <div
                      key={
                        question._id ||
                        index
                      }
                      className="bg-surf-50 rounded-lg p-3"
                    >

                      <p className="text-[13px] font-semibold mb-2">
                        {index + 1}.{' '}
                        {question.question}
                      </p>

                      <p className="text-[12px] text-ink-500">
                        Candidate answer
                      </p>

                      <p className="text-[13px] mt-0.5">
                        {question.answer ||
                          'No answer'}
                      </p>

                      {question.score !==
                        null &&
                        question.score !==
                          undefined && (
                          <p className="text-[12px] mt-2 font-semibold">
                            Score:{' '}
                            {
                              question.score
                            }%
                          </p>
                        )}

                      {question.feedback && (
                        <p className="text-[12px] text-ink-500 mt-1">
                          {question.feedback}
                        </p>
                      )}

                    </div>
                  )
                )}

              </div>

            </details>

            {/* =================================================
                HR DECISION BUTTONS
                ================================================= */}

            {assessment.status ===
              'Submitted' && (
              <div className="flex gap-2 flex-wrap">

                <button
                  className="btn btn-primary"
                  disabled={reviewing}
                  onClick={() =>
                    onApproveAssessment(
                      app._id
                    )
                  }
                >
                  {reviewing
                    ? 'Approving...'
                    : 'Approve Assessment'}
                </button>

                <button
                  className="btn btn-danger"
                  disabled={reviewing}
                  onClick={() =>
                    onRejectAssessment(
                      app._id
                    )
                  }
                >
                  {reviewing
                    ? 'Processing...'
                    : 'Reject Assessment'}
                </button>

              </div>
            )}

          </div>
        )}

        {/* ====================================================
            APPROVED
            ==================================================== */}
        {assessmentApproved && (
          <div className="mt-3 bg-good-100 text-good-600 rounded-lg p-3 text-[13px] font-semibold">
            ✓ Assessment approved. Candidate can proceed to the real interview.
          </div>
        )}

        {/* ====================================================
            REJECTED
            ==================================================== */}
        {assessmentRejected && (
          <div className="mt-3 bg-bad-100 text-bad-600 rounded-lg p-3 text-[13px] font-semibold">
            Candidate was rejected after the online assessment.
          </div>
        )}

      </div>

      {/* ======================================================
          ACTION BUTTONS
          ====================================================== */}
      <div className="flex gap-2 flex-wrap mb-4">

        {/* REAL INTERVIEW ONLY AFTER APPROVAL */}
        {canSchedule && (
          <button
            className="btn btn-secondary"
            onClick={() =>
              onSchedule(app._id)
            }
          >
            Schedule interview
          </button>
        )}

        {/* GENERAL REJECT */}
        {!assessmentRejected &&
          app.status !==
            'Rejected' && (
            <button
              className="btn btn-danger"
              onClick={() =>
                onStatus(
                  app._id,
                  'Rejected'
                )
              }
            >
              Reject
            </button>
          )}

        {/* SHORTLIST ONLY BEFORE ASSESSMENT */}
        {app.status ===
          'Applied' && (
          <button
            className="btn btn-primary"
            onClick={() =>
              onStatus(
                app._id,
                'Shortlisted'
              )
            }
          >
            Shortlist
          </button>
        )}

      </div>

      {/* ======================================================
          NOTES
          ====================================================== */}
      <div className="space-y-2 mb-3">

        {app.notes.length === 0 ? (
          <p className="text-ink-500 text-[13px]">
            No notes yet.
          </p>
        ) : (
          app.notes.map(
            (n, i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-3 text-[13px]"
              >

                <span className="font-semibold">
                  {n.byName}
                </span>

                {' — '}

                {n.text}

                <span className="text-ink-500 text-[11px] block mt-1">
                  {new Date(
                    n.at
                  ).toLocaleString()}
                </span>

              </div>
            )
          )
        )}

      </div>

      {/* ======================================================
          ADD NOTE
          ====================================================== */}
      <form
        onSubmit={addNote}
        className="flex gap-2"
      >

        <input
          className="input"
          placeholder="Add a note…"
          value={noteText}
          onChange={(e) =>
            setNoteText(
              e.target.value
            )
          }
        />

        <button
          className="btn btn-secondary"
          type="submit"
        >
          Add
        </button>

      </form>

    </div>
  );
}