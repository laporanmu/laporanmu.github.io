import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import StatsCarousel from '../../components/StatsCarousel'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faShieldHalved, faClipboardList, faTriangleExclamation,
    faUserPen, faTrash, faPlus, faFileExport, faFileImport, faFloppyDisk,
    faSearch, faXmark, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faRotateRight, faFilter, faDownload, faCircleInfo,
    faGraduationCap, faEye, faSpinner, faDatabase, faBolt,
    faUserPlus, faUserSlash, faKey, faLink, faLinkSlash,
    faRightFromBracket, faShield, faListCheck,
    faChevronDown, faChevronUp, faEraser,
    faUserClock, faArrowRight, faUsers, faDotCircle, faPenToSquare,
    faDoorOpen, faSignOutAlt, faSignInAlt, faUserFriends,
    faChalkboardTeacher, faBriefcase, faUserGraduate,
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

// Action styles berdasarkan schema audit_logs yang asli
// Kolom: id, user_id, action, table_name, record_id, old_data, new_data, ip_address, created_at
const ACTION_STYLES = {
    INSERT: { label: 'Dibuat', color: '#10b981', bg: '#10b98115', icon: faPlus },
    UPDATE: { label: 'Diubah', color: '#3b82f6', bg: '#3b82f615', icon: faUserPen },
    DELETE: { label: 'Dihapus', color: '#ef4444', bg: '#ef444415', icon: faTrash },
    default: { label: 'Aksi', color: '#6b7280', bg: '#6b728015', icon: faDatabase },
}

// Nama tampilan per tabel untuk Audit Trail
const TABLE_LABELS = {
    students: 'Data Siswa', teachers: 'Data Guru', classes: 'Data Kelas',
    reports: 'Poin Pelanggaran', student_monthly_reports: 'Raport Bulanan',
    violation_types: 'Jenis Poin', academic_years: 'Tahun Pelajaran',
    profiles: 'Profil & Akun', news: 'Informasi/News', audit_logs: 'Audit Log',
    gate_logs: 'Log Gerbang', attendance_weekly: 'Absensi',
    user_preferences: 'Pengaturan User',
}

const AUDIT_ACTION_STYLES = {
    update: { label: 'Diubah', color: '#3b82f6', bg: '#3b82f615', icon: faPenToSquare },
    create: { label: 'Dibuat', color: '#10b981', bg: '#10b98115', icon: faPlus },
    delete: { label: 'Dihapus', color: '#ef4444', bg: '#ef444415', icon: faTrash },
    import: { label: 'Diimpor', color: '#f59e0b', bg: '#f59e0b115', icon: faFileImport },
    default: { label: 'Diubah', color: '#6b7280', bg: '#6b728015', icon: faDotCircle },
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

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
const fmtTime = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
}
const durasi = (cin, cout) => {
    if (!cin || !cout) return null
    const diff = new Date(cout) - new Date(cin)
    if (diff <= 0) return null
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}j ${m}m` : `${m}m`
}

// ─── SQL Setup Banner ─────────────────────────────────────────────────────────

const AUDIT_SQL = `-- Schema audit_logs yang digunakan aplikasi ini
-- id, user_id, action, table_name, record_id, old_data, new_data, ip_address, created_at
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,         -- INSERT | UPDATE | DELETE
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'developer'));

CREATE POLICY "any_insert_audit_logs" ON audit_logs FOR INSERT TO authenticated
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

