import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { FeatureFlagsProvider, useFeatureFlags } from './context/FeatureFlagsContext'
import { useTheme } from './context/ThemeContext'
import DashboardLayout from './components/layout/DashboardLayout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faSpinner, faTools, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary'

// ─── Lazy-loaded Pages ────────────────────────────────────────────────────────
// Public
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ParentCheckPage = lazy(() => import('./pages/auth/ParentCheckPage'))
const InformationPage = lazy(() => import('./pages/InformationPage'))

// Core
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const RaportPage = lazy(() => import('./pages/reports/RaportPage'))
const BehaviorPage = lazy(() => import('./pages/reports/BehaviorPage'))
const AttendancePage = lazy(() => import('./pages/reports/AttendancePage'))
const GatePage = lazy(() => import('./pages/reports/GatePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// Admin-only
const UserPage = lazy(() => import('./pages/admin/UserPage'))
const LogsPage = lazy(() => import('./pages/admin/LogsPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const DatabasePage = lazy(() => import('./pages/admin/DatabasePage'))
const StoragePage = lazy(() => import('./pages/admin/StoragePage'))
const TasksPage = lazy(() => import('./pages/admin/TasksPage'))
const PlaygroundPage = lazy(() => import('./pages/admin/PlaygroundPage'))
const AdminNewsPage = lazy(() => import('./pages/admin/NewsPage'))

// Master Data
const StudentsPage = lazy(() => import('./pages/master/StudentsPage'))
const TeachersPage = lazy(() => import('./pages/master/TeachersPage'))
const ClassesPage = lazy(() => import('./pages/master/ClassesPage'))
const ViolationsTypePage = lazy(() => import('./pages/master/PoinPage'))
const AcademicYearsPage = lazy(() => import('./pages/master/AcademicYearsPage'))

// ─── Role Hierarchy ───────────────────────────────────────────────────────────
// developer > admin > guru = satpam > viewer
const DEV_ONLY = ['developer']
const DEV_ADMIN = ['developer', 'admin']
const DEV_ADMIN_TEACHER = ['developer', 'admin', 'guru']
const DEV_ADMIN_GATE = ['developer', 'admin', 'satpam']
const ALL_STAFF = ['developer', 'admin', 'guru', 'satpam']

const ROUTE_ALIASES = [
  // English ↔ Indonesian aliases
  { from: '/absence', to: '/absensi' },
  { from: '/attendance', to: '/absensi' },
  { from: '/portal', to: '/gate' },
  { from: '/report', to: '/raport' },
  { from: '/reports', to: '/raports' },
  { from: '/points', to: '/perilaku' },

  // Master data aliases
  { from: '/master/student', to: '/master/students' },
  { from: '/master/teacher', to: '/master/teachers' },
  { from: '/master/class', to: '/master/classes' },

  // Admin data aliases
  { from: '/admin/log', to: '/admin/logs' },
  { from: '/admin/user', to: '/admin/users' },
  { from: '/admin/setting', to: '/admin/settings' },
  { from: '/admin/db', to: '/admin/database' },
  { from: '/admin/task', to: '/admin/tasks' },
  { from: '/playground', to: '/admin/playground' },
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

/**
 * Feature flag guard — wraps a single page element.
 * Jika flag off: tampilkan "Akses Ditolak" di dalam DashboardLayout (tidak redirect).
 * Jika flag sedang load: tampilkan spinner.
 *
 * Usage:
 *   <Route path="/absensi" element={<FlagRoute flag="module.absensi"><AttendancePage /></FlagRoute>} />
 */
function FlagRoute({ children, flag, label }) {
  const { flags, loading } = useFeatureFlags()
  const navigate = useNavigate()

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
      </div>
    </DashboardLayout>
  )

  if (flags[flag] === false) return (
    <DashboardLayout>
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faLock} className="text-2xl text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Modul Tidak Aktif</h2>
          <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">
            Modul <strong>{label || flag}</strong> sedang dinonaktifkan oleh administrator.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">
          Kembali
        </button>
      </div>
    </DashboardLayout>
  )

  return children
}

/**
 * Combined Role + Flag guard.
 * Cek role dulu, lalu cek feature flag.
 */
function RoleFlagRoute({ children, roles = [], flag, label }) {
  const { profile } = useAuth()
  const { flags, loading } = useFeatureFlags()
  const navigate = useNavigate()

  const role = profile?.role?.toLowerCase()
  const hasRole = !roles.length || (role && roles.includes(role))

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
      </div>
    </DashboardLayout>
  )

  // Role tidak sesuai
  if (!hasRole) return (
    <DashboardLayout>
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faLock} className="text-2xl text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Akses Ditolak</h2>
          <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">
            Halaman ini tidak tersedia untuk role <strong>
              {(role?.charAt(0).toUpperCase() + role?.slice(1)) || 'Kamu'}
            </strong>.
          </p>
        </div>
        <button onClick={() => navigate(-1)}
          className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">
          Kembali
        </button>
      </div>
    </DashboardLayout>
  )

  // Flag off
  if (flag && flags[flag] === false) return (
    <DashboardLayout>
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faLock} className="text-2xl text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Modul Tidak Aktif</h2>
          <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">
            Modul <strong>{label || flag}</strong> sedang dinonaktifkan oleh administrator.
          </p>
        </div>
        <button onClick={() => navigate(-1)}
          className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">
          Kembali
        </button>
      </div>
    </DashboardLayout>
  )

  return children
}
// ─── Maintenance Page ─────────────────────────────────────────────────────────
function MaintenancePage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-app-bg)] px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center shadow-xl shadow-amber-500/10">
            <FontAwesomeIcon icon={faTools} className="text-4xl text-amber-500" />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--color-text)] mb-3">
          Sedang Maintenance
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-2">
          Sistem sedang dalam pemeliharaan oleh administrator.
        </p>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-8">
          Silakan kembali beberapa saat lagi.
        </p>

        {/* Info card */}
        <div className="glass rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-black text-amber-700 mb-1">Informasi</p>
              <p className="text-[11px] text-amber-600/80 leading-relaxed">
                Seluruh data kamu aman. Maintenance ini bersifat sementara dan tidak menghapus data apapun.
              </p>
            </div>
          </div>
        </div>

        {/* Login as different account or logout */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Login sebagai: <span className="font-black text-[var(--color-text)]">{profile?.name}</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[10px] font-black uppercase border border-[var(--color-border)]">{profile?.role}</span>
          </p>
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
          >
            Ganti Akun
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Maintenance guard — wrap di dalam ProtectedRoute.
 * Kalau system.maintenance = true dan user bukan developer → tampilkan MaintenancePage.
 * Developer tetap bisa akses semua halaman normal.
 */
function MaintenanceGuard({ children }) {
  const { profile } = useAuth()
  const { flags, loading } = useFeatureFlags()

  // Tunggu flags load dulu
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-muted)] text-sm font-medium">Memuat...</p>
      </div>
    </div>
  )

  // Developer selalu bypass maintenance
  const isDeveloper = profile?.role?.toLowerCase() === 'developer'
  if (!isDeveloper && flags['system.maintenance'] === true) {
    return <MaintenancePage />
  }

  return children
}

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
          <Route element={<MaintenanceGuard><Outlet /></MaintenanceGuard>}>

            {/* Core — module flag guarded */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/raport" element={<FlagRoute flag="module.raport" label="Raport Bulanan"><RaportPage /></FlagRoute>} />
            <Route path="/perilaku" element={<FlagRoute flag="module.poin" label="Laporan Perilaku"><BehaviorPage /></FlagRoute>} />
            <Route path="/absensi" element={<FlagRoute flag="module.absensi" label="Absensi Bulanan"><AttendancePage /></FlagRoute>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/informasi" element={<InformationPage />} />

            {/* Role + flag guarded */}
            <Route path="/gate" element={
              <RoleFlagRoute roles={DEV_ADMIN_GATE} flag="module.gate" label="Portal Keluar Masuk">
                <GatePage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/logs" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <LogsPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/users" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <UserPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/settings" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <AdminSettingsPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/database" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <DatabasePage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/storage" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <StoragePage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/tasks" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <TasksPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/playground" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <PlaygroundPage />
              </RoleFlagRoute>
            } />

            {/* Master Data */}
            <Route path="/admin/news" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <AdminNewsPage />
              </RoleFlagRoute>
            } />

            <Route path="/master/students" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.students" label="Data Siswa">
                <StudentsPage />
              </RoleFlagRoute>
            } />
            <Route path="/master/teachers" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.teachers" label="Data Guru">
                <TeachersPage />
              </RoleFlagRoute>
            } />
            <Route path="/master/classes" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.classes" label="Data Kelas">
                <ClassesPage />
              </RoleFlagRoute>
            } />
            <Route path="/master/violations" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.violations" label="Konfigurasi Poin">
                <ViolationsTypePage />
              </RoleFlagRoute>
            } />
            <Route path="/master/academic-years" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.academic_years" label="Tahun Pelajaran">
                <AcademicYearsPage />
              </RoleFlagRoute>
            } />

            {/* Route Aliases */}
            {ROUTE_ALIASES.map(({ from, to }) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
          </Route>
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
    <GlobalErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <FeatureFlagsProvider>
                <AppRoutes />
              </FeatureFlagsProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </GlobalErrorBoundary>
  )
}