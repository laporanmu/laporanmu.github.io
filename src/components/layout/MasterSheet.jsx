import { useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faUsers, faChalkboardTeacher, faSchool,
    faExclamationTriangle, faCalendarAlt,
    faClipboardList, faCalendarWeek, faShieldHalved,
    faPersonWalkingArrowRight, faClockRotateLeft, faUserGear,
    faScrewdriverWrench, faDatabase, faBoxArchive, faServer, faPalette, faNewspaper, faRobot, faCube
} from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../../context/AuthContext"
import { useFeatureFlags } from "../../context/FeatureFlagsContext"

// ─── Portal container ─────────────────────────────────────────────────────────
// Singleton di module-level — dibuat SEKALI saat module di-load, tidak pernah
// dihapus. Mencegah removeChild crash di React 18 Strict Mode / concurrent render
// yang bisa double-invoke render function sehingga hook-based container jadi orphan.
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

// ─── Items ────────────────────────────────────────────────────────────────────
const REPORTS_ITEMS = [
    { to: "/gate", label: "Portal Keluar Masuk", icon: faPersonWalkingArrowRight, desc: "Manajemen izin keluar masuk area santri", color: "bg-red-500/10 text-red-500" },
    { to: "/raport", label: "Raport Bulanan", icon: faClipboardList, desc: "Laporan perkembangan poin & prestasi bulanan", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/attendance", label: "Absensi Bulanan", icon: faCalendarWeek, desc: "Data kehadiran santri di sekolah & asrama", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/behavior", label: "Laporan Perilaku", icon: faShieldHalved, desc: "Riwayat detail poin kedisiplinan santri", color: "bg-orange-500/10 text-orange-500" },
]

const MASTER_ITEMS = [
    { to: "/master/students", label: "Data Siswa", icon: faUsers, desc: "Pusat database seluruh santri aktif dalam sistem", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/teachers", label: "Data Guru", icon: faChalkboardTeacher, desc: "Data akun pengajar, musyrif, dan staf sekolah", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/classes", label: "Data Kelas", icon: faSchool, desc: "Pengaturan struktur kelas dan pembagian asrama", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/poin", label: "Konfigurasi Poin", icon: faExclamationTriangle, desc: "Konfigurasi kategori poin prestasi & pelanggaran", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/academic-years", label: "Tahun Pelajaran", icon: faCalendarAlt, desc: "Manajemen semester dan periode kalender akademik", color: "bg-indigo-500/10 text-indigo-600" },
]

const ADMIN_ITEMS = [
    { to: "/admin", label: "Admin Dashboard Center", icon: faCube, desc: "Pusat monitoring teknis & integrasi sistem", color: "bg-indigo-600/10 text-indigo-600" },
    { to: "/admin/news", label: "Manajemen Informasi", icon: faNewspaper, desc: "Update Informasi & info terbaru ke landing page", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/admin/ai-insights", label: "AI Insights Center", icon: faRobot, desc: "Audit perckapan AI dan analisis performa mesin", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/admin/logs", label: "Audit Logs", icon: faClockRotateLeft, desc: "Log historis aktivitas user dan perubahan data", color: "bg-purple-500/10 text-purple-600" },
    { to: "/admin/users", label: "User Management", icon: faUserGear, desc: "Pengaturan hak akses, role, dan kredensial user", color: "bg-rose-500/10 text-rose-600" },
    { to: "/admin/database", label: "Database Health", icon: faDatabase, desc: "Pemantauan status database & kesehatan tabel", color: "bg-cyan-500/10 text-cyan-600" },
    { to: "/admin/storage", label: "Storage Manager", icon: faBoxArchive, desc: "Manajemen media, foto siswa, dan berkas sistem", color: "bg-amber-500/10 text-amber-600" },
    { to: "/admin/tasks", label: "Background Tasks", icon: faServer, desc: "Status sinkronisasi background & automasi sistem", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/admin/settings", label: "Pengaturan", icon: faScrewdriverWrench, desc: "Panel pusat pengaturan parameter aplikasi utama", color: "bg-slate-500/10 text-slate-600" },
    { to: "/admin/playground", label: "UI Playground", icon: faPalette, desc: "Panduan visual komponen dan dokumentasi desain", color: "bg-pink-500/10 text-pink-600" },
]

// ─── Section titles per key ───────────────────────────────────────────────────
const SECTION_TITLE = {
    reports: "Laporan & Rekap",
    master: "Master Data",
    admin: "Admin Panel",
}

function Section({ title, items, onNavigate }) {
    return (
        <>
            <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{title}</p>
            </div>
            <div className="px-2 pb-1">
                {items.map((it) => (
                    <button key={it.to} onClick={() => onNavigate(it.to)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--color-surface-alt)] transition">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${it.color}`}>
                            <FontAwesomeIcon icon={it.icon} className="text-sm" />
                        </div>
                        <div className="text-left min-w-0">
                            <div className="text-[13px] font-bold text-[var(--color-text)] leading-tight">{it.label}</div>
                            {it.desc && <div className="text-[10px] text-[var(--color-text-muted)]">{it.desc}</div>}
                        </div>
                    </button>
                ))}
            </div>
        </>
    )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
    return <div className="h-px bg-[var(--color-border)] mx-4 my-1" />
}

