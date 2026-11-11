import { extractTextFromPdf } from '../../../utils/pdf-text-extractor';

export interface ExtractedFileContext {
  fileName: string;
  text: string;
  size: number;
}

/**
 * Reads and extracts text content from an uploaded resume or job description file (PDF, TXT, MD).
 */
export async function extractTextFromFile(file: File): Promise<ExtractedFileContext> {
  const fileName = file.name;
  const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfText = await extractTextFromPdf(arrayBuffer, 10); // Read up to first 10 pages
    return {
      fileName,
      text: pdfText.trim(),
      size: file.size,
    };
  }

  // Text / Markdown files
  const rawText = await file.text();
  return {
    fileName,
    text: rawText.trim(),
    size: file.size,
  };
}
