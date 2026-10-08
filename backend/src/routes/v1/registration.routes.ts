import { Router } from 'express';
import * as registrationController from '../../controllers/registration.controller.js';
import * as registrationRsvpController from '../../controllers/registrationRsvp.controller.js';
import * as uploadController from '../../controllers/upload.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { registrationLimiter, idCardUploadLimiter, rsvpRedeemLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { uploadImage } from '../../middlewares/upload.middleware.js';
import { createRegistrationSchema, redeemRsvpSchema } from '../../validations/registration.validation.js';

const router = Router();

router.post('/', registrationLimiter, validate(createRegistrationSchema), registrationController.create);

// The pending-attendee RSVP reconfirmation link — registrationRsvp.controller.ts's
// redeem(). Records interest only; an admin still confirms afterward.
router.post('/rsvp/:token', rsvpRedeemLimiter, validate(redeemRsvpSchema), registrationRsvpController.redeem);

// Public — the attendee form's ID_VERIFICATION_TICKET_CATEGORIES gate uploads
// the photo here first (upload-then-submit, same pattern the admin
// ImagePicker already uses), gets back a URL, then includes that URL in the
// POST / above. Reuses the exact same controller/multer picker admin/delegate
// image uploads use — it's already auth-agnostic — just mounted publicly
// here with its own rate limit instead of requireAuth.
router.post('/upload-id', idCardUploadLimiter, uploadImage, uploadController.uploadImage);

export default router;
