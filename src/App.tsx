import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/AuthContext'
import { RequireAuth, PublicOnly, FullScreenLoader } from './components/layout/RouteGuards'
import { DashboardLayout } from './layouts/DashboardLayout'
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/Login'))
const SignupPage = lazy(() => import('./pages/Signup'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'))
const OnboardingPage = lazy(() => import('./pages/Onboarding'))
const OverviewPage = lazy(() => import('./pages/Dashboard/OverviewPage'))
const MissionsPage = lazy(() => import('./pages/Dashboard/MissionsPage'))
const MissionDetailPage = lazy(() => import('./pages/Dashboard/MissionDetailPage'))
const WorkoutsPage = lazy(() => import('./pages/Dashboard/WorkoutsPage'))
const NutritionPage = lazy(() => import('./pages/Dashboard/NutritionPage'))
const ProgressPage = lazy(() => import('./pages/Dashboard/ProgressPage'))
const LifestylePage = lazy(() => import('./pages/Dashboard/LifestylePage'))
const AICoachPage = lazy(() => import('./pages/Dashboard/AICoachPage'))
const SettingsPage = lazy(() => import('./pages/Dashboard/SettingsPage'))
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
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="lifestyle" element={<LifestylePage />} />
            <Route path="ai-coach" element={<AICoachPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<DashboardIndexRedirect />} />
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
