import { Router } from 'express';
import * as adminController from '../../controllers/admin.controller.js';
import * as registrationController from '../../controllers/registration.controller.js';
import * as speakerController from '../../controllers/speaker.controller.js';
import * as sessionController from '../../controllers/session.controller.js';
import * as partnerController from '../../controllers/partner.controller.js';
import * as inquiryController from '../../controllers/inquiry.controller.js';
import * as contactController from '../../controllers/contact.controller.js';
import * as auditLogController from '../../controllers/auditLog.controller.js';
import * as userController from '../../controllers/user.controller.js';
import * as notificationController from '../../controllers/notification.controller.js';
import * as pushController from '../../controllers/push.controller.js';
import * as jobController from '../../controllers/job.controller.js';
import * as accessCodeController from '../../controllers/accessCode.controller.js';
import * as innovationController from '../../controllers/innovation.controller.js';
import * as checkinController from '../../controllers/checkin.controller.js';
import * as delegateAnnouncementController from '../../controllers/delegateAnnouncement.controller.js';
import * as abstractController from '../../controllers/abstract.controller.js';
import * as rubricController from '../../controllers/rubric.controller.js';
import * as reviewerController from '../../controllers/reviewer.controller.js';
import * as communicationController from '../../controllers/communication.controller.js';
import * as eventTeamController from '../../controllers/eventTeam.controller.js';
import * as portalTokenController from '../../controllers/portalToken.controller.js';
import * as reconciliationController from '../../controllers/reconciliation.controller.js';
import * as analyticsController from '../../controllers/analytics.controller.js';
import * as integrationsController from '../../controllers/integrations.controller.js';
import * as newsletterController from '../../controllers/newsletter.controller.js';
import * as uploadController from '../../controllers/upload.controller.js';
import * as searchController from '../../controllers/search.controller.js';
import * as mediaController from '../../controllers/media.controller.js';
import * as sponsorshipPackageController from '../../controllers/sponsorshipPackage.controller.js';
import * as deliverableController from '../../controllers/deliverable.controller.js';
import * as partnerInteractionController from '../../controllers/partnerInteraction.controller.js';
import * as trackController from '../../controllers/track.controller.js';
import * as leadController from '../../controllers/lead.controller.js';
import * as customFormFieldController from '../../controllers/customFormField.controller.js';
import * as exhibitorController from '../../controllers/exhibitor.controller.js';
import * as attendeeController from '../../controllers/attendee.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { uploadImage, uploadMedia, uploadCsv } from '../../middlewares/upload.middleware.js';
import { subscribePushSchema, unsubscribePushSchema } from '../../validations/push.validation.js';
import { sendAnnouncementSchema } from '../../validations/delegateAnnouncement.validation.js';
import { replaceRubricSchema } from '../../validations/rubric.validation.js';
import { adminCreateReviewerSchema, adminAssignReviewerSchema } from '../../validations/reviewer.validation.js';
import { adminUpdateCommunicationSchema } from '../../validations/communication.validation.js';
import { createSponsorshipPackageSchema, updateSponsorshipPackageSchema } from '../../validations/sponsorshipPackage.validation.js';
import { createDeliverableSchema, updateDeliverableSchema } from '../../validations/deliverable.validation.js';
import { createPartnerInteractionSchema } from '../../validations/partnerInteraction.validation.js';

const router = Router();

// Every /admin/* route requires a valid session — role checks then narrow further.
router.use(requireAuth);

router.get('/dashboard', requireRole('super_admin', 'content_editor', 'registrations_officer', 'viewer'), adminController.dashboardStats);

// Global search (topbar ⌘K) — every role may call this; which resources are
// actually queried is narrowed per-role inside the controller itself.
router.get('/search', requireRole('super_admin', 'content_editor', 'registrations_officer', 'viewer'), searchController.globalSearch);

// Any authenticated admin role can upload an image (own profile photo at minimum);
// which resource a URL ends up saved on is still gated by that resource's own route.
router.post('/uploads/image', uploadImage, uploadController.uploadImage);

// Gallery photo/video uploader — content_editor scope, same as the Media CRUD
// routes below.
router.post(
  '/uploads/media',
  requireRole('super_admin', 'content_editor'),
  uploadMedia,
  uploadController.uploadMedia
);

