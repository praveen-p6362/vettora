import { Request, Response } from 'express';
import { Resume } from '../models/Resume';
import { extractResumeText } from '../utils/resumeParser';
import { askGemini, parseJsonLoose } from '../utils/gemini';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const ATS_SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume analyzer. Respond with ONLY valid JSON, no prose, no markdown fences, matching exactly this shape:
{
 "name": string|null, "email": string|null, "phone": string|null, "location": string|null, "summary": string|null,
 "education": [string], "skills": [string], "technicalSkills": [string], "softSkills": [string],
 "projects": [string], "internships": [string], "experience": [string], "certifications": [string],
 "achievements": [string], "languages": [string], "tools": [string],
 "github": string|null, "linkedin": string|null, "portfolio": string|null,
 "ats": {
   "overall": number(0-100), "keywordMatch": number, "skillsMatch": number, "experienceMatch": number,
   "educationMatch": number, "projectMatch": number, "formatting": number, "readability": number,
   "matchedSkills": [string], "missingSkills": [string], "missingKeywords": [string],
   "strengths": [string], "weakSections": [string], "suggestions": [string]
 }
}
Base every score strictly on the actual resume content provided. Do not default to round numbers like 90 unless genuinely warranted — vary scores realistically based on resume quality, completeness, and clarity.`;

/** POST /api/resumes/upload — real file upload + extraction + Gemini analysis */
export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'No file was uploaded.');
  if (!req.user) throw new ApiError(401, 'Authentication required.');

  const text = await extractResumeText(req.file.buffer, req.file.mimetype);

  const raw = await askGemini('Resume text:\n\n' + text.slice(0, 9000), ATS_SYSTEM_PROMPT);
  const parsed = parseJsonLoose<any>(raw);
  if (!parsed || !parsed.ats) throw new ApiError(502, 'AI analysis did not return a valid result. Please try again.');

  const doc = await Resume.findOneAndUpdate(
    { user: req.user.userId },
    {
      user: req.user.userId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      extractedText: text.slice(0, 20000),
      parsed: {
        name: parsed.name, email: parsed.email, phone: parsed.phone, location: parsed.location, summary: parsed.summary,
        education: parsed.education || [], skills: parsed.skills || [], technicalSkills: parsed.technicalSkills || [],
        softSkills: parsed.softSkills || [], projects: parsed.projects || [], internships: parsed.internships || [],
        experience: parsed.experience || [], certifications: parsed.certifications || [], achievements: parsed.achievements || [],
        languages: parsed.languages || [], tools: parsed.tools || [],
        github: parsed.github, linkedin: parsed.linkedin, portfolio: parsed.portfolio,
      },
      ats: parsed.ats,
      uploadedAt: new Date(),
      analyzedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ resume: doc });
});

/** GET /api/resumes/me */
export const getMyResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const resume = await Resume.findOne({ user: req.user.userId });
  res.status(200).json({ resume: resume || null });
});

/** DELETE /api/resumes/me — lets a candidate re-upload from a clean state */
export const deleteMyResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  await Resume.deleteOne({ user: req.user.userId });
  res.status(200).json({ message: 'Resume removed.' });
});

/** GET /api/resumes/:userId — HR viewing a specific candidate's resume */
export const getResumeByUser = asyncHandler(async (req: Request, res: Response) => {
  const resume = await Resume.findOne({ user: req.params.userId });
  res.status(200).json({ resume: resume || null });
});
