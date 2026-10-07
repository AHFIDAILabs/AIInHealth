import { Routes, Route } from 'react-router-dom';
import { PageViewTracker } from './components/analytics/PageViewTracker';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { DelegateAuthProvider } from './contexts/DelegateAuthContext';
import { ReviewerAuthProvider } from './contexts/ReviewerAuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PortalLayout } from './components/layout/PortalLayout';
import { ReviewerPortalLayout } from './components/layout/ReviewerPortalLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RequireRole } from './routes/RequireRole';
import { RequireRootAdmin } from './routes/RequireRootAdmin';
import { PortalProtectedRoute } from './routes/PortalProtectedRoute';
import { ReviewerProtectedRoute } from './routes/ReviewerProtectedRoute';
import { Home } from './pages/public/Home';
import { NewHome } from './pages/public/NewHome';
import { HomeMain } from './pages/public/HomeMain';
import { About } from './pages/public/About';
import { Agenda } from './pages/public/Agenda';
import { Speakers } from './pages/public/Speakers';
import { Volunteers } from './pages/public/Volunteers';
import { InnovationShowcase } from './pages/public/InnovationShowcase';
import { InnovationShowcaseConfirmed } from './pages/public/InnovationShowcaseConfirmed';
import { AbstractShowcase } from './pages/public/AbstractShowcase';
import { ParticipantsOutcomes } from './pages/public/ParticipantsOutcomes';
import { PolicyTracker } from './pages/public/PolicyTracker';
import { Partners } from './pages/public/Partners';
import { Gallery } from './pages/public/Gallery';
import { AboutAhfid } from './pages/public/AboutAhfid';
import { Register } from './pages/public/Register';
import { PaymentCallback } from './pages/public/PaymentCallback';
import { PromoClaim } from './pages/public/PromoClaim';
import { AbstractSubmission } from './pages/public/AbstractSubmission';
import { ScholarshipApplication } from './pages/public/ScholarshipApplication';
import { TeamRegistration } from './pages/public/TeamRegistration';
import { WaiHealthBreakfast } from './pages/public/WaiHealthBreakfast';
import { WaiHealthRsvp } from './pages/public/WaiHealthRsvp';
import { RapporteurForm } from './pages/public/RapporteurForm';
import { KnowledgeProductView } from './pages/public/KnowledgeProductView';
import { Contact } from './pages/public/Contact';
import { Privacy } from './pages/public/Privacy';
import { Terms } from './pages/public/Terms';
import { NotFound } from './pages/public/NotFound';
import { LoginPage } from './pages/admin/LoginPage';
import { ForgotPasswordPage } from './pages/admin/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/admin/ResetPasswordPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { RegistrationsPage } from './pages/admin/RegistrationsPage';
import { ExhibitorsPage } from './pages/admin/ExhibitorsPage';
import { InnovatorsPage } from './pages/admin/InnovatorsPage';
import { AttendeesPage } from './pages/admin/AttendeesPage';
import { SpeakersPage } from './pages/admin/SpeakersPage';
import { SessionsPage } from './pages/admin/SessionsPage';
import { PartnersPage } from './pages/admin/PartnersPage';
import { InnovationsPage } from './pages/admin/InnovationsPage';
import { InnovationShowcaseEntriesPage } from './pages/admin/InnovationShowcaseEntriesPage';
import { ConfirmedAbstractsPage } from './pages/admin/ConfirmedAbstractsPage';
import { AccessCodesPage } from './pages/admin/AccessCodesPage';
import { WhatsAppConversationsPage } from './pages/admin/WhatsAppConversationsPage';
import { InquiriesPage } from './pages/admin/InquiriesPage';
import { MessagesPage } from './pages/admin/MessagesPage';
import { NewsletterPage } from './pages/admin/NewsletterPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { UsersPage } from './pages/admin/UsersPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { PaymentsPage } from './pages/admin/PaymentsPage';
import { CheckInPage } from './pages/admin/CheckInPage';
import { ReconciliationsPage } from './pages/admin/ReconciliationsPage';
import { AbstractsPage } from './pages/admin/AbstractsPage';
import { MediaPage } from './pages/admin/MediaPage';
import { KnowledgeBasePage } from './pages/admin/KnowledgeBasePage';
import { PolicyTrackerPage } from './pages/admin/PolicyTrackerPage';
import { TranslationsQueuePage } from './pages/admin/TranslationsQueuePage';
import { EventTeamPage } from './pages/admin/EventTeamPage';
import { SecurityPage } from './pages/admin/SecurityPage';
import { PortalTokensPage } from './pages/admin/PortalTokensPage';
import { ScholarshipApplicationsPage } from './pages/admin/ScholarshipApplicationsPage';
import { WaiHealthPage } from './pages/admin/WaiHealthPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { IntegrationsPage } from './pages/admin/IntegrationsPage';
import { RolesPermissionsPage } from './pages/admin/RolesPermissionsPage';
import { RapporteurPage } from './pages/admin/RapporteurPage';
import { KnowledgeProductsPage } from './pages/admin/KnowledgeProductsPage';
import { PortalLogin } from './pages/portal/PortalLogin';
import { PortalHome } from './pages/portal/PortalHome';
import { PortalDirectory } from './pages/portal/PortalDirectory';
import { PortalMeetings } from './pages/portal/PortalMeetings';
import { ReviewerLogin } from './pages/reviewer/ReviewerLogin';
import { ReviewerDashboard } from './pages/reviewer/ReviewerDashboard';
import { ReviewerScoreForm } from './pages/reviewer/ReviewerScoreForm';

