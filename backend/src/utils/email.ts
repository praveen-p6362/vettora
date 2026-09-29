import nodemailer from 'nodemailer';
import { env, isEmailConfigured } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.BREVO_SMTP_HOST,
      port: env.BREVO_SMTP_PORT,
      secure: env.BREVO_SMTP_PORT === 465,
      auth: {
        user: env.BREVO_SMTP_USER,
        pass: env.BREVO_SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

/* ============================================================
   OTP EMAIL
   ============================================================ */

export async function sendOtpEmail(
  toEmail: string,
  name: string,
  code: string
): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email sending is not configured. Set the Brevo SMTP variables in backend/.env.'
    );
  }

  const subject =
    'Your Aptura AI Verification Code';

  const text = `Hello ${name},

Your Aptura AI verification code is:

${code}

This code expires in ${env.OTP_EXPIRES_MINUTES} minutes.

If you did not request this code, you can safely ignore this email.

— Aptura AI`;

  const html = `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
      color: #0F172A;
    ">
      <h2 style="color:#3730A3;">
        Aptura AI
      </h2>

      <p>Hello ${escapeHtml(name)},</p>

      <p>Your verification code is:</p>

      <div style="
        font-size:32px;
        font-weight:700;
        letter-spacing:8px;
        color:#4338CA;
        padding:16px 0;
      ">
        ${escapeHtml(code)}
      </div>

      <p style="color:#64748B;font-size:13px;">
        This code expires in ${env.OTP_EXPIRES_MINUTES} minutes.
      </p>

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">

      <p style="color:#94A3B8;font-size:12px;">
        Aptura AI — Recruitment Intelligence Platform
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${env.BREVO_FROM_NAME}" <${env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

/* ============================================================
   ASSESSMENT INVITATION
   ============================================================ */

export async function sendAssessmentInvitationEmail(
  toEmail: string,
  name: string,
  jobTitle: string,
  company: string,
  assessmentUrl: string,
  expiresAt: Date
): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email sending is not configured.'
    );
  }

  const expiryText =
    expiresAt.toLocaleString(
      'en-IN',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    );

  const subject =
    `Aptura AI — Online Assessment Invitation for ${jobTitle}`;

  const text = `Hello ${name},

Congratulations!

You have been shortlisted for the ${jobTitle} position at ${company}.

You are invited to complete an online assessment as the next step in the recruitment process.

Assessment deadline:
${expiryText}

Please complete the assessment before the deadline.

Start your assessment:
${assessmentUrl}

The assessment link will only work while your assessment is active.

Good luck!

— Aptura AI`;

  const html = `
    <div style="
      font-family:Arial,sans-serif;
      max-width:600px;
      margin:0 auto;
      padding:30px;
      color:#0F172A;
    ">

      <h2 style="
        color:#3730A3;
        margin-bottom:24px;
      ">
        Aptura AI
      </h2>

      <p>
        Hello ${escapeHtml(name)},
      </p>

      <p>
        Congratulations! You have been
        <strong>shortlisted</strong> for the
        <strong>${escapeHtml(jobTitle)}</strong>
        position at
        <strong>${escapeHtml(company)}</strong>.
      </p>

      <p>
        The next step is an online assessment.
      </p>

      <div style="
        background:#F8FAFC;
        border-radius:12px;
        padding:20px;
        margin:24px 0;
      ">
        <p style="
          margin:0 0 8px;
          font-weight:bold;
        ">
          Assessment deadline
        </p>

        <p style="
          margin:0;
          color:#DC2626;
          font-weight:bold;
        ">
          ${escapeHtml(expiryText)}
        </p>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a
          href="${escapeHtml(assessmentUrl)}"
          style="
            display:inline-block;
            background:#4338CA;
            color:white;
            text-decoration:none;
            padding:14px 24px;
            border-radius:8px;
            font-weight:bold;
          "
        >
          Start Online Assessment
        </a>
      </div>

      <p style="
        color:#64748B;
        font-size:13px;
        line-height:1.6;
      ">
        Please complete the assessment before the
        deadline. After the assessment is reviewed,
        you will receive another email informing you
        whether you can proceed to the real interview.
      </p>

      <hr style="
        border:none;
        border-top:1px solid #E2E8F0;
        margin:28px 0;
      ">

      <p style="
        color:#94A3B8;
        font-size:12px;
      ">
        Aptura AI — Recruitment Intelligence Platform
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${env.BREVO_FROM_NAME}" <${env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

