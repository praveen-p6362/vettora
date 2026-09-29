import { Router } from 'express';
import * as interview from '../controllers/interview.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/generate', requireAuth, requireRole('candidate'), aiLimiter, interview.generateInterview);
router.patch('/:id/answer', requireAuth, requireRole('candidate'), interview.submitAnswer);
router.post('/:id/finish', requireAuth, requireRole('candidate'), aiLimiter, interview.finishInterview);
router.get('/mine', requireAuth, requireRole('candidate'), interview.getMyInterviews);
router.get('/candidate/:candidateId', requireAuth, requireRole('hr', 'admin'), interview.getInterviewsForCandidate);
router.get('/:id', requireAuth, interview.getInterview);

export default router;
