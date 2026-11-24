import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminGate } from '@/components/AdminGate';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPageSkeleton } from '@/components/skeletons/LoginPageSkeleton';
import { getAuthToken } from '@/lib/api';
import { isAuthBypassed } from '@/lib/authBypass';

const HomePage = lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage })),
);
const HubPage = lazy(() => import('@/pages/HubPage').then((m) => ({ default: m.HubPage })));
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const ChangePasswordPage = lazy(() =>
  import('@/pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const PlaceholderPage = lazy(() =>
  import('@/pages/PlaceholderPage').then((m) => ({ default: m.PlaceholderPage })),
);
const OrganizationsPage = lazy(() =>
  import('@/pages/organization/OrganizationsPage').then((m) => ({
    default: m.OrganizationsPage,
  })),
);
const OrganizationEditorPage = lazy(() =>
  import('@/pages/organization/OrganizationEditorPage').then((m) => ({
    default: m.OrganizationEditorPage,
  })),
);
const SponsorsPage = lazy(() =>
  import('@/pages/organization/SponsorsPage').then((m) => ({ default: m.SponsorsPage })),
);
const SponsorEditorPage = lazy(() =>
  import('@/pages/organization/SponsorEditorPage').then((m) => ({
    default: m.SponsorEditorPage,
  })),
);
const RecordsPage = lazy(() =>
  import('@/pages/organization/RecordsPage').then((m) => ({ default: m.RecordsPage })),
);
const OrphanProfilePage = lazy(() =>
  import('@/pages/organization/OrphanProfilePage').then((m) => ({
    default: m.OrphanProfilePage,
  })),
);
const KafalatReportPage = lazy(() =>
  import('@/pages/organization/KafalatReportPage').then((m) => ({
    default: m.KafalatReportPage,
  })),
);
const FopSponsorsPage = lazy(() =>
  import('@/pages/fop/FopSponsorsPage').then((m) => ({ default: m.FopSponsorsPage })),
);
const FopSponsorProfilePage = lazy(() =>
  import('@/pages/fop/FopSponsorProfilePage').then((m) => ({ default: m.FopSponsorProfilePage })),
);
const SendReminderPage = lazy(() =>
  import('@/pages/fop/SendReminderPage').then((m) => ({ default: m.SendReminderPage })),
);
const DonationSummaryPage = lazy(() =>
  import('@/pages/fop/DonationSummaryPage').then((m) => ({ default: m.DonationSummaryPage })),
);
const OnlineDonationsPage = lazy(() =>
  import('@/pages/fop/OnlineDonationsPage').then((m) => ({ default: m.OnlineDonationsPage })),
);
const BankDetailsPage = lazy(() =>
  import('@/pages/fop/BankDetailsPage').then((m) => ({ default: m.BankDetailsPage })),
);
const EventSubmissionsPage = lazy(() =>
  import('@/pages/fop/EventSubmissionsPage').then((m) => ({ default: m.EventSubmissionsPage })),
);
const FeeCollectionPage = lazy(() =>
  import('@/pages/fop/FeeCollectionPage').then((m) => ({ default: m.FeeCollectionPage })),
);
const InvoiceStatementPage = lazy(() =>
  import('@/pages/InvoiceStatementPage').then((m) => ({ default: m.InvoiceStatementPage })),
);
const OrphanEditorPage = lazy(() =>
  import('@/pages/organization/OrphanEditorPage').then((m) => ({
    default: m.OrphanEditorPage,
  })),
);

function LoginRoute() {
  if (getAuthToken() || isAuthBypassed()) {
    return <Navigate to="/" replace />;
  }
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPage />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/sign-up" element={<Navigate to="/login" replace />} />
        <Route
          path="/invoice/:token"
          element={
            <Suspense fallback={null}>
              <InvoiceStatementPage />
            </Suspense>
          }
        />
        <Route path="/forgot-password" element={<Navigate to="/login" replace />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route
            path="sponsor"
            element={
              <PlaceholderPage
                heading="Sponsor"
                body="Sponsorship flows will live here — aligned with the mobile sponsor experience."
              />
            }
          />
          <Route
            path="payments"
            element={
              <PlaceholderPage
                heading="Payments"
                body="Payment history and pending transfers — matching the mobile Payments tab."
              />
            }
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/change-password" element={<ChangePasswordPage />} />
          <Route
            path="chat"
            element={
              <PlaceholderPage heading="Chat" body="Messaging — aligned with the mobile Chat tab." />
            }
          />
          <Route
            path="reports"
            element={
              <PlaceholderPage heading="Reports" body="Reports and exports." />
            }
          />
          <Route path="hub/:slug" element={<HubPage />} />

          <Route element={<AdminGate />}>
            <Route path="organization/organizations" element={<OrganizationsPage />} />
            <Route path="organization/organizations/new" element={<OrganizationEditorPage />} />
            <Route path="organization/organizations/:id/edit" element={<OrganizationEditorPage />} />

            <Route path="organization/sponsors" element={<SponsorsPage />} />
            <Route path="organization/sponsors/new" element={<SponsorEditorPage />} />
            <Route path="organization/sponsors/:id/edit" element={<SponsorEditorPage />} />

            <Route
              path="organization/orphans"
              element={<RecordsPage kind="orphan" title="Orphans" />}
            />
            <Route path="organization/orphans/new" element={<OrphanEditorPage kind="orphan" />} />
            <Route
              path="organization/orphans/:id/edit"
              element={<OrphanEditorPage kind="orphan" />}
            />
            <Route
              path="organization/orphans/:id"
              element={<OrphanProfilePage kind="orphan" />}
            />
            <Route path="organization/kafalat" element={<KafalatReportPage />} />

            <Route path="fop/sponsors" element={<FopSponsorsPage />} />
            <Route path="fop/sponsors/:code" element={<FopSponsorProfilePage />} />
            <Route path="fop/fee-collection" element={<FeeCollectionPage />} />
            <Route path="fop/send-reminder" element={<SendReminderPage />} />
            <Route path="fop/donation-summary" element={<DonationSummaryPage />} />
            <Route path="fop/online-donations" element={<OnlineDonationsPage />} />
            <Route path="fop/banks" element={<BankDetailsPage />} />
            <Route path="fop/events" element={<EventSubmissionsPage />} />

            <Route
              path="organization/students"
              element={<RecordsPage kind="student" title="Students" />}
            />
            <Route path="organization/students/new" element={<OrphanEditorPage kind="student" />} />
            <Route
              path="organization/students/:id/edit"
              element={<OrphanEditorPage kind="student" />}
            />
            <Route
              path="organization/students/:id"
              element={<OrphanProfilePage kind="student" />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
