import express from 'express';
import cors from 'cors';

import {
  env,
  isEmailConfigured,
  isGeminiConfigured,
} from './config/env';

import { connectDB } from './config/db';

import {
  notFoundHandler,
  errorHandler,
} from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import resumeRoutes from './routes/resume.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';
import assessmentRoutes from './routes/assessment.routes';
import interviewRoutes from './routes/interview.routes';
import hrRoutes from './routes/hr.routes';
import adminRoutes from './routes/admin.routes';

async function main() {
  await connectDB();

  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  app.use(
    express.json({
      limit: '2mb',
    })
  );

  /*
   * Health check
   */
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      emailConfigured: isEmailConfigured(),
      aiConfigured: isGeminiConfigured(),
    });
  });

  /*
   * API routes
   */
  app.use('/api/auth', authRoutes);

  app.use('/api/resumes', resumeRoutes);

  app.use('/api/jobs', jobRoutes);

  app.use('/api/applications', applicationRoutes);

  // Online assessment routes
  app.use('/api/assessments', assessmentRoutes);

  app.use('/api/interviews', interviewRoutes);

  app.use('/api/hr', hrRoutes);

  app.use('/api/admin', adminRoutes);

  /*
   * Error handling
   */
  app.use(notFoundHandler);

  app.use(errorHandler);

  /*
   * Start server
   */
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[server] Aptura API running on http://localhost:${env.PORT}`
    );

    if (!isEmailConfigured()) {
      console.warn(
        '[server] Brevo SMTP is not configured — OTP emails will fail until configured.'
      );
    } else {
      console.log(
        '[server] Brevo SMTP email is configured.'
      );
    }

    if (!isGeminiConfigured()) {
      console.warn(
        '[server] GEMINI_API_KEY not set — AI features (ATS, matching, assessments, interviews) will fail until configured.'
      );
    } else {
      console.log(
        '[server] Gemini AI is configured.'
      );
    }
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(
    '[server] Fatal startup error:',
    err
  );

  process.exit(1);
});