// content_editor is included here too — their access is narrowed to volunteer-type
// records inside the controllers themselves (isContentEditor()), not at the route
// level, so this stays one shared endpoint rather than a parallel "volunteers" API.
router.get(
  '/registrations',
  requireRole('super_admin', 'registrations_officer', 'viewer', 'content_editor'),
  registrationController.adminList
);
router.get(
  '/registrations/export',
  requireRole('super_admin', 'registrations_officer'),
  registrationController.adminExport
);
router.post(
  '/registrations',
  requireRole('super_admin', 'registrations_officer', 'content_editor'),
  registrationController.adminCreate
);
router.patch(
  '/registrations/:id',
  requireRole('super_admin', 'registrations_officer', 'content_editor'),
  registrationController.adminUpdate
);
// Delete is a step above what content_editor should touch, so scoped tighter
// than the PATCH above.
router.delete(
  '/registrations/:id',
  requireRole('super_admin', 'registrations_officer'),
  registrationController.adminDelete
);

// Access codes directly gate free entry — same role scope as reviewing registrations,
// plus content_editor for volunteer-type codes only (enforced in the controller).
router.get('/access-codes', requireRole('super_admin', 'registrations_officer', 'content_editor'), accessCodeController.adminList);
router.post('/access-codes', requireRole('super_admin', 'registrations_officer', 'content_editor'), accessCodeController.adminGenerate);
router.patch('/access-codes/:id/revoke', requireRole('super_admin', 'registrations_officer', 'content_editor'), accessCodeController.adminRevoke);
router.post('/access-codes/:id/send', requireRole('super_admin', 'registrations_officer', 'content_editor'), accessCodeController.adminSend);

router.get('/payments/reconciliations', requireRole('super_admin', 'registrations_officer'), reconciliationController.list);
router.post('/payments/reconciliations/:reference/resync', requireRole('super_admin', 'registrations_officer'), reconciliationController.resync);

router.get('/portal-tokens', requireRole('super_admin', 'registrations_officer'), portalTokenController.adminList);
router.post('/portal-tokens/:id/send-code', requireRole('super_admin', 'registrations_officer'), portalTokenController.adminSendCode);

const contentRoles = ['super_admin', 'content_editor'] as const;

router.get('/speakers', requireRole(...contentRoles), speakerController.adminList);
router.post('/speakers', requireRole(...contentRoles), speakerController.adminCreate);
router.patch('/speakers/:id', requireRole(...contentRoles), speakerController.adminUpdate);
router.delete('/speakers/:id', requireRole(...contentRoles), speakerController.adminDelete);

router.get('/sessions', requireRole(...contentRoles), sessionController.adminList);
router.post('/sessions/check-conflict', requireRole(...contentRoles), sessionController.checkConflict);
router.post('/sessions', requireRole(...contentRoles), sessionController.adminCreate);
router.patch('/sessions/:id', requireRole(...contentRoles), sessionController.adminUpdate);
router.delete('/sessions/:id', requireRole(...contentRoles), sessionController.adminDelete);
router.post('/sessions/:id/rsvp', requireRole(...contentRoles), sessionController.adminAddRsvp);
router.delete('/sessions/:id/rsvp/:email', requireRole(...contentRoles), sessionController.adminRemoveRsvp);

router.get('/tracks', requireRole(...contentRoles), trackController.adminList);
router.post('/tracks', requireRole(...contentRoles), trackController.adminCreate);
router.patch('/tracks/:id', requireRole(...contentRoles), trackController.adminUpdate);
router.delete('/tracks/:id', requireRole(...contentRoles), trackController.adminDelete);

router.get('/exhibitors-stats', requireRole('super_admin', 'registrations_officer', 'viewer'), exhibitorController.adminStats);
router.get('/exhibitors-analytics', requireRole('super_admin', 'registrations_officer', 'viewer'), exhibitorController.adminAnalytics);
router.post('/exhibitors/import', requireRole('super_admin', 'registrations_officer'), uploadCsv, exhibitorController.adminImport);
router.get('/exhibitors/:exhibitorId/leads', requireRole('super_admin', 'registrations_officer', 'viewer'), leadController.adminListForExhibitor);
router.post('/exhibitors/:exhibitorId/leads', requireRole('super_admin', 'registrations_officer'), leadController.adminCreate);
router.patch('/leads/:id', requireRole('super_admin', 'registrations_officer'), leadController.adminUpdate);
router.delete('/leads/:id', requireRole('super_admin', 'registrations_officer'), leadController.adminDelete);

