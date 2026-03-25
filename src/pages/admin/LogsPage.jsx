import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faShieldHalved, faRotateRight, faFilter, faSearch,
    faXmark, faChevronLeft, faChevronRight, faCircleInfo, faKey,
    faUsers, faBolt, faDatabase, faFileExport, faEraser, faSpinner,
    faAngleDown, faHistory, faTrashRestore, faGlobe, faMicrochip,
    faLink, faCircle, faDesktop, faInfoCircle, faChartLine,
    faPlus, faPen, faTrash, faSync, faTools, faClock,
    faUserShield, faCheckCircle
} from '@fortawesome/free-solid-svg-icons'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/auditLogger'
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip,
    CartesianGrid
} from 'recharts'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { fmtDate, fmtTime, fmtDateTime, fmtRelative } from '../../utils/formatters'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['admin', 'developer']

const SOURCE_META = {
    SYSTEM: { label: 'Security', color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: faKey },
    MASTER: { label: 'Master Data', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: faUsers },
    OPERATIONAL: { label: 'Operational', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: faBolt },
}

const ACTION_STYLES = {
    INSERT: { label: 'Tambah', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    UPDATE: { label: 'Ubah', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    DELETE: { label: 'Hapus', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
}

const TABLE_LABELS = {
    profiles: 'Akun & Profil',
    students: 'Data Siswa',
    teachers: 'Data Guru',
    classes: 'Data Kelas',
    gate_logs: 'Log Gerbang',
    reports: 'Poin Pelanggaran',
    student_monthly_reports: 'Raport Santri',
    violation_types: 'Konfigurasi Poin',
    user_preferences: 'Pengaturan User',
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: AUDIT DETAILS — ActionBadge, JsonVisualizer, DiffViewer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ActionBadge — Chip kecil penanda tipe aksi (INSERT, UPDATE, DELETE, dst)
 * @param {string} action — Tipe aksi dari kolom `action` di audit_logs
 */
export const ActionBadge = ({ action }) => {
    const config = {
        INSERT: { label: 'TAMBAH', color: 'bg-emerald-500/10 text-emerald-500', icon: faPlus },
        UPDATE: { label: 'UBAH', color: 'bg-amber-500/10 text-amber-500', icon: faPen },
        DELETE: { label: 'HAPUS', color: 'bg-rose-500/10 text-rose-500', icon: faTrash },
        RESTORE: { label: 'PULIH', color: 'bg-indigo-500/10 text-indigo-500', icon: faHistory },
        EXECUTE: { label: 'JALAN', color: 'bg-sky-500/10 text-sky-500', icon: faSync },
        LOGIN: { label: 'MASUK', color: 'bg-emerald-500/10 text-emerald-500', icon: faHistory },
        REPAIR: { label: 'PERBAIKAN', color: 'bg-purple-500/10 text-purple-500', icon: faTools },
    }
    const c = config[action] || { label: action, color: 'bg-gray-500/10 text-gray-500', icon: faHistory }

    return (
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${c.color}`}>
            <FontAwesomeIcon icon={c.icon} className="text-[7px]" />
            {c.label}
        </span>
    )
}

/**
 * JsonVisualizer — Tampilkan objek JSON dalam format key:value berwarna
 * @param {object} data — Objek JSON yang akan ditampilkan
 */
export const JsonVisualizer = ({ data }) => {
    if (!data || typeof data !== 'object') {
        return <span className="text-[var(--color-text-muted)] italic">null</span>
    }

    const renderValue = (val) => {
        if (val === null) return <span className="text-rose-400">null</span>
        if (typeof val === 'boolean') return <span className="text-amber-400">{val.toString()}</span>
        if (typeof val === 'number') return <span className="text-sky-400 font-mono">{val}</span>
        if (typeof val === 'string') return <span className="text-emerald-400">"{val}"</span>
        return JSON.stringify(val)
    }

    return (
        <div className="space-y-1 font-mono text-[10px]">
            {Object.entries(data).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                    <span className="text-[var(--color-primary)] opacity-70 shrink-0">{key}:</span>
                    <span className="truncate">{renderValue(val)}</span>
                </div>
            ))}
        </div>
    )
}

// Helper internal — hitung diff antara dua objek
const _getDiff = (oldObj, newObj) => {
    const changes = {}
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
    allKeys.forEach(key => {
        if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key])) {
            changes[key] = { old: oldObj?.[key], new: newObj?.[key] }
        }
    })
    return changes
}

/**
 * DiffViewer — Side-by-side diff antara old_data dan new_data dari audit log
 * @param {object} oldData — Data sebelum perubahan (log.old_data)
 * @param {object} newData — Data setelah perubahan (log.new_data)
 */
export const DiffViewer = ({ oldData, newData }) => {
    const diff = _getDiff(oldData, newData)
    const keys = Object.keys(diff)

    if (keys.length === 0) return (
        <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <FontAwesomeIcon icon={faCircleInfo} className="text-xl mb-2" />
            <p className="text-[10px] italic font-bold uppercase tracking-widest">Tidak ada perubahan terbaca</p>
        </div>
    )

    return (
        <div className="space-y-3">
            <div className="hidden lg:grid grid-cols-2 gap-4 mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 px-2">
                    Data Sebelumnya
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-80 px-2 text-right">
                    Data Terbaru
                </p>
            </div>

            {keys.map(key => {
                const isSensitive = ['password', 'secret', 'token'].includes(key.toLowerCase())
                const valOld = diff[key].old
                const valNew = diff[key].new

                return (
                    <div key={key} className="group">
                        <div className="px-2 py-1.5 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-surface-alt)]/30 group-hover:border-[var(--color-primary)]/30 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-tighter">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                {isSensitive && (
                                    <span className="text-[8px] font-black text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">
                                        Sensitif
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Old Value */}
                                <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 min-h-[32px] flex items-center">
                                    <code className="text-[10px] font-mono break-all text-rose-600/70 line-through">
                                        {isSensitive
                                            ? '••••••••'
                                            : (typeof valOld === 'object'
                                                ? JSON.stringify(valOld)
                                                : String(valOld ?? 'null'))}
                                    </code>
                                </div>
                                {/* New Value */}
                                <div className="relative p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 min-h-[32px] flex items-center">
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden lg:flex w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] items-center justify-center z-10">
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[8px] text-[var(--color-text-muted)] opacity-30" />
                                    </div>
                                    <code className="text-[10px] font-mono font-black break-all text-emerald-600">
                                        {isSensitive
                                            ? '••••••••'
                                            : (typeof valNew === 'object'
                                                ? JSON.stringify(valNew)
                                                : String(valNew ?? 'null'))}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: AUDIT TIMELINE — Komponen riwayat audit per-record
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AuditTimeline — Timeline vertikal audit log untuk satu record spesifik.
 * Biasa digunakan di halaman detail siswa, guru, atau entitas lain.
 *
 * @param {string}  tableName   — Nama tabel Supabase (e.g. 'students')
 * @param {string}  recordId    — UUID record yang ingin dilihat riwayatnya
 * @param {number}  limit       — Batas jumlah entry yang ditampilkan (default 20)
 * @param {boolean} showSearch  — Tampilkan kolom pencarian (default false)
 */
export function AuditTimeline({ tableName, recordId, limit = 20, showSearch = false }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [search, setSearch] = useState('')
    const [restoringId, setRestoringId] = useState(null)

    const fetchLogs = useCallback(async () => {
        if (!tableName || !recordId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('table_name', tableName)
                .eq('record_id', recordId)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            // Resolve nama aktor
            const uids = [...new Set((data || []).map(r => r.user_id).filter(Boolean))]
            let profileMap = {}
            if (uids.length) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('id,full_name')
                    .in('id', uids)
                if (pData) pData.forEach(p => { profileMap[p.id] = p })
            }

            setLogs((data || []).map(r => ({
                ...r,
                actor_name: profileMap[r.user_id]?.full_name || 'System',
            })))
        } catch (e) {
            console.error('[AuditTimeline]', e.message)
        } finally {
            setLoading(false)
        }
    }, [tableName, recordId, limit])

    const handleRestore = async (log) => {
        if (!window.confirm('Pulihkan data ini? Aksi ini akan menulis ulang state record saat ini.')) return
        setRestoringId(log.id)
        try {
            const targetData = log.old_data
            if (!targetData) throw new Error('Data forensik tidak ditemukan')

            const { error } = await supabase
                .from(tableName)
                .upsert({ id: recordId, ...targetData })
            if (error) throw error

            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'RESTORE',
                source: 'MASTER',
                table_name: tableName,
                record_id: recordId,
                old_data: {},
                new_data: { restored_from: log.id, action: log.action },
                url: window.location.href,
            })
            window.location.reload()
        } catch (e) {
            alert('Gagal memulihkan: ' + e.message)
        } finally {
            setRestoringId(null)
        }
    }

    useEffect(() => { fetchLogs() }, [fetchLogs])

    const filteredLogs = logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.actor_name.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return (
        <div className="space-y-4 p-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-alt)]" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 bg-[var(--color-surface-alt)] rounded" />
                        <div className="h-2 w-1/4 bg-[var(--color-surface-alt)] rounded opacity-50" />
                    </div>
                </div>
            ))}
        </div>
    )

    if (logs.length === 0) return (
        <div className="py-12 flex flex-col items-center justify-center text-center opacity-30 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                <FontAwesomeIcon icon={faHistory} className="text-xl" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Belum ada jejak audit</p>
                <p className="text-[9px] font-bold">Aktivitas forensik untuk data ini tidak ditemukan.</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-4">
            {showSearch && (
                <div className="relative mb-4">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari dalam riwayat..."
                        className="w-full h-8 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[10px] font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                    />
                </div>
            )}

            <div className="relative space-y-1">
                {/* Garis vertikal */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[var(--color-border)] opacity-30" />

                {filteredLogs.map(log => {
                    const isExpanded = expandedId === log.id
                    return (
                        <div key={log.id} className="relative pl-9 pb-4 last:pb-0">
                            {/* Dot indicator */}
                            <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-xl border bg-[var(--color-surface)] flex items-center justify-center transition-all z-10
                                ${isExpanded
                                    ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10 scale-110'
                                    : 'border-[var(--color-border)] opacity-80'}`}>
                                <FontAwesomeIcon
                                    icon={log.action === 'INSERT' ? faPlus : log.action === 'DELETE' ? faTrash : faPen}
                                    className={`text-[10px] ${isExpanded ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
                                />
                            </div>

                            <button
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                className={`w-full text-left group transition-all rounded-2xl p-3 border
                                    ${isExpanded
                                        ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-[var(--color-surface-alt)]/30'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <ActionBadge action={log.action} />
                                        <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-tight">
                                            {log.actor_name}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] tabular-nums opacity-60">
                                        {fmtRelative(log.created_at)}
                                    </span>
                                </div>

                                <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-tight">
                                    {log.action === 'UPDATE' ? 'Melakukan perubahan data record'
                                        : log.action === 'INSERT' ? 'Membuat record baru di sistem'
                                            : log.action === 'DELETE' ? 'Menghapus record dari sistem'
                                                : 'Aktivitas sistem'}
                                    <span className="mx-1.5 opacity-30">·</span>
                                    {fmtDateTime(log.created_at)}
                                </p>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/50 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faClock} className="text-[10px] text-indigo-500" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                        Forensic Diff
                                                    </span>
                                                </div>
                                                <div className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">
                                                    IP: {log.ip_address || '?.?.?.?'}
                                                </div>
                                            </div>
                                            <DiffViewer oldData={log.old_data} newData={log.new_data} />

                                            {(log.action === 'DELETE' || log.action === 'UPDATE') && (
                                                <div className="pt-3 border-t border-[var(--color-border)]/50 flex justify-end">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleRestore(log) }}
                                                        disabled={restoringId === log.id}
                                                        className={`h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                                            ${restoringId === log.id
                                                                ? 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] animate-pulse'
                                                                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 active:scale-95'}`}
                                                    >
                                                        <FontAwesomeIcon icon={faHistory} className={restoringId === log.id ? 'animate-spin' : ''} />
                                                        {restoringId === log.id
                                                            ? 'Memulihkan...'
                                                            : log.action === 'DELETE' ? 'Pulihkan Record' : 'Revert ke State ini'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!isExpanded && (
                                    <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black uppercase text-[var(--color-primary)] flex items-center gap-1.5">
                                            Detail Forensik <FontAwesomeIcon icon={faChevronRight} className="text-[7px]" />
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: SUB-KOMPONEN INTERNAL — ActivityTrends & LogRow
// ─────────────────────────────────────────────────────────────────────────────

/** Grafik area tren aktivitas 24 jam terakhir */
const ActivityTrends = ({ data, loading }) => {
    const hourlyData = useMemo(() => {
        if (!data.length) return []
        const now = new Date()
        const categories = {}

        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 3_600_000)
            const hour = d.getHours()
            categories[hour] = { hour: `${hour}:00`, total: 0, security: 0, master: 0 }
        }

        data.forEach(log => {
            const hour = new Date(log.created_at).getHours()
            if (categories[hour]) {
                categories[hour].total++
                if (log.source === 'SYSTEM') categories[hour].security++
                if (['students', 'teachers', 'classes'].includes(log.table_name)) categories[hour].master++
            }
        })

        return Object.values(categories)
    }, [data])

    if (loading) return <div className="h-40 w-full animate-pulse bg-[var(--color-surface-alt)] rounded-2xl" />

    return (
        <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.2} />
                    <XAxis
                        dataKey="hour"
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 900, opacity: 0.5 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 900, opacity: 0.5 }}
                    />
                    <ChartTooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '10px',
                            fontWeight: 900,
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="total"
                        stroke="var(--color-primary)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

/** Satu baris entry audit log — expandable dengan DiffViewer */
const LogRow = ({ entry, isExpanded, onToggle, onRestore }) => {
    const meta = SOURCE_META[entry.source] || SOURCE_META.SYSTEM
    const action = ACTION_STYLES[entry.action] || { label: entry.action, color: 'bg-gray-100 text-gray-600' }

    return (
        <div className={`transition-all ${isExpanded ? 'bg-[var(--color-surface-alt)]/50' : 'hover:bg-[var(--color-surface-alt)]/30'}`}>
            <div
                className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 cursor-pointer border-b border-[var(--color-border)]"
                onClick={onToggle}
            >
                {/* Waktu */}
                <div className="w-40 shrink-0">
                    <p className="text-[11px] font-black text-[var(--color-text)] tabular-nums">
                        {fmtRelative(entry.created_at)}
                    </p>
                    <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                        {fmtDate(entry.created_at)} • {fmtTime(entry.created_at)}
                    </p>
                </div>

                {/* Deskripsi event */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <ActionBadge action={entry.action} />
                        <p className="text-[12px] font-bold text-[var(--color-text)] truncate">
                            {TABLE_LABELS[entry.table_name] || entry.table_name}
                        </p>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate opacity-70">
                        Record ID: <span className="font-mono text-[9px]">{entry.record_id || 'N/A'}</span>
                    </p>
                </div>

                {/* Aktor */}
                <div className="w-32 hidden lg:block">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                            <span className="text-[10px] font-bold">{entry.actor_name?.[0] || '?'}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--color-text)] truncate">
                                {entry.actor_name || 'System'}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-mono opacity-60">
                                ID: {entry.user_id?.slice(0, 8) || 'SYSTEM'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Badge kategori */}
                <div className="hidden md:flex flex-col items-end gap-1.5 w-24">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${meta.bg} ${meta.border} ${meta.color}`}>
                        {meta.label}
                    </span>
                    <FontAwesomeIcon
                        icon={isExpanded ? faXmark : faAngleDown}
                        className="text-[10px] text-[var(--color-text-muted)] opacity-30"
                    />
                </div>
            </div>

            {/* Expansion — Forensic Context + DiffViewer */}
            {isExpanded && (
                <div className="px-5 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Kiri: metadata forensik + raw JSON lama */}
                        <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCircleInfo} /> Forensic Context
                                </p>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-[var(--color-border)] mt-1">
                                    {/* User Agent */}
                                    <div className="flex items-center gap-2 group cursor-help" title={entry.user_agent}>
                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
                                            <FontAwesomeIcon icon={faDesktop} className="text-[10px]" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">User Agent</span>
                                            <span className="text-[10px] font-bold text-[var(--color-text)] truncate max-w-[200px] block lg:max-w-[400px]">
                                                {entry.user_agent || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Remote IP */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faGlobe} className="text-[10px]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Remote IP</span>
                                            <span className="text-[10px] font-mono font-bold text-[var(--color-text)]">
                                                {entry.ip_address || '0.0.0.0'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* URL */}
                                    <div className="flex items-center gap-2 group min-w-0 flex-1">
                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faLink} className="text-[10px]" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Interaction URL</span>
                                            <span className="text-[10px] font-bold text-[var(--color-text)] break-all leading-tight">
                                                {entry.url || 'Internal Action'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Data Lama</p>
                                <pre className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-mono overflow-auto max-h-40">
                                    {JSON.stringify(entry.old_data || {}, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* Kanan: DiffViewer */}
                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Perubahan Data</p>
                            <div className="p-4 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                <DiffViewer oldData={entry.old_data} newData={entry.new_data} />
                            </div>
                        </div>
                    </div>

                    {entry.action === 'DELETE' && onRestore && (
                        <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
                            <button
                                onClick={() => onRestore(entry)}
                                className="h-8 px-4 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faTrashRestore} /> Pulihkan Record ini
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: LOGS PAGE — Halaman utama audit (default export)
// ─────────────────────────────────────────────────────────────────────────────

export default function LogsPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()
    const isAllowed = ALLOWED_ROLES.includes(profile?.role)

    // Data state
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)

    // UI state
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    const [autoRefresh, setAutoRefresh] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    // Filter state
    const [filterSource, setFilterSource] = useState('')
    const [filterAction, setFilterAction] = useState('')
    const [filterTable, setFilterTable] = useState('')
    const [filterRange, setFilterRange] = useState({ from: '', to: '' })
    const [sortDir, setSortDir] = useState('desc')

    // Modal state
    const [restoreEntry, setRestoreEntry] = useState(null)
    const [restoring, setRestoring] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isCleanupOpen, setIsCleanupOpen] = useState(false)
    const [cleanupDays, setCleanupDays] = useState(90)
    const [clearing, setClearing] = useState(false)

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(t)
    }, [search])

    const fetchLogs = useCallback(async (quiet = false) => {
        if (!isAllowed) return
        if (!quiet) setLoading(true)
        try {
            let q = supabase.from('audit_logs').select('*', { count: 'exact' })

            if (filterSource) q = q.eq('source', filterSource)
            if (filterAction) q = q.eq('action', filterAction)
            if (filterTable) q = q.eq('table_name', filterTable)
            if (filterRange.from) q = q.gte('created_at', filterRange.from)
            if (filterRange.to) q = q.lte('created_at', filterRange.to + 'T23:59:59')
            if (debouncedSearch) q = q.or(`table_name.ilike.%${debouncedSearch}%,action.ilike.%${debouncedSearch}%`)

            q = q.order('created_at', { ascending: sortDir === 'asc' })
            q = q.range((page - 1) * pageSize, page * pageSize - 1)

            const { data, error, count } = await q
            if (error) throw error

            // Resolve nama aktor dari profiles
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            const uids = [...new Set((data || []).map(r => r.user_id).filter(id => id && uuidRegex.test(id)))]
            let profileMap = {}
            if (uids.length) {
                const { data: pData } = await supabase.from('profiles').select('id,full_name,role').in('id', uids)
                if (pData) pData.forEach(p => { profileMap[p.id] = p })
            }

            setLogs((data || []).map(r => {
                const p = profileMap[r.user_id]
                return {
                    ...r,
                    actor_name: p?.full_name || (r.user_id ? `User ${r.user_id.slice(0, 8)}` : 'System'),
                    actor_role: p?.role || (r.user_id ? 'Unknown' : 'Auto'),
                }
            }))
            setTotal(count || 0)
        } catch (e) {
            addToast('Gagal memuat log audit: ' + e.message, 'error')
        } finally {
            if (!quiet) setLoading(false)
        }
    }, [isAllowed, page, pageSize, debouncedSearch, filterSource, filterAction, filterTable, filterRange, sortDir, addToast])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    // Realtime subscription
    useEffect(() => {
        if (!isAllowed) return
        const channel = supabase
            .channel('audit_changes')
            .on('postgres_changes', { event: 'INSERT', table: 'audit_logs', schema: 'public' }, () => {
                if (autoRefresh) fetchLogs(true)
            })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [isAllowed, autoRefresh, fetchLogs])

    const handleRestore = async () => {
        if (!restoreEntry) return
        setRestoring(true)
        try {
            const { error } = await supabase.from(restoreEntry.table_name).insert(restoreEntry.old_data)
            if (error) throw error
            addToast('Data dipulihkan ✓', 'success')
            fetchLogs()
        } catch (e) {
            addToast('Gagal memulihkan: ' + e.message, 'error')
        } finally {
            setRestoring(false)
            setRestoreEntry(null)
        }
    }

    const handleExport = async (format = 'csv') => {
        setIsExporting(true)
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000)
            if (error) throw error

            const exportData = data.map(r => ({
                Waktu: fmtDateTime(r.created_at),
                Aksi: r.action,
                Tabel: r.table_name,
                Actor_ID: r.user_id,
                Source: r.source,
                IP: r.ip_address,
                URL: r.url,
            }))

            if (format === 'csv') {
                const csv = Papa.unparse(exportData)
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)
                link.click()
            } else {
                const ws = XLSX.utils.json_to_sheet(exportData)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs')
                XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`)
            }
            addToast('Log audit berhasil diekspor ✓', 'success')
        } catch (e) {
            addToast('Gagal ekspor: ' + e.message, 'error')
        } finally {
            setIsExporting(false)
        }
    }

    const handleCleanup = async () => {
        if (!confirm(`Hapus permanen log yang lebih lama dari ${cleanupDays} hari? Tindakan ini tidak bisa dibatalkan.`)) return
        setClearing(true)
        try {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - cleanupDays)
            const { error, count } = await supabase
                .from('audit_logs')
                .delete()
                .lt('created_at', cutoff.toISOString())
            if (error) throw error
            addToast(`Pembersihan berhasil ✓`, 'success')
            await logAudit({
                action: 'DELETE',
                source: profile?.id || 'SYSTEM',
                tableName: 'audit_logs',
                newData: { cleanup: true, days: cleanupDays, count: count || 0 },
            })
            setIsCleanupOpen(false)
            fetchLogs()
        } catch (e) {
            addToast('Gagal pembersihan: ' + e.message, 'error')
        } finally {
            setClearing(false)
        }
    }

    if (!isAllowed) return (
        <DashboardLayout title="Akses Dibatasi">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <FontAwesomeIcon icon={faShieldHalved} className="text-4xl text-rose-500 opacity-20" />
                <p className="text-sm font-bold text-[var(--color-text-muted)]">Hanya untuk Admin/Developer.</p>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout title="Audit Logs">
            <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col gap-1">
                    <Breadcrumb badge="Admin" items={['Audit Center']} className="mb-0" />
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)]">Pusat Audit Sistem</h1>
                    <p className="text-[11px] font-medium text-[var(--color-text-muted)] opacity-60">
                        Jejak digital lengkap aktivitas sistem dan akses data.
                    </p>
                </div>

                {/* Trends & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 glass rounded-2xl p-5 border border-[var(--color-border)] relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <FontAwesomeIcon icon={faChartLine} className="text-[var(--color-primary)]" /> Tren Aktivitas 24 Jam
                                </p>
                                <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 mt-0.5">
                                    Frekuensi perubahan data per jam.
                                </p>
                            </div>
                            {autoRefresh && (
                                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live Monitoring</span>
                                </div>
                            )}
                        </div>
                        <ActivityTrends data={logs} loading={loading} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Total Audit', value: total, icon: faHistory, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10', sub: '24 Jam Terakhir' },
                            { label: 'Security', value: logs.filter(l => l.source === 'SYSTEM').length, icon: faShieldHalved, color: 'text-rose-500', bg: 'bg-rose-500/10', sub: 'Akses & Auth' },
                            { label: 'Master Data', value: logs.filter(l => ['students', 'teachers', 'classes'].includes(l.table_name)).length, icon: faUsers, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sub: 'Siswa, Guru, Kelas' },
                            { label: 'Operational', value: logs.filter(l => l.source === 'OPERATIONAL').length, icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10', sub: 'Tugas & Sistem' },
                        ].map((s, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                <div className={`absolute top-0 right-0 w-24 h-24 ${s.bg} rounded-bl-full opacity-30 -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
                                <div className="flex items-center gap-4 relative">
                                    <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-xl flex items-center justify-center text-lg`}>
                                        <FontAwesomeIcon icon={s.icon} />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">{s.label}</div>
                                        <div className="text-2xl font-black">{loading ? '...' : s.value}</div>
                                        {s.sub && <div className="text-[8px] font-medium text-[var(--color-text-muted)] mt-1">{s.sub}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 p-3">
                        <div className="flex-1 min-w-[200px] relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari tabel, aksi, atau ID..."
                                className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-transparent text-xs font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`h-10 px-4 rounded-xl border text-[11px] font-black flex items-center gap-2 transition-all ${autoRefresh ? 'bg-emerald-500 text-white border-transparent' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faCircle} className={`text-[8px] ${autoRefresh ? 'animate-pulse' : 'opacity-20'}`} />
                                {autoRefresh ? 'Live' : 'Static'}
                            </button>
                            <button
                                onClick={() => fetchLogs()}
                                className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] text-[11px] font-black flex items-center gap-2 transition-all"
                            >
                                <FontAwesomeIcon icon={faRotateRight} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`h-10 px-4 rounded-xl border font-black text-[11px] flex items-center gap-2 transition-all ${showFilters ? 'bg-[var(--color-primary)] text-white border-transparent' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faFilter} /> Filter
                            </button>
                            <div className="h-8 w-px bg-[var(--color-border)] mx-1" />
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleExport('csv')}
                                    disabled={isExporting}
                                    className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:text-emerald-500 transition-all flex items-center justify-center"
                                    title="Export CSV"
                                >
                                    <FontAwesomeIcon icon={faFileExport} />
                                </button>
                                <button
                                    onClick={() => setIsCleanupOpen(true)}
                                    className="h-10 w-10 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                    title="Cleanup Logs"
                                >
                                    <FontAwesomeIcon icon={faEraser} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter panel */}
                    {showFilters && (
                        <div className="px-3 pb-3 border-t border-[var(--color-border)] pt-4 flex flex-wrap gap-4 items-end animate-in fade-in duration-200">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Kategori</label>
                                <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)]">
                                    {[
                                        { v: '', l: 'Semua' },
                                        { v: 'SYSTEM', l: 'Security' },
                                        { v: 'MASTER', l: 'Master' },
                                        { v: 'OPERATIONAL', l: 'Ops' },
                                    ].map(opt => (
                                        <button
                                            key={opt.v}
                                            onClick={() => setFilterSource(opt.v)}
                                            className={`h-7 px-3 rounded-lg text-[10px] font-black transition-all ${filterSource === opt.v ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}`}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-[150px]">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Pilih Tabel</label>
                                <select
                                    value={filterTable}
                                    onChange={e => setFilterTable(e.target.value)}
                                    className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black px-3 outline-none focus:border-[var(--color-primary)]"
                                >
                                    <option value="">Semua Perubahan</option>
                                    {Object.entries(TABLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 shrink-0">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Rentang Tanggal</label>
                                <div className="flex items-center gap-2">
                                    <input type="date" value={filterRange.from} onChange={e => setFilterRange({ ...filterRange, from: e.target.value })} className="h-9 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold" />
                                    <span className="text-[10px] font-bold opacity-30">—</span>
                                    <input type="date" value={filterRange.to} onChange={e => setFilterRange({ ...filterRange, to: e.target.value })} className="h-9 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold" />
                                </div>
                            </div>
                            <button
                                onClick={() => { setFilterSource(''); setFilterTable(''); setFilterRange({ from: '', to: '' }); setFilterAction('') }}
                                className="h-9 px-4 rounded-xl border border-rose-500/20 text-rose-500 text-[10px] font-black flex items-center gap-2 hover:bg-rose-500/5 transition-all"
                            >
                                <FontAwesomeIcon icon={faXmark} /> Reset
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabel log */}
                <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    <div className="hidden md:grid grid-cols-[160px_1fr_128px_96px] gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                        {['Waktu', 'Aksi & Subjek', 'Actor', 'Kategori'].map((h, i) => (
                            <div key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</div>
                        ))}
                    </div>

                    <div className="divide-y divide-[var(--color-border)]">
                        {loading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
                                    <div className="w-32 h-3 bg-[var(--color-border)] rounded" />
                                    <div className="flex-1 h-3 bg-[var(--color-border)] rounded opacity-50" />
                                    <div className="w-24 h-5 bg-[var(--color-border)] rounded-full" />
                                </div>
                            ))
                        ) : logs.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-3xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                    <FontAwesomeIcon icon={faDatabase} className="text-2xl text-[var(--color-text-muted)] opacity-20" />
                                </div>
                                <div>
                                    <p className="text-sm font-black">Tidak Ada Jejak Audit</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">Belum ada aktivitas yang direkam untuk kriteria ini.</p>
                                </div>
                            </div>
                        ) : (
                            logs.map(log => (
                                <LogRow
                                    key={log.id}
                                    entry={log}
                                    isExpanded={expandedId === log.id}
                                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                    onRestore={setRestoreEntry}
                                />
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {total > pageSize && (
                        <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} log
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface)]">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                </button>
                                <div className="px-3 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black">
                                    {page}
                                </div>
                                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / pageSize)} className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface)]">
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Catatan integritas */}
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-indigo-500 text-sm mt-0.5" />
                    <div>
                        <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-1">Penting: Integritas Data</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                            Audit trail ini adalah record permanen yang tidak dapat diubah oleh administrator biasa.
                            Gunakan data ini untuk investigasi forensik jika terjadi kejanggalan pada data Master atau Operational.
                        </p>
                    </div>
                </div>

                <div className="h-4" />
            </div>

            {/* Modal: Restore */}
            {restoreEntry && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setRestoreEntry(null)}>
                    <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                                <FontAwesomeIcon icon={faTrashRestore} className="text-xl text-amber-500" />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] mb-1">Pulihkan Data?</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] mb-4 leading-relaxed">
                                Anda akan mengembalikan data yang dihapus ke tabel{' '}
                                <span className="font-bold text-amber-600 underline">
                                    {TABLE_LABELS[restoreEntry.table_name] || restoreEntry.table_name}
                                </span>.
                                Tindakan ini sendiri akan dicatat sebagai entri Audit baru.
                            </p>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setRestoreEntry(null)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all">
                                    Batal
                                </button>
                                <button onClick={handleRestore} disabled={restoring} className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {restoring ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Ya, Pulihkan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Cleanup */}
            {isCleanupOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsCleanupOpen(false)}>
                    <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
                                <FontAwesomeIcon icon={faEraser} className="text-xl text-rose-500" />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] mb-1">Pembersihan Log</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] mb-4 leading-relaxed">
                                Hapus log audit permanen untuk menjaga performa sistem. Log yang dihapus tidak dapat dipulihkan.
                            </p>
                            <div className="space-y-3 mb-6">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Hapus log lebih tua dari:</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[30, 90, 180].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setCleanupDays(d)}
                                            className={`h-9 rounded-xl border text-[10px] font-black transition-all ${cleanupDays === d ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}
                                        >
                                            {d} Hari
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsCleanupOpen(false)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all">
                                    Batal
                                </button>
                                <button onClick={handleCleanup} disabled={clearing} className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-[11px] font-black hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {clearing ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Eksekusi Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}