/* ============================================================
   ASSESSMENT APPROVED
   ============================================================ */

export async function sendAssessmentApprovedEmail(
  toEmail: string,
  name: string,
  jobTitle: string,
  company: string
): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email sending is not configured.'
    );
  }

  const subject =
    `Aptura AI — Assessment Approved for ${jobTitle}`;

  const text = `Hello ${name},

Great news!

Your online assessment for the ${jobTitle} position at ${company} has been reviewed and approved.

You have successfully passed the online assessment stage and can now proceed to the real interview.

The HR team will contact you with the interview details.

Congratulations!

— Aptura AI`;

  const html = `
    <div style="
      font-family:Arial,sans-serif;
      max-width:600px;
      margin:0 auto;
      padding:30px;
      color:#0F172A;
    ">

      <h2 style="color:#3730A3;">
        Aptura AI
      </h2>

      <p>Hello ${escapeHtml(name)},</p>

      <div style="
        background:#ECFDF5;
        border-radius:12px;
        padding:20px;
        margin:20px 0;
      ">
        <h3 style="
          color:#047857;
          margin-top:0;
        ">
          Assessment Approved
        </h3>

        <p>
          Your online assessment for
          <strong>${escapeHtml(jobTitle)}</strong>
          at
          <strong>${escapeHtml(company)}</strong>
          has been reviewed and approved.
        </p>
      </div>

      <p>
        You have successfully passed the online
        assessment stage and can now proceed to
        the <strong>real interview</strong>.
      </p>

      <p>
        The HR team will contact you with the
        interview date, time and other details.
      </p>

      <p>
        Congratulations!
      </p>

      <hr style="
        border:none;
        border-top:1px solid #E2E8F0;
        margin:28px 0;
      ">

      <p style="
        color:#94A3B8;
        font-size:12px;
      ">
        Aptura AI — Recruitment Intelligence Platform
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${env.BREVO_FROM_NAME}" <${env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

/* ============================================================
   ASSESSMENT REJECTED
   ============================================================ */

export async function sendAssessmentRejectedEmail(
  toEmail: string,
  name: string,
  jobTitle: string,
  company: string
): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email sending is not configured.'
    );
  }

  const subject =
    `Aptura AI — Assessment Update for ${jobTitle}`;

  const text = `Hello ${name},

Thank you for completing the online assessment for the ${jobTitle} position at ${company}.

After reviewing your assessment, the HR team has decided not to move forward with your application at this stage.

We appreciate the time and effort you invested in the process.

We wish you the very best in your future opportunities.

— Aptura AI`;

  const html = `
    <div style="
      font-family:Arial,sans-serif;
      max-width:600px;
      margin:0 auto;
      padding:30px;
      color:#0F172A;
    ">

      <h2 style="color:#3730A3;">
        Aptura AI
      </h2>

      <p>
        Hello ${escapeHtml(name)},
      </p>

      <p>
        Thank you for completing the online
        assessment for the
        <strong>${escapeHtml(jobTitle)}</strong>
        position at
        <strong>${escapeHtml(company)}</strong>.
      </p>

      <div style="
        background:#FEF2F2;
        border-radius:12px;
        padding:20px;
        margin:24px 0;
      ">
        <p style="margin:0;color:#B91C1C;">
          After reviewing your assessment,
          the HR team has decided not to move
          forward with your application at this
          stage.
        </p>
      </div>

      <p>
        We appreciate the time and effort you
        invested in the process.
      </p>

      <p>
        We wish you the very best in your
        future opportunities.
      </p>

      <hr style="
        border:none;
        border-top:1px solid #E2E8F0;
        margin:28px 0;
      ">

      <p style="
        color:#94A3B8;
        font-size:12px;
      ">
        Aptura AI — Recruitment Intelligence Platform
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${env.BREVO_FROM_NAME}" <${env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}

/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHtml(
  s: string
): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string
  );
}