router.get('/attendees-stats', requireRole('super_admin', 'registrations_officer', 'viewer'), attendeeController.adminStats);

router.get('/custom-fields', requireRole('super_admin', 'registrations_officer', 'viewer'), customFormFieldController.adminList);
router.post('/custom-fields', requireRole('super_admin', 'registrations_officer'), customFormFieldController.adminCreate);
router.patch('/custom-fields/:id', requireRole('super_admin', 'registrations_officer'), customFormFieldController.adminUpdate);
router.delete('/custom-fields/:id', requireRole('super_admin', 'registrations_officer'), customFormFieldController.adminDelete);

router.get('/partners', requireRole(...contentRoles), partnerController.adminList);
router.post('/partners', requireRole(...contentRoles), partnerController.adminCreate);
router.patch('/partners/:id', requireRole(...contentRoles), partnerController.adminUpdate);
router.delete('/partners/:id', requireRole(...contentRoles), partnerController.adminDelete);
router.get('/partners-analytics', requireRole(...contentRoles), partnerController.analytics);

router.get('/sponsorship-packages', requireRole(...contentRoles), sponsorshipPackageController.adminList);
router.post(
  '/sponsorship-packages',
  requireRole(...contentRoles),
  validate(createSponsorshipPackageSchema),
  sponsorshipPackageController.adminCreate
);
router.patch(
  '/sponsorship-packages/:id',
  requireRole(...contentRoles),
  validate(updateSponsorshipPackageSchema),
  sponsorshipPackageController.adminUpdate
);
router.delete('/sponsorship-packages/:id', requireRole(...contentRoles), sponsorshipPackageController.adminDelete);

router.get('/deliverables', requireRole(...contentRoles), deliverableController.adminList);
router.post(
  '/partners/:id/deliverables',
  requireRole(...contentRoles),
  validate(createDeliverableSchema),
  deliverableController.adminCreate
);
router.patch('/deliverables/:id', requireRole(...contentRoles), validate(updateDeliverableSchema), deliverableController.adminUpdate);
router.delete('/deliverables/:id', requireRole(...contentRoles), deliverableController.adminDelete);

router.get('/interactions', requireRole(...contentRoles), partnerInteractionController.adminList);
router.post(
  '/partners/:id/interactions',
  requireRole(...contentRoles),
  validate(createPartnerInteractionSchema),
  partnerInteractionController.adminCreate
);
router.patch(
  '/interactions/:id/follow-up-done',
  requireRole(...contentRoles),
  partnerInteractionController.adminMarkFollowUpDone
);

router.get('/innovations', requireRole(...contentRoles), innovationController.adminList);
router.post('/innovations', requireRole(...contentRoles), innovationController.adminCreate);
router.patch('/innovations/:id', requireRole(...contentRoles), innovationController.adminUpdate);
router.delete('/innovations/:id', requireRole(...contentRoles), innovationController.adminDelete);

router.get('/abstracts', requireRole(...contentRoles), abstractController.adminList);
router.patch('/abstracts/:id', requireRole(...contentRoles), abstractController.adminUpdate);
router.post(
  '/abstracts/:id/assignments',
  requireRole(...contentRoles),
  validate(adminAssignReviewerSchema),
  abstractController.assignReviewer
);
router.delete('/abstracts/:id/assignments/:reviewId', requireRole(...contentRoles), abstractController.unassignReviewer);

router.get('/review-matrix', requireRole(...contentRoles), abstractController.reviewMatrix);

router.get('/rubric', requireRole(...contentRoles), rubricController.get);
router.put('/rubric', requireRole(...contentRoles), validate(replaceRubricSchema), rubricController.replace);
router.post('/rubric/restore-standard', requireRole(...contentRoles), rubricController.restoreStandard);

router.get('/reviewers', requireRole(...contentRoles), reviewerController.adminList);
router.post('/reviewers', requireRole(...contentRoles), validate(adminCreateReviewerSchema), reviewerController.adminCreate);

