import { env, isGeminiConfigured } from '../config/env';
import { ApiError } from './ApiError';

/**
 * Calls Google's Gemini API (generateContent) with a system instruction
 * and user prompt, and returns the raw text response.
 *
 * Retries temporary Gemini errors such as 503, 429, 500, 502 and 504.
 */
export async function askGemini(
  userPrompt: string,
  systemInstruction: string
): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new ApiError(
      503,
      'AI analysis is not configured on this server. Set GEMINI_API_KEY in backend/.env to enable resume analysis, job matching, and interview features.'
    );
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;

        const text: string | undefined =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new ApiError(
            502,
            'Gemini API returned an empty response.'
          );
        }

        return text;
      }

      const body = await res.text().catch(() => '');

      // Temporary Gemini/server errors that are worth retrying
      const retryableStatuses = [429, 500, 502, 503, 504];

      if (
        retryableStatuses.includes(res.status) &&
        attempt < maxAttempts
      ) {
        const delay = 1500 * Math.pow(2, attempt - 1);

        console.log(
          `[Gemini] Request failed with ${res.status}. ` +
          `Retrying in ${delay}ms... (attempt ${attempt}/${maxAttempts})`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new ApiError(
        502,
        `Gemini API request failed (${res.status}). ${body.slice(0, 500)}`
      );
    } catch (error) {
      // Re-throw our own API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Retry unexpected network errors
      if (attempt < maxAttempts) {
        const delay = 1500 * Math.pow(2, attempt - 1);

        console.log(
          `[Gemini] Network error. ` +
          `Retrying in ${delay}ms... (attempt ${attempt}/${maxAttempts})`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new ApiError(
        502,
        'Unable to connect to the Gemini API after multiple attempts.'
      );
    }
  }

  throw new ApiError(
    502,
    'Gemini API request failed after multiple attempts.'
  );
}

export function parseJsonLoose<T = any>(raw: string): T | null {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

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