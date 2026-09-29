import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { ApiError } from './ApiError';

export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  let text = '';
  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer);
    text = result.text;
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new ApiError(400, 'Unsupported file type.');
  }

  const trimmed = text.trim();
  if (trimmed.length < 30) {
    throw new ApiError(422, 'Could not extract readable text from this file. Try a different PDF/DOCX.');
  }
  return trimmed;
}
