import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = Router();

router.get('/overview', requireAuth, requireRole('admin'), admin.getOverview);
router.get('/users', requireAuth, requireRole('admin'), admin.listUsers);
router.delete('/users/:id', requireAuth, requireRole('admin'), admin.deleteUser);
router.get('/jobs', requireAuth, requireRole('admin'), admin.listAllJobs);

export default router;
