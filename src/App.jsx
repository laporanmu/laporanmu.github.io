import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarProvider } from './context/SidebarContext'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import ParentCheckPage from './pages/auth/ParentCheckPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import DeveloperPage from './pages/DeveloperPage'

// Master Data Pages
import StudentsPage from './pages/master/StudentsPage'
import TeachersPage from './pages/master/TeachersPage'
import ClassesPage from './pages/master/ClassesPage'
import ViolationsPage from './pages/master/ViolationsPage'
import AcademicYearsPage from './pages/master/AcademicYearsPage'

// Protected Route Wrapper
function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// Public Route (redirect if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/check" element={<ParentCheckPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/developer" element={<DeveloperPage />} />

        {/* Master Data */}
        <Route path="/master/students" element={<StudentsPage />} />
        <Route path="/master/teachers" element={<TeachersPage />} />
        <Route path="/master/classes" element={<ClassesPage />} />
        <Route path="/master/violations" element={<ViolationsPage />} />
        <Route path="/master/academic-years" element={<AcademicYearsPage />} />
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
            <div className="text-center">
              <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
              <p className="text-[var(--color-text-muted)] mb-6">Halaman tidak ditemukan</p>
              <a href="/" className="btn btn-primary">Kembali ke Beranda</a>
            </div>
          </div>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </SidebarProvider>
  )
}
