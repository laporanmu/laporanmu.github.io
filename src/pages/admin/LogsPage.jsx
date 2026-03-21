import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faShieldHalved, faClipboardList, faTriangleExclamation,
    faUserPen, faTrash, faPlus, faFileExport, faFileImport, faFloppyDisk,
    faSearch, faXmark, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faRotateRight, faFilter, faDownload, faCircleInfo,
    faGraduationCap, faEye, faSpinner, faDatabase, faBolt,
    faUserPlus, faUserSlash, faKey, faLink, faLinkSlash,
    faRightFromBracket, faShield, faListCheck, faArrowsRotate,
    faChevronDown, faChevronUp, faEraser,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Pagination from '../../components/ui/Pagination'

// ─── Constants ────────────────────────────────────────────────────────────────

const BULAN = [
    { id: 1, id_str: 'Januari' }, { id: 2, id_str: 'Februari' }, { id: 3, id_str: 'Maret' },
    { id: 4, id_str: 'April' }, { id: 5, id_str: 'Mei' }, { id: 6, id_str: 'Juni' },
    { id: 7, id_str: 'Juli' }, { id: 8, id_str: 'Agustus' }, { id: 9, id_str: 'September' },
    { id: 10, id_str: 'Oktober' }, { id: 11, id_str: 'November' }, { id: 12, id_str: 'Desember' },
]

const ALLOWED_ROLES = ['admin', 'developer', 'superadmin']

const EVENT_TYPES = {
    raport_created: { label: 'Raport Disimpan', color: '#10b981', bg: '#10b98115', icon: faFloppyDisk },
    raport_updated: { label: 'Raport Diupdate', color: '#3b82f6', bg: '#3b82f615', icon: faUserPen },
    raport_deleted: { label: 'Raport Dihapus', color: '#ef4444', bg: '#ef444415', icon: faTrash },
    poin_created: { label: 'Poin Dicatat', color: '#8b5cf6', bg: '#8b5cf615', icon: faPlus },
    poin_deleted: { label: 'Poin Dihapus', color: '#ef4444', bg: '#ef444415', icon: faTrash },
    poin_imported: { label: 'Poin Diimpor', color: '#f59e0b', bg: '#f59e0b15', icon: faFileImport },
    raport_exported: { label: 'Raport Diekspor', color: '#06b6d4', bg: '#06b6d415', icon: faFileExport },
    poin_exported: { label: 'Poin Diekspor', color: '#06b6d4', bg: '#06b6d415', icon: faFileExport },
}

const SYSTEM_EVENT_TYPES = {
    user_created: { label: 'Akun Dibuat', color: '#10b981', bg: '#10b98115', icon: faUserPlus },
    user_deleted: { label: 'Akun Dihapus', color: '#ef4444', bg: '#ef444415', icon: faUserSlash },
    password_reset: { label: 'Password Direset', color: '#f59e0b', bg: '#f59e0b15', icon: faKey },
    session_revoked: { label: 'Sesi Dicabut', color: '#6366f1', bg: '#6366f115', icon: faRightFromBracket },
    session_revoke_all: { label: 'Semua Sesi Dicabut', color: '#8b5cf6', bg: '#8b5cf615', icon: faShield },
    teacher_linked: { label: 'Teacher Di-link', color: '#10b981', bg: '#10b98115', icon: faLink },
    teacher_unlinked: { label: 'Teacher Di-unlink', color: '#6b7280', bg: '#6b728015', icon: faLinkSlash },
    role_changed: { label: 'Role Diubah', color: '#3b82f6', bg: '#3b82f615', icon: faUserPen },
    student_updated: { label: 'Data Siswa Diubah', color: '#8b5cf6', bg: '#8b5cf615', icon: faUserPen },
    settings_changed: { label: 'Settings Diubah', color: '#f59e0b', bg: '#f59e0b15', icon: faFloppyDisk },
    flag_toggled: { label: 'Feature Flag Diubah', color: '#06b6d4', bg: '#06b6d415', icon: faBolt },
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

const TABS = [
    { id: 'activity', label: 'Aktivitas Siswa', icon: faGraduationCap },
    { id: 'system', label: 'Sistem', icon: faShield },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDateTime = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtRelative = (d) => {
    if (!d) return '—'
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'baru saja'
    if (mins < 60) return `${mins} menit lalu`
    if (hours < 24) return `${hours} jam lalu`
    if (days < 7) return `${days} hari lalu`
    return fmtDate(d)
}

// ─── SQL Setup Banner ─────────────────────────────────────────────────────────

const AUDIT_SQL = `-- Buat tabel audit_logs untuk log aktivitas sistem
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  actor_role text,
  target_id text,
  target_name text,
  target_email text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'developer'));

CREATE POLICY "service_insert_audit_logs" ON audit_logs FOR INSERT TO authenticated
WITH CHECK (true);`

function SqlSetupBanner({ onDismiss }) {
    const [copied, setCopied] = useState(false)
    const copy = () => { navigator.clipboard.writeText(AUDIT_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    return (
        <div className="glass rounded-2xl border border-amber-500/25 overflow-hidden">
            <div className="flex items-start gap-3 p-4 bg-amber-500/5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 text-sm">
                    <FontAwesomeIcon icon={faDatabase} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-amber-700">Tabel <code className="bg-amber-100 px-1 rounded text-[11px]">audit_logs</code> belum ada</p>
                    <p className="text-[11px] text-amber-600/80 mt-0.5">Jalankan SQL berikut di Supabase → SQL Editor, lalu tulis ke tabel ini dari edge functions kamu.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={copy} className="h-8 px-3 rounded-xl bg-amber-500 text-white text-[10px] font-black flex items-center gap-1.5 hover:brightness-105 transition-all">
                        <FontAwesomeIcon icon={copied ? faListCheck : faDatabase} className="text-[9px]" />
                        {copied ? 'Disalin!' : 'Salin SQL'}
                    </button>
                    <button onClick={onDismiss} className="w-8 h-8 rounded-xl border border-amber-500/30 text-amber-500 flex items-center justify-center hover:bg-amber-500/10 transition-all">
                        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                    </button>
                </div>
            </div>
            <pre className="px-4 pb-4 text-[9px] font-mono text-amber-700/60 overflow-x-auto leading-relaxed max-h-36 bg-amber-500/3 border-t border-amber-500/20">{AUDIT_SQL}</pre>
        </div>
    )
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ entry, isExpanded, onToggle, isSystem }) {
    const evMap = isSystem ? SYSTEM_EVENT_TYPES : EVENT_TYPES
    const evType = evMap[entry._type] || { label: entry._type, color: '#6b7280', bg: '#6b728015', icon: faDatabase }
    return (
        <div className={`transition-colors ${isExpanded ? 'bg-[var(--color-primary)]/[0.02]' : 'hover:bg-[var(--color-surface-alt)]/50'}`}>
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_140px_120px_40px] gap-3 px-5 py-3.5 items-center cursor-pointer" onClick={onToggle}>
                {/* Time */}
                <div>
                    <p className="text-[11px] font-black text-[var(--color-text)] tabular-nums">{fmtRelative(entry._ts)}</p>
                    <p className="text-[9px] text-[var(--color-text-muted)] tabular-nums">{fmtDate(entry._ts)}</p>
                </div>
                {/* Subject + event */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: evType.bg }}>
                        <FontAwesomeIcon icon={evType.icon} style={{ color: evType.color, fontSize: 11 }} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[12px] font-black text-[var(--color-text)] truncate">{entry._subject}</p>
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full border shrink-0"
                                style={{ background: evType.bg, color: evType.color, borderColor: evType.color + '40' }}>
                                {evType.label}
                            </span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">{entry._detail}</p>
                    </div>
                </div>
                {/* Actor */}
                <div className="hidden md:block">
                    <p className="text-[10px] font-bold text-[var(--color-text)] truncate">{entry._actor}</p>
                    {entry._actorRole && <p className="text-[9px] text-[var(--color-text-muted)]">{entry._actorRole}</p>}
                </div>
                {/* Category */}
                <div className="hidden md:block">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${isSystem
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                        : entry._source === 'raport'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                        {isSystem ? 'Sistem' : entry._source === 'raport' ? 'Raport' : 'Poin'}
                    </span>
                </div>
                {/* Expand */}
                <div className="hidden md:flex items-center justify-center">
                    <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown}
                        className={`text-[10px] ${isExpanded ? 'text-[var(--color-primary)]' : 'text-[var(--color-border)]'}`} />
                </div>
            </div>
            {/* Expanded detail */}
            {isExpanded && (
                <div className="px-5 pb-4 border-t border-[var(--color-border)]/50">
                    <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Detail Aktivitas</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {entry._details.map((item, i) => (
                                <div key={i}>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{item.label}</p>
                                    <p className="text-[11px] font-bold text-[var(--color-text)] mt-0.5 break-words">{item.val}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogsPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()
    const isAllowed = ALLOWED_ROLES.includes(profile?.role)

    const [activeTab, setActiveTab] = useState('activity')

    // Activity data
    const [activityLogs, setActivityLogs] = useState([])
    const [activityLoading, setActivityLoading] = useState(true)
    const [activityTotal, setActivityTotal] = useState(0)
    const [activityStats, setActivityStats] = useState({ total: 0, today: 0, raport: 0, poin: 0 })

    // System data
    const [systemLogs, setSystemLogs] = useState([])
    const [systemLoading, setSystemLoading] = useState(false)
    const [systemTotal, setSystemTotal] = useState(0)
    const [systemStats, setSystemStats] = useState({ total: 0, today: 0, users: 0, security: 0 })
    const [systemTableExists, setSystemTableExists] = useState(true)
    const [showSqlBanner, setShowSqlBanner] = useState(true)

    // Shared filters
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [sortDir, setSortDir] = useState('desc')
    const [showFilters, setShowFilters] = useState(false)
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const [pageSize, setPageSize] = useState(20)

    // Activity filters
    const [filterSource, setFilterSource] = useState('')
    const [filterTeacher, setFilterTeacher] = useState('')

    // System filters
    const [filterEventType, setFilterEventType] = useState('')

    // UI
    const [expandedId, setExpandedId] = useState(null)
    const [autoRefresh, setAutoRefresh] = useState(false)
    const autoRefreshRef = useRef(null)
    const searchRef = useRef(null)

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [search])

    useEffect(() => { setPage(1) }, [filterSource, filterTeacher, filterDateFrom, filterDateTo, sortDir, filterEventType, activeTab])

    useEffect(() => {
        const h = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !isTyping)) { e.preventDefault(); searchRef.current?.focus() }
            if (e.key === 'Escape') { setSearch(''); setExpandedId(null) }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [])

    useEffect(() => {
        clearInterval(autoRefreshRef.current)
        if (autoRefresh) {
            autoRefreshRef.current = setInterval(() => {
                if (activeTab === 'activity') fetchActivityLogs(true)
                else fetchSystemLogs(true)
            }, 30000)
        }
        return () => clearInterval(autoRefreshRef.current)
    }, [autoRefresh, activeTab])

    const fetchActivityLogs = useCallback(async (quiet = false) => {
        if (!isAllowed) return
        if (!quiet) setActivityLoading(true)
        try {
            const raportQ = supabase
                .from('student_monthly_reports')
                .select('id, month, year, musyrif_name, updated_by_name, created_at, updated_at, students(name, classes(name))')
                .order('updated_at', { ascending: sortDir === 'asc' })

            const poinQ = supabase
                .from('reports')
                .select('id, points, notes, reported_at, teacher_name, violation_types(name), students(name, classes(name))')
                .order('reported_at', { ascending: sortDir === 'asc' })

            if (filterDateFrom) { raportQ.gte('updated_at', filterDateFrom); poinQ.gte('reported_at', filterDateFrom) }
            if (filterDateTo) { const t = filterDateTo + 'T23:59:59'; raportQ.lte('updated_at', t); poinQ.lte('reported_at', t) }
            if (filterTeacher) poinQ.ilike('teacher_name', `%${filterTeacher}%`)

            const [raportRes, poinRes] = await Promise.all([
                filterSource === 'poin' ? Promise.resolve({ data: [] }) : raportQ.limit(500),
                filterSource === 'raport' ? Promise.resolve({ data: [] }) : poinQ.limit(500),
            ])

            const raportEntries = (raportRes.data || []).map(r => ({
                _id: `raport_${r.id}`, _source: 'raport', _type: 'raport_created',
                _ts: r.updated_at || r.created_at,
                _actor: r.updated_by_name || r.musyrif_name || '—', _actorRole: 'Guru/Musyrif',
                _subject: r.students?.name || '—',
                _detail: `Raport ${BULAN.find(b => b.id === r.month)?.id_str ?? r.month} ${r.year}`,
                _details: [
                    { label: 'Waktu', val: fmtDateTime(r.updated_at || r.created_at) },
                    { label: 'Santri', val: r.students?.name || '—' },
                    { label: 'Kelas', val: r.students?.classes?.name || '—' },
                    { label: 'Periode', val: `${BULAN.find(b => b.id === r.month)?.id_str ?? r.month} ${r.year}` },
                    { label: 'Musyrif', val: r.musyrif_name || '—' },
                    { label: 'Disimpan Oleh', val: r.updated_by_name || '—' },
                ],
            }))

            const poinEntries = (poinRes.data || []).map(r => ({
                _id: `poin_${r.id}`, _source: 'poin', _type: 'poin_created',
                _ts: r.reported_at,
                _actor: r.teacher_name || '—', _actorRole: 'Guru',
                _subject: r.students?.name || '—',
                _detail: r.violation_types?.name || '—',
                _details: [
                    { label: 'Waktu', val: fmtDateTime(r.reported_at) },
                    { label: 'Santri', val: r.students?.name || '—' },
                    { label: 'Kelas', val: r.students?.classes?.name || '—' },
                    { label: 'Poin', val: r.points > 0 ? `+${r.points}` : String(r.points ?? '—') },
                    { label: 'Jenis', val: r.violation_types?.name || '—' },
                    { label: 'Catatan', val: r.notes || '(tidak ada)' },
                    { label: 'Dicatat Oleh', val: r.teacher_name || '—' },
                ],
            }))

            let combined = [...raportEntries, ...poinEntries]
                .sort((a, b) => sortDir === 'desc' ? new Date(b._ts) - new Date(a._ts) : new Date(a._ts) - new Date(b._ts))

            if (debouncedSearch) {
                const q = debouncedSearch.toLowerCase()
                combined = combined.filter(e =>
                    e._subject.toLowerCase().includes(q) ||
                    e._actor.toLowerCase().includes(q) ||
                    e._detail.toLowerCase().includes(q)
                )
            }

            const todayStr = new Date().toISOString().slice(0, 10)
            setActivityStats({
                total: combined.length, today: combined.filter(e => (e._ts || '').slice(0, 10) === todayStr).length,
                raport: raportEntries.length, poin: poinEntries.length,
            })
            setActivityTotal(combined.length)
            const from = (page - 1) * pageSize
            setActivityLogs(combined.slice(from, from + pageSize))
        } catch (e) {
            addToast('Gagal memuat logs: ' + e.message, 'error')
        } finally {
            if (!quiet) setActivityLoading(false)
        }
    }, [isAllowed, page, pageSize, debouncedSearch, filterSource, filterTeacher, filterDateFrom, filterDateTo, sortDir, addToast])

    const fetchSystemLogs = useCallback(async (quiet = false) => {
        if (!isAllowed) return
        if (!quiet) setSystemLoading(true)
        try {
            let q = supabase.from('audit_logs').select('*', { count: 'exact' })
                .order('created_at', { ascending: sortDir === 'asc' })
            if (filterDateFrom) q = q.gte('created_at', filterDateFrom)
            if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59')
            if (filterEventType) q = q.eq('event_type', filterEventType)
            if (debouncedSearch) q = q.or(`actor_name.ilike.%${debouncedSearch}%,target_name.ilike.%${debouncedSearch}%,target_email.ilike.%${debouncedSearch}%`)
            q = q.range((page - 1) * pageSize, page * pageSize - 1)

            const { data, error, count } = await q

            if (error) {
                if (error.message?.includes('does not exist') || error.code === '42P01') {
                    setSystemTableExists(false); setSystemLogs([]); return
                }
                throw error
            }

            setSystemTableExists(true)
            const normalized = (data || []).map(r => ({
                _id: r.id, _source: 'system', _type: r.event_type,
                _ts: r.created_at,
                _actor: r.actor_name || '—', _actorRole: r.actor_role || '—',
                _subject: r.target_name || r.target_email || '—',
                _detail: SYSTEM_EVENT_TYPES[r.event_type]?.label || r.event_type,
                _details: [
                    { label: 'Waktu', val: fmtDateTime(r.created_at) },
                    { label: 'Event', val: SYSTEM_EVENT_TYPES[r.event_type]?.label || r.event_type },
                    { label: 'Oleh', val: r.actor_name || '—' },
                    { label: 'Role Aktor', val: r.actor_role || '—' },
                    { label: 'Target', val: r.target_name || '—' },
                    { label: 'Email Target', val: r.target_email || '—' },
                    ...(r.metadata && Object.keys(r.metadata).length ? [{ label: 'Metadata', val: JSON.stringify(r.metadata) }] : []),
                ],
            }))

            const todayStr = new Date().toISOString().slice(0, 10)
            setSystemStats({
                total: count || 0,
                today: normalized.filter(e => (e._ts || '').slice(0, 10) === todayStr).length,
                users: normalized.filter(e => ['user_created', 'user_deleted', 'role_changed'].includes(e._type)).length,
                security: normalized.filter(e => ['session_revoked', 'session_revoke_all', 'password_reset'].includes(e._type)).length,
            })
            setSystemTotal(count || 0)
            setSystemLogs(normalized)
        } catch (e) {
            addToast('Gagal memuat system logs: ' + e.message, 'error')
        } finally {
            if (!quiet) setSystemLoading(false)
        }
    }, [isAllowed, page, pageSize, debouncedSearch, filterEventType, filterDateFrom, filterDateTo, sortDir, addToast])

    useEffect(() => {
        if (activeTab === 'activity') fetchActivityLogs()
        else fetchSystemLogs()
    }, [activeTab, fetchActivityLogs, fetchSystemLogs])

    const exportCSV = useCallback(() => {
        const logs = activeTab === 'activity' ? activityLogs : systemLogs
        if (!logs.length) return
        const rows = logs.map(e => [fmtDateTime(e._ts), e._type, e._subject, e._detail, e._actor, e._actorRole || ''])
        const csv = [['Waktu', 'Event', 'Subjek', 'Detail', 'Oleh', 'Role'], ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
        a.download = `logs_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
        a.click(); URL.revokeObjectURL(a.href)
        addToast('Log diekspor ✓', 'success')
    }, [activityLogs, systemLogs, activeTab, addToast])

    const isActivity = activeTab === 'activity'
    const logs = isActivity ? activityLogs : systemLogs
    const loading = isActivity ? activityLoading : systemLoading
    const totalRows = isActivity ? activityTotal : systemTotal
    const stats = isActivity ? activityStats : systemStats
    const totalPages = Math.ceil(totalRows / pageSize)
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)
    const activeFilterCount = isActivity
        ? [filterSource, filterTeacher, filterDateFrom, filterDateTo].filter(Boolean).length
        : [filterEventType, filterDateFrom, filterDateTo].filter(Boolean).length

    const resetFilters = () => { setSearch(''); setFilterSource(''); setFilterTeacher(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterEventType(''); setPage(1) }

    // ── Clear system logs
    const [clearConfirm, setClearConfirm] = useState(false)
    const [clearing, setClearing] = useState(false)

    const handleClearLogs = async () => {
        setClearing(true)
        try {
            // Build query with active filters — if any, only delete filtered; else delete all
            let q = supabase.from('audit_logs').delete()
            if (filterDateFrom) q = q.gte('created_at', filterDateFrom)
            if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59')
            if (filterEventType) q = q.eq('event_type', filterEventType)
            // Supabase requires a filter for delete — use created_at >= epoch if no filter
            if (!filterDateFrom && !filterDateTo && !filterEventType) {
                q = q.gte('created_at', '2000-01-01')
            }
            const { error } = await q
            if (error) throw error
            addToast('Log sistem berhasil dihapus ✓', 'success')
            setClearConfirm(false)
            fetchSystemLogs()
        } catch (e) {
            addToast('Gagal hapus log: ' + e.message, 'error')
        } finally {
            setClearing(false)
        }
    }

    if (!isAllowed) return (
        <DashboardLayout title="Audit Logs">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-3xl text-red-500" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-black text-[var(--color-text)] mb-2">Akses Terbatas</h2>
                    <p className="text-[var(--color-text-muted)] text-sm">Halaman ini hanya untuk <span className="font-black text-red-500">Admin</span> atau <span className="font-black text-red-500">Developer</span>.</p>
                </div>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout title="Audit Logs">
            <div className="p-4 md:p-6 space-y-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['Admin', 'Audit Logs']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Audit Logs</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 uppercase tracking-widest">Admin Only</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Riwayat aktivitas siswa dan perubahan sistem.
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setAutoRefresh(v => !v)}
                            className={`h-9 px-3 rounded-xl border text-[10px] font-black flex items-center gap-2 transition-all ${autoRefresh ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            title="Auto-refresh 30 detik">
                            <FontAwesomeIcon icon={faArrowsRotate} className={autoRefresh ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
                            <span className="hidden sm:inline">{autoRefresh ? 'Auto On' : 'Auto-refresh'}</span>
                        </button>
                        <button onClick={() => isActivity ? fetchActivityLogs() : fetchSystemLogs()} disabled={loading}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center hover:text-[var(--color-text)] transition-all disabled:opacity-50" title="Refresh (R)">
                            <FontAwesomeIcon icon={faRotateRight} className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={exportCSV} disabled={!logs.length}
                            className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1.5 hover:text-[var(--color-text)] transition-all disabled:opacity-40">
                            <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        {/* Clear — hanya di tab sistem, hanya developer */}
                        {!isActivity && profile?.role === 'developer' && (
                            clearConfirm ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10">
                                    <span className="text-[10px] font-bold text-red-600 hidden sm:inline">Yakin hapus?</span>
                                    <button onClick={handleClearLogs} disabled={clearing}
                                        className="h-7 px-2.5 rounded-lg bg-red-500 text-white text-[9px] font-black hover:bg-red-600 transition-all flex items-center gap-1 disabled:opacity-60">
                                        {clearing ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[8px]" /> : null}
                                        {activeFilterCount > 0 ? 'Hapus yang difilter' : 'Hapus Semua'}
                                    </button>
                                    <button onClick={() => setClearConfirm(false)}
                                        className="h-7 w-7 rounded-lg border border-red-500/30 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-all">
                                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setClearConfirm(true)} disabled={!systemTotal}
                                    className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-500 text-[10px] font-black flex items-center gap-1.5 hover:bg-red-500/15 transition-all disabled:opacity-30">
                                    <FontAwesomeIcon icon={faEraser} className="text-[10px]" />
                                    <span className="hidden sm:inline">Clear Log</span>
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 w-fit">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => { setActiveTab(t.id); setSearch(''); setExpandedId(null) }}
                            className={`relative h-8 px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${activeTab === t.id ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={t.icon} className="text-[10px]" />
                            {t.label}
                            {t.id === 'system' && !systemTableExists && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                            )}
                        </button>
                    ))}
                </div>

                {/* SQL banner */}
                {activeTab === 'system' && !systemTableExists && showSqlBanner && (
                    <SqlSetupBanner onDismiss={() => setShowSqlBanner(false)} />
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(isActivity ? [
                        { label: 'Total Aktivitas', value: stats.total, icon: faDatabase, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                        { label: 'Hari Ini', value: stats.today, icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'Entri Raport', value: stats.raport, icon: faGraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Entri Poin', value: stats.poin, icon: faClipboardList, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    ] : [
                        { label: 'Total Log', value: stats.total, icon: faDatabase, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                        { label: 'Hari Ini', value: stats.today, icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'Aktivitas User', value: stats.users, icon: faUserPen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                        { label: 'Keamanan', value: stats.security, icon: faShield, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    ]).map((s, i) => (
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

                {/* Search + Filter bar */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="flex items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                            <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder={isActivity ? 'Cari santri, guru, aktivitas...' : 'Cari nama, email user...'}
                                className="w-full h-9 pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-transparent text-xs font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] transition-all" />
                            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>}
                        </div>
                        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                            className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-all shrink-0">
                            <FontAwesomeIcon icon={sortDir === 'desc' ? faChevronLeft : faChevronRight} className="text-[9px] rotate-90" />
                            {sortDir === 'desc' ? 'Terbaru' : 'Terlama'}
                        </button>
                        <button onClick={() => setShowFilters(v => !v)}
                            className={`h-9 px-3 rounded-xl border text-[10px] font-black flex items-center gap-1.5 transition-all shrink-0 relative ${showFilters || activeFilterCount > 0 ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={faFilter} className="text-[9px]" />
                            Filter
                            {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[8px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="border-t border-[var(--color-border)] px-3 py-3 flex flex-wrap gap-2 items-end">
                            {isActivity && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Sumber</label>
                                        <div className="flex gap-1">
                                            {[{ v: '', l: 'Semua' }, { v: 'raport', l: 'Raport' }, { v: 'poin', l: 'Poin' }].map(opt => (
                                                <button key={opt.v} onClick={() => setFilterSource(opt.v)}
                                                    className={`h-7 px-2.5 rounded-lg text-[9px] font-black border transition-all ${filterSource === opt.v ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                    {opt.l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Guru</label>
                                        <input type="text" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} placeholder="Nama guru..."
                                            className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[9px] outline-none focus:border-[var(--color-primary)] w-28" />
                                    </div>
                                </>
                            )}
                            {!isActivity && (
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tipe Event</label>
                                    <select value={filterEventType} onChange={e => setFilterEventType(e.target.value)}
                                        className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[9px] font-black outline-none focus:border-[var(--color-primary)]">
                                        <option value="">Semua Event</option>
                                        {Object.entries(SYSTEM_EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Dari</label>
                                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                                    className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[9px] outline-none focus:border-[var(--color-primary)]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Sampai</label>
                                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                                    className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[9px] outline-none focus:border-[var(--color-primary)]" />
                            </div>
                            {activeFilterCount > 0 && (
                                <button onClick={resetFilters} className="h-7 px-2.5 rounded-lg border border-red-500/30 bg-red-500/8 text-red-500 text-[9px] font-black flex items-center gap-1">
                                    <FontAwesomeIcon icon={faXmark} className="text-[8px]" /> Reset
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Log table */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="hidden md:grid grid-cols-[140px_1fr_140px_120px_40px] gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        {['Waktu', isActivity ? 'Santri & Aktivitas' : 'Target & Event', 'Oleh', 'Kategori', ''].map((h, i) => (
                            <div key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="divide-y divide-[var(--color-border)]">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--color-border)] shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-1/3 bg-[var(--color-border)] rounded" />
                                        <div className="h-2.5 w-1/2 bg-[var(--color-border)] rounded opacity-60" />
                                    </div>
                                    <div className="h-3 w-20 bg-[var(--color-border)] rounded hidden md:block" />
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                <FontAwesomeIcon icon={faDatabase} className="text-2xl text-[var(--color-text-muted)] opacity-30" />
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Tidak ada log</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] opacity-60">
                                    {!systemTableExists && !isActivity ? 'Buat tabel audit_logs terlebih dahulu.' : debouncedSearch || activeFilterCount > 0 ? 'Coba ubah filter.' : 'Belum ada data tercatat.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                            {logs.map(entry => (
                                <LogRow key={entry._id} entry={entry}
                                    isExpanded={expandedId === entry._id}
                                    onToggle={() => setExpandedId(expandedId === entry._id ? null : entry._id)}
                                    isSystem={!isActivity} />
                            ))}
                        </div>
                    )}

                    <Pagination
                        totalRows={totalRows}
                        page={page}
                        pageSize={pageSize}
                        setPage={setPage}
                        setPageSize={setPageSize}
                        label="log"
                        jumpPage={jumpPage}
                        setJumpPage={setJumpPage}
                    />
                </div>

                {/* Info note */}
                <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-start gap-2.5">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-[var(--color-text-muted)] text-xs mt-0.5 shrink-0" />
                    <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                        {isActivity
                            ? <>Log dari tabel <code className="bg-[var(--color-surface)] px-1 rounded font-mono text-[9px]">student_monthly_reports</code> dan <code className="bg-[var(--color-surface)] px-1 rounded font-mono text-[9px]">reports</code>.</>
                            : <>Log dari tabel <code className="bg-[var(--color-surface)] px-1 rounded font-mono text-[9px]">audit_logs</code>. Tulis ke tabel ini dari edge functions untuk mencatat aktivitas admin secara otomatis.</>
                        }
                    </p>
                </div>

                <div className="h-8" />
            </div>
        </DashboardLayout>
    )
}