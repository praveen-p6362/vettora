import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Spinner } from '../../components/ui';

interface Question {
  _id?: string;
  type: 'MCQ' | 'ShortAnswer';
  question: string;
  options: string[];
  answer: string;
  score?: number | null;
  feedback?: string;
}

interface Assessment {
  _id: string;
  application: string;
  status: string;
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  aiFeedback?: string;
  questions: Question[];
  startedAt?: string;
  submittedAt?: string;
}

export default function Assessment() {
  const { applicationId } = useParams<{
    applicationId: string;
  }>();

  const navigate = useNavigate();

  const [assessment, setAssessment] =
    useState<Assessment | null>(null);

  const [answers, setAnswers] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [submitted, setSubmitted] =
    useState(false);

  useEffect(() => {
    if (!applicationId) {
      setError('Invalid application.');
      setLoading(false);
      return;
    }

    loadAssessment();
  }, [applicationId]);

  async function loadAssessment() {
    try {
      setLoading(true);
      setError('');

      /*
       * This endpoint creates the assessment if it
       * does not already exist.
       */
      const res = await api.post(
        `/assessments/${applicationId}/start`
      );

      const data =
        res.data.assessment as Assessment;

      setAssessment(data);

      setAnswers(
        data.questions.map(
          (q) => q.answer || ''
        )
      );

      if (
        data.status === 'Submitted' ||
        data.status === 'Approved' ||
        data.status === 'Rejected'
      ) {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(
        err.message ||
          'Could not load the assessment.'
      );
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(
    index: number,
    value: string
  ) {
    setAnswers((current) => {
      const copy = [...current];
      copy[index] = value;
      return copy;
    });
  }

  async function submitAssessment() {
    if (!applicationId || !assessment) {
      return;
    }

    const unanswered =
      answers.some(
        (answer) => !answer.trim()
      );

    if (unanswered) {
      setError(
        'Please answer every question before submitting the assessment.'
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to submit your assessment? You will not be able to change your answers afterward.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await api.post(
        `/assessments/${applicationId}/submit`,
        {
          answers,
        }
      );

      setAssessment(
        res.data.assessment
      );

      setSubmitted(true);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (err: any) {
      setError(
        err.message ||
          'Could not submit the assessment.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-6">
          <div className="bg-bad-100 text-bad-600 rounded-xl p-4 text-[13px]">
            {error}
          </div>

          <button
            className="btn btn-secondary mt-4"
            onClick={() => navigate('/jobs')}
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-good-100 flex items-center justify-center mb-4">
            <span className="text-good-600 text-2xl">
              ✓
            </span>
          </div>

          <h1 className="font-display text-[24px] font-bold">
            Assessment Submitted
          </h1>

          <p className="text-ink-500 text-[14px] mt-2">
            Your online assessment has been submitted
            successfully.
          </p>

          <div className="bg-surf-50 rounded-xl p-5 mt-6 text-left">
            <p className="text-[13px] text-ink-500">
              Current status
            </p>

            <p className="font-semibold text-[16px] mt-1">
              {assessment.status === 'Approved'
                ? 'Approved for interview'
                : assessment.status === 'Rejected'
                ? 'Not selected for interview'
                : 'Waiting for HR review'}
            </p>

            {typeof assessment.score ===
              'number' && (
              <p className="mt-3">
                Assessment score:{' '}
                <span className="font-bold mono">
                  {Math.round(
                    assessment.score
                  )}
                  %
                </span>
              </p>
            )}
          </div>

          <button
            className="btn btn-primary mt-6"
            onClick={() => navigate('/jobs')}
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-[26px] font-bold">
          Online Assessment
        </h1>

        <p className="text-ink-500 text-[14px] mt-1">
          Complete all questions carefully. Your
          assessment will be reviewed by the HR team
          before you can proceed to the real interview.
        </p>
      </div>

      {error && (
        <div className="bg-bad-100 text-bad-600 rounded-xl p-3 text-[13px] mb-5">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {assessment.questions.map(
          (question, index) => (
            <div
              key={
                question._id ||
                `question-${index}`
              }
              className="card p-6"
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[13px] shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    {question.type === 'MCQ'
                      ? 'Multiple Choice'
                      : 'Short Answer'}
                  </span>

                  <p className="font-semibold text-[15px] mt-1 leading-relaxed">
                    {question.question}
                  </p>
                </div>
              </div>

              {question.type === 'MCQ' ? (
                <div className="space-y-2 ml-11">
                  {question.options.map(
                    (option, optionIndex) => {
                      const selected =
                        answers[index] ===
                        option;

                      return (
                        <button
                          key={optionIndex}
                          type="button"
                          onClick={() =>
                            updateAnswer(
                              index,
                              option
                            )
                          }
                          className={`w-full text-left rounded-xl border px-4 py-3 text-[13.5px] transition ${
                            selected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-ink-100 bg-white hover:bg-surf-50'
                          }`}
                        >
                          <span className="font-semibold mr-2">
                            {String.fromCharCode(
                              65 +
                                optionIndex
                            )}
                            .
                          </span>

                          {option}
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="ml-11">
                  <textarea
                    className="input min-h-[120px] resize-y"
                    placeholder="Write your answer here..."
                    value={
                      answers[index] || ''
                    }
                    onChange={(e) =>
                      updateAnswer(
                        index,
                        e.target.value
                      )
                    }
                  />
                </div>
              )}
            </div>
          )
        )}
      </div>

      <div className="card p-5 mt-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[13px] text-ink-500">
          {answers.filter(
            (x) => x.trim()
          ).length}{' '}
          of {assessment.questions.length}{' '}
          answered
        </p>

        <button
          className="btn btn-primary"
          disabled={submitting}
          onClick={submitAssessment}
        >
          {submitting
            ? 'Submitting...'
            : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
}