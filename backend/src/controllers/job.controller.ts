import { Request, Response } from 'express';
import { Job } from '../models/Job';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/** GET /api/jobs — public list of published jobs (candidates browse these) */
export const listJobs = asyncHandler(async (_req: Request, res: Response) => {
  const jobs = await Job.find({ published: true }).sort({ createdAt: -1 });
  res.status(200).json({ jobs });
});

/** GET /api/jobs/mine — HR's own posted jobs (published or not) */
export const listMyJobs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const jobs = await Job.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });
  res.status(200).json({ jobs });
});

/** GET /api/jobs/:id */
export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found.');
  res.status(200).json({ job });
});

/** POST /api/jobs — HR only */
export const createJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { company, title, description, requiredSkills, preferredSkills, experience, education, location, employmentType } = req.body;
  if (!company || !title || !description) throw new ApiError(400, 'Company, title and description are required.');

  const job = await Job.create({
    createdBy: req.user.userId,
    company, title, description,
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
    preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : [],
    experience: experience || '', education: education || '', location: location || '',
    employmentType: employmentType || 'Full-time',
    published: true,
  });
  res.status(201).json({ job });
});

/** PATCH /api/jobs/:id — HR only, must own the job */
export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found.');
  if (job.createdBy.toString() !== req.user.userId) throw new ApiError(403, 'You can only edit your own job postings.');

  const fields = ['company', 'title', 'description', 'requiredSkills', 'preferredSkills', 'experience', 'education', 'location', 'employmentType', 'published'];
  for (const f of fields) if (f in req.body) (job as any)[f] = req.body[f];
  await job.save();
  res.status(200).json({ job });
});

/** DELETE /api/jobs/:id — HR only, must own the job */
export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found.');
  if (job.createdBy.toString() !== req.user.userId) throw new ApiError(403, 'You can only delete your own job postings.');
  await job.deleteOne();
  res.status(200).json({ message: 'Job deleted.' });
});
