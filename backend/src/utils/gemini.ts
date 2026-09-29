import { env, isGeminiConfigured } from '../config/env';
import { ApiError } from './ApiError';

/**
 * Calls Google's Gemini API (generateContent) with a system instruction and
 * user prompt, and returns the raw text response. Requires GEMINI_API_KEY.
 */
export async function askGemini(userPrompt: string, systemInstruction: string): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new ApiError(
      503,
      'AI analysis is not configured on this server. Set GEMINI_API_KEY in backend/.env to enable resume analysis, job matching, and interview features.'
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(502, `Gemini API request failed (${res.status}). ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as any;
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ApiError(502, 'Gemini API returned an empty response.');
  return text;
}

export function parseJsonLoose<T = any>(raw: string): T | null {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
