import { useEffect, useRef, useState, useCallback } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { createPortal } from "react-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faBell, faChevronDown, faMoon, faSun, faGear, faRightFromBracket,
    faLayerGroup, faXmark, faArrowRight, faRotateRight, faCircleExclamation,
    faTriangleExclamation, faCircleInfo, faCircleCheck,
    faClipboardList, faCalendarWeek, faShieldHalved,
    faUsers, faChalkboardTeacher, faSchool, faExclamationTriangle, faCalendarAlt,
    faPersonWalkingArrowRight, faUserGear, faClockRotateLeft, faScrewdriverWrench,
} from "@fortawesome/free-solid-svg-icons"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"
import { useNotifications } from "../../hooks/useNotifications"
import { useFeatureFlags } from "../../context/FeatureFlagsContext"

// ─── Portal container helper ──────────────────────────────────────────────────
// Singleton di module-level — dibuat SEKALI saat module di-load, tidak pernah
// dihapus. Mencegah removeChild crash di React 18 Strict Mode / concurrent render.
const _portalContainers = {}
function getPortalContainer(id) {
    if (!_portalContainers[id]) {
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
        }
        _portalContainers[id] = el
    }
    return _portalContainers[id]
}

const MASTER_ITEMS = [
    { to: "/master/students", label: "Data Siswa", icon: faUsers, desc: "Kelola data santri aktif" },
    { to: "/master/teachers", label: "Data Guru", icon: faChalkboardTeacher, desc: "Daftar musyrif & pengajar" },
    { to: "/master/classes", label: "Data Kelas", icon: faSchool, desc: "Manajemen kelas & kamar" },
    { to: "/master/violations", label: "Jenis Pelanggaran", icon: faExclamationTriangle, desc: "Kategori & bobot pelanggaran" },
    { to: "/master/academic-years", label: "Tahun Pelajaran", icon: faCalendarAlt, desc: "Periode tahun ajaran aktif" },
]

const REPORTS_ITEMS = [
    { to: "/gate", label: "Portal Keluar Masuk", icon: faPersonWalkingArrowRight, desc: "Izin keluar guru & kunjungan tamu", color: "bg-red-500/10 text-red-500" },
    { to: "/raport", label: "Raport Bulanan", icon: faClipboardList, desc: "Nilai & perilaku per bulan", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/absensi", label: "Absensi Bulanan", icon: faCalendarWeek, desc: "Rekap kehadiran per bulan", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/poin", label: "Poin Siswa", icon: faShieldHalved, desc: "Pelanggaran & prestasi siswa", color: "bg-orange-500/10 text-orange-500" },
]

// Admin-only items — hanya tampil untuk developer & admin
const ADMIN_ITEMS = [
    { to: "/admin/logs", label: "Audit Logs", icon: faClockRotateLeft, desc: "Riwayat aktivitas sistem", color: "bg-purple-500/10 text-purple-600" },
    { to: "/admin/users", label: "User Management", icon: faUserGear, desc: "Kelola akun & hak akses", color: "bg-rose-500/10 text-rose-600" },
    { to: "/admin/settings", label: "Pengaturan", icon: faScrewdriverWrench, desc: "Konfigurasi sistem & aplikasi", color: "bg-slate-500/10 text-slate-600" },
]

// ── Warna & icon per type notifikasi
const TYPE_STYLE = {
    error: { bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500', text: 'text-red-500', icon: faCircleExclamation },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', text: 'text-amber-500', icon: faTriangleExclamation },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500', text: 'text-blue-500', icon: faCircleInfo },
    success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500', text: 'text-emerald-500', icon: faCircleCheck },
}

// Badge merah di atas icon bell
function NotifBadge({ count }) {
    if (!count) return null
    return (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none pointer-events-none">
            {count > 9 ? '9+' : count}
        </span>
    )
}

