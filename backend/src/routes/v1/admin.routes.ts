import { Router } from 'express';
import * as adminController from '../../controllers/admin.controller.js';
import * as registrationController from '../../controllers/registration.controller.js';
import * as registrationRsvpController from '../../controllers/registrationRsvp.controller.js';
import * as knowledgeChunkController from '../../controllers/knowledgeChunk.controller.js';
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
import * as accessCodeBatchController from '../../controllers/accessCodeBatch.controller.js';
import * as scholarshipApplicationController from '../../controllers/scholarshipApplication.controller.js';
import * as waiHealthController from '../../controllers/waiHealth.controller.js';
import * as whatsappController from '../../controllers/whatsapp.controller.js';
import * as promoController from '../../controllers/promo.controller.js';
import * as innovationController from '../../controllers/innovation.controller.js';
import * as checkinController from '../../controllers/checkin.controller.js';
import * as delegateAnnouncementController from '../../controllers/delegateAnnouncement.controller.js';
import * as abstractController from '../../controllers/abstract.controller.js';
import * as rubricController from '../../controllers/rubric.controller.js';
import * as reviewerController from '../../controllers/reviewer.controller.js';
import * as rapporteurController from '../../controllers/rapporteur.controller.js';
import * as liveTranscriptController from '../../controllers/liveTranscript.controller.js';
import * as knowledgeProductController from '../../controllers/knowledgeProduct.controller.js';
import * as communicationController from '../../controllers/communication.controller.js';
import * as eventTeamController from '../../controllers/eventTeam.controller.js';
import * as portalTokenController from '../../controllers/portalToken.controller.js';
import * as reconciliationController from '../../controllers/reconciliation.controller.js';
import * as paymentController from '../../controllers/payment.controller.js';
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
import * as sessionTypeController from '../../controllers/sessionType.controller.js';
import * as confirmedAbstractController from '../../controllers/confirmedAbstract.controller.js';
import * as innovationShowcaseEntryController from '../../controllers/innovationShowcaseEntry.controller.js';
import * as volunteerTrackController from '../../controllers/volunteerTrack.controller.js';
import * as volunteerSettingsController from '../../controllers/volunteerSettings.controller.js';
import * as innovatorSettingsController from '../../controllers/innovatorSettings.controller.js';
import * as leadController from '../../controllers/lead.controller.js';
import * as customFormFieldController from '../../controllers/customFormField.controller.js';
import * as exhibitorController from '../../controllers/exhibitor.controller.js';
import * as attendeeController from '../../controllers/attendee.controller.js';
import * as securityController from '../../controllers/security.controller.js';
import * as policySourceController from '../../controllers/policySource.controller.js';
import * as policyTrackerController from '../../controllers/policyTracker.controller.js';
import * as translationReviewController from '../../controllers/translationReview.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { requireRootAdmin } from '../../middlewares/requireRootAdmin.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { uploadImage, uploadMedia, uploadCsv, uploadDocument, uploadAudio } from '../../middlewares/upload.middleware.js';
import { liveTranscriptChunkLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { subscribePushSchema, unsubscribePushSchema } from '../../validations/push.validation.js';
import { sendAnnouncementSchema } from '../../validations/delegateAnnouncement.validation.js';
import { replaceRubricSchema } from '../../validations/rubric.validation.js';
import { adminCreateReviewerSchema, adminAssignReviewerSchema } from '../../validations/reviewer.validation.js';
import { adminAssignRapporteurSchema, adminUpdateReportSchema } from '../../validations/rapporteur.validation.js';
import { knowledgeProductTypeParamSchema, adminUpdateKnowledgeProductSchema } from '../../validations/knowledgeProduct.validation.js';
import { adminUpdateCommunicationSchema } from '../../validations/communication.validation.js';
import { createSponsorshipPackageSchema, updateSponsorshipPackageSchema } from '../../validations/sponsorshipPackage.validation.js';
import { createDeliverableSchema, updateDeliverableSchema } from '../../validations/deliverable.validation.js';
import { createPartnerInteractionSchema } from '../../validations/partnerInteraction.validation.js';
import { blockIpSchema, setLockdownSchema } from '../../validations/security.validation.js';
import { setVolunteerSettingsSchema } from '../../validations/volunteerSettings.validation.js';
import { setInnovatorSettingsSchema } from '../../validations/innovatorSettings.validation.js';
import { setPromoActiveSchema } from '../../validations/promo.validation.js';
import { setWaiHealthCapacitySchema } from '../../validations/waiHealth.validation.js';
import { decideScholarshipApplicationSchema, adminAnalyzeApplicationsSchema } from '../../validations/scholarshipApplication.validation.js';

const router = Router();

// Every /admin/* route requires a valid session — role checks then narrow further.
router.use(requireAuth);

// Every /admin/* role, listed once since several cross-cutting routes (dashboard,
// search, analytics, notifications, push) are open to all of them.
const allRoles = [
  'super_admin',
  'admin',
  'registrations_officer',
  'innovator_lead',
  'exhibitor_lead',
  'abstract_lead',
  'rapporteur_lead',
  'wai_health_lead',
  'viewer',
] as const;

router.get('/dashboard', requireRole(...allRoles), adminController.dashboardStats);

// Global search (topbar ⌘K) — every role may call this; which resources are
// actually queried is narrowed per-role inside the controller itself.
router.get('/search', requireRole(...allRoles), searchController.globalSearch);

// Any authenticated admin role can upload an image (own profile photo at minimum);
// which resource a URL ends up saved on is still gated by that resource's own route.
router.post('/uploads/image', uploadImage, uploadController.uploadImage);

// Gallery photo/video uploader — same scope as the Media CRUD routes below.
router.post(
  '/uploads/media',
  requireRole('super_admin', 'admin'),
  uploadMedia,
  uploadController.uploadMedia
);

// innovator_lead/exhibitor_lead are included here too — their access is narrowed
// to their own registration type inside the controllers themselves
// (ROLE_REGISTRATION_TYPES in registration.controller.ts), not at the route
// level, so this stays one shared endpoint rather than parallel per-type APIs.
router.get(
  '/registrations',
  requireRole('super_admin', 'admin', 'registrations_officer', 'viewer', 'innovator_lead', 'exhibitor_lead'),
  registrationController.adminList
);
router.get(
  '/registrations/export',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  registrationController.adminExport
);
router.post(
  '/registrations',
  requireRole('super_admin', 'admin', 'registrations_officer', 'innovator_lead', 'exhibitor_lead'),
  registrationController.adminCreate
);
router.patch(
  '/registrations/:id',
  requireRole('super_admin', 'admin', 'registrations_officer', 'innovator_lead', 'exhibitor_lead'),
  registrationController.adminUpdate
);
// Delete is a step above what the leads above should touch, so scoped tighter
// than the PATCH above.
router.delete(
  '/registrations/:id',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  registrationController.adminDelete
);
router.post(
  '/registrations/bulk-payment-reminder',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  registrationController.adminBulkSendPaymentReminders
);
// A financial action (marks a real payment collected outside Paystack) — not
// innovator_lead/exhibitor_lead territory.
router.post(
  '/registrations/:id/mark-paid',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  registrationController.adminMarkPaid
);
// Pending-attendee RSVP reconfirmation — sending the nudge is the only new
// endpoint; actually confirming (singly or in bulk) reuses the existing
// PATCH /registrations/:id above (RegistrationsPage.tsx's own bulk "Confirm"
// action already covers it, no duplicate endpoint needed).
router.post(
  '/registrations/rsvp/send-reminders',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  registrationRsvpController.adminSendReminders
);
router.post(
  '/registrations/import-volunteers',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  uploadCsv,
  registrationController.adminImportVolunteers
);

// Access codes directly gate free entry — admin/super_admin only. Not
// registrations_officer (deliberately narrowed off this role) and not the
// per-type leads below — Innovator/Exhibitor heads manage their own
// registrations but don't issue access codes.
router.get('/access-codes', requireRole('super_admin', 'admin'), accessCodeController.adminList);
router.post('/access-codes', requireRole('super_admin', 'admin'), accessCodeController.adminGenerate);
router.patch('/access-codes/:id/revoke', requireRole('super_admin', 'admin'), accessCodeController.adminRevoke);
router.post('/access-codes/:id/send', requireRole('super_admin', 'admin'), accessCodeController.adminSend);

// Access Code Batches — a bunch of anonymous, 48h-expiring bulk_invite codes
// generated at once and emailed to one distributor; see AccessCode.model.ts's
// comment for how these differ from every other access code type. Same
// sensitivity class/gating as Access Codes above.
router.get('/access-code-batches', requireRole('super_admin', 'admin'), accessCodeBatchController.adminList);
router.post('/access-code-batches', requireRole('super_admin', 'admin'), accessCodeBatchController.adminGenerate);
router.get('/access-code-batches/:id', requireRole('super_admin', 'admin'), accessCodeBatchController.adminGetOne);
router.post('/access-code-batches/:id/resend', requireRole('super_admin', 'admin'), accessCodeBatchController.adminResend);

router.get('/scholarship-applications', requireRole('super_admin', 'admin', 'registrations_officer'), scholarshipApplicationController.adminList);
router.get('/scholarship-applications/export', requireRole('super_admin', 'admin', 'registrations_officer'), scholarshipApplicationController.adminExport);
router.post(
  '/scholarship-applications/analyze',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  validate(adminAnalyzeApplicationsSchema),
  scholarshipApplicationController.adminAnalyze
);
router.patch(
  '/scholarship-applications/:id/decide',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  validate(decideScholarshipApplicationSchema),
  scholarshipApplicationController.adminDecide
);

// Women in AI & Health Breakfast — a new, separate event-registration area,
// not folded into the core registrations_officer scope. wai_health_lead owns
// this area fully (same "full control of their own area" shape as
// innovator_lead/exhibitor_lead), but — unlike those two — gets no admittance
// to the main Registrations page; see types/enums.ts's comment for why.
// registrations_officer gets VIEW access only (list/export/capacity reading)
// — not the capacity PUT or either notify-not-eligible action below, same
// "visibility without the sensitive write actions" split this role already
// has elsewhere (e.g. Payments' adminStats vs its mutations).
router.get('/wai-health', requireRole('super_admin', 'admin', 'wai_health_lead', 'registrations_officer'), waiHealthController.adminList);
router.get(
  '/wai-health/export',
  requireRole('super_admin', 'admin', 'wai_health_lead', 'registrations_officer'),
  waiHealthController.adminExport
);
router.get(
  '/wai-health/settings',
  requireRole('super_admin', 'admin', 'wai_health_lead', 'registrations_officer'),
  waiHealthController.adminGetSettings
);
router.put(
  '/wai-health/settings',
  requireRole('super_admin', 'admin', 'wai_health_lead'),
  validate(setWaiHealthCapacitySchema),
  waiHealthController.adminSetCapacity
);
router.post(
  '/wai-health/:id/notify-not-eligible',
  requireRole('super_admin', 'admin', 'wai_health_lead'),
  waiHealthController.adminNotifyNotEligible
);
router.post(
  '/wai-health/notify-not-eligible/bulk',
  requireRole('super_admin', 'admin', 'wai_health_lead'),
  waiHealthController.adminBulkNotifyNotEligible
);

// WhatsApp Concierge — new area, not registrations_officer's territory,
// consistent with how WAI-Health/Access Codes/Payments were scoped above.
router.get('/whatsapp/conversations', requireRole('super_admin', 'admin'), whatsappController.adminList);
router.get('/whatsapp/conversations/:id', requireRole('super_admin', 'admin'), whatsappController.adminGet);
router.post('/whatsapp/conversations/:id/reply', requireRole('super_admin', 'admin'), whatsappController.adminReply);

router.get('/payments-stats', requireRole('super_admin', 'admin', 'viewer'), paymentController.adminStats);
router.get('/payments/reconciliations', requireRole('super_admin', 'admin'), reconciliationController.list);
router.post('/payments/reconciliations/:reference/resync', requireRole('super_admin', 'admin'), reconciliationController.resync);

router.get('/portal-tokens', requireRole('super_admin', 'admin'), portalTokenController.adminList);
router.post('/portal-tokens/:id/send-code', requireRole('super_admin', 'admin'), portalTokenController.adminSendCode);
router.post('/portal-tokens/bulk-send', requireRole('super_admin', 'admin'), portalTokenController.adminBulkSendCodes);

// Areas not named as their own staff role — folded into Admin (+ super_admin),
// per the per-area roles plan. Kept as one shared const since these routes are
// otherwise unrelated (Agenda/Speakers, Translations, Tracks) but share the
// exact same access scope.
const adminOnlyRoles = ['super_admin', 'admin'] as const;
const abstractRoles = ['super_admin', 'admin', 'abstract_lead'] as const;
const rapporteurRoles = ['super_admin', 'admin', 'rapporteur_lead'] as const;

router.get('/speakers', requireRole(...adminOnlyRoles), speakerController.adminList);
router.post('/speakers', requireRole(...adminOnlyRoles), speakerController.adminCreate);
// Must come before the /:id routes below — otherwise Express matches
// "reorder" as an :id param instead of this route.
router.patch('/speakers/reorder', requireRole(...adminOnlyRoles), speakerController.adminReorder);
router.patch('/speakers/:id', requireRole(...adminOnlyRoles), speakerController.adminUpdate);
router.delete('/speakers/:id', requireRole(...adminOnlyRoles), speakerController.adminDelete);
router.post('/speakers/:id/translate', requireRole(...adminOnlyRoles), speakerController.translate);
router.patch('/speakers/:id/translations/:lang', requireRole(...adminOnlyRoles), speakerController.updateTranslation);
router.post('/speakers/:id/register', requireRole(...adminOnlyRoles), speakerController.adminRegister);
router.post('/speakers/:id/send-access-email', requireRole(...adminOnlyRoles), speakerController.adminSendAccessEmail);

router.get('/sessions', requireRole(...adminOnlyRoles), sessionController.adminList);
router.post('/sessions/check-conflict', requireRole(...adminOnlyRoles), sessionController.checkConflict);
router.post('/sessions', requireRole(...adminOnlyRoles), sessionController.adminCreate);
router.patch('/sessions/:id', requireRole(...adminOnlyRoles), sessionController.adminUpdate);
router.delete('/sessions/:id', requireRole(...adminOnlyRoles), sessionController.adminDelete);
router.post('/sessions/:id/rsvp', requireRole(...adminOnlyRoles), sessionController.adminAddRsvp);
router.delete('/sessions/:id/rsvp/:email', requireRole(...adminOnlyRoles), sessionController.adminRemoveRsvp);
router.post('/sessions/:id/translate', requireRole(...adminOnlyRoles), sessionController.translate);
router.post('/sessions/translate-missing', requireRole(...adminOnlyRoles), sessionController.translateMissing);
router.patch('/sessions/:id/translations/:lang', requireRole(...adminOnlyRoles), sessionController.updateTranslation);

router.get('/translations/pending', requireRole(...adminOnlyRoles), translationReviewController.adminListPending);

router.get('/tracks', requireRole(...adminOnlyRoles), trackController.adminList);
router.post('/tracks', requireRole(...adminOnlyRoles), trackController.adminCreate);
router.patch('/tracks/:id', requireRole(...adminOnlyRoles), trackController.adminUpdate);
router.delete('/tracks/:id', requireRole(...adminOnlyRoles), trackController.adminDelete);

router.get('/session-types', requireRole(...adminOnlyRoles), sessionTypeController.adminList);
router.post('/session-types', requireRole(...adminOnlyRoles), sessionTypeController.adminCreate);
router.delete('/session-types/:id', requireRole(...adminOnlyRoles), sessionTypeController.adminDelete);

// Volunteer track options — same roles as registrations (Volunteers is where
// this list is managed, not the Agenda/Sessions area Track above belongs to).
router.get('/volunteer-tracks', requireRole('super_admin', 'admin', 'registrations_officer'), volunteerTrackController.adminList);
router.post('/volunteer-tracks', requireRole('super_admin', 'admin', 'registrations_officer'), volunteerTrackController.adminCreate);
router.patch('/volunteer-tracks/:id', requireRole('super_admin', 'admin', 'registrations_officer'), volunteerTrackController.adminUpdate);
router.delete('/volunteer-tracks/:id', requireRole('super_admin', 'admin', 'registrations_officer'), volunteerTrackController.adminDelete);

router.get('/volunteer-settings', requireRole('super_admin', 'admin', 'registrations_officer'), volunteerSettingsController.adminGet);
router.put('/volunteer-settings', requireRole('super_admin', 'admin', 'registrations_officer'), validate(setVolunteerSettingsSchema), volunteerSettingsController.adminSet);

// innovator_lead owns this (same "full control of their own area" shape as
// elsewhere in this file) — opening/closing applications is a distinct,
// narrower decision from registrations_officer's full registration-pipeline
// access (which does include Innovator registrations — see
// ROLE_REGISTRATION_TYPES in registration.controller.ts).
router.get('/innovator-settings', requireRole('super_admin', 'admin', 'innovator_lead'), innovatorSettingsController.adminGet);
router.put(
  '/innovator-settings',
  requireRole('super_admin', 'admin', 'innovator_lead'),
  validate(setInnovatorSettingsSchema),
  innovatorSettingsController.adminSet
);

// super_admin only — launching this starts a real, uncapped-quantity 100%-off
// giveaway running for a fixed 10 days, a financial decision distinct from
// every other role's normal content/registrations scope.
router.get('/promo/status', requireRole('super_admin'), promoController.adminStatus);
router.post('/promo/launch', requireRole('super_admin'), promoController.adminLaunch);
router.put('/promo/active', requireRole('super_admin'), validate(setPromoActiveSchema), promoController.adminSetActive);

router.get('/exhibitors-stats', requireRole('super_admin', 'admin', 'registrations_officer', 'viewer', 'exhibitor_lead'), exhibitorController.adminStats);
router.get('/exhibitors-analytics', requireRole('super_admin', 'admin', 'registrations_officer', 'viewer', 'exhibitor_lead'), exhibitorController.adminAnalytics);
router.post('/exhibitors/import', requireRole('super_admin', 'admin', 'registrations_officer'), uploadCsv, exhibitorController.adminImport);
router.get('/exhibitors/:exhibitorId/leads', requireRole('super_admin', 'admin', 'registrations_officer', 'viewer', 'exhibitor_lead'), leadController.adminListForExhibitor);
router.post('/exhibitors/:exhibitorId/leads', requireRole('super_admin', 'admin', 'registrations_officer', 'exhibitor_lead'), leadController.adminCreate);
router.patch('/leads/:id', requireRole('super_admin', 'admin', 'registrations_officer', 'exhibitor_lead'), leadController.adminUpdate);
router.delete('/leads/:id', requireRole('super_admin', 'admin', 'registrations_officer'), leadController.adminDelete);

router.get('/attendees-stats', requireRole('super_admin', 'admin', 'registrations_officer', 'viewer'), attendeeController.adminStats);

router.get('/custom-fields', requireRole('super_admin', 'admin', 'registrations_officer', 'viewer'), customFormFieldController.adminList);
router.post('/custom-fields', requireRole('super_admin', 'admin', 'registrations_officer'), customFormFieldController.adminCreate);
router.patch('/custom-fields/:id', requireRole('super_admin', 'admin', 'registrations_officer'), customFormFieldController.adminUpdate);
router.delete('/custom-fields/:id', requireRole('super_admin', 'admin', 'registrations_officer'), customFormFieldController.adminDelete);

router.get('/partners', requireRole(...adminOnlyRoles), partnerController.adminList);
router.post('/partners', requireRole(...adminOnlyRoles), partnerController.adminCreate);
router.patch('/partners/:id', requireRole(...adminOnlyRoles), partnerController.adminUpdate);
router.delete('/partners/:id', requireRole(...adminOnlyRoles), partnerController.adminDelete);
router.get('/partners-analytics', requireRole(...adminOnlyRoles), partnerController.analytics);

router.get('/sponsorship-packages', requireRole(...adminOnlyRoles), sponsorshipPackageController.adminList);
router.post(
  '/sponsorship-packages',
  requireRole(...adminOnlyRoles),
  validate(createSponsorshipPackageSchema),
  sponsorshipPackageController.adminCreate
);
router.patch(
  '/sponsorship-packages/:id',
  requireRole(...adminOnlyRoles),
  validate(updateSponsorshipPackageSchema),
  sponsorshipPackageController.adminUpdate
);
router.delete('/sponsorship-packages/:id', requireRole(...adminOnlyRoles), sponsorshipPackageController.adminDelete);

router.get('/deliverables', requireRole(...adminOnlyRoles), deliverableController.adminList);
router.post(
  '/partners/:id/deliverables',
  requireRole(...adminOnlyRoles),
  validate(createDeliverableSchema),
  deliverableController.adminCreate
);
router.patch('/deliverables/:id', requireRole(...adminOnlyRoles), validate(updateDeliverableSchema), deliverableController.adminUpdate);
router.delete('/deliverables/:id', requireRole(...adminOnlyRoles), deliverableController.adminDelete);

router.get('/interactions', requireRole(...adminOnlyRoles), partnerInteractionController.adminList);
router.post(
  '/partners/:id/interactions',
  requireRole(...adminOnlyRoles),
  validate(createPartnerInteractionSchema),
  partnerInteractionController.adminCreate
);
router.patch(
  '/interactions/:id/follow-up-done',
  requireRole(...adminOnlyRoles),
  partnerInteractionController.adminMarkFollowUpDone
);

router.get('/innovations', requireRole(...adminOnlyRoles), innovationController.adminList);
router.post('/innovations', requireRole(...adminOnlyRoles), innovationController.adminCreate);
router.patch('/innovations/:id', requireRole(...adminOnlyRoles), innovationController.adminUpdate);
router.delete('/innovations/:id', requireRole(...adminOnlyRoles), innovationController.adminDelete);

router.get('/confirmed-abstracts', requireRole(...abstractRoles), confirmedAbstractController.adminList);
router.post('/confirmed-abstracts', requireRole(...abstractRoles), confirmedAbstractController.adminCreate);
router.patch('/confirmed-abstracts/:id', requireRole(...abstractRoles), confirmedAbstractController.adminUpdate);
router.delete('/confirmed-abstracts/:id', requireRole(...abstractRoles), confirmedAbstractController.adminDelete);

router.get('/innovation-showcase-entries', requireRole(...adminOnlyRoles), innovationShowcaseEntryController.adminList);
router.post('/innovation-showcase-entries', requireRole(...adminOnlyRoles), innovationShowcaseEntryController.adminCreate);
router.patch('/innovation-showcase-entries/:id', requireRole(...adminOnlyRoles), innovationShowcaseEntryController.adminUpdate);
router.delete('/innovation-showcase-entries/:id', requireRole(...adminOnlyRoles), innovationShowcaseEntryController.adminDelete);

router.get('/abstracts', requireRole(...abstractRoles), abstractController.adminList);
router.patch('/abstracts/:id', requireRole(...abstractRoles), abstractController.adminUpdate);
router.post('/abstracts/summarize', requireRole(...abstractRoles), abstractController.adminSummarize);
router.patch('/abstracts/:id/plain-summary', requireRole(...abstractRoles), abstractController.updatePlainSummary);
router.post('/abstracts/triage', requireRole(...abstractRoles), abstractController.adminTriage);
router.patch('/abstracts/:id/track', requireRole(...abstractRoles), abstractController.updateTrack);

router.get('/policy-sources', requireRole(...adminOnlyRoles), policySourceController.adminList);
router.post('/policy-sources', requireRole(...adminOnlyRoles), policySourceController.adminCreate);
router.patch('/policy-sources/:id', requireRole(...adminOnlyRoles), policySourceController.adminUpdate);
router.delete('/policy-sources/:id', requireRole(...adminOnlyRoles), policySourceController.adminDelete);

router.get('/policy-tracker', requireRole(...adminOnlyRoles), policyTrackerController.adminList);
router.patch('/policy-tracker/:id', requireRole(...adminOnlyRoles), policyTrackerController.adminUpdate);
router.post('/policy-tracker/refresh-now', requireRole(...adminOnlyRoles), policyTrackerController.adminRefreshNow);
router.post(
  '/abstracts/:id/assignments',
  requireRole(...abstractRoles),
  validate(adminAssignReviewerSchema),
  abstractController.assignReviewer
);
router.delete('/abstracts/:id/assignments/:reviewId', requireRole(...abstractRoles), abstractController.unassignReviewer);

router.get('/review-matrix', requireRole(...abstractRoles), abstractController.reviewMatrix);

router.get('/rubric', requireRole(...abstractRoles), rubricController.get);
router.put('/rubric', requireRole(...abstractRoles), validate(replaceRubricSchema), rubricController.replace);
router.post('/rubric/restore-standard', requireRole(...abstractRoles), rubricController.restoreStandard);

router.get('/reviewers', requireRole(...abstractRoles), reviewerController.adminList);
router.post('/reviewers', requireRole(...abstractRoles), validate(adminCreateReviewerSchema), reviewerController.adminCreate);

// AI-Assisted Rapporteur System (Stage 1).
router.get('/rapporteur/sessions', requireRole(...rapporteurRoles), rapporteurController.adminListAssignableSessions);
router.post('/rapporteur/assign', requireRole(...rapporteurRoles), validate(adminAssignRapporteurSchema), rapporteurController.adminAssign);
router.get('/rapporteur/reports', requireRole(...rapporteurRoles), rapporteurController.adminListReports);
router.patch('/rapporteur/reports/:id', requireRole(...rapporteurRoles), validate(adminUpdateReportSchema), rapporteurController.adminUpdateReport);
router.post('/rapporteur/reports/:id/retry-polish', requireRole(...rapporteurRoles), rapporteurController.adminRetryPolish);
router.get('/rapporteur/live-status', requireRole(...rapporteurRoles), rapporteurController.adminLiveStatus);
router.post('/rapporteur/tokens/:id/revoke', requireRole(...rapporteurRoles), rapporteurController.adminRevokeToken);
router.post('/rapporteur/tokens/:id/resend', requireRole(...rapporteurRoles), rapporteurController.adminResendLink);

// AI-Assisted Rapporteur System Stage 2, Layer 3 — internal live transcript
// monitoring, same roles as the rest of the rapporteur block.
router.get('/live-transcript/sessions', requireRole(...rapporteurRoles), liveTranscriptController.adminListSessions);
router.get('/live-transcript/sessions/:id', requireRole(...rapporteurRoles), liveTranscriptController.adminGet);
router.post('/live-transcript/sessions/:id/start', requireRole(...rapporteurRoles), liveTranscriptController.adminStart);
router.post('/live-transcript/sessions/:id/stop', requireRole(...rapporteurRoles), liveTranscriptController.adminStop);
router.post(
  '/live-transcript/sessions/:id/chunk',
  requireRole(...rapporteurRoles),
  liveTranscriptChunkLimiter,
  uploadAudio,
  liveTranscriptController.adminChunk
);

// AI Feature Suite 2.9 / Rapporteur spec Section 7 — Knowledge Product
// Drafting — not named as its own role, folded into Admin.
router.get('/knowledge-products', requireRole(...adminOnlyRoles), knowledgeProductController.adminList);
router.post(
  '/knowledge-products/:type/generate',
  requireRole(...adminOnlyRoles),
  validate(knowledgeProductTypeParamSchema),
  knowledgeProductController.adminGenerate
);
router.patch(
  '/knowledge-products/:type',
  requireRole(...adminOnlyRoles),
  validate(adminUpdateKnowledgeProductSchema),
  knowledgeProductController.adminUpdate
);

router.get('/abstracts-analytics', requireRole(...abstractRoles), abstractController.analytics);

router.get('/communications', requireRole(...adminOnlyRoles), communicationController.adminList);
router.patch(
  '/communications/:id',
  requireRole(...adminOnlyRoles),
  validate(adminUpdateCommunicationSchema),
  communicationController.adminUpdate
);
router.post('/communications/:id/send', requireRole(...adminOnlyRoles), communicationController.adminSend);
router.post('/communications/:id/cancel', requireRole(...adminOnlyRoles), communicationController.adminCancel);

// Ask the Concept Note's source material — see KnowledgeChunk.model.ts.
router.get('/ai/knowledge-chunks', requireRole(...adminOnlyRoles), knowledgeChunkController.adminList);
router.post('/ai/knowledge-chunks', requireRole(...adminOnlyRoles), knowledgeChunkController.adminCreate);
router.patch('/ai/knowledge-chunks/:id', requireRole(...adminOnlyRoles), knowledgeChunkController.adminUpdate);
router.delete('/ai/knowledge-chunks/:id', requireRole(...adminOnlyRoles), knowledgeChunkController.adminDelete);
router.post(
  '/ai/knowledge-chunks/extract',
  requireRole(...adminOnlyRoles),
  uploadDocument,
  knowledgeChunkController.adminExtract
);
router.post('/ai/knowledge-chunks/bulk-create', requireRole(...adminOnlyRoles), knowledgeChunkController.adminBulkCreate);

router.get('/media', requireRole(...adminOnlyRoles), mediaController.adminList);
router.post('/media', requireRole(...adminOnlyRoles), mediaController.adminCreate);
router.patch('/media/:id', requireRole(...adminOnlyRoles), mediaController.adminUpdate);
router.delete('/media/:id', requireRole(...adminOnlyRoles), mediaController.adminDelete);

router.get('/inquiries', requireRole(...adminOnlyRoles), inquiryController.adminList);
router.patch('/inquiries/:id', requireRole(...adminOnlyRoles), inquiryController.adminUpdateStatus);

router.get('/messages', requireRole(...adminOnlyRoles), contactController.adminList);
router.patch('/messages/:id', requireRole(...adminOnlyRoles), contactController.adminUpdate);

router.get('/newsletter-subscribers', requireRole(...adminOnlyRoles), newsletterController.adminList);
router.get('/newsletter-subscribers/export', requireRole(...adminOnlyRoles), newsletterController.adminExport);

router.get('/audit-logs', requireRole('super_admin', 'admin', 'viewer'), auditLogController.adminList);

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
// handles the door on event day; super_admin/admin always can).
router.get('/check-in/stats', requireRole('super_admin', 'admin', 'registrations_officer'), checkinController.stats);
router.get('/check-in/search', requireRole('super_admin', 'admin', 'registrations_officer'), checkinController.search);
router.post('/check-in/scan', requireRole('super_admin', 'admin', 'registrations_officer'), checkinController.scan);
router.post('/check-in/manual/:id', requireRole('super_admin', 'admin', 'registrations_officer'), checkinController.manualCheckIn);

router.post(
  '/delegate-announcements',
  requireRole('super_admin', 'admin', 'registrations_officer'),
  validate(sendAnnouncementSchema),
  delegateAnnouncementController.send
);

// Security Command Center — gated on isRootAdmin (an identity flag set once
// by ensureSuperAdminSeeded), not a role. A later super_admin created through
// ordinary user management never passes requireRootAdmin, even though they'd
// pass requireRole('super_admin') everywhere else in this file.
router.use('/security', requireRootAdmin);
router.get('/security/overview', securityController.overview);
router.get('/security/events', securityController.listEvents);
router.get('/security/blocked-ips', securityController.listBlockedIps);
router.post('/security/blocked-ips', validate(blockIpSchema), securityController.adminBlockIp);
router.delete('/security/blocked-ips/:ip', securityController.adminUnblockIp);
router.get('/security/lockdown', securityController.getLockdown);
router.put('/security/lockdown', validate(setLockdownSchema), securityController.adminSetLockdown);
router.get('/security/sessions', securityController.listSessions);
router.post('/security/sessions/revoke-all', securityController.revokeAllSessions);

export default router;