// Areas not named as their own staff role — folded into Admin (+ super_admin).
const ADMIN_ONLY_ROLES = ['super_admin', 'admin'] as const;
const REGISTRATION_ROLES = ['super_admin', 'admin', 'registrations_officer'] as const;
const ABSTRACT_ROLES = ['super_admin', 'admin', 'abstract_lead'] as const;
const RAPPORTEUR_ROLES = ['super_admin', 'admin', 'rapporteur_lead'] as const;

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
        <DelegateAuthProvider>
        <ReviewerAuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomeMain />} />
            <Route path="/classic" element={<Home />} />
            <Route path="/home-v2" element={<NewHome />} />
            <Route path="/about" element={<About />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/speakers" element={<Speakers />} />
            <Route path="/volunteers" element={<Volunteers />} />
            <Route path="/innovation-showcase" element={<InnovationShowcase />} />
            <Route path="/innovation-showcase/confirmed" element={<InnovationShowcaseConfirmed />} />
            <Route path="/abstracts/confirmed" element={<AbstractShowcase />} />
            <Route path="/participants-outcomes" element={<ParticipantsOutcomes />} />
            <Route path="/policy-tracker" element={<PolicyTracker />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about-ahfid" element={<AboutAhfid />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/payment-callback" element={<PaymentCallback />} />
            <Route path="/promo/claim" element={<PromoClaim />} />
            <Route path="/abstracts/submit" element={<AbstractSubmission />} />
            <Route path="/sponsored-delegates" element={<ScholarshipApplication />} />
            <Route path="/team/register" element={<TeamRegistration />} />
            <Route path="/wai-health-breakfast" element={<WaiHealthBreakfast />} />
            <Route path="/wai-health-breakfast/rsvp/:token" element={<WaiHealthRsvp />} />
            <Route path="/rapporteur/:token" element={<RapporteurForm />} />
            <Route path="/knowledge-products/:type" element={<KnowledgeProductView />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<DashboardPage />} />

              {/* innovator_lead/exhibitor_lead are admitted here too — RegistrationsPage
                  self-scopes to their own registration type (and the backend enforces
                  the same scoping). */}
              <Route element={<RequireRole roles={['super_admin', 'admin', 'registrations_officer', 'viewer', 'innovator_lead', 'exhibitor_lead']} />}>
                <Route path="/admin/registrations" element={<RegistrationsPage />} />
              </Route>

              <Route element={<RequireRole roles={[...REGISTRATION_ROLES]} />}>
                <Route path="/admin/scholarship-applications" element={<ScholarshipApplicationsPage />} />
                <Route path="/admin/check-in" element={<CheckInPage />} />
              </Route>

              {/* Deliberately narrowed off registrations_officer — see admin.routes.ts's
                  matching routes. */}
              <Route element={<RequireRole roles={[...ADMIN_ONLY_ROLES]} />}>
                <Route path="/admin/access-codes" element={<AccessCodesPage />} />
                <Route path="/admin/reconciliations" element={<ReconciliationsPage />} />
                <Route path="/admin/portal-tokens" element={<PortalTokensPage />} />
              </Route>

              {/* wai_health_lead owns this area fully; registrations_officer gets
                  view-only access (admin.routes.ts enforces the write-action split). */}
              <Route element={<RequireRole roles={[...ADMIN_ONLY_ROLES, 'wai_health_lead', 'registrations_officer']} />}>
                <Route path="/admin/wai-health" element={<WaiHealthPage />} />
              </Route>

              <Route element={<RequireRole roles={[...ADMIN_ONLY_ROLES, 'viewer']} />}>
                <Route path="/admin/payments" element={<PaymentsPage />} />
              </Route>

              <Route element={<RequireRole roles={[...REGISTRATION_ROLES, 'viewer']} />}>
                <Route path="/admin/attendees" element={<AttendeesPage />} />
              </Route>

              <Route element={<RequireRole roles={[...REGISTRATION_ROLES, 'viewer', 'exhibitor_lead']} />}>
                <Route path="/admin/exhibitors" element={<ExhibitorsPage />} />
              </Route>

              <Route element={<RequireRole roles={[...REGISTRATION_ROLES, 'viewer', 'innovator_lead']} />}>
                <Route path="/admin/innovators" element={<InnovatorsPage />} />
              </Route>

              <Route element={<RequireRole roles={[...ABSTRACT_ROLES]} />}>
                <Route path="/admin/abstracts" element={<AbstractsPage />} />
                <Route path="/admin/confirmed-abstracts" element={<ConfirmedAbstractsPage />} />
              </Route>

              <Route element={<RequireRole roles={[...RAPPORTEUR_ROLES]} />}>
                <Route path="/admin/rapporteur" element={<RapporteurPage />} />
              </Route>

              <Route element={<RequireRole roles={[...ADMIN_ONLY_ROLES]} />}>
                <Route path="/admin/speakers" element={<SpeakersPage />} />
                <Route path="/admin/sessions" element={<SessionsPage />} />
                <Route path="/admin/innovations" element={<InnovationsPage />} />
                <Route path="/admin/innovation-showcase-entries" element={<InnovationShowcaseEntriesPage />} />
                <Route path="/admin/partners" element={<PartnersPage />} />
                <Route path="/admin/inquiries" element={<InquiriesPage />} />
                <Route path="/admin/messages" element={<MessagesPage />} />
                <Route path="/admin/newsletter" element={<NewsletterPage />} />
                <Route path="/admin/media" element={<MediaPage />} />
                <Route path="/admin/knowledge-base" element={<KnowledgeBasePage />} />
                <Route path="/admin/policy-tracker" element={<PolicyTrackerPage />} />
                <Route path="/admin/translations" element={<TranslationsQueuePage />} />
                <Route path="/admin/knowledge-products" element={<KnowledgeProductsPage />} />
                <Route path="/admin/whatsapp" element={<WhatsAppConversationsPage />} />
              </Route>

              <Route
                element={
                  <RequireRole
                    roles={[
                      'super_admin',
                      'admin',
                      'registrations_officer',
                      'innovator_lead',
                      'exhibitor_lead',
                      'abstract_lead',
                      'rapporteur_lead',
                      'wai_health_lead',
                      'viewer',
                    ]}
                  />
                }
              >
                <Route path="/admin/analytics" element={<AnalyticsPage />} />
              </Route>

              <Route element={<RequireRole roles={['super_admin', 'admin', 'viewer']} />}>
                <Route path="/admin/audit-log" element={<AuditLogPage />} />
              </Route>

              <Route element={<RequireRole roles={['super_admin']} />}>
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/event-team" element={<EventTeamPage />} />
                <Route path="/admin/integrations" element={<IntegrationsPage />} />
                <Route path="/admin/roles-permissions" element={<RolesPermissionsPage />} />
              </Route>

              {/* Identity-gated, not role-gated — see RequireRootAdmin.tsx. */}
              <Route element={<RequireRootAdmin />}>
                <Route path="/admin/security" element={<SecurityPage />} />
              </Route>

              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Delegate portal — a separate route tree/layout from the public marketing
              site and admin dashboard, but declared in this same <Routes> (not a
              sibling <Routes>) so its static paths correctly outrank the public
              block's catch-all `*` NotFound route under ranked route matching. */}
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route element={<PortalProtectedRoute />}>
            <Route element={<PortalLayout />}>
              <Route path="/portal" element={<PortalHome />} />
              <Route path="/portal/directory" element={<PortalDirectory />} />
              <Route path="/portal/meetings" element={<PortalMeetings />} />
            </Route>
          </Route>

          {/* Reviewer portal — same pattern as the delegate portal above, its
              own separate auth/layout tree for external abstract reviewers. */}
          <Route path="/review/login" element={<ReviewerLogin />} />
          <Route element={<ReviewerProtectedRoute />}>
            <Route element={<ReviewerPortalLayout />}>
              <Route path="/review" element={<ReviewerDashboard />} />
              <Route path="/review/abstracts/:id" element={<ReviewerScoreForm />} />
            </Route>
          </Route>
        </Routes>
        <PageViewTracker />
        </ReviewerAuthProvider>
        </DelegateAuthProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