// ─── MasterSheet ─────────────────────────────────────────────────────────────
// Props:
//   isOpen   — boolean, whether the sheet is visible
//   onClose  — callback to close the sheet
//   section  — 'reports' | 'master' | 'admin' | null
//              null/undefined = tampilkan semua section sesuai role (legacy / full menu)
export default function MasterSheet({ isOpen, onClose, section }) {
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { flags } = useFeatureFlags()

    const container = getPortalContainer('portal-sheet')

    const role = profile?.role?.toLowerCase()
    const isSatpam = role === 'satpam'
    const isAdminUp = ['developer', 'admin'].includes(role)

    // Filter items berdasarkan role + feature flags
    const filteredReports = REPORTS_ITEMS.filter(it => {
        if (it.to === '/gate') return flags['nav.gate'] !== false
        if (it.to === '/raport') return flags['nav.raport'] !== false
        if (it.to === '/attendance') return flags['nav.absensi'] !== false
        if (it.to === '/behavior') return flags['nav.poin'] !== false
        return true
    })
    const visibleReports = isSatpam
        ? filteredReports.filter(it => it.to === '/gate')
        : filteredReports

    const filteredMaster = MASTER_ITEMS.filter(it => {
        if (it.to === '/master/students') return flags['nav.students'] !== false
        if (it.to === '/master/teachers') return flags['nav.teachers'] !== false
        if (it.to === '/master/classes') return flags['nav.classes'] !== false
        if (it.to === '/master/poin') return flags['nav.poin'] !== false
        if (it.to === '/master/academic-years') return flags['nav.academic_years'] !== false
        return true
    })
    const visibleMaster = isSatpam ? [] : filteredMaster

    // Tentukan section mana yang perlu ditampilkan
    // section prop = spesifik 1 section; null = tampil semua (fallback full-menu)
    const show = {
        reports: !section || section === 'reports',
        master: (!section || section === 'master') && visibleMaster.length > 0,
        admin: (!section || section === 'admin') && isAdminUp,
    }

    useEffect(() => {
        if (!isOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = prev }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => e.key === "Escape" && onClose?.()
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isOpen, onClose])

    const handleNav = (to) => { onClose?.(); navigate(to) }

    return createPortal(
        !isOpen ? null : (
            <div className="fixed inset-0 z-[100000]" onClick={onClose}>
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-0 right-0 bottom-0 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                    <div className="mx-auto max-w-xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">

                        {/* Grabber */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="h-1 w-10 rounded-full bg-gray-300/80 dark:bg-gray-700/80" />
                        </div>

                        {/* ── Reports ── */}
                        {show.reports && (
                            <Section
                                title={SECTION_TITLE.reports}
                                items={visibleReports}
                                onNavigate={handleNav}
                            />
                        )}

                        {/* ── Master Data ── */}
                        {show.master && (
                            <>
                                {show.reports && <Divider />}
                                <Section
                                    title={SECTION_TITLE.master}
                                    items={visibleMaster}
                                    onNavigate={handleNav}
                                />
                            </>
                        )}

                        {/* ── Admin Panel ── */}
                        {show.admin && (
                            <div className="mt-2">
                                {(show.reports || show.master) && <Divider />}
                                <Section
                                    title="Infrastructure & Control"
                                    items={ADMIN_ITEMS}
                                    onNavigate={handleNav}
                                />
                            </div>
                        )}

                        <div className="mt-2 px-5 py-3 rounded-2xl bg-black/5 dark:bg-white/5 mx-3 flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">LaporanMu System</span>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Operational</span>
                        </div>

                        <div className="h-3" />
                    </div>
                </div>
            </div>
        ),
        container
    )
}