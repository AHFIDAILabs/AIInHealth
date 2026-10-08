import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { toCsv } from '../utils/toCsv.js';
import { ScholarshipApplication, type ScholarshipApplicationDoc } from '../models/ScholarshipApplication.model.js';
import { AccessCode } from '../models/AccessCode.model.js';
import { generateCode } from './accessCode.controller.js';
import { recordAudit } from '../services/audit.service.js';
import { sendSponsorshipApprovedEmail, sendSponsorshipReceivedEmail, sendSponsorshipDeclinedEmail } from '../services/email.service.js';
import { cloudinaryConfigured } from '../config/cloudinary.js';
import { uploadRawToCloudinary } from '../services/cloudinary.service.js';
import { logger } from '../config/logger.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { scoreApplication } from '../services/ai/scholarshipTriage.service.js';
import { runInBatches } from '../utils/batch.js';
import type {
  SubmitScholarshipApplicationInput,
  DecideScholarshipApplicationInput,
  ListScholarshipApplicationsQuery,
  AdminAnalyzeApplicationsInput,
} from '../validations/scholarshipApplication.validation.js';

const SUBMISSION_MESSAGE = "Thanks for applying — our team will review your application and follow up by email.";

// POST /scholarship-applications — public. See ScholarshipApplication.model.ts's
// header comment for how this differs from AccessCode's own 'scholarship' type.
export const submit = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as SubmitScholarshipApplicationInput;
  const application = await ScholarshipApplication.create({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    organization: input.organization,
    country: input.country,
    applicantType: input.applicantType,
    designation: input.designation,
    courseOfStudy: input.courseOfStudy,
    level: input.level,
    reason: input.reason,
    supportingDocumentUrl: input.supportingDocumentUrl,
  });

  sendSponsorshipReceivedEmail(application.email, application.fullName).catch((err) =>
    logger.error({ err }, 'Failed to send sponsorship application received email')
  );
  emitAdminNotification({
    type: 'scholarship_application.new',
    title: 'New sponsorship application',
    body: application.fullName,
    resourceType: 'ScholarshipApplication',
    resourceId: application.id,
  }).catch((err) => logger.error({ err }, 'Failed to emit sponsorship application admin notification'));

  res.status(201).json(new ApiResponse({ id: application.id, message: SUBMISSION_MESSAGE }));
});

// POST /scholarship-applications/upload-document — public. Same "upload first,
// get a URL back for the real submit" shape as the attendee ID-card upload
// (uploadController.uploadImage), just for a document instead of an image.
export const uploadSupportingDocument = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(422, 'No file was uploaded.', 'NO_FILE');
  }
  if (!cloudinaryConfigured) {
    throw new ApiError(503, 'Document uploads are not configured yet — set CLOUDINARY_* in .env.', 'UPLOADS_NOT_CONFIGURED');
  }

  const { secureUrl } = await uploadRawToCloudinary(req.file.buffer, req.file.mimetype, req.file.originalname);
  res.status(201).json(new ApiResponse({ url: secureUrl }));
});

const buildFilter = (query: ListScholarshipApplicationsQuery): FilterQuery<ScholarshipApplicationDoc> => {
  const filter: FilterQuery<ScholarshipApplicationDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { country: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListScholarshipApplicationsQuery;
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    ScholarshipApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    ScholarshipApplication.countDocuments(filter),
  ]);

  res.json(new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 }));
});

const CSV_COLUMNS = [
  '_id',
  'fullName',
  'email',
  'phone',
  'organization',
  'country',
  'applicantType',
  'designation',
  'courseOfStudy',
  'level',
  'reason',
  'status',
  'reviewNotes',
  'supportingDocumentUrl',
  'createdAt',
  'decidedAt',
];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListScholarshipApplicationsQuery;
  const filter = buildFilter(query);
  const items = await ScholarshipApplication.find(filter).sort({ createdAt: -1 }).lean();

  const csv = toCsv(items as unknown as Record<string, unknown>[], CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sponsorship-applications-${Date.now()}.csv"`);
  res.send(csv);
});

// POST /admin/scholarship-applications/analyze — admin-triggered, suggestion-
// only AI scoring over the pending pool (ids omitted) or a specific subset
// (ids given). Never touches `status` — adminDecide below is still the only
// way an application gets approved/rejected.
export const adminAnalyze = catchAsync(async (req: Request, res: Response) => {
  const { ids }: AdminAnalyzeApplicationsInput = req.body;

  const filter: FilterQuery<ScholarshipApplicationDoc> = ids && ids.length > 0 ? { _id: { $in: ids } } : { status: 'pending' };
  const applications = await ScholarshipApplication.find(filter);
  if (applications.length === 0) throw new ApiError(404, 'No applications to analyze', 'NOT_FOUND');
  if (applications.length > 200) throw new ApiError(422, 'Narrow the selection to 200 or fewer applications', 'TOO_MANY');

  await runInBatches(applications, 3, async (application) => {
    const result = await scoreApplication({
      organization: application.organization,
      applicantType: application.applicantType,
      level: application.level ?? undefined,
      reason: application.reason,
    });
    if (!result) return;
    application.aiScore = result.score;
    application.aiRationale = result.rationale;
    application.aiScoredAt = new Date();
    await application.save();
  });

  res.json(
    new ApiResponse({
      scored: applications.filter((a) => a.aiScoredAt).length,
      items: applications.map((a) => ({ _id: a.id, aiScore: a.aiScore, aiRationale: a.aiRationale })),
    })
  );
});

// PATCH /admin/scholarship-applications/:id/decide
export const adminDecide = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Application not found', 'NOT_FOUND');
  const application = await ScholarshipApplication.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND');
  if (application.status !== 'pending') throw new ApiError(400, 'This application has already been decided.', 'ALREADY_DECIDED');

  const input = req.body as DecideScholarshipApplicationInput;
  const before = { status: application.status };

  if (input.status === 'approved') {
    const discountPercent = input.discountPercent ?? 100;
    let code = generateCode('scholarship');
    // eslint-disable-next-line no-await-in-loop
    while (await AccessCode.exists({ code })) code = generateCode('scholarship');

    const accessCode = await AccessCode.create({
      code,
      type: 'scholarship',
      issuedTo: application.email,
      discountPercent,
      createdBy: req.user!.sub,
    });

    application.status = 'approved';
    application.issuedAccessCode = accessCode._id;
    application.reviewNotes = input.reviewNotes;
    application.decidedBy = req.user!.sub as unknown as ScholarshipApplicationDoc['decidedBy'];
    application.decidedAt = new Date();
    await application.save();

    sendSponsorshipApprovedEmail(application.email, application.fullName, accessCode.code, discountPercent)
      .then(() => AccessCode.updateOne({ _id: accessCode._id }, { $set: { sentAt: new Date() } }))
      .catch((err) => logger.error({ err }, 'Failed to send sponsorship approved email'));
  } else {
    application.status = 'rejected';
    application.reviewNotes = input.reviewNotes;
    application.decidedBy = req.user!.sub as unknown as ScholarshipApplicationDoc['decidedBy'];
    application.decidedAt = new Date();
    await application.save();

    sendSponsorshipDeclinedEmail(application.email, application.fullName).catch((err) =>
      logger.error({ err }, 'Failed to send sponsorship declined email')
    );
  }

  await recordAudit({
    req,
    action: `scholarship_application.${input.status}`,
    resourceType: 'ScholarshipApplication',
    resourceId: application.id,
    before,
    after: { status: application.status },
  });

  res.json(new ApiResponse(application));
});
