import { Request, Response } from 'express';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Application } from '../models/Application';
import { Interview } from '../models/Interview';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/** GET /api/admin/overview — platform-wide real counts, admin only */
export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [totalUsers, candidates, hrUsers, jobs, applications, interviews] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'candidate' }),
    User.countDocuments({ role: 'hr' }),
    Job.countDocuments({}),
    Application.countDocuments({}),
    Interview.countDocuments({}),
  ]);
  res.status(200).json({ totalUsers, candidates, hrUsers, jobs, applications, interviews });
});

/** GET /api/admin/users */
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({}).select('name email role isVerified createdAt').sort({ createdAt: -1 });
  res.status(200).json({ users });
});

/** DELETE /api/admin/users/:id — admin can deactivate/remove a user */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  await user.deleteOne();
  res.status(200).json({ message: 'User removed.' });
});

/** GET /api/admin/jobs — every job on the platform, across all HR accounts */
export const listAllJobs = asyncHandler(async (_req: Request, res: Response) => {
  const jobs = await Job.find({}).populate('createdBy', 'name email').sort({ createdAt: -1 });
  res.status(200).json({ jobs });
});
