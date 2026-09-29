import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import {
  startAssessment,
  getAssessment,
  submitAssessment,
  getAssessmentResult,
  reviewAssessment,
} from '../controllers/assessment.controller';

const router = Router();

// Candidate
router.post(
  '/:applicationId/start',
  requireAuth,
  requireRole('candidate'),
  startAssessment
);

router.get(
  '/:applicationId',
  requireAuth,
  requireRole('candidate'),
  getAssessment
);

router.post(
  '/:applicationId/submit',
  requireAuth,
  requireRole('candidate'),
  submitAssessment
);

// HR
router.get(
  '/:applicationId/result',
  requireAuth,
  requireRole('hr', 'admin'),
  getAssessmentResult
);

router.patch(
  '/:applicationId/review',
  requireAuth,
  requireRole('hr', 'admin'),
  reviewAssessment
);

export default router;