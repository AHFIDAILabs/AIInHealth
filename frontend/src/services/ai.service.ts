import { api } from './api';

export interface AskResult {
  answer: string;
  sources: string[];
}

// Public — "Ask the Concept Note". Grounded/retrieval-scoped only, see the
// backend's rag.service.ts. Rate-limited server-side (5 questions/15min per IP).
// `lang` ('fr'/'pt') asks Groq to answer in that language — the RAG grounding
// itself is unaffected, this only changes the language of the generated
// answer. Omit (or 'en') for English.
export const askConceptNote = async (question: string, lang?: 'fr' | 'pt' | 'en'): Promise<AskResult> => {
  const res = await api.post<{ success: true; data: AskResult }>('/ai/ask', {
    question,
    ...(lang && lang !== 'en' ? { lang } : {}),
  });
  return res.data.data;
};

export interface AdminKnowledgeChunk {
  _id: string;
  sourceDocument: string;
  sectionHeading?: string;
  text: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunkInput {
  sourceDocument: string;
  sectionHeading?: string;
  text: string;
  isActive?: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListKnowledgeChunks = async (params: { sourceDocument?: string; page?: number; limit?: number } = {}): Promise<Paginated<AdminKnowledgeChunk>> => {
  const res = await api.get<{ success: true; data: AdminKnowledgeChunk[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/ai/knowledge-chunks',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateKnowledgeChunk = async (input: KnowledgeChunkInput): Promise<AdminKnowledgeChunk> => {
  const res = await api.post<{ success: true; data: AdminKnowledgeChunk }>('/admin/ai/knowledge-chunks', input);
  return res.data.data;
};

export const adminUpdateKnowledgeChunk = async (id: string, input: Partial<KnowledgeChunkInput>): Promise<AdminKnowledgeChunk> => {
  const res = await api.patch<{ success: true; data: AdminKnowledgeChunk }>(`/admin/ai/knowledge-chunks/${id}`, input);
  return res.data.data;
};

export const adminDeleteKnowledgeChunk = async (id: string): Promise<void> => {
  await api.delete(`/admin/ai/knowledge-chunks/${id}`);
};

// --- Upload a document instead of pasting chunks by hand ---
// Two-step: /extract proposes chunks from the file (nothing saved yet, pure
// text extraction + heuristic splitting — see backend chunkText.ts), the
// admin reviews/edits/deselects in the UI, then /bulk-create commits what's
// left. Matches the draft-then-approve pattern used everywhere else in this
// app's AI features, just with the admin doing the "review" step directly
// instead of a second model call.

export interface ProposedKnowledgeChunk {
  sectionHeading?: string;
  text: string;
}

export const extractKnowledgeChunksFromDocument = async (
  file: File,
  sourceDocument: string
): Promise<{ sourceDocument: string; chunks: ProposedKnowledgeChunk[] }> => {
  const form = new FormData();
  form.append('file', file);
  form.append('sourceDocument', sourceDocument);
  const res = await api.post<{ success: true; data: { sourceDocument: string; chunks: ProposedKnowledgeChunk[] } }>(
    '/admin/ai/knowledge-chunks/extract',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
};

export const adminBulkCreateKnowledgeChunks = async (
  sourceDocument: string,
  chunks: ProposedKnowledgeChunk[]
): Promise<{ created: number; failed: number }> => {
  const res = await api.post<{ success: true; data: { created: number; failed: number } }>(
    '/admin/ai/knowledge-chunks/bulk-create',
    { sourceDocument, chunks }
  );
  return res.data.data;
};
