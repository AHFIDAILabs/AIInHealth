import { Routes, Route } from 'react-router-dom';
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
import { ParticipantsOutcomes } from './pages/public/ParticipantsOutcomes';
import { Partners } from './pages/public/Partners';
import { Gallery } from './pages/public/Gallery';
import { AboutAhfid } from './pages/public/AboutAhfid';
import { Register } from './pages/public/Register';
import { PaymentCallback } from './pages/public/PaymentCallback';
import { AbstractSubmission } from './pages/public/AbstractSubmission';
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
import { AttendeesPage } from './pages/admin/AttendeesPage';
import { SpeakersPage } from './pages/admin/SpeakersPage';
import { SessionsPage } from './pages/admin/SessionsPage';
import { PartnersPage } from './pages/admin/PartnersPage';
import { InnovationsPage } from './pages/admin/InnovationsPage';
import { AccessCodesPage } from './pages/admin/AccessCodesPage';
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
import { EventTeamPage } from './pages/admin/EventTeamPage';
import { PortalTokensPage } from './pages/admin/PortalTokensPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { IntegrationsPage } from './pages/admin/IntegrationsPage';
import { RolesPermissionsPage } from './pages/admin/RolesPermissionsPage';
import { PortalLogin } from './pages/portal/PortalLogin';
import { PortalHome } from './pages/portal/PortalHome';
import { PortalDirectory } from './pages/portal/PortalDirectory';
import { PortalMeetings } from './pages/portal/PortalMeetings';
import { ReviewerLogin } from './pages/reviewer/ReviewerLogin';
import { ReviewerDashboard } from './pages/reviewer/ReviewerDashboard';
import { ReviewerScoreForm } from './pages/reviewer/ReviewerScoreForm';

const CONTENT_ROLES = ['super_admin', 'content_editor'] as const;
const REGISTRATION_ROLES = ['super_admin', 'registrations_officer'] as const;

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
            <Route path="/participants-outcomes" element={<ParticipantsOutcomes />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about-ahfid" element={<AboutAhfid />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/payment-callback" element={<PaymentCallback />} />
            <Route path="/abstracts/submit" element={<AbstractSubmission />} />
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

              {/* content_editor is admitted here too — RegistrationsPage/AccessCodesPage each
                  self-scope to volunteer-only data for that role (and the backend enforces
                  the same scoping), matching how content_editor's "Volunteers" sidebar
                  entry actually links here. */}
              <Route element={<RequireRole roles={['super_admin', 'registrations_officer', 'viewer', 'content_editor']} />}>
                <Route path="/admin/registrations" element={<RegistrationsPage />} />
              </Route>

              <Route element={<RequireRole roles={[...REGISTRATION_ROLES, 'content_editor']} />}>
                <Route path="/admin/access-codes" element={<AccessCodesPage />} />
              </Route>

              <Route element={<RequireRole roles={[...REGISTRATION_ROLES]} />}>
                <Route path="/admin/check-in" element={<CheckInPage />} />
                <Route path="/admin/reconciliations" element={<ReconciliationsPage />} />
                <Route path="/admin/portal-tokens" element={<PortalTokensPage />} />
              </Route>

              <Route element={<RequireRole roles={[...REGISTRATION_ROLES, 'viewer']} />}>
                <Route path="/admin/payments" element={<PaymentsPage />} />
                <Route path="/admin/exhibitors" element={<ExhibitorsPage />} />
                <Route path="/admin/attendees" element={<AttendeesPage />} />
              </Route>

              <Route element={<RequireRole roles={[...CONTENT_ROLES]} />}>
                <Route path="/admin/speakers" element={<SpeakersPage />} />
                <Route path="/admin/sessions" element={<SessionsPage />} />
                <Route path="/admin/innovations" element={<InnovationsPage />} />
                <Route path="/admin/partners" element={<PartnersPage />} />
                <Route path="/admin/inquiries" element={<InquiriesPage />} />
                <Route path="/admin/messages" element={<MessagesPage />} />
                <Route path="/admin/newsletter" element={<NewsletterPage />} />
                <Route path="/admin/abstracts" element={<AbstractsPage />} />
                <Route path="/admin/media" element={<MediaPage />} />
              </Route>

              <Route element={<RequireRole roles={['super_admin', 'content_editor', 'registrations_officer', 'viewer']} />}>
                <Route path="/admin/analytics" element={<AnalyticsPage />} />
              </Route>

              <Route element={<RequireRole roles={['super_admin', 'viewer']} />}>
                <Route path="/admin/audit-log" element={<AuditLogPage />} />
              </Route>

              <Route element={<RequireRole roles={['super_admin']} />}>
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/event-team" element={<EventTeamPage />} />
                <Route path="/admin/integrations" element={<IntegrationsPage />} />
                <Route path="/admin/roles-permissions" element={<RolesPermissionsPage />} />
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
        </ReviewerAuthProvider>
        </DelegateAuthProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
