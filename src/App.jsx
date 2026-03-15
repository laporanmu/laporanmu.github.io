import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarProvider } from './context/SidebarContext'


// ─── Lazy-loaded Pages ────────────────────────────────────────────────────────
// Public
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ParentCheckPage = lazy(() => import('./pages/auth/ParentCheckPage'))

// Core
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const RaportPage = lazy(() => import('./pages/RaportPage'))
const PoinPage = lazy(() => import('./pages/PoinPage'))
const AbsensiPage = lazy(() => import('./pages/AbsensiPage'))
const GatePage = lazy(() => import('./pages/GatePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// Admin-only
const UserPage = lazy(() => import('./pages/admin/UserPage'))
const LogsPage = lazy(() => import('./pages/admin/LogsPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage'))

// Master Data
const StudentsPage = lazy(() => import('./pages/master/StudentsPage'))
const TeachersPage = lazy(() => import('./pages/master/TeachersPage'))
const ClassesPage = lazy(() => import('./pages/master/ClassesPage'))
const ViolationsTypePage = lazy(() => import('./pages/master/ViolationsPage'))
const AcademicYearsPage = lazy(() => import('./pages/master/AcademicYearsPage'))

// ─── Role Hierarchy ───────────────────────────────────────────────────────────
// developer > admin > guru = satpam > viewer
const DEV_ONLY = ['developer']
const DEV_ADMIN = ['developer', 'admin']
const DEV_ADMIN_GATE = ['developer', 'admin', 'satpam']
const ALL_STAFF = ['developer', 'admin', 'guru', 'satpam']

const ROUTE_ALIASES = [
  // English ↔ Indonesian aliases
  { from: '/absence', to: '/absensi' },
  { from: '/attendance', to: '/absensi' },
  { from: '/portal', to: '/gate' },
  { from: '/report', to: '/raport' },
  { from: '/reports', to: '/raports' },
  { from: '/points', to: '/poin' },

  // Master data aliases
  { from: '/master/student', to: '/master/students' },
  { from: '/master/teacher', to: '/master/teachers' },
  { from: '/master/class', to: '/master/classes' },

  // Admin data aliases
  { from: '/admin/log', to: '/admin/logs' },
  { from: '/admin/user', to: '/admin/users' },
  { from: '/admin/setting', to: '/admin/settings' },
]

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-muted)] text-sm font-medium">Memuat halaman...</p>
      </div>
    </div>
  )
}

// ─── Auth Guards ──────────────────────────────────────────────────────────────

/** Blocks unauthenticated users. */
function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

/** Blocks authenticated users from visiting public pages (e.g. /login). */
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (user) return <Navigate to="/dashboard" replace />

  return children
}

/**
 * Role-based guard — wraps a single page element.
 * Redirects to /dashboard if the user's role is not in `allowedRoles`.
 *
 * Usage:
 *   <Route path="/user" element={<RoleRoute roles={ADMIN_ROLES}><UserPage /></RoleRoute>} />
 */
function RoleRoute({ children, roles = [] }) {
  const { profile } = useAuth()

  if (!roles.length) return children

  const role = profile?.role?.toLowerCase()
  if (!role || !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// ─── 404 Page ─────────────────────────────────────────────────────────────────
function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="text-center max-w-sm">
        <div className="text-[80px] font-black font-heading leading-none gradient-text mb-2 select-none">
          404
        </div>
        <h2 className="text-xl font-black text-[var(--color-text)] mb-2">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
          URL yang kamu akses tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
            ← Kembali
          </button>
          <a href="/dashboard" className="btn btn-primary h-10 px-5 text-sm">
            Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>

        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/check" element={<ParentCheckPage />} />
        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        {/* ── Protected ── */}
        <Route element={<ProtectedRoute />}>

          {/* Core — any authenticated user */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/raport" element={<RaportPage />} />
          <Route path="/poin" element={<PoinPage />} />
          <Route path="/absensi" element={<AbsensiPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Role-restricted */}
          <Route path="/gate" element={<RoleRoute roles={DEV_ADMIN_GATE}><GatePage /></RoleRoute>} />
          <Route path="/admin/logs" element={<RoleRoute roles={DEV_ADMIN}><LogsPage /></RoleRoute>} />
          <Route path="/admin/users" element={<RoleRoute roles={DEV_ADMIN}><UserPage /></RoleRoute>} />
          <Route path="/admin/settings" element={<RoleRoute roles={DEV_ADMIN}><AdminSettingsPage /></RoleRoute>} />

          {/* Master Data — developer & admin */}
          <Route path="/master/students" element={<RoleRoute roles={DEV_ADMIN}><StudentsPage /></RoleRoute>} />
          <Route path="/master/teachers" element={<RoleRoute roles={DEV_ADMIN}><TeachersPage /></RoleRoute>} />
          <Route path="/master/classes" element={<RoleRoute roles={DEV_ADMIN}><ClassesPage /></RoleRoute>} />
          <Route path="/master/violations" element={<RoleRoute roles={DEV_ADMIN}><ViolationsTypePage /></RoleRoute>} />
          <Route path="/master/academic-years" element={<RoleRoute roles={DEV_ADMIN}><AcademicYearsPage /></RoleRoute>} />

          {/* Route Aliases */}
          {ROUTE_ALIASES.map(({ from, to }) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </Suspense>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────
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