// ─── Visual Diff Component ──────────────────────────────────────────────────
function VisualDiff({ oldData, newData }) {
    if (!oldData && !newData) return null
    
    // Get all unique keys from both objects
    const keys = Array.from(new Set([
        ...Object.keys(oldData || {}),
        ...Object.keys(newData || {})
    ])).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && !k.startsWith('_'))

    if (keys.length === 0) return <p className="text-[10px] text-[var(--color-text-muted)] italic">Tidak ada perubahan field</p>

    return (
        <div className="grid grid-cols-1 gap-1.5 mt-2">
            <div className="grid grid-cols-[100px_1fr_1fr] gap-3 px-3 py-1.5 bg-[var(--color-surface)]/50 rounded-t-lg border-b border-[var(--color-border)]/30 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                <div>Field</div>
                <div>Data Lama</div>
                <div>Data Baru</div>
            </div>
            {keys.map(key => {
                const oldVal = oldData?.[key]
                const newVal = newData?.[key]
                const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal)
                const displayOld = oldVal === null || oldVal === undefined ? '—' : (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal))
                const displayNew = newVal === null || newVal === undefined ? '—' : (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal))

                return (
                    <div key={key} className={`grid grid-cols-[100px_1fr_1fr] gap-3 px-3 py-2 rounded-lg text-[10px] items-start transition-colors ${isChanged ? 'bg-amber-500/[0.03]' : 'opacity-60'}`}>
                        <div className="font-black text-[var(--color-text-muted)] break-all">{key}</div>
                        <div className={`px-2 py-0.5 rounded-md break-all font-mono ${isChanged && oldVal !== undefined ? 'bg-red-500/10 text-red-600 line-through' : ''}`}>
                            {displayOld}
                        </div>
                        <div className={`px-2 py-0.5 rounded-md break-all font-mono font-bold ${isChanged ? 'bg-emerald-500/10 text-emerald-600' : 'text-[var(--color-text)]'}`}>
                            {displayNew}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function LogRow({ entry, isExpanded, onToggle, isSystem, onRestore }) {
    const evType = isSystem
        ? (ACTION_STYLES[entry._type?.toUpperCase()] || ACTION_STYLES.default)
        : (EVENT_TYPES[entry._type] || { label: entry._type, color: '#6b7280', bg: '#6b728015', icon: faDatabase })
    return (
        <div className={`transition-all duration-300 ${isExpanded ? 'bg-[var(--color-primary)]/[0.03] shadow-inner ring-1 ring-inset ring-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/50'}`}>
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_140px_120px_40px] gap-3 px-5 py-4 items-center cursor-pointer" onClick={onToggle}>
                {/* Time */}
                <div>
                    <p className="text-[11px] font-black text-[var(--color-text)] tabular-nums">{fmtRelative(entry._ts)}</p>
                    <p className="text-[9px] text-[var(--color-text-muted)] tabular-nums">{fmtDateTime(entry._ts).split(',')[0]}</p>
                </div>
                {/* Subject + event */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: evType.bg }}>
                        <FontAwesomeIcon icon={evType.icon} style={{ color: evType.color, fontSize: 13 }} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-black text-[var(--color-text)] truncate">{entry._subject}</p>
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-tight"
                                style={{ background: evType.bg, color: evType.color, borderColor: evType.color + '40' }}>
                                {evType.label}
                            </span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)] truncate flex items-center gap-1.5">
                            {isSystem && entry._tableName && (
                                <span className="font-bold text-[var(--color-primary)] opacity-70">
                                    {TABLE_LABELS[entry._tableName] || entry._tableName}
                                </span>
                            )}
                            {isSystem && <span className="opacity-30">·</span>}
                            {entry._detail}
                        </p>
                    </div>
                </div>
                {/* Actor */}
                <div className="hidden md:block">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faShield} className="text-[8px] opacity-40" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-[var(--color-text)] truncate">{entry._actor}</p>
                            <p className="text-[8px] font-bold text-[var(--color-primary)] opacity-70 uppercase tracking-wider">{entry._actorRole}</p>
                        </div>
                    </div>
                </div>
                {/* Category */}
                <div className="hidden md:block">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${isSystem
                        ? (entry._rawSource === 'OPERATIONAL' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-600')
                        : entry._source === 'raport'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                        {isSystem ? (entry._rawSource === 'OPERATIONAL' ? 'Operational' : 'Security') : entry._source === 'raport' ? 'Raport' : 'Operational'}
                    </span>
                </div>
                {/* Expand */}
                <div className="hidden md:flex items-center justify-center">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-border)]'}`}>
                        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-[10px]" />
                    </div>
                </div>
            </div>
            {/* Expanded detail */}
            {isExpanded && (
                <div className="px-5 pb-6 border-t border-[var(--color-border)]/40 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
                        {/* Main Detail Area */}
                        <div className="space-y-4">
                            {/* Visual Diff for System Updates */}
                            {isSystem && entry._type === 'UPDATE' && (entry._oldData || entry.new_data) && (
                                <div className="p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]/60">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Visual Comparison (Diff)</p>
                                        <div className="flex gap-2">
                                            <span className="flex items-center gap-1 text-[8px] font-bold text-red-500"><div className="w-1.5 h-1.5 rounded-full bg-red-500"/> Removed</span>
                                            <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-500"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Added</span>
                                        </div>
                                    </div>
                                    <VisualDiff oldData={entry._oldData} newData={entry._newData} />
                                </div>
                            )}

                            {/* Standard Grid Detail */}
                            <div className="p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]/60">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Metadata & Konteks</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                    {entry._details.filter(d => !['Data Lama', 'Data Baru'].includes(d.label)).map((item, i) => (
                                        <div key={i}>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">{item.label}</p>
                                            <p className="text-[11px] font-bold text-[var(--color-text)] mt-0.5 break-words line-clamp-2" title={item.val}>{item.val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Raw Data Toggle (Optional) */}
                            {isSystem && entry._type !== 'UPDATE' && (entry._oldData || entry._newData) && (
                                <div className="p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]/60 overflow-hidden">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Raw Data Log</p>
                                     <pre className="text-[10px] font-mono p-3 bg-black/5 dark:bg-white/5 rounded-lg overflow-x-auto max-h-48 leading-relaxed">
                                         {JSON.stringify(entry._newData || entry._oldData, null, 2)}
                                     </pre>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Info (Security/Tech Context) */}
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Security & Network</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faShieldHalved} className="text-[10px]" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">IP Address</p>
                                            <p className="text-[11px] font-mono font-bold text-[var(--color-text)]">{entry._ip || 'Internal System'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Impact Level</p>
                                            <p className="text-[11px] font-bold text-[var(--color-text)]">
                                                {entry._type === 'DELETE' ? 'Critical (Permanent)' : entry._type === 'INSERT' ? 'Normal' : 'Observation'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Restore button */}
                            {isSystem && entry._action === 'DELETE' && entry._oldData && onRestore && (
                                <button onClick={(e) => { e.stopPropagation(); onRestore(entry) }}
                                    className="w-full h-11 rounded-xl bg-amber-500 text-white text-[11px] font-black flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">
                                    <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
                                    Pulihkan Data Terhapus
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


// ─── Audit Trail Tab ──────────────────────────────────────────────────────────

function AuditTrailTab() {
    const { addToast } = useToast()
    const [searchVal, setSearchVal] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [students, setStudents] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [auditLogs, setAuditLogs] = useState([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const searchRef = useRef(null)

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchVal.trim()), 350)
        return () => clearTimeout(t)
    }, [searchVal])

    useEffect(() => {
        if (!debouncedSearch || selectedStudent) return
        setSearchLoading(true)
        supabase.from('students')
            .select('id, name, nis, classes(name)')
            .ilike('name', `%${debouncedSearch}%`)
            .is('deleted_at', null)
            .limit(10)
            .then(({ data }) => {
                setStudents(data || [])
                setShowDropdown(true)
                setSearchLoading(false)
            })
    }, [debouncedSearch, selectedStudent])

    const selectStudent = async (s) => {
        setSelectedStudent(s)
        setSearchVal(s.name)
        setShowDropdown(false)
        setStudents([])
        setAuditLoading(true)
        try {
            const { data, error } = await supabase
                .from('student_audit_log')
                .select('*')
                .eq('student_id', s.id)
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) throw error
            setAuditLogs(data || [])
        } catch (e) {
            addToast('Gagal memuat jejak: ' + e.message, 'error')
        } finally {
            setAuditLoading(false)
        }
    }

    const clearStudent = () => {
        setSelectedStudent(null)
        setAuditLogs([])
        setSearchVal('')
        setDebouncedSearch('')
        setTimeout(() => searchRef.current?.focus(), 50)
    }

    const exportAudit = () => {
        if (!auditLogs.length || !selectedStudent) return
        const rows = [['Waktu', 'Aksi', 'Field', 'Nilai Lama', 'Nilai Baru', 'Diubah Oleh', 'Catatan'],
        ...auditLogs.map(l => [fmtDateTime(l.created_at), l.action, l.field || '—', l.old_value || '—', l.new_value || '—', l.changed_by || '—', l.note || '—'])]
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
        a.download = `audit_${selectedStudent.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        addToast('Jejak diekspor ✓', 'success')
    }

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups = {}
        auditLogs.forEach(l => {
            const day = l.created_at?.slice(0, 10) || 'unknown'
            if (!groups[day]) groups[day] = []
            groups[day].push(l)
        })
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    }, [auditLogs])

    return (
        <div className="space-y-4">
            {/* Search bar */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Cari Siswa</p>
                <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                    {searchLoading && <FontAwesomeIcon icon={faSpinner} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm animate-spin" />}
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchVal}
                        onChange={e => { setSearchVal(e.target.value); setSelectedStudent(null) }}
                        onFocus={() => students.length > 0 && setShowDropdown(true)}
                        placeholder="Ketik nama siswa..."
                        className="w-full h-10 pl-9 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] transition-all"
                    />
                    {searchVal && (
                        <button onClick={clearStudent} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                            <FontAwesomeIcon icon={faXmark} className="text-xs" />
                        </button>
                    )}
                    {/* Dropdown */}
                    {showDropdown && students.length > 0 && !selectedStudent && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-20">
                            {students.map(s => (
                                <button key={s.id} onClick={() => selectStudent(s)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-alt)] transition-colors text-left">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                                        <FontAwesomeIcon icon={faUsers} className="text-[10px] text-[var(--color-primary)]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-black text-[var(--color-text)] truncate">{s.name}</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">{s.classes?.name || 'Tanpa kelas'} {s.nis ? `· ${s.nis}` : ''}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {showDropdown && students.length === 0 && debouncedSearch && !searchLoading && !selectedStudent && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl p-4 z-20 text-center">
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Siswa tidak ditemukan</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {!selectedStudent && (
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <FontAwesomeIcon icon={faUserClock} className="text-2xl text-[var(--color-primary)]" />
                    </div>
                    <div className="text-center">
                        <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Jejak Perubahan Siswa</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] opacity-70 max-w-xs">Cari nama siswa di atas untuk melihat seluruh riwayat perubahan data mereka.</p>
                    </div>
                </div>
            )}

            {/* Student header + timeline */}
            {selectedStudent && (
                <div className="space-y-3">
                    {/* Student info bar */}
                    <div className="glass rounded-2xl border border-[var(--color-border)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black text-base shrink-0">
                                {selectedStudent.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-[var(--color-text)]">{selectedStudent.name}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                    {selectedStudent.classes?.name || 'Tanpa kelas'}
                                    {selectedStudent.nis ? ` · NIS: ${selectedStudent.nis}` : ''}
                                    {' · '}<span className="font-bold">{auditLogs.length} perubahan tercatat</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {auditLogs.length > 0 && (
                                <button onClick={exportAudit}
                                    className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-colors">
                                    <FontAwesomeIcon icon={faDownload} className="text-[9px]" /> Export CSV
                                </button>
                            )}
                            <button onClick={clearStudent}
                                className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-colors">
                                <FontAwesomeIcon icon={faXmark} className="text-[9px]" /> Ganti Siswa
                            </button>
                        </div>
                    </div>

                    {/* Timeline */}
                    {auditLoading ? (
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] flex items-center justify-center py-20">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                <FontAwesomeIcon icon={faDatabase} className="text-xl text-[var(--color-text-muted)] opacity-30" />
                            </div>
                            <p className="text-[12px] font-black text-[var(--color-text)]">Tidak ada jejak perubahan</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] opacity-60">Belum ada perubahan data yang tercatat untuk siswa ini.</p>
                        </div>
                    ) : (
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                            {groupedLogs.map(([day, entries]) => (
                                <div key={day}>
                                    {/* Date group header */}
                                    <div className="px-5 py-2.5 bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)] flex items-center gap-2">
                                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] shrink-0">
                                            {fmtDate(day + 'T00:00:00')}
                                        </span>
                                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                                    </div>
                                    {/* Entries */}
                                    <div className="divide-y divide-[var(--color-border)]/50">
                                        {entries.map(log => {
                                            const actionKey = log.action?.toLowerCase() || 'default'
                                            const style = AUDIT_ACTION_STYLES[actionKey] || AUDIT_ACTION_STYLES.default
                                            return (
                                                <div key={log.id} className="px-5 py-3.5 flex items-start gap-4 hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                                                    {/* Icon */}
                                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: style.bg }}>
                                                        <FontAwesomeIcon icon={style.icon} style={{ color: style.color, fontSize: 11 }} />
                                                    </div>
                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded border"
                                                                style={{ background: style.bg, color: style.color, borderColor: style.color + '40' }}>
                                                                {style.label}
                                                            </span>
                                                            {log.field && (
                                                                <span className="text-[11px] font-black text-[var(--color-text)]">{log.field}</span>
                                                            )}
                                                        </div>
                                                        {/* Old → New value */}
                                                        {(log.old_value || log.new_value) && (
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                {log.old_value && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500 font-mono line-through">
                                                                        {log.old_value}
                                                                    </span>
                                                                )}
                                                                {log.old_value && log.new_value && (
                                                                    <FontAwesomeIcon icon={faArrowRight} className="text-[8px] text-[var(--color-text-muted)] shrink-0" />
                                                                )}
                                                                {log.new_value && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-mono font-bold">
                                                                        {log.new_value}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* Meta */}
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            {log.changed_by && (
                                                                <span className="text-[9px] text-[var(--color-text-muted)] font-medium flex items-center gap-1">
                                                                    <FontAwesomeIcon icon={faUserPen} className="text-[8px]" />
                                                                    {log.changed_by}
                                                                </span>
                                                            )}
                                                            {log.note && (
                                                                <span className="text-[9px] text-[var(--color-text-muted)] opacity-70 italic">"{log.note}"</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Time */}
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] tabular-nums" title={fmtDateTime(log.created_at)}>
                                                            {fmtRelative(log.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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

    const [activeTab, setActiveTab] = useState('operational')

    // Activity data
    const [activityLogs, setActivityLogs] = useState([])
    const [activityLoading, setActivityLoading] = useState(true)
    const [activityTotal, setActivityTotal] = useState(0)
    const [activityStats, setActivityStats] = useState({ total: 0, today: 0, raport: 0, poin: 0 })

    // System / Audit Data
    const [systemLogs, setSystemLogs] = useState([])
    const [systemLoading, setSystemLoading] = useState(false)
    const [systemTotal, setSystemTotal] = useState(0)
    const [systemStats, setSystemStats] = useState({ total: 0, today: 0, security: 0, master: 0, operational: 0 })
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
    const [filterAction, setFilterAction] = useState('')
    const [filterTable, setFilterTable] = useState('')
    const [filterSystemSource, setFilterSystemSource] = useState('')

    // Tabs
    const [activeSubTab, setActiveSubTab] = useState('activity')

    const isActivity = activeTab === 'operational'
    const isSystem = activeTab === 'system'

    // UI
    const [expandedId, setExpandedId] = useState(null)
    const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('logs_autorefresh') === 'true')
    const autoRefreshRef = useRef(null)
    const searchRef = useRef(null)

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [search])

    useEffect(() => { setPage(1) }, [filterSource, filterTeacher, filterDateFrom, filterDateTo, sortDir, filterAction, filterTable, activeSubTab, activeTab])

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
                if (activeTab === 'operational') fetchActivityLogs(true)
                else if (activeTab === 'system') fetchSystemLogs(true)
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
            if (filterSystemSource) q = q.eq('source', filterSystemSource)
            q = q.order('created_at', { ascending: sortDir === 'asc' })
            if (filterDateFrom) q = q.gte('created_at', filterDateFrom)
            if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59')
            if (filterAction) q = q.eq('action', filterAction)
            if (filterTable) q = q.eq('table_name', filterTable)
            if (debouncedSearch) q = q.or(`table_name.ilike.%${debouncedSearch}%,action.ilike.%${debouncedSearch}%`)
            q = q.range((page - 1) * pageSize, page * pageSize - 1)

            const { data, error, count } = await q

            if (error) {
                if (error.message?.includes('does not exist') || error.code === '42P01') {
                    setSystemTableExists(false); setSystemLogs([]); return
                }
                throw error
            }

            // Resolve Actors (User IDs to Names)
            // Filter only valid UUIDs to avoid 400 Bad Request
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const uids = [...new Set((data || []).map(r => r.user_id).filter(id => id && uuidRegex.test(id)))]
            
            let profileMap = {}
            if (uids.length) {
                const { data: pData, error: pError } = await supabase.from('profiles').select('id,full_name,role').in('id', uids)
                if (!pError && pData) {
                    pData.forEach(p => { profileMap[p.id] = p })
                }
            }

            setSystemTableExists(true)
            const normalized = (data || []).map(r => {
                const actionStyle = ACTION_STYLES[r.action?.toUpperCase()] || ACTION_STYLES.default
                const tableLabel = TABLE_LABELS[r.table_name] || r.table_name || '—'
                // Try to get a readable subject from new_data or old_data
                const dataObj = r.new_data || r.old_data || {}
                const subject = dataObj.visitor_name || dataObj.name || dataObj.full_name || dataObj.title || dataObj.email || dataObj.slug || r.record_id?.slice(0, 8) + '...' || '—'
                // Build a readable detail line
                let detailLine = tableLabel
                if (dataObj.visitor_type) detailLine += ` · ${dataObj.visitor_type}`
                if (dataObj.purpose) detailLine += ` · ${dataObj.purpose}`

                // Resolve actor name from profiles
                const actorProfile = profileMap[r.user_id]
                const actorName = actorProfile?.full_name || (r.user_id ? r.user_id.slice(0, 8) + '...' : '—')
                const actorRole = actorProfile?.role || '—'

                return {
                    _id: r.id,
                    _source: 'system',
                    _rawSource: r.source,
                    _type: r.action?.toUpperCase() || 'UNKNOWN',
                    _ts: r.created_at,
                    _actor: actorName,
                    _actorRole: actorRole,
                    _subject: subject,
                    _detail: detailLine,
                    _tableName: r.table_name || '—',
                    _action: r.action || '—',
                    _ip: r.ip_address || '—',
                    _details: [
                        { label: 'Waktu', val: fmtDateTime(r.created_at) },
                        { label: 'Aksi', val: r.action || '—' },
                        { label: 'Tabel', val: tableLabel },
                        { label: 'Record ID', val: r.record_id || '—' },
                        { label: 'Dilakukan Oleh', val: actorName + (actorRole !== '—' ? ` (${actorRole})` : '') },
                        { label: 'IP Address', val: r.ip_address || '—' },
                        { label: 'Mekanisme', val: 'Direct Auth Commit' },
                        { label: 'Security Context', val: r.action === 'INSERT' ? 'Creation Audit' : r.action === 'DELETE' ? 'Destruction Audit' : 'Modification Audit' },
                        ...(r.old_data ? [{ label: 'Data Lama', val: JSON.stringify(r.old_data, null, 2) }] : []),
                        ...(r.new_data ? [{ label: 'Data Baru', val: JSON.stringify(r.new_data, null, 2) }] : []),
                    ],
                    _oldData: r.old_data || null,
                    _newData: r.new_data || null,
                    _recordId: r.record_id || null,
                }
            })

            const todayStr = new Date().toISOString().slice(0, 10)
            
            // Calculate rich stats from loaded data (this page range)
            setSystemStats({
                total: count || 0,
                today: normalized.filter(e => (e._ts || '').slice(0, 10) === todayStr).length,
                security: (data || []).filter(r => r.source === 'SYSTEM').length,
                master: (data || []).filter(r => ['students', 'teachers', 'classes'].includes(r.table_name)).length,
                operational: (data || []).filter(r => r.source === 'OPERATIONAL').length,
            })
            setSystemTotal(count || 0)
            setSystemLogs(normalized)
        } catch (e) {
            addToast('Gagal memuat audit logs: ' + e.message, 'error')
        } finally {
            if (!quiet) setSystemLoading(false)
        }
    }, [isAllowed, page, pageSize, debouncedSearch, filterAction, filterTable, filterSystemSource, filterDateFrom, filterDateTo, sortDir, addToast])

    useEffect(() => {
        if (activeTab === 'operational') fetchActivityLogs()
        else if (activeTab === 'system') fetchSystemLogs()
    }, [activeTab, activeSubTab, fetchActivityLogs, fetchSystemLogs])

    const exportCSV = useCallback(() => {
        const logs = activeTab === 'operational' ? activityLogs : systemLogs
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

    const logs = activeTab === 'operational' ? activityLogs : systemLogs
    const loading = activeTab === 'operational' ? activityLoading : systemLoading
    const totalRows = activeTab === 'operational' ? activityTotal : systemTotal
    const stats = activeTab === 'operational' ? activityStats : systemStats
    const totalPages = Math.ceil(totalRows / pageSize)
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)
    const activeFilterCount = activeTab === 'operational'
        ? [filterSource, filterTeacher, filterDateFrom, filterDateTo].filter(Boolean).length
        : [filterAction, filterTable, filterDateFrom, filterDateTo, filterSystemSource].filter(Boolean).length

    const resetFilters = () => { setSearch(''); setFilterSource(''); setFilterTeacher(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterAction(''); setFilterTable(''); setFilterSystemSource(''); setPage(1) }

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
            if (filterAction) q = q.eq('action', filterAction)
            if (filterTable) q = q.eq('table_name', filterTable)
            if (filterSystemSource) q = q.eq('source', filterSystemSource)
            // Supabase requires a filter for delete — use created_at >= epoch if no filter
            if (!filterDateFrom && !filterDateTo && !filterAction && !filterTable && !filterSystemSource) {
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

    // ── Restore deleted data
    const [restoreEntry, setRestoreEntry] = useState(null)
    const [restoring, setRestoring] = useState(false)

    const handleRestore = async () => {
        if (!restoreEntry) return
        setRestoring(true)
        try {
            const { _oldData, _tableName } = restoreEntry
            if (!_oldData || !_tableName || _tableName === '—') throw new Error('Data lama atau tabel tidak tersedia')

            // Clone old_data, hapus 'id' agar UUID baru di-generate (khusus gate_logs dan tabel lain)
            const restoreData = { ..._oldData }
            delete restoreData.id

            const { error } = await supabase.from(_tableName).insert(restoreData)
            if (error) throw error

            // Tulis audit log baru
            await supabase.from('audit_logs').insert({
                user_id: (await supabase.auth.getUser()).data?.user?.id,
                action: 'INSERT',
                table_name: _tableName,
                record_id: null,
                old_data: null,
                new_data: { ...restoreData, _restored_from_audit: restoreEntry._id },
            })

            addToast('Data berhasil dipulihkan ✓', 'success')
            setRestoreEntry(null)
            fetchSystemLogs()
        } catch (e) {
            addToast('Gagal memulihkan: ' + e.message, 'error')
        } finally {
            setRestoring(false)
        }
    }

    // ── Archive logs (export then delete)
    const [archiving, setArchiving] = useState(false)

    const handleArchive = async () => {
        setArchiving(true)
        try {
            // Fetch all filtered logs for export
            let q = supabase.from('audit_logs').select('*')
                .order('created_at', { ascending: true })
            if (filterDateFrom) q = q.gte('created_at', filterDateFrom)
            if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59')
            if (filterAction) q = q.eq('action', filterAction)
            if (filterTable) q = q.eq('table_name', filterTable)
            if (filterSystemSource) q = q.eq('source', filterSystemSource)
            if (!filterDateFrom && !filterDateTo && !filterAction && !filterTable && !filterSystemSource) {
                q = q.gte('created_at', '2000-01-01')
            }
            const { data: exportData, error: fetchError } = await q
            if (fetchError) throw fetchError

            if (!exportData?.length) {
                addToast('Tidak ada log untuk diarsipkan', 'warning')
                setArchiving(false)
                return
            }

            // Export ke JSON
            const jsonStr = JSON.stringify(exportData, null, 2)
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([jsonStr], { type: 'application/json' }))
            a.download = `audit_archive_${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(a.href)

            // Hapus dari database
            let dq = supabase.from('audit_logs').delete()
            if (filterDateFrom) dq = dq.gte('created_at', filterDateFrom)
            if (filterDateTo) dq = dq.lte('created_at', filterDateTo + 'T23:59:59')
            if (filterAction) dq = dq.eq('action', filterAction)
            if (filterTable) dq = dq.eq('table_name', filterTable)
            if (filterSystemSource) dq = dq.eq('source', filterSystemSource)
            if (!filterDateFrom && !filterDateTo && !filterAction && !filterTable && !filterSystemSource) {
                dq = dq.gte('created_at', '2000-01-01')
            }
            const { error: delError } = await dq
            if (delError) throw delError

            addToast(`${exportData.length} log diarsipkan & dihapus ✓`, 'success')
            fetchSystemLogs()
        } catch (e) {
            addToast('Gagal arsipkan: ' + e.message, 'error')
        } finally {
            setArchiving(false)
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

                {/* Enterprise Header Area */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                    <div className="flex flex-col gap-3">
                        <Breadcrumb badge="Admin" items={['Audit Center']} className="mb-0" />
                        <div>
                            <div className="flex items-center gap-2.5 mb-1">
                                <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Pusat Audit & Log</h1>
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 uppercase tracking-widest">Enterprise Edition</span>
                            </div>
                            <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                                Pantau aktivitas harian (Operational), kendali keamanan (System), dan audit forensik (Investigation).
                            </p>
                        </div>
                        
                        {/* MAIN TABS */}
                        <div className="flex flex-wrap items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 w-fit mt-3">
                             {[
                                 { id: 'operational', label: 'Operational Events', icon: faClipboardList, isActive: activeTab === 'operational' },
                                 { id: 'system', label: 'Audit Trail & Security', icon: faShield, isActive: activeTab === 'system' },
                                 { id: 'audit', label: 'Forensic Investigation', icon: faSearch, isActive: activeTab === 'audit' },
                             ].map(t => (
                                 <button key={t.id} onClick={() => { 
                                     setActiveTab(t.id)
                                     setSearch(''); setExpandedId(null); setPage(1);
                                 }}
                                     className={`relative h-9 px-4 rounded-lg text-[11px] font-black flex items-center gap-2 transition-all ${t.isActive ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                     <FontAwesomeIcon icon={t.icon} className="text-[11px]" />
                                     {t.label}
                                     {t.id === 'system' && !systemTableExists && (
                                         <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                                     )}
                                 </button>
                             ))}
                        </div>
                    </div>

                    {/* ACTION BUTTONS (Moved here to align with tabs, specific per tab) */}
                    <div className="flex flex-col md:items-end gap-3 shrink-0">
                         {/* Toggle Auto Refresh (only for non-investigation) */}
                         {activeTab !== 'audit' && (
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Live Updates</span>
                                <button onClick={() => { const next = !autoRefresh; setAutoRefresh(next); localStorage.setItem('logs_autorefresh', next) }}
                                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${autoRefresh ? 'bg-emerald-500' : 'bg-[#e5e7eb] dark:bg-[#374151]'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-4 shadow-[0_0_5px_rgba(0,0,0,0.2)]' : 'translate-x-0'}`} />
                                </button>
                             </div>
                         )}
                         <div className="flex items-center gap-2 flex-wrap md:justify-end">
                             {/* Refresh based on activeTab */}
                             {activeTab !== 'audit' && (
                                <button onClick={() => activeTab === 'operational' ? fetchActivityLogs() : fetchSystemLogs()} disabled={loading}
                                    className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] flex items-center justify-center hover:text-[var(--color-text)] transition-all disabled:opacity-50" title="Refresh">
                                    <FontAwesomeIcon icon={faRotateRight} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </button>
                             )}
                             {/* Export CSV */}
                             {activeTab !== 'audit' && (
                                <button onClick={exportCSV} disabled={!logs.length}
                                    className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1.5 hover:text-[var(--color-text)] transition-all disabled:opacity-40">
                                    <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
                                    <span className="hidden sm:inline">Export CSV</span>
                                </button>
                             )}
                             {/* System tab specific actions */}
                             {activeTab === 'system' && profile?.role === 'developer' && (
                                 <>
                                     <button onClick={handleArchive} disabled={archiving || !systemTotal}
                                         className="h-9 px-3 rounded-xl border border-amber-500/20 bg-amber-500/8 text-amber-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-amber-500/15 transition-all disabled:opacity-30">
                                         {archiving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" /> : <FontAwesomeIcon icon={faFileExport} className="text-[10px]" />}
                                         <span className="hidden sm:inline">Arsipkan</span>
                                     </button>
                                     {clearConfirm ? (
                                        <div className="flex items-center gap-1.5 pl-3 pr-1 py-1 h-9 rounded-xl border border-red-500/30 bg-red-500/10">
                                            <span className="text-[10px] font-bold text-red-600 hidden xl:inline">Yakin hapus?</span>
                                            <button onClick={handleClearLogs} disabled={clearing}
                                                className="h-7 px-2.5 rounded-lg bg-red-500 text-white text-[9px] font-black hover:bg-red-600 transition-all flex items-center gap-1 disabled:opacity-60">
                                                {clearing ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[8px]" /> : null}
                                                {activeFilterCount > 0 ? 'Yang difilter' : 'Semua'}
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
                                    )}
                                 </>
                             )}
                         </div>
                    </div>
                </div>

                {/* Sub Tabs for Operational */}
                {activeTab === 'operational' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button onClick={() => { setActiveSubTab('activity'); setSearch(''); setPage(1) }}
                            className="h-8 px-3 rounded-xl text-[10px] font-black flex items-center gap-2 bg-[var(--color-primary)] text-white border-transparent shadow-md shadow-[var(--color-primary)]/20">
                            <FontAwesomeIcon icon={faGraduationCap} /> Aktivitas Akademik & Pelanggaran
                        </button>
                    </div>
                )}

                {/* SQL banner */}
                {activeTab === 'system' && !systemTableExists && showSqlBanner && (
                    <SqlSetupBanner onDismiss={() => setShowSqlBanner(false)} />
                )}

                {/* Stats — hanya tampil di tab activity, system, gate */}
                {activeTab !== 'audit' && <StatsCarousel count={4}>
                    {(activeTab === 'operational' ? [
                        { label: 'Total Aktivitas', value: stats.total, icon: faDatabase, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                        { label: 'Hari Ini', value: stats.today, icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'Entri Raport', value: stats.raport, icon: faGraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Entri Poin', value: stats.poin, icon: faClipboardList, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    ] : [
                        { label: 'Total Audit', value: stats.total, icon: faShield, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                        { label: 'Security Log', value: stats.security, icon: faKey, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                        { label: 'Master Data', value: stats.master, icon: faUsers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Operational', value: stats.operational, icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    ]).map((s, i) => (
                        <div key={i} className="shrink-0 snap-center w-[200px] xs:w-[220px] sm:w-auto glass rounded-[1.5rem] p-4 flex items-center gap-3 border border-[var(--color-border)]">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                                <FontAwesomeIcon icon={s.icon} className={`text-sm ${s.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{s.label}</p>
                                <p className={`text-xl font-black font-heading ${s.color}`}>{loading ? '—' : s.value.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </StatsCarousel>}

                {/* Search + Filter bar — hanya activity & system */}
                {activeTab !== 'audit' && <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="flex items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                            <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder={isActivity ? 'Cari santri, guru, aktivitas...' : 'Cari nama tabel atau aksi...'}
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
                            {activeTab === 'system' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kategori Audit</label>
                                        <div className="flex gap-1">
                                            {[{ v: '', l: 'Semua' }, { v: 'SYSTEM', l: 'System' }, { v: 'OPERATIONAL', l: 'Operational' }].map(opt => (
                                                <button key={opt.v} onClick={() => setFilterSystemSource(opt.v)}
                                                    className={`h-7 px-2.5 rounded-lg text-[9px] font-black border transition-all ${filterSystemSource === opt.v ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                    {opt.l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Aksi</label>
                                        <div className="flex gap-1">
                                            {[{ v: '', l: 'Semua' }, { v: 'INSERT', l: 'Insert' }, { v: 'UPDATE', l: 'Update' }, { v: 'DELETE', l: 'Delete' }].map(opt => (
                                                <button key={opt.v} onClick={() => setFilterAction(opt.v)}
                                                    className={`h-7 px-2.5 rounded-lg text-[9px] font-black border transition-all ${filterAction === opt.v ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                    {opt.l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tabel</label>
                                        <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
                                            className="h-7 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[9px] font-black outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua Tabel</option>
                                            {Object.entries(TABLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                </>
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
                </div>}

                {/* Main Table Logic */}
                {(activeTab === 'operational' || activeTab === 'system') && (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        <div className="hidden md:grid grid-cols-[140px_1fr_140px_120px_40px] gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                            {['Waktu', activeTab === 'operational' ? 'Santri & Aktivitas' : 'Target & Event', 'Oleh', 'Kategori', ''].map((h, i) => (
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
                                        {!systemTableExists && activeTab === 'system' ? 'Buat tabel audit_logs terlebih dahulu.' : debouncedSearch || activeFilterCount > 0 ? 'Coba ubah filter.' : 'Belum ada data tercatat.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--color-border)]">
                                {logs.map(entry => (
                                    <LogRow key={entry._id} entry={entry}
                                        isExpanded={expandedId === entry._id}
                                        onToggle={() => setExpandedId(expandedId === entry._id ? null : entry._id)}
                                        isSystem={activeTab === 'system'}
                                        onRestore={activeTab === 'system' ? (e) => setRestoreEntry(e) : undefined} />
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
                )}

                {/* Audit Trail Tab */}
                {activeTab === 'audit' && <AuditTrailTab />}

                {/* Info note */}
                {activeTab !== 'audit' && <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-start gap-2.5">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-[var(--color-text-muted)] text-xs mt-0.5 shrink-0" />
                    <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                        {activeTab === 'operational'
                            ? <>Log aktivitas dari tabel <code className="bg-[var(--color-surface)] px-1 rounded font-mono text-[9px]">student_monthly_reports</code> dan <code className="bg-[var(--color-surface)] px-1 rounded font-mono text-[9px]">reports</code>.</>
                            : <>Audit Trail terintegrasi dari tabel <code className="bg-[var(--color-surface)] px-1 rounded font-mono text-[9px]">audit_logs</code>. Mencakup Security, Master Data, dan Operational Audit.</>
                        }
                    </p>
                </div>}

                <div className="h-8" />
            </div>

            {/* Restore confirmation modal */}
            {restoreEntry && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setRestoreEntry(null) }}>
                    <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
                        <div className="px-5 pt-5 pb-3">
                            <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Pulihkan Data?</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">
                                Data yang terhapus dari <code className="bg-[var(--color-surface-alt)] px-1 rounded font-mono text-[9px]">{TABLE_LABELS[restoreEntry._tableName] || restoreEntry._tableName}</code> akan dikembalikan.
                            </p>
                        </div>
                        <div className="px-5 pb-3">
                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                <p className="text-[12px] font-black text-[var(--color-text)]">{restoreEntry._subject}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">{restoreEntry._detail}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 px-5 pb-5">
                            <button onClick={() => setRestoreEntry(null)}
                                className="flex-1 h-9 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                            <button onClick={handleRestore} disabled={restoring}
                                className="flex-1 h-9 rounded-xl bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {restoring && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" />}
                                Pulihkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}