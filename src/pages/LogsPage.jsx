import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faShieldHalved, faClipboardList, faArrowTrendUp, faTriangleExclamation,
    faUserPen, faTrash, faPlus, faFileExport, faFileImport, faFloppyDisk,
    faSearch, faXmark, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faRotateRight, faFilter, faCalendarAlt, faDownload, faCircleInfo,
    faUsers, faSchool, faGraduationCap, faTable, faEye, faSpinner,
    faDatabase, faCode, faBolt, faCheckCircle, faTimeline,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const BULAN = [
    { id: 1, id_str: 'Januari' }, { id: 2, id_str: 'Februari' }, { id: 3, id_str: 'Maret' },
    { id: 4, id_str: 'April' }, { id: 5, id_str: 'Mei' }, { id: 6, id_str: 'Juni' },
    { id: 7, id_str: 'Juli' }, { id: 8, id_str: 'Agustus' }, { id: 9, id_str: 'September' },
    { id: 10, id_str: 'Oktober' }, { id: 11, id_str: 'November' }, { id: 12, id_str: 'Desember' },
]

const ALLOWED_ROLES = ['admin', 'developer', 'superadmin']

const EVENT_TYPES = {
    raport_created: { label: 'Raport Dibuat', color: '#10b981', bg: '#10b98115', icon: faFloppyDisk },
    raport_updated: { label: 'Raport Diupdate', color: '#3b82f6', bg: '#3b82f615', icon: faUserPen },
    raport_deleted: { label: 'Raport Dihapus', color: '#ef4444', bg: '#ef444415', icon: faTrash },
    poin_created: { label: 'Poin Dicatat', color: '#8b5cf6', bg: '#8b5cf615', icon: faPlus },
    poin_updated: { label: 'Poin Diupdate', color: '#6366f1', bg: '#6366f115', icon: faUserPen },
    poin_deleted: { label: 'Poin Dihapus', color: '#ef4444', bg: '#ef444415', icon: faTrash },
    poin_bulk_deleted: { label: 'Poin Hapus Massal', color: '#ef4444', bg: '#ef444415', icon: faTrash },
    poin_imported: { label: 'Poin Diimpor', color: '#f59e0b', bg: '#f59e0b15', icon: faFileImport },
    raport_exported: { label: 'Raport Diekspor', color: '#06b6d4', bg: '#06b6d415', icon: faFileExport },
    poin_exported: { label: 'Poin Diekspor', color: '#06b6d4', bg: '#06b6d415', icon: faFileExport },
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) => {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtRelative = (d) => {
    if (!d) return '—'
    const now = Date.now()
    const diff = now - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'baru saja'
    if (mins < 60) return `${mins} menit lalu`
    if (hours < 24) return `${hours} jam lalu`
    if (days < 7) return `${days} hari lalu`
    return fmtDate(d)
}

function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogsPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()

    // ── Access control
    const isAllowed = ALLOWED_ROLES.includes(profile?.role)

    // ── Data
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalRows, setTotalRows] = useState(0)
    const [stats, setStats] = useState({ total: 0, today: 0, raport: 0, poin: 0 })

    // ── Filters
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterSource, setFilterSource] = useState('') // 'raport' | 'poin' | ''
    const [filterAction, setFilterAction] = useState('') // 'created' | 'updated' | 'deleted' | ''
    const [filterTeacher, setFilterTeacher] = useState('')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [sortDir, setSortDir] = useState('desc')

    // ── Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)

    // ── UI
    const [expandedId, setExpandedId] = useState(null)
    const [showFilters, setShowFilters] = useState(false)
    const searchRef = useRef(null)

    // ── Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [search])

    // Reset page on filter change
    useEffect(() => { setPage(1) }, [filterSource, filterAction, filterTeacher, filterDateFrom, filterDateTo, sortDir])

    // ── Keyboard shortcuts
    useEffect(() => {
        const h = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !isTyping)) {
                e.preventDefault(); searchRef.current?.focus()
            }
            if (e.key === 'Escape') { setSearch(''); setExpandedId(null) }
            if (e.key === 'r' && !isTyping) { e.preventDefault(); fetchLogs() }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [])

    // ── Build unified log entries from raport + poin tables
    const fetchLogs = useCallback(async () => {
        if (!isAllowed) return
        setLoading(true)
        try {
            // Fetch raport activity (student_monthly_reports with metadata)
            const raportQ = supabase
                .from('student_monthly_reports')
                .select('id, student_id, month, year, musyrif_name, updated_by_name, created_at, updated_at, students(name, classes(name))')
                .order('updated_at', { ascending: sortDir === 'asc' })

            // Fetch poin activity (reports table)
            const poinQ = supabase
                .from('reports')
                .select('id, student_id, points, notes, reported_at, teacher_name, violation_types(name), students(name, classes(name))')
                .order('reported_at', { ascending: sortDir === 'asc' })

            // Apply date filters
            if (filterDateFrom) {
                raportQ.gte('updated_at', filterDateFrom)
                poinQ.gte('reported_at', filterDateFrom)
            }
            if (filterDateTo) {
                const toDate = filterDateTo + 'T23:59:59'
                raportQ.lte('updated_at', toDate)
                poinQ.lte('reported_at', toDate)
            }

            // Apply teacher filter
            if (filterTeacher) poinQ.ilike('teacher_name', `%${filterTeacher}%`)

            const results = await Promise.all([
                filterSource === 'poin' ? Promise.resolve({ data: [] }) : raportQ.limit(500),
                filterSource === 'raport' ? Promise.resolve({ data: [] }) : poinQ.limit(500),
            ])

            const [raportRes, poinRes] = results

            // Normalize raport entries
            const raportEntries = (raportRes.data || []).map(r => ({
                _id: `raport_${r.id}`,
                _source: 'raport',
                _type: 'raport_created',
                _ts: r.updated_at || r.created_at,
                _actor: r.updated_by_name || r.musyrif_name || '—',
                _musyrif: r.musyrif_name || '—',
                _student: r.students?.name || '—',
                _class: r.students?.classes?.name || '—',
                _detail: `Raport ${BULAN.find(b => b.id === r.month)?.id_str ?? r.month} ${r.year}`,
                _meta: { bulan: r.month, tahun: r.year, musyrif: r.musyrif_name, savedBy: r.updated_by_name },
                raw: r,
            }))

            // Normalize poin entries
            const poinEntries = (poinRes.data || []).map(r => {
                const isPositive = (r.points ?? 0) > 0
                return {
                    _id: `poin_${r.id}`,
                    _source: 'poin',
                    _type: 'poin_created',
                    _ts: r.reported_at,
                    _actor: r.teacher_name || '—',
                    _student: r.students?.name || '—',
                    _class: r.students?.classes?.name || '—',
                    _detail: r.violation_types?.name || '—',
                    _meta: { points: r.points, notes: r.notes, isPositive },
                    raw: r,
                }
            })

            // Combine, filter by search, sort
            let combined = [...raportEntries, ...poinEntries]
                .sort((a, b) => sortDir === 'desc'
                    ? new Date(b._ts) - new Date(a._ts)
                    : new Date(a._ts) - new Date(b._ts)
                )

            if (debouncedSearch) {
                const q = debouncedSearch.toLowerCase()
                combined = combined.filter(e =>
                    e._student.toLowerCase().includes(q) ||
                    e._actor.toLowerCase().includes(q) ||
                    e._class.toLowerCase().includes(q) ||
                    e._detail.toLowerCase().includes(q)
                )
            }

            if (filterAction) {
                combined = combined.filter(e => e._type.includes(filterAction))
            }

            // Stats
            const todayStr = new Date().toISOString().slice(0, 10)
            setStats({
                total: combined.length,
                today: combined.filter(e => (e._ts || '').slice(0, 10) === todayStr).length,
                raport: raportEntries.length,
                poin: poinEntries.length,
            })

            setTotalRows(combined.length)

            // Paginate
            const from = (page - 1) * pageSize
            setLogs(combined.slice(from, from + pageSize))
        } catch (e) {
            addToast('Gagal memuat logs: ' + e.message, 'error')
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [isAllowed, page, pageSize, debouncedSearch, filterSource, filterAction, filterTeacher, filterDateFrom, filterDateTo, sortDir, addToast])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    // ── Export logs as CSV
    const exportCSV = useCallback(() => {
        if (!logs.length) return
        const headers = ['Waktu', 'Sumber', 'Santri', 'Kelas', 'Aktivitas', 'Detail', 'Oleh']
        const rows = logs.map(e => [
            fmtDateTime(e._ts),
            e._source === 'raport' ? 'Raport' : 'Poin',
            e._student,
            e._class,
            EVENT_TYPES[e._type]?.label || e._type,
            e._detail,
            e._actor,
        ])
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `logs_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        addToast('Log diekspor', 'success')
    }, [logs, addToast])

    const totalPages = Math.ceil(totalRows / pageSize)
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    const activeFilterCount = [filterSource, filterAction, filterTeacher, filterDateFrom, filterDateTo].filter(Boolean).length

    // ── Access denied
    if (!isAllowed) {
        return (
            <DashboardLayout title="Audit Logs">
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center">
                        <FontAwesomeIcon icon={faShieldHalved} className="text-3xl text-red-500" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-black text-[var(--color-text)] mb-2">Akses Terbatas</h2>
                        <p className="text-[var(--color-text-muted)] text-sm max-w-sm">
                            Halaman ini hanya dapat diakses oleh <span className="font-black text-red-500">Admin</span> atau <span className="font-black text-red-500">Developer</span>.
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-2 opacity-60">Role kamu saat ini: <code className="font-mono bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded">{profile?.role || 'tidak diketahui'}</code></p>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Audit Logs">
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* ── PAGE HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <FontAwesomeIcon icon={faShieldHalved} className="text-red-500 text-sm" />
                            </div>
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Audit Logs</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 uppercase tracking-widest">
                                Admin Only
                            </span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Riwayat seluruh aktivitas sistem — raport, poin, dan perubahan data.
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={fetchLogs} disabled={loading}
                            className="h-9 w-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center hover:text-[var(--color-text)] transition-all disabled:opacity-50"
                            title="Refresh (R)">
                            <FontAwesomeIcon icon={faRotateRight} className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={exportCSV} disabled={!logs.length}
                            className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1.5 hover:text-[var(--color-text)] transition-all disabled:opacity-40">
                            <FontAwesomeIcon icon={faDownload} className="text-[10px]" /> Export CSV
                        </button>
                    </div>
                </div>

                {/* ── STATS ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Total Aktivitas', value: stats.total, icon: faDatabase, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                        { label: 'Hari Ini', value: stats.today, icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'Entri Raport', value: stats.raport, icon: faGraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Entri Poin', value: stats.poin, icon: faClipboardList, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    ].map((s, i) => (
                        <div key={i} className="glass rounded-[1.5rem] p-4 flex items-center gap-3 border border-[var(--color-border)]">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                                <FontAwesomeIcon icon={s.icon} className={`text-sm ${s.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{s.label}</p>
                                <p className={`text-xl font-black font-heading ${s.color}`}>{loading ? '—' : s.value.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── SEARCH + FILTER BAR ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] mb-4 overflow-hidden">
                    <div className="flex items-center gap-2 p-3">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari santri, guru, kelas, aktivitas... (/ untuk fokus)"
                                className="w-full h-9 pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-transparent text-xs font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] transition-all"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                    <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                </button>
                            )}
                        </div>

                        {/* Sort direction */}
                        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                            className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-all shrink-0"
                            title={sortDir === 'desc' ? 'Terbaru dulu' : 'Terlama dulu'}>
                            <FontAwesomeIcon icon={sortDir === 'desc' ? faChevronLeft : faChevronRight} className="text-[9px] rotate-90" />
                            {sortDir === 'desc' ? 'Terbaru' : 'Terlama'}
                        </button>

                        {/* Filter toggle */}
                        <button onClick={() => setShowFilters(v => !v)}
                            className={`h-9 px-3 rounded-xl border text-[10px] font-black flex items-center gap-1.5 transition-all shrink-0 relative ${showFilters || activeFilterCount > 0 ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={faFilter} className="text-[9px]" />
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[8px] font-black flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Expanded filters */}
                    {showFilters && (
                        <div className="border-t border-[var(--color-border)] px-3 py-3 flex flex-wrap gap-2 items-end">
                            {/* Source filter */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Sumber</label>
                                <div className="flex gap-1">
                                    {[{ v: '', l: 'Semua' }, { v: 'raport', l: 'Raport' }, { v: 'poin', l: 'Poin' }].map(opt => (
                                        <button key={opt.v} onClick={() => setFilterSource(opt.v)}
                                            className={`h-7 px-2.5 rounded-lg text-[9px] font-black transition-all border ${filterSource === opt.v ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date range */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Dari Tanggal</label>
                                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                                    className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Sampai</label>
                                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                                    className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all" />
                            </div>

                            {/* Teacher name */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Guru / Musyrif</label>
                                <input type="text" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
                                    placeholder="Nama guru..."
                                    className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all w-36" />
                            </div>

                            {activeFilterCount > 0 && (
                                <button onClick={() => { setFilterSource(''); setFilterAction(''); setFilterTeacher(''); setFilterDateFrom(''); setFilterDateTo('') }}
                                    className="h-7 px-2.5 rounded-lg border border-red-500/30 bg-red-500/8 text-red-500 text-[9px] font-black hover:bg-red-500/15 transition-all flex items-center gap-1">
                                    <FontAwesomeIcon icon={faXmark} className="text-[8px]" /> Reset Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── LOG TABLE ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    {/* Table header */}
                    <div className="hidden md:grid grid-cols-[140px_1fr_140px_140px_120px_40px] gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        {['Waktu', 'Santri & Aktivitas', 'Kelas', 'Oleh', 'Sumber', ''].map((h, i) => (
                            <div key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</div>
                        ))}
                    </div>

                    {/* Body */}
                    {loading ? (
                        <div className="space-y-0 divide-y divide-[var(--color-border)]">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--color-border)] shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-1/3 bg-[var(--color-border)] rounded" />
                                        <div className="h-2.5 w-1/2 bg-[var(--color-border)] rounded opacity-60" />
                                    </div>
                                    <div className="h-3 w-20 bg-[var(--color-border)] rounded hidden md:block" />
                                    <div className="h-3 w-16 bg-[var(--color-border)] rounded hidden md:block" />
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--color-text-muted)]">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                <FontAwesomeIcon icon={faDatabase} className="text-2xl opacity-30" />
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] font-black mb-1">Tidak ada aktivitas</p>
                                <p className="text-[11px] opacity-60">
                                    {debouncedSearch || activeFilterCount > 0
                                        ? 'Coba ubah filter atau kata kunci pencarian.'
                                        : 'Belum ada data aktivitas yang tercatat.'}
                                </p>
                            </div>
                            {(debouncedSearch || activeFilterCount > 0) && (
                                <button onClick={() => { setSearch(''); setFilterSource(''); setFilterAction(''); setFilterTeacher(''); setFilterDateFrom(''); setFilterDateTo('') }}
                                    className="h-8 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black hover:bg-[var(--color-surface-alt)] transition-all">
                                    Reset Semua Filter
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                            {logs.map((entry) => {
                                const evType = EVENT_TYPES[entry._type] || EVENT_TYPES.raport_created
                                const isExpanded = expandedId === entry._id
                                const isRaport = entry._source === 'raport'

                                return (
                                    <div key={entry._id}
                                        className={`transition-colors ${isExpanded ? 'bg-[var(--color-primary)]/[0.02]' : 'hover:bg-[var(--color-surface-alt)]/50'}`}>
                                        {/* Main row */}
                                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_140px_140px_120px_40px] gap-3 px-5 py-3.5 items-center cursor-pointer"
                                            onClick={() => setExpandedId(isExpanded ? null : entry._id)}>

                                            {/* Time */}
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-[var(--color-text)] tabular-nums">
                                                    {fmtRelative(entry._ts)}
                                                </span>
                                                <span className="text-[9px] text-[var(--color-text-muted)] font-medium tabular-nums">
                                                    {fmtDate(entry._ts)}
                                                </span>
                                            </div>

                                            {/* Student + activity */}
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: evType.bg }}>
                                                    <FontAwesomeIcon icon={evType.icon} style={{ color: evType.color, fontSize: 11 }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-black text-[var(--color-text)] truncate">{entry._student}</p>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{entry._detail}</p>
                                                </div>
                                            </div>

                                            {/* Class */}
                                            <div className="hidden md:block">
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] truncate block">{entry._class || '—'}</span>
                                            </div>

                                            {/* Actor */}
                                            <div className="hidden md:block">
                                                <span className="text-[10px] font-bold text-[var(--color-text)] truncate block">{entry._actor}</span>
                                            </div>

                                            {/* Source badge */}
                                            <div className="hidden md:flex items-center gap-1.5">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${isRaport ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                                                    {isRaport ? 'Raport' : 'Poin'}
                                                </span>
                                                {!isRaport && entry._meta?.points !== undefined && (
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${entry._meta.points > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                                                        {entry._meta.points > 0 ? '+' : ''}{entry._meta.points}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Expand icon */}
                                            <div className="hidden md:flex items-center justify-center">
                                                <FontAwesomeIcon icon={faEye}
                                                    className={`text-[10px] transition-colors ${isExpanded ? 'text-[var(--color-primary)]' : 'text-[var(--color-border)] hover:text-[var(--color-text-muted)]'}`} />
                                            </div>
                                        </div>

                                        {/* Expanded detail */}
                                        {isExpanded && (
                                            <div className="px-5 pb-4 pt-0 border-t border-[var(--color-border)]/50">
                                                <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-2">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Detail Aktivitas</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {[
                                                            { label: 'Waktu Tepat', val: fmtDateTime(entry._ts) },
                                                            { label: 'Santri', val: entry._student },
                                                            { label: 'Kelas', val: entry._class || '—' },
                                                            { label: 'Dicatat Oleh', val: entry._actor },
                                                            { label: 'Sumber Data', val: isRaport ? 'Raport Bulanan' : 'Laporan Poin' },
                                                            ...(isRaport ? [
                                                                { label: 'Disimpan Oleh', val: entry._meta?.savedBy || '—' },
                                                                { label: 'Musyrif / Wali Kelas', val: entry._meta?.musyrif || '—' },
                                                                { label: 'Periode', val: `${BULAN.find(b => b.id === entry._meta?.bulan)?.id_str ?? entry._meta?.bulan} ${entry._meta?.tahun}` },
                                                            ] : [
                                                                { label: 'Poin', val: entry._meta?.points > 0 ? `+${entry._meta?.points}` : String(entry._meta?.points ?? '—') },
                                                                { label: 'Catatan', val: entry._meta?.notes || '(tidak ada catatan)' },
                                                            ]),
                                                        ].map((item, i) => (
                                                            <div key={i}>
                                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{item.label}</p>
                                                                <p className="text-[11px] font-bold text-[var(--color-text)] mt-0.5">{item.val}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalRows > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                            <div className="flex items-center gap-4">
                                <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-[0.08em] tabular-nums">
                                    Menampilkan <span className="text-[var(--color-text)]">{fromRow}–{toRow}</span>
                                    <span className="opacity-40 font-medium"> dari </span>
                                    <span className="text-[var(--color-text)]">{totalRows}</span> log
                                </p>
                                <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-[var(--color-border)]">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Baris:</span>
                                    <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                                        className="bg-transparent text-[10px] font-black text-[var(--color-text)] outline-none cursor-pointer">
                                        {PAGE_SIZE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {[
                                    { icon: faAnglesLeft, action: () => setPage(1), disabled: page === 1 },
                                    { icon: faChevronLeft, action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                                ].map((b, i) => (
                                    <button key={i} disabled={b.disabled} onClick={b.action}
                                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-xs disabled:opacity-20 hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center">
                                        <FontAwesomeIcon icon={b.icon} className="text-[10px]" />
                                    </button>
                                ))}
                                <div className="flex gap-0.5 mx-1">
                                    {getPageItems(page, totalPages).map((it, idx) =>
                                        it === '...'
                                            ? <span key={idx} className="w-8 h-8 flex items-center justify-center opacity-30 text-xs">···</span>
                                            : <button key={it} onClick={() => setPage(it)}
                                                className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${it === page ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30' : 'border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}>
                                                {it}
                                            </button>
                                    )}
                                </div>
                                {[
                                    { icon: faChevronRight, action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page >= totalPages },
                                    { icon: faAnglesRight, action: () => setPage(totalPages), disabled: page >= totalPages },
                                ].map((b, i) => (
                                    <button key={i} disabled={b.disabled} onClick={b.action}
                                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-xs disabled:opacity-20 hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center">
                                        <FontAwesomeIcon icon={b.icon} className="text-[10px]" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── INFO NOTE ── */}
                <div className="mt-4 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-start gap-2.5">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-[var(--color-text-muted)] text-xs mt-0.5 shrink-0" />
                    <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                        Log ini menampilkan aktivitas dari tabel <code className="font-mono bg-[var(--color-surface)] px-1 py-0.5 rounded text-[9px]">student_monthly_reports</code> dan <code className="font-mono bg-[var(--color-surface)] px-1 py-0.5 rounded text-[9px]">reports</code>.
                        Untuk audit trail lengkap dengan record create/update/delete terpisah, aktifkan <strong>Supabase Audit Logs</strong> di dashboard database kamu.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}