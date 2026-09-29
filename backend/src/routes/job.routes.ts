import { Router } from 'express';
import * as job from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

router.get('/', job.listJobs);
router.get('/mine', requireAuth, requireRole('hr'), job.listMyJobs);
router.get('/:id', job.getJob);
router.post('/', requireAuth, requireRole('hr'), job.createJob);
router.patch('/:id', requireAuth, requireRole('hr'), job.updateJob);
router.delete('/:id', requireAuth, requireRole('hr'), job.deleteJob);

export default router;
