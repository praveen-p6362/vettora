import { Router } from 'express';
import * as resume from '../controllers/resume.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import { resumeUpload } from '../middleware/upload';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/upload', requireAuth, requireRole('candidate'), aiLimiter, resumeUpload.single('resume'), resume.uploadResume);
router.get('/me', requireAuth, requireRole('candidate'), resume.getMyResume);
router.delete('/me', requireAuth, requireRole('candidate'), resume.deleteMyResume);
router.get('/:userId', requireAuth, requireRole('hr', 'admin'), resume.getResumeByUser);

export default router;
