import { ApiError } from './ApiError.js';

// Plain text extraction only — no OCR, no layout/table reconstruction. Good
// enough for the kind of source documents this feeds (Concept Note,
// Partnership Prospectus, FAQ): mostly prose, headings, and lists.
export const extractDocumentText = async (buffer: Buffer, filename: string): Promise<string> => {
  const ext = filename.toLowerCase().split('.').pop() ?? '';

  if (ext === 'pdf') {
    // v2's API is class-based (new PDFParse({ data }).getText()), not the
    // simple pdfParse(buffer) function older v1.x had. Its own `.text`
    // (rather than `.pages`) inserts "-- N of M --" page-separator markers
    // between pages, which would otherwise pollute the extracted text and
    // get treated as content by chunkText.ts — rebuilding from `.pages`
    // avoids that.
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.pages.map((p) => p.text).join('\n\n');
    } finally {
      await parser.destroy();
    }
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8');
  }

  throw new ApiError(422, 'Only PDF, DOCX, TXT, or MD files are supported.', 'UNSUPPORTED_FILE_TYPE');
};
