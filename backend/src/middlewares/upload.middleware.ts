import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Single shared picker for every profile/logo photo upload (admin settings, delegate
// portal, speakers, partners, innovations) — one endpoint per auth context reuses
// this. memoryStorage (not diskStorage) — the file never touches this server's
// disk; upload.controller.ts streams the buffer straight to Cloudinary.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      cb(new ApiError(422, 'Only JPEG, PNG, WEBP, or GIF images are allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('image');

const ALLOWED_MEDIA_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime', // .mov, common straight off a phone camera
  'video/webm',
]);

// The comms team's Gallery uploader (photos and short video clips) — a separate,
// larger-ceiling picker from uploadImage above since event footage runs well past
// a 5MB profile-photo cap. memoryStorage here too; media.service.ts streams
// straight to Cloudinary the same way.
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB — comfortably covers a few minutes of 1080p phone footage
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MEDIA_MIMES.has(file.mimetype)) {
      cb(new ApiError(422, 'Only JPEG, PNG, WEBP, GIF images or MP4, MOV, WEBM videos are allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('file');

// Exhibitors' "Import CSV" bulk-create — exhibitor.controller.ts's
// adminImport parses the buffer with csv-parse; a small file is expected
// (tens to low hundreds of rows), so a low size cap is plenty and catches an
// accidental wrong-file upload early. Browsers report a .csv file's mimetype
// inconsistently (text/csv, application/vnd.ms-excel, or even text/plain),
// so this checks the filename extension instead of trusting the mimetype.
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      cb(new ApiError(422, 'Only .csv files are allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('file');

const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

// Knowledge Base's "upload a document" flow (knowledgeChunk.controller.ts's
// adminExtract) — a source document (Concept Note, Partnership Prospectus,
// FAQ) an admin uploads to auto-propose chunks from, instead of pasting each
// one by hand. Extension-based filtering, same reasoning as uploadCsv above
// — browsers report .docx/.pdf mimetypes inconsistently.
export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB — comfortably covers a real multi-page concept note
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      cb(new ApiError(422, 'Only PDF, DOCX, TXT, or MD files are allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('file');

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
]);

// AI-Assisted Rapporteur System Stage 2 — both Layer 2's "Capture This Quote"
// (rapporteur.controller.ts's transcribeQuote) and Layer 3's live-transcript
// chunks (liveTranscript.controller.ts's adminChunk) share this one picker:
// both are short (<1 minute) clips headed straight to Groq Whisper, never to
// disk or Cloudinary (whisper.service.ts discards the buffer right after
// transcribing it), so one size cap/mime set covers both. The mime set covers
// what MediaRecorder actually produces across Chrome/Firefox/Safari.
export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB — generous for a <1min clip at any reasonable bitrate
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AUDIO_MIMES.has(file.mimetype)) {
      cb(new ApiError(422, 'Only WEBM, OGG, MP4, MP3, WAV, or M4A audio is allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('audio');