// Satu baris notifikasi di panel
function NotifItem({ notif, onDismiss, onNavigate }) {
    const s = TYPE_STYLE[notif.type] || TYPE_STYLE.info
    return (
        <div className={`group relative rounded-xl border p-3 transition-all ${s.bg} ${s.border}`}>
            <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 text-sm shrink-0 ${s.text}`}>
                    <FontAwesomeIcon icon={s.icon} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{notif.title}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{notif.body}</p>
                    {notif.action && (
                        <button
                            onClick={() => onNavigate(notif.action.route)}
                            className={`mt-1.5 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${s.text} hover:opacity-70 transition-opacity`}
                        >
                            {notif.action.label} <FontAwesomeIcon icon={faArrowRight} className="text-[7px]" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => onDismiss(notif.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[9px]"
                    title="Tutup"
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>
        </div>
    )
}

// Panel dropdown notifikasi
// KEY FIX: menerima isOpen prop — portal selalu di-render, content dikondisikan di dalam.
// Pola ini mencegah removeChild crash saat concurrent unmount.
function NotifPanel({ isOpen, notifications, loading, refreshing, onDismiss, onRefresh, onNavigate, isMobile, anchorRef, panelRef }) {
    const errCount = notifications.filter(n => n.type === 'error').length
    const warnCount = notifications.filter(n => n.type === 'warning').length
    const container = getPortalContainer('portal-notif')

    // Hitung posisi SAAT render (sync) — tidak ada useEffect, tidak ada glitch
    let style = {}
    if (!isMobile && anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect()
        style = {
            position: 'fixed',
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
            width: 320,
        }
    }

    const inner = (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <div>
                    <p className="text-[12px] font-black text-[var(--color-text)]">Notifikasi</p>
                    {!loading && notifications.length > 0 && (
                        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                            {errCount > 0 && <span className="text-red-500 font-bold">{errCount} perlu tindakan · </span>}
                            {warnCount > 0 && <span className="text-amber-500 font-bold">{warnCount} peringatan · </span>}
                            {notifications.length} total
                        </p>
                    )}
                </div>
                <button
                    onClick={onRefresh}
                    title="Refresh"
                    className={`p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition text-xs ${refreshing ? 'animate-spin pointer-events-none' : ''}`}
                >
                    <FontAwesomeIcon icon={faRotateRight} />
                </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
                {loading ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-lg" />
                        <p className="text-[10px]">Memuat notifikasi...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                        <span className="text-2xl">🎉</span>
                        <p className="text-[11px] font-bold">Semua beres!</p>
                        <p className="text-[9px] text-center">Tidak ada notifikasi yang perlu ditindaklanjuti.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <NotifItem
                            key={n.id}
                            notif={n}
                            onDismiss={onDismiss}
                            onNavigate={onNavigate}
                        />
                    ))
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && !loading && (
                <div className="px-4 py-2.5 border-t border-[var(--color-border)] flex justify-end">
                    <button
                        onClick={() => notifications.forEach(n => onDismiss(n.id))}
                        className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                    >
                        Tutup Semua
                    </button>
                </div>
            )}
        </div>
    )

    // Mobile: full-width di bawah header
    if (isMobile) {
        return createPortal(
            !isOpen ? null : (
                <div ref={panelRef} className="fixed inset-x-0 top-[72px] z-[9999] px-3">
                    {inner}
                </div>
            ),
            container
        )
    }

    // Desktop
    return createPortal(
        !isOpen ? null : (
            <div ref={panelRef} style={{ ...style, zIndex: 9999 }}>{inner}</div>
        ),
        container
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TopNav({ title, subtitle }) {
    const { isDark, toggleTheme } = useTheme()
    const { profile, signOut } = useAuth()
    const { flags } = useFeatureFlags()
    const navigate = useNavigate()
    const { notifications, loading, refreshing, dismiss, refresh } = useNotifications()

    // ── Filter nav items by feature flags
    // nav.X flags control visibility; default true if flag not yet loaded
    const visibleReportsItems = REPORTS_ITEMS.filter(it => {
        if (it.to === '/gate') return flags['nav.gate'] !== false
        if (it.to === '/raport') return flags['nav.raport'] !== false
        if (it.to === '/absensi') return flags['nav.absensi'] !== false
        if (it.to === '/poin') return flags['nav.poin'] !== false
        return true
    })
    // Satpam: only show gate
    const role = profile?.role?.toLowerCase()
    const isSatpam = role === 'satpam'
    const filteredReportsItems = isSatpam
        ? visibleReportsItems.filter(it => it.to === '/gate')
        : visibleReportsItems

    // Filter master items by nav flags
    const filteredMasterItems = MASTER_ITEMS.filter(it => {
        if (it.to === '/master/students') return flags['nav.students'] !== false
        if (it.to === '/master/teachers') return flags['nav.teachers'] !== false
        if (it.to === '/master/classes') return flags['nav.classes'] !== false
        if (it.to === '/master/violations') return flags['nav.violations'] !== false
        if (it.to === '/master/academic-years') return flags['nav.academic_years'] !== false
        return true
    })

    const [masterOpen, setMasterOpen] = useState(false)
    const [reportsOpen, setReportsOpen] = useState(false)
    const [adminOpen, setAdminOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)

    const masterRef = useRef(null)
    const reportsRef = useRef(null)
    const adminRef = useRef(null)
    const mobileProfileRef = useRef(null)
    const desktopProfileRef = useRef(null)
    const notifBtnRef = useRef(null)
    const notifPanelRef = useRef(null)

    // Jumlah notif yang butuh perhatian (error + warning)
    const urgentCount = notifications.filter(n => n.type === 'error' || n.type === 'warning').length
    const totalCount = notifications.length

    // Close on outside click
    useEffect(() => {
        const onClick = (e) => {
            if (masterRef.current && !masterRef.current.contains(e.target)) setMasterOpen(false)
            if (reportsRef.current && !reportsRef.current.contains(e.target)) setReportsOpen(false)
            if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false)

            const isOutsideMobile = mobileProfileRef.current && !mobileProfileRef.current.contains(e.target)
            const isOutsideDesktop = desktopProfileRef.current && !desktopProfileRef.current.contains(e.target)
            if (isOutsideMobile && isOutsideDesktop) setProfileOpen(false)

            const isOutsideNotifBtn = notifBtnRef.current && !notifBtnRef.current.contains(e.target)
            const isOutsideNotifPanel = notifPanelRef.current && !notifPanelRef.current.contains(e.target)
            if (isOutsideNotifBtn && isOutsideNotifPanel) setNotifOpen(false)
        }
        window.addEventListener("mousedown", onClick)
        return () => window.removeEventListener("mousedown", onClick)
    }, [])

    const handleNotifNavigate = useCallback((route) => {
        setNotifOpen(false)
        navigate(route)
    }, [navigate])

    const tabClass = ({ isActive }) =>
        `px-3 py-2 rounded-xl text-sm font-bold transition
     ${isActive ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`

    const avatarLetter = profile?.name?.charAt(0) || "U"

    const today = new Date().toLocaleDateString("id-ID", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

    // Deteksi mobile (< 1024px = lg breakpoint Tailwind)
    const [isMobileScreen, setIsMobileScreen] = useState(
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false
    )
    useEffect(() => {
        const handler = () => setIsMobileScreen(window.innerWidth < 1024)
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])

    // Bell button — hanya tombol, panel dirender sekali di luar
    const BellButton = () => (
        <div className="relative" ref={notifBtnRef}>
            <button
                onClick={() => setNotifOpen(v => !v)}
                className={`relative p-2.5 rounded-xl transition
                    ${notifOpen
                        ? 'bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                        : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}
                    ${urgentCount > 0 ? 'animate-[bellShake_2s_ease-in-out_infinite]' : ''}`}
                type="button"
                title="Notifikasi"
            >
                <FontAwesomeIcon icon={faBell} />
                <NotifBadge count={urgentCount || (totalCount > 0 ? totalCount : 0)} />
            </button>
        </div>
    )

    return (
        <>
            {/* Animasi bell shake untuk notif urgent */}
            <style>{`
                @keyframes bellShake {
                    0%, 85%, 100% { transform: rotate(0deg); }
                    88% { transform: rotate(-12deg); }
                    92% { transform: rotate(12deg); }
                    96% { transform: rotate(-8deg); }
                    98% { transform: rotate(8deg); }
                }
            `}</style>

            <header className="sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 pt-3">

                    {/* ===================== */}
                    {/* MOBILE */}
                    {/* ===================== */}
                    <div className="lg:hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-md shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start justify-between px-4 py-3">
                            {/* Left */}
                            <div className="min-w-0">
                                <div className="text-base font-extrabold text-[var(--color-text)] truncate">
                                    {title || "Dashboard"}
                                </div>
                                <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
                                    {subtitle || today}
                                </div>
                            </div>

                            {/* Right: Bell + Profile */}
                            <div className="flex items-center gap-1.5">
                                <BellButton />

                                <div className="relative flex-shrink-0" ref={mobileProfileRef}>
                                    <button
                                        onClick={() => setProfileOpen(v => !v)}
                                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-2xl hover:bg-[var(--color-surface-alt)] transition border border-transparent hover:border-[var(--color-border)]"
                                        type="button"
                                    >
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black">
                                            {avatarLetter}
                                        </div>
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            className={`text-xs text-[var(--color-text-muted)] transition-transform ${profileOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                            <button
                                                onClick={() => { setProfileOpen(false); navigate("/settings") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-[var(--color-text)]"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faGear} /> Settings
                                            </button>
                                            <button
                                                onClick={async () => { setProfileOpen(false); await signOut(); navigate("/login") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-red-600"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===================== */}
                    {/* DESKTOP */}
                    {/* ===================== */}
                    <div className="hidden lg:block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                        <div className="grid grid-cols-3 items-center px-4 py-3">

                            {/* Left: Logo */}
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center">
                                    L
                                </div>
                                <div>
                                    <p className="text-sm font-extrabold text-[var(--color-text)] leading-tight">{title || "Dashboard"}</p>
                                    <p className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
                                        {subtitle || today}
                                    </p>
                                </div>
                            </div>

                            {/* Center: Tabs */}
                            <div className="flex justify-center">
                                <nav className="flex items-center gap-2 bg-[var(--color-surface-alt)]/60 rounded-2xl p-1.5">
                                    <NavLink to="/dashboard" className={tabClass}>Dashboard</NavLink>

                                    {/* Reports Dropdown */}
                                    <div className="relative" ref={reportsRef}>
                                        <button
                                            onClick={() => { setReportsOpen(v => !v); setMasterOpen(false) }}
                                            className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2
                                                ${reportsOpen
                                                    ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]"
                                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`}
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faClipboardList} />
                                            Reports
                                            <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${reportsOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        {reportsOpen && (
                                            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                                <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">
                                                    Laporan & Rekap
                                                </div>
                                                <div className="p-2">
                                                    {filteredReportsItems.map(it => (
                                                        <button
                                                            key={it.to}
                                                            onClick={() => { setReportsOpen(false); navigate(it.to) }}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition group"
                                                            type="button"
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${it.color}`}>
                                                                <FontAwesomeIcon icon={it.icon} className="text-xs" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{it.label}</p>
                                                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">{it.desc}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Master Dropdown */}
                                    <div className="relative" ref={masterRef}>
                                        <button
                                            onClick={() => { setMasterOpen(v => !v); setReportsOpen(false) }}
                                            className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2
                                                ${masterOpen
                                                    ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]"
                                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`}
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faLayerGroup} />
                                            Master
                                            <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${masterOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        {masterOpen && (
                                            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                                <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">
                                                    Master Data
                                                </div>
                                                <div className="p-2">
                                                    {filteredMasterItems.map(it => (
                                                        <button
                                                            key={it.to}
                                                            onClick={() => { setMasterOpen(false); navigate(it.to) }}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition group"
                                                            type="button"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                                                <FontAwesomeIcon icon={it.icon} className="text-xs" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{it.label}</p>
                                                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">{it.desc}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Admin Dropdown — developer & admin only */}
                                    {['developer', 'admin'].includes(profile?.role?.toLowerCase()) && (
                                        <div className="relative" ref={adminRef}>
                                            <button
                                                onClick={() => { setAdminOpen(v => !v); setReportsOpen(false); setMasterOpen(false) }}
                                                className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2
                                                    ${adminOpen
                                                        ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]"
                                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`}
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faUserGear} />
                                                Admin
                                                <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${adminOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {adminOpen && (
                                                <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                                    <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">
                                                        Admin Panel
                                                    </div>
                                                    <div className="p-2">
                                                        {ADMIN_ITEMS.map(it => (
                                                            <button
                                                                key={it.to}
                                                                onClick={() => { setAdminOpen(false); navigate(it.to) }}
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition group"
                                                                type="button"
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${it.color}`}>
                                                                    <FontAwesomeIcon icon={it.icon} className="text-xs" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{it.label}</p>
                                                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">{it.desc}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </nav>
                            </div>

                            {/* Right: Bell + Theme + Profile */}
                            <div className="flex items-center justify-end gap-2">
                                <BellButton />

                                <button
                                    onClick={toggleTheme}
                                    className="p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                                </button>

                                {/* Profile dropdown */}
                                <div className="relative" ref={desktopProfileRef}>
                                    <button
                                        onClick={() => setProfileOpen(v => !v)}
                                        className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-[var(--color-surface-alt)] transition border border-transparent hover:border-[var(--color-border)]"
                                        type="button"
                                    >
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black">
                                            {avatarLetter}
                                        </div>
                                        <div className="hidden sm:flex flex-col items-start leading-tight">
                                            <span className="text-sm font-extrabold text-[var(--color-text)]">{profile?.name || "User"}</span>
                                            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">{profile?.role || "Staff"}</span>
                                        </div>
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            className={`text-xs text-[var(--color-text-muted)] transition-transform ${profileOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                            <button
                                                onClick={() => { setProfileOpen(false); navigate("/settings") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-[var(--color-text)]"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faGear} /> Settings
                                            </button>
                                            <button
                                                onClick={async () => { setProfileOpen(false); await signOut(); navigate("/login") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-red-600"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </header>
            {/* KEY FIX: Selalu render NotifPanel, jangan conditional mount.
                Portal unmount = crash. Pass isOpen sebagai prop, biarkan
                NotifPanel yang putuskan render null di dalam portal. */}
            <NotifPanel
                isOpen={notifOpen}
                notifications={notifications}
                loading={loading}
                refreshing={refreshing}
                onDismiss={dismiss}
                onRefresh={refresh}
                onNavigate={handleNotifNavigate}
                isMobile={isMobileScreen}
                anchorRef={notifBtnRef}
                panelRef={notifPanelRef}
            />
        </>
    )
}