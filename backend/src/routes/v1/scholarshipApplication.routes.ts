import { Router } from 'express';
import * as scholarshipApplicationController from '../../controllers/scholarshipApplication.controller.js';
import * as scholarshipSettingsController from '../../controllers/scholarshipSettings.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { scholarshipLimiter, scholarshipUploadLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { uploadDocument } from '../../middlewares/upload.middleware.js';
import { submitScholarshipApplicationSchema } from '../../validations/scholarshipApplication.validation.js';

const router = Router();

router.get('/applications-status', scholarshipSettingsController.status);
router.post('/', scholarshipLimiter, validate(submitScholarshipApplicationSchema), scholarshipApplicationController.submit);
router.post('/upload-document', scholarshipUploadLimiter, uploadDocument, scholarshipApplicationController.uploadSupportingDocument);
router.post('/rsvp/:token', scholarshipApplicationController.rsvp);

export default router;
