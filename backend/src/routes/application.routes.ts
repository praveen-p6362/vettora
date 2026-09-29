import { Router } from 'express';
import * as app from '../controllers/application.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/:jobId/apply', requireAuth, requireRole('candidate'), aiLimiter, app.applyToJob);
router.get('/mine', requireAuth, requireRole('candidate'), app.getMyApplications);
router.get('/job/:jobId', requireAuth, requireRole('hr'), app.getApplicationsForJob);
router.get('/candidate/:candidateId', requireAuth, requireRole('hr', 'admin'), app.getApplicationsForCandidate);
router.patch('/:id/status', requireAuth, requireRole('hr'), app.updateApplicationStatus);
router.post('/:id/notes', requireAuth, requireRole('hr'), app.addNote);

export default router;
