import { Router } from 'express';
import * as hr from '../controllers/hr.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

router.get('/dashboard', requireAuth, requireRole('hr', 'admin'), hr.getDashboard);
router.get('/candidates', requireAuth, requireRole('hr', 'admin'), hr.listCandidates);
router.get('/candidates/:id', requireAuth, requireRole('hr', 'admin'), hr.getCandidateProfile);
router.get('/export', requireAuth, requireRole('hr', 'admin'), hr.exportData);

export default router;