router.get('/abstracts-analytics', requireRole(...contentRoles), abstractController.analytics);

router.get('/communications', requireRole(...contentRoles), communicationController.adminList);
router.patch(
  '/communications/:id',
  requireRole(...contentRoles),
  validate(adminUpdateCommunicationSchema),
  communicationController.adminUpdate
);
router.post('/communications/:id/send', requireRole(...contentRoles), communicationController.adminSend);
router.post('/communications/:id/cancel', requireRole(...contentRoles), communicationController.adminCancel);

router.get('/media', requireRole(...contentRoles), mediaController.adminList);
router.post('/media', requireRole(...contentRoles), mediaController.adminCreate);
router.patch('/media/:id', requireRole(...contentRoles), mediaController.adminUpdate);
router.delete('/media/:id', requireRole(...contentRoles), mediaController.adminDelete);

router.get('/inquiries', requireRole(...contentRoles), inquiryController.adminList);
router.patch('/inquiries/:id', requireRole(...contentRoles), inquiryController.adminUpdateStatus);

router.get('/messages', requireRole(...contentRoles), contactController.adminList);
router.patch('/messages/:id', requireRole(...contentRoles), contactController.adminUpdate);

router.get('/newsletter-subscribers', requireRole(...contentRoles), newsletterController.adminList);
router.get('/newsletter-subscribers/export', requireRole(...contentRoles), newsletterController.adminExport);

router.get('/audit-logs', requireRole('super_admin', 'viewer'), auditLogController.adminList);

router.get('/users', requireRole('super_admin'), userController.adminList);
router.post('/users', requireRole('super_admin'), userController.adminCreate);
router.patch('/users/:id', requireRole('super_admin'), userController.adminUpdate);
router.delete('/users/:id', requireRole('super_admin'), userController.adminDelete);

router.get('/event-team', requireRole('super_admin'), eventTeamController.adminList);
router.post('/event-team', requireRole('super_admin'), eventTeamController.adminCreate);
router.patch('/event-team/:id', requireRole('super_admin'), eventTeamController.adminUpdate);
router.delete('/event-team/:id', requireRole('super_admin'), eventTeamController.adminDelete);

router.get('/integrations/status', requireRole('super_admin'), integrationsController.status);
router.post('/integrations/test-email', requireRole('super_admin'), integrationsController.testEmail);
router.post('/integrations/test-push', requireRole('super_admin'), integrationsController.testPush);

const allRoles = ['super_admin', 'content_editor', 'registrations_officer', 'viewer'] as const;

router.get('/analytics', requireRole(...allRoles), analyticsController.overview);
router.get('/analytics-registrations', requireRole(...allRoles), analyticsController.registrations);
router.get('/analytics-revenue', requireRole(...allRoles), analyticsController.revenue);
router.get('/analytics-engagement', requireRole(...allRoles), analyticsController.engagement);

router.get('/notifications', requireRole(...allRoles), notificationController.adminList);
router.patch('/notifications/:id/read', requireRole(...allRoles), notificationController.adminMarkRead);
router.patch('/notifications/read-all', requireRole(...allRoles), notificationController.adminMarkAllRead);

router.get('/push/public-key', requireRole(...allRoles), pushController.publicKey);
router.post('/push/subscribe', requireRole(...allRoles), validate(subscribePushSchema), pushController.subscribe);
router.post('/push/unsubscribe', requireRole(...allRoles), validate(unsubscribePushSchema), pushController.unsubscribe);

router.post('/jobs/run-digest', requireRole('super_admin'), jobController.runDigestNow);

// Check-in — same role scope as reviewing registrations (registrations_officer
// handles the door on event day; super_admin always can).
router.get('/check-in/stats', requireRole('super_admin', 'registrations_officer'), checkinController.stats);
router.get('/check-in/search', requireRole('super_admin', 'registrations_officer'), checkinController.search);
router.post('/check-in/scan', requireRole('super_admin', 'registrations_officer'), checkinController.scan);
router.post('/check-in/manual/:id', requireRole('super_admin', 'registrations_officer'), checkinController.manualCheckIn);

router.post(
  '/delegate-announcements',
  requireRole('super_admin', 'registrations_officer'),
  validate(sendAnnouncementSchema),
  delegateAnnouncementController.send
);

export default router;
