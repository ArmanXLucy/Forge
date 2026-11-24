import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/AuthContext'
import { RequireAuth, PublicOnly, FullScreenLoader } from './components/layout/RouteGuards'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { RequireAdmin, RequireAdminPermission } from './components/layout/AdminRouteGuard'
import { AdminAccessProvider } from './features/admin/useAdminAccess'
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/Login'))
const SignupPage = lazy(() => import('./pages/Signup'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'))
const OnboardingPage = lazy(() => import('./pages/Onboarding'))
const OverviewPage = lazy(() => import('./pages/Dashboard/OverviewPage'))
const MissionsPage = lazy(() => import('./pages/Dashboard/MissionsPage'))
const MissionDetailPage = lazy(() => import('./pages/Dashboard/MissionDetailPage'))
const WorkoutsPage = lazy(() => import('./pages/Dashboard/WorkoutsPage'))
const WorkoutRecommendationPage = lazy(() => import('./pages/Dashboard/WorkoutRecommendationPage'))
const NutritionPage = lazy(() => import('./pages/Dashboard/NutritionPage'))
const ProgressPage = lazy(() => import('./pages/Dashboard/ProgressPage'))
const LifestylePage = lazy(() => import('./pages/Dashboard/LifestylePage'))
const AICoachPage = lazy(() => import('./pages/Dashboard/AICoachPage'))
const SettingsPage = lazy(() => import('./pages/Dashboard/SettingsPage'))
const HelpDeskPage = lazy(() => import('./pages/Dashboard/HelpDesk/HelpDeskPage'))
const HelpDeskTicketPage = lazy(() => import('./pages/Dashboard/HelpDesk/HelpDeskTicketPage'))
const AdminLoginPage = lazy(() => import('./pages/Admin/AdminLoginPage'))
const AdminOverviewPage = lazy(() => import('./pages/Admin/OverviewPage'))
const AdminUsersPage = lazy(() => import('./pages/Admin/UserManagementPage'))
const AdminRolesPage = lazy(() => import('./pages/Admin/RolesPage'))
const AdminWorkoutsPage = lazy(() => import('./pages/Admin/WorkoutsPage'))
const AdminExercisesPage = lazy(() => import('./pages/Admin/ExercisesPage'))
const AdminMissionsPage = lazy(() => import('./pages/Admin/MissionsPage'))
const AdminNutritionPage = lazy(() => import('./pages/Admin/NutritionPage'))
const AdminHelpDeskPage = lazy(() => import('./pages/Admin/HelpDeskPage'))
const AdminTicketPage = lazy(() => import('./pages/Admin/HelpDeskTicketPage'))
const AdminSupportAnalyticsPage = lazy(() => import('./pages/Admin/SupportAnalyticsPage'))
const AdminAIMonitoringPage = lazy(() => import('./pages/Admin/AIMonitoringPage'))
const AdminAICoachPage = lazy(() => import('./pages/Admin/AICoachMonitoringPage'))
const AdminAIErrorLogPage = lazy(() => import('./pages/Admin/AIErrorLogPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/Admin/AnalyticsPage'))
const AdminMediaPage = lazy(() => import('./pages/Admin/MediaPage'))
const AdminNotificationsPage = lazy(() => import('./pages/Admin/NotificationsPage'))
const AdminAnnouncementsPage = lazy(() => import('./pages/Admin/AnnouncementsPage'))
const AdminActivityPage = lazy(() => import('./pages/Admin/ActivityLogPage'))
const AdminSettingsPage = lazy(() => import('./pages/Admin/SettingsPage'))
const AdminProfilePage = lazy(() => import('./pages/Admin/ProfilePage'))
const PrivacyPage = lazy(() => import('./pages/Legal/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/Legal/TermsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFound'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const timeout = window.setTimeout(() => {
        const element = document.getElementById(hash.replace('#', ''))
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
        }
      }, 40)
      return () => window.clearTimeout(timeout)
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    return undefined
  }, [pathname, hash])

  return null
}

function DashboardIndexRedirect() {
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ScrollToTop />
        <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnly>
                <SignupPage />
              </PublicOnly>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnly>
                <ForgotPasswordPage />
              </PublicOnly>
            }
          />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="missions" element={<MissionsPage />} />
            <Route path="missions/:missionId" element={<MissionDetailPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="workout-recommendation" element={<WorkoutRecommendationPage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="lifestyle" element={<LifestylePage />} />
            <Route path="ai-coach" element={<AICoachPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help-desk" element={<HelpDeskPage />} />
            <Route path="help-desk/:ticketId" element={<HelpDeskTicketPage />} />
            <Route path="*" element={<DashboardIndexRedirect />} />
          </Route>

          <Route path="/admin/login" element={<AdminAccessProvider><AdminLoginPage /></AdminAccessProvider>} />

          <Route
            path="/admin"
            element={
              <AdminAccessProvider>
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              </AdminAccessProvider>
            }
          >
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="users" element={<RequireAdminPermission permission="manage_users"><AdminUsersPage /></RequireAdminPermission>} />
            <Route path="roles" element={<RequireAdminPermission permission="manage_roles"><AdminRolesPage /></RequireAdminPermission>} />
            <Route path="workouts" element={<RequireAdminPermission permission="manage_content"><AdminWorkoutsPage /></RequireAdminPermission>} />
            <Route path="exercises" element={<RequireAdminPermission permission="manage_content"><AdminExercisesPage /></RequireAdminPermission>} />
            <Route path="missions" element={<RequireAdminPermission permission="manage_content"><AdminMissionsPage /></RequireAdminPermission>} />
            <Route path="nutrition" element={<RequireAdminPermission permission="manage_content"><AdminNutritionPage /></RequireAdminPermission>} />
            <Route path="help-desk" element={<RequireAdminPermission permission="manage_support"><AdminHelpDeskPage /></RequireAdminPermission>} />
            <Route path="help-desk/:ticketId" element={<RequireAdminPermission permission="manage_support"><AdminTicketPage /></RequireAdminPermission>} />
            <Route path="support-analytics" element={<RequireAdminPermission permission="manage_support"><AdminSupportAnalyticsPage /></RequireAdminPermission>} />
            <Route path="ai-monitoring" element={<RequireAdminPermission permission="manage_ai"><AdminAIMonitoringPage /></RequireAdminPermission>} />
            <Route path="ai-coach-monitoring" element={<RequireAdminPermission permission="manage_ai"><AdminAICoachPage /></RequireAdminPermission>} />
            <Route path="ai-errors" element={<RequireAdminPermission permission="manage_ai"><AdminAIErrorLogPage /></RequireAdminPermission>} />
            <Route path="analytics" element={<RequireAdminPermission permission="view_analytics"><AdminAnalyticsPage /></RequireAdminPermission>} />
            <Route path="media" element={<RequireAdminPermission permission="manage_platform"><AdminMediaPage /></RequireAdminPermission>} />
            <Route path="notifications" element={<RequireAdminPermission permission="manage_platform"><AdminNotificationsPage /></RequireAdminPermission>} />
            <Route path="announcements" element={<RequireAdminPermission permission="manage_platform"><AdminAnnouncementsPage /></RequireAdminPermission>} />
            <Route path="activity" element={<RequireAdminPermission permission="view_analytics"><AdminActivityPage /></RequireAdminPermission>} />
            <Route path="settings" element={<RequireAdminPermission permission="manage_platform"><AdminSettingsPage /></RequireAdminPermission>} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="*" element={<Navigate to="/admin/overview" replace />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: '"DM Sans Variable", system-ui, sans-serif', fontSize: '13px' },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
