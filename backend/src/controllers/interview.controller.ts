import { Request, Response } from 'express';
import { Interview } from '../models/Interview';
import { Resume } from '../models/Resume';
import { Job } from '../models/Job';
import { askGemini, parseJsonLoose } from '../utils/gemini';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const QUESTIONS_SYSTEM_PROMPT = `You are an expert technical interviewer. Respond with ONLY valid JSON:
{"questions":[{"round": "HR"|"Technical"|"Behavioral"|"Problem-Solving", "tag": string, "text": string}]}
Generate exactly the requested number of unique, non-duplicate interview questions tailored to the candidate's real skills/experience and (if provided) the job description, at the requested difficulty. Spread questions across the requested rounds roughly evenly.`;

const EVAL_SYSTEM_PROMPT = `You are an expert interview evaluator. Respond with ONLY valid JSON of this exact shape:
{"perQuestion":[{"score": number(0-100), "feedback": string}], "scores":{"technical": number, "communication": number, "confidence": number, "problemSolving": number, "overall": number}, "strengths":[string], "weaknesses":[string], "recommendation": string}
Evaluate strictly based on the actual answer content provided — unanswered or empty answers should score low. The perQuestion array order must match the question order given. Confidence and communication scores should be described as AI-based indicators derived from the text of the answer, not a claim about the candidate's true psychological state.`;

/** POST /api/interviews/generate — creates a new interview session with real AI-generated questions */
export const generateInterview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { jobId, difficulty, count } = req.body as { jobId?: string; difficulty?: string; count?: number };

  const resume = await Resume.findOne({ user: req.user.userId });
  if (!resume) throw new ApiError(400, 'Upload your resume first — interview questions are generated from your real skills and experience.');

  let job = null;
  if (jobId) {
    job = await Job.findById(jobId);
    if (!job) throw new ApiError(404, 'Job not found.');
  }

  const questionCount = Math.min(Math.max(count || 6, 4), 12);
  const prompt = `Candidate skills: ${(resume.parsed.skills || []).join(', ')}
Candidate experience: ${(resume.parsed.experience || []).join(' | ')}
Candidate projects: ${(resume.parsed.projects || []).join(' | ')}
${job ? `Target role: ${job.title}\nJob description: ${job.description}\nRequired skills: ${(job.requiredSkills || []).join(', ')}` : 'No specific target role — general interview.'}
Difficulty: ${difficulty || 'Medium'}
Number of questions: ${questionCount}
Rounds to cover: HR, Technical, Behavioral, Problem-Solving`;

  const raw = await askGemini(prompt, QUESTIONS_SYSTEM_PROMPT);
  const parsed = parseJsonLoose<any>(raw);
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new ApiError(502, 'Could not generate interview questions. Please try again.');
  }

  const interview = await Interview.create({
    candidate: req.user.userId,
    job: job ? job._id : undefined,
    role: job ? job.title : 'General interview',
    company: job ? job.company : undefined,
    difficulty: difficulty || 'Medium',
    questions: parsed.questions.slice(0, questionCount).map((q: any) => ({
      round: q.round || 'HR', tag: q.tag || 'General', text: q.text, answer: '', score: null, feedback: '',
    })),
  });

  res.status(201).json({ interview });
});

/** PATCH /api/interviews/:id/answer — saves a candidate's real answer to one question */
export const submitAnswer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { questionIndex, answer } = req.body as { questionIndex?: number; answer?: string };
  if (questionIndex === undefined || answer === undefined) throw new ApiError(400, 'questionIndex and answer are required.');

  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found.');
  if (interview.candidate.toString() !== req.user.userId) throw new ApiError(403, 'Not your interview.');
  if (!interview.questions[questionIndex]) throw new ApiError(400, 'Invalid question index.');

  interview.questions[questionIndex].answer = answer;
  await interview.save();
  res.status(200).json({ interview });
});

/** POST /api/interviews/:id/finish — real Gemini evaluation of all real answers, produces the report */
export const finishInterview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found.');
  if (interview.candidate.toString() !== req.user.userId) throw new ApiError(403, 'Not your interview.');

  const prompt = interview.questions
    .map((q, i) => `Q${i + 1} [${q.round} / ${q.tag}]: ${q.text}\nAnswer: ${q.answer || '(no answer given)'}`)
    .join('\n\n');

  const raw = await askGemini(prompt, EVAL_SYSTEM_PROMPT);
  const parsed = parseJsonLoose<any>(raw);
  if (!parsed || !parsed.scores) throw new ApiError(502, 'Could not generate your report. Please try again.');

  interview.questions.forEach((q, i) => {
    q.score = parsed.perQuestion?.[i]?.score ?? null;
    q.feedback = parsed.perQuestion?.[i]?.feedback || '';
  });
  interview.scores = parsed.scores;
  interview.strengths = parsed.strengths || [];
  interview.weaknesses = parsed.weaknesses || [];
  interview.recommendation = parsed.recommendation || '';
  await interview.save();

  res.status(200).json({ interview });
});

/** GET /api/interviews/mine */
export const getMyInterviews = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const interviews = await Interview.find({ candidate: req.user.userId }).sort({ date: -1 });
  res.status(200).json({ interviews });
});

/** GET /api/interviews/:id */
export const getInterview = asyncHandler(async (req: Request, res: Response) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found.');
  res.status(200).json({ interview });
});

/** GET /api/interviews/candidate/:candidateId — HR viewing a candidate's interview history */
export const getInterviewsForCandidate = asyncHandler(async (req: Request, res: Response) => {
  const interviews = await Interview.find({ candidate: req.params.candidateId }).sort({ date: -1 });
  res.status(200).json({ interviews });
});
