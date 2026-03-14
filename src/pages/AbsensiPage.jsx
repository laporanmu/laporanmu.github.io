import {
    useState, useEffect, useCallback, useRef,
    useMemo, memo, useDeferredValue, Component,
} from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faChevronLeft, faChevronRight, faSave, faSpinner, faExclamationTriangle,
    faUserCheck, faHeartPulse, faFileCircleCheck, faCircleXmark,
    faDoorOpen, faRotateLeft, faFileExport, faCircleCheck, faCloudArrowUp,
    faTriangleExclamation, faMagnifyingGlass, faChalkboardTeacher,
    faCalendarDays, faChartSimple, faBolt, faChevronDown,
    faXmark, faLightbulb, faCheck, faTableList, faArrowPointer,
    faFloppyDisk, faArrowsRotate, faListCheck,
    faRotateRight, faBullseye,
    // ── New icons for features 1-10 ──
    faCopy, faEye, faEyeSlash, faFilter, faFileImport,
    faPrint, faBell, faStickyNote, faArrowDown, faCrosshairs,
    faArrowTrendUp, faArrowTrendDown, faGear, faUpload,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const BULAN_NAMA = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const STATUS_CYCLE = ['', 'H', 'S', 'I', 'A', 'P']

const STATUS_META = {
    H: { label: 'Hadir', color: 'text-emerald-600', cellBg: 'bg-emerald-500/15', cellBorder: 'border-emerald-500/30', textColor: '#059669', icon: faUserCheck },
    S: { label: 'Sakit', color: 'text-amber-600', cellBg: 'bg-amber-500/15', cellBorder: 'border-amber-500/30', textColor: '#d97706', icon: faHeartPulse },
    I: { label: 'Izin', color: 'text-blue-600', cellBg: 'bg-blue-500/15', cellBorder: 'border-blue-500/30', textColor: '#2563eb', icon: faFileCircleCheck },
    A: { label: 'Alpa', color: 'text-red-600', cellBg: 'bg-red-500/15', cellBorder: 'border-red-500/30', textColor: '#dc2626', icon: faCircleXmark },
    P: { label: 'Pulang Awal', color: 'text-purple-600', cellBg: 'bg-purple-500/15', cellBorder: 'border-purple-500/30', textColor: '#7c3aed', icon: faDoorOpen },
}

const STATUS_LIST = ['H', 'S', 'I', 'A', 'P']
const DOW_SHORT = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb']

// Lebar sticky cols (px) — harus konsisten antara th dan td
const W_NO = 40   // kolom #
const W_NAMA = 176  // kolom Nama

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate()
const getDow = (y, m, d) => new Date(y, m - 1, d).getDay()
const isWeekend = (y, m, d) => { const w = getDow(y, m, d); return w === 0 || w === 6 }

function cycleStatus(curr) {
    const i = STATUS_CYCLE.indexOf(curr || '')
    return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]
}

function summarize(days = {}, y, m) {
    const out = { H: 0, S: 0, I: 0, A: 0, P: 0 }
    for (let d = 1; d <= getDaysInMonth(y, m); d++) {
        const s = days[d] || ''
        if (out[s] !== undefined) out[s]++
    }
    return out
}

function countWeekdays(y, m) {
    let n = 0
    for (let d = 1; d <= getDaysInMonth(y, m); d++) if (!isWeekend(y, m, d)) n++
    return n
}

const draftKey = (cid, y, m) => `absensi_monthly_${cid}_${y}_${m}`

// ─── Error Boundary ───────────────────────────────────────────────────────────

class AbsensiErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { error: null } }
    static getDerivedStateFromError(e) { return { error: e } }
    render() {
        if (this.state.error) return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-xl" />
                </div>
                <div className="text-center">
                    <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Terjadi kesalahan</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] opacity-60">{this.state.error?.message}</p>
                </div>
                <button onClick={() => this.setState({ error: null })}
                    className="h-8 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90">
                    Coba Lagi
                </button>
            </div>
        )
        return this.props.children
    }
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

const DayCell = memo(({ status, weekend, invalid, isToday, isFocused, onMouseDown, onMouseEnter }) => {
    const meta = status ? STATUS_META[status] : null

    if (invalid) return (
        <td style={{ width: 32, minWidth: 32, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-alt)', opacity: 0.3 }} />
    )

    return (
        <td
            style={{
                width: 32, minWidth: 32,
                border: isFocused ? '2px solid #6366f1' : isToday ? '1px solid #6366f180' : '1px solid var(--color-border)',
                backgroundColor: meta
                    ? undefined
                    : isFocused
                        ? '#6366f10a'
                        : isToday
                            ? '#6366f108'
                            : weekend
                                ? 'var(--color-surface-alt)'
                                : undefined,
                cursor: 'pointer',
                userSelect: 'none',
                padding: 0,
                position: 'relative',
                zIndex: isFocused ? 2 : undefined,
            }}
            className={meta ? `${meta.cellBg} ${meta.cellBorder}` : ''}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
        >
            {isToday && !meta && (
                <div style={{
                    position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: '50%', backgroundColor: '#6366f1', opacity: 0.6,
                }} />
            )}
            <div
                className={`w-full h-full flex items-center justify-center text-[11px] font-black transition-all duration-75 hover:brightness-90 active:scale-90 ${meta ? meta.color : weekend ? 'text-[var(--color-text-muted)]/20' : 'text-transparent hover:text-[var(--color-text-muted)]/30'
                    }`}
                style={{ height: 28 }}
            >
                {status || (weekend ? '·' : '')}
            </div>
        </td>
    )
})

// ─── StudentRow ───────────────────────────────────────────────────────────────

const StudentRow = memo(({ student, idx, days, tahun, bulan, daysInMonth, todayDate, onCellMouseDown, onCellMouseEnter, onRowFill, onNoteClick, note, hideWeekend, focusedDay, alpaThreshold, hadirThreshold, visibleDays }) => {
    const sum = useMemo(() => summarize(days, tahun, bulan), [days, tahun, bulan])
    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])
    const pct = weekdays > 0 ? Math.round((sum.H / weekdays) * 100) : 0
    const alertAlpa = sum.A >= (alpaThreshold ?? 3)
    const alertHadir = pct < (hadirThreshold ?? 75) && weekdays > 0 && sum.H + sum.S + sum.I + sum.A + sum.P > 0
    const hasNote = !!note

    return (
        <tr className={alertAlpa ? 'bg-red-500/[0.02]' : ''}>
            {/* No — sticky */}
            <td style={{
                position: 'sticky', left: 0, zIndex: 4,
                width: W_NO, minWidth: W_NO,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                textAlign: 'center',
                boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
            }}>
                <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black text-[var(--color-text-muted)] mx-auto">
                    {idx + 1}
                </div>
            </td>

            {/* Nama — sticky, klik untuk row fill */}
            <td
                onClick={onRowFill}
                style={{
                    position: 'sticky', left: W_NO, zIndex: 4,
                    width: W_NAMA, minWidth: W_NAMA, maxWidth: W_NAMA,
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRight: '2px solid var(--color-border)',
                    padding: '6px 12px',
                    boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                }}
                title="Klik untuk isi baris siswa ini"
                className="group"
            >
                <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">{student.name}</p>
                        {alertAlpa
                            ? <p className="text-[9px] font-black text-red-500 flex items-center gap-1 mt-0.5">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />Alpa {sum.A}×
                            </p>
                            : alertHadir
                                ? <p className="text-[9px] font-black text-amber-500 flex items-center gap-1 mt-0.5">
                                    <FontAwesomeIcon icon={faBell} className="text-[8px]" />Hadir {pct}%
                                </p>
                                : student.nisn
                                    ? <p className="text-[9px] text-[var(--color-text-muted)] truncate">{student.nisn}</p>
                                    : null
                        }
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Note button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onNoteClick(e) }}
                            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${hasNote ? 'text-amber-500 opacity-100' : 'text-[var(--color-text-muted)]/0 group-hover:text-[var(--color-text-muted)]/40'}`}
                            title={hasNote ? `Catatan: ${note}` : 'Tambah catatan'}
                        >
                            <FontAwesomeIcon icon={faStickyNote} className="text-[8px]" />
                        </button>
                        <FontAwesomeIcon icon={faBullseye} className="text-[8px] text-[var(--color-text-muted)]/0 group-hover:text-[var(--color-text-muted)]/40 transition-all" />
                    </div>
                </div>
            </td>

            {/* Day cells — respects hideWeekend */}
            {(visibleDays || Array.from({ length: 31 }, (_, i) => i + 1)).map(d => (
                <DayCell
                    key={d}
                    status={d <= daysInMonth ? (days?.[d] || '') : ''}
                    weekend={d <= daysInMonth && isWeekend(tahun, bulan, d)}
                    invalid={d > daysInMonth}
                    isToday={d === todayDate}
                    isFocused={focusedDay === d}
                    onMouseDown={() => onCellMouseDown(student.id, d)}
                    onMouseEnter={() => onCellMouseEnter(student.id, d)}
                />
            ))}

            {/* Summary cols */}
            {STATUS_LIST.map((s, i) => (
                <td key={s}
                    className={`border border-[var(--color-border)] text-center px-0 py-0 ${i === 0 ? 'border-l-2 border-l-[var(--color-border)]' : ''}`}
                    style={{ width: 28, minWidth: 28 }}
                >
                    <span className={`text-[10px] font-black ${STATUS_META[s].color} ${sum[s] === 0 ? 'opacity-20' : ''}`}>
                        {sum[s]}
                    </span>
                </td>
            ))}

            {/* % hadir */}
            <td className="border border-[var(--color-border)] border-l-2 border-l-[var(--color-border)] text-center px-0 py-0" style={{ width: 40, minWidth: 40 }}>
                <div className="flex flex-col items-center gap-0.5 py-1">
                    <span className={`text-[10px] font-black tabular-nums ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct}%
                    </span>
                    <div className="w-5 h-0.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }} />
                    </div>
                </div>
            </td>
        </tr>
    )
}, (p, n) =>
    p.student === n.student && p.idx === n.idx && p.days === n.days &&
    p.tahun === n.tahun && p.bulan === n.bulan && p.daysInMonth === n.daysInMonth &&
    p.todayDate === n.todayDate && p.note === n.note && p.hideWeekend === n.hideWeekend &&
    p.focusedDay === n.focusedDay && p.alpaThreshold === n.alpaThreshold && p.hadirThreshold === n.hadirThreshold
)

// ─── RowSkeleton ──────────────────────────────────────────────────────────────

function RowSkeleton({ colCount = 31 }) {
    return (
        <tr className="animate-pulse">
            <td style={{
                position: 'sticky', left: 0, zIndex: 4, width: W_NO, minWidth: W_NO,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)', padding: 8, textAlign: 'center',
                boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
            }}>
                <div className="w-6 h-6 rounded-full bg-[var(--color-border)] mx-auto" />
            </td>
            <td style={{
                position: 'sticky', left: W_NO, zIndex: 4, width: W_NAMA, minWidth: W_NAMA,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)', borderRight: '2px solid var(--color-border)',
                padding: '8px 12px',
                boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)',
            }}>
                <div className="h-3 w-28 rounded bg-[var(--color-border)] mb-1.5" />
                <div className="h-2.5 w-16 rounded bg-[var(--color-border)]" />
            </td>
            {Array.from({ length: colCount }).map((_, i) => (
                <td key={i} className="border border-[var(--color-border)] p-0"
                    style={{ width: 32, minWidth: 32 }}>
                    <div className="w-full h-7 bg-[var(--color-border)]/30" />
                </td>
            ))}
            {STATUS_LIST.map(s => <td key={s} className="border border-[var(--color-border)]" style={{ width: 28 }} />)}
            <td className="border border-[var(--color-border)]" style={{ width: 40 }} />
        </tr>
    )
}

// ─── MassActionDropdown ───────────────────────────────────────────────────────

function MassActionDropdown({ studentList, dataMap, setDataMap, tahun, bulan, daysInMonth, onDirty, addToast }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    const applyAll = useCallback((statusCode) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) {
                const days = {}
                for (let d = 1; d <= daysInMonth; d++) {
                    if (!isWeekend(tahun, bulan, d)) days[d] = statusCode
                }
                next[s.id] = days
            }
            return next
        })
        onDirty()
        setOpen(false)
        const meta = STATUS_META[statusCode]
        addToast(`Semua hari kerja diisi: ${meta.label}`, 'success')
    }, [studentList, tahun, bulan, daysInMonth, setDataMap, onDirty, addToast])

    const handleReset = useCallback(() => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) next[s.id] = {}
            return next
        })
        onDirty()
        setOpen(false)
        addToast('Semua data absensi direset', 'info')
    }, [studentList, setDataMap, onDirty, addToast])

    const ACTIONS = [
        ...STATUS_LIST.map(s => ({
            key: s,
            label: `Semua: ${STATUS_META[s].label}`,
            color: STATUS_META[s].color,
            cellBg: STATUS_META[s].cellBg,
            icon: STATUS_META[s].icon,
            action: () => applyAll(s),
        })),
        {
            key: 'reset',
            label: 'Reset Semua',
            color: 'text-[var(--color-text-muted)]',
            cellBg: 'bg-[var(--color-surface-alt)]',
            icon: faArrowsRotate,
            action: handleReset,
        },
    ]

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1.5"
            >
                <FontAwesomeIcon icon={faListCheck} className="text-[9px]" />
                Aksi Massal
                <FontAwesomeIcon icon={faChevronDown} className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl z-50 overflow-hidden py-1">
                    <p className="px-3 pt-1.5 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                        Isi semua hari kerja dengan:
                    </p>
                    {ACTIONS.filter(a => a.key !== 'reset').map(a => (
                        <button key={a.key} onClick={a.action}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold hover:bg-[var(--color-surface-alt)] transition-colors text-left">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border ${a.cellBg} ${a.color.replace('text-', 'border-').replace('600', '500/30')}`}>
                                {a.key}
                            </span>
                            <span className={a.color}>{STATUS_META[a.key].label}</span>
                        </button>
                    ))}
                    <div className="my-1 border-t border-[var(--color-border)]" />
                    <button onClick={handleReset}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold hover:bg-red-500/5 transition-colors text-left text-red-500">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] bg-red-500/10 border border-red-500/20">
                            <FontAwesomeIcon icon={faArrowsRotate} className="text-[9px]" />
                        </span>
                        Reset Semua
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── NotePopup — catatan per siswa per bulan ────────────────────────────────

function NotePopup({ student, note, x, y, onSave, onClose }) {
    const [val, setVal] = useState(note || '')
    const ref = useRef(null)
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { onSave(val); onClose() } }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [onClose, onSave, val])
    return createPortal(
        <div ref={ref} style={{
            position: 'fixed', left: Math.min(x, window.innerWidth - 240), top: y + 4, zIndex: 9999,
            width: 232, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FontAwesomeIcon icon={faStickyNote} style={{ fontSize: 10, color: '#f59e0b' }} />
                <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--color-text)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Catatan — {student.name.split(' ')[0]}
                </p>
                <button onClick={() => { onSave(val); onClose() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
                </button>
            </div>
            <div style={{ padding: 12 }}>
                <textarea
                    autoFocus
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    placeholder="Tulis catatan singkat (misal: sakit operasi, pindah sekolah...)"
                    style={{
                        width: '100%', minHeight: 72, resize: 'vertical', fontSize: 11, fontWeight: 600,
                        color: 'var(--color-text)', background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px',
                        outline: 'none', fontFamily: 'inherit',
                    }}
                    onKeyDown={e => { if (e.key === 'Escape') { onSave(val); onClose() } }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {val && (
                        <button onClick={() => setVal('')}
                            style={{ flex: 1, height: 28, borderRadius: 8, border: '1px solid var(--color-border)', background: 'none', fontSize: 10, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>
                            Hapus Catatan
                        </button>
                    )}
                    <button onClick={() => { onSave(val); onClose() }}
                        style={{ flex: 1, height: 28, borderRadius: 8, background: 'var(--color-primary)', border: 'none', fontSize: 10, fontWeight: 900, color: '#fff', cursor: 'pointer' }}>
                        Simpan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── ImportModal — upload CSV/Excel absensi lama ─────────────────────────────

function ImportModal({ studentList, tahun, bulan, daysInMonth, onImport, onClose }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const loadXLSX = async () => {
        if (window.XLSX) return window.XLSX
        return new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
            s.onload = () => res(window.XLSX)
            s.onerror = () => rej(new Error('Gagal memuat XLSX'))
            document.head.appendChild(s)
        })
    }

    const handleFile = async (f) => {
        if (!f) return
        setFile(f); setError(null); setLoading(true)
        try {
            const XLSX = await loadXLSX()
            const buf = await f.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
            // Cari baris header & kolom nama
            if (rows.length < 2) throw new Error('File tidak valid atau kosong')
            const header = rows[0].map(h => String(h).toLowerCase().trim())
            const namaCol = header.findIndex(h => h.includes('nama'))
            if (namaCol < 0) throw new Error('Kolom "Nama" tidak ditemukan di baris pertama')
            // Map siswa by name
            const nameMap = {}
            for (const s of studentList) nameMap[s.name.toLowerCase().replace(/\s+/g, ' ').trim()] = s.id
            // Parse absensi per hari
            const matched = []; const unmatched = []
            for (let r = 1; r < rows.length; r++) {
                const row = rows[r]
                const rawName = String(row[namaCol] || '').trim()
                if (!rawName) continue
                const key = rawName.toLowerCase().replace(/\s+/g, ' ')
                const sid = nameMap[key]
                if (!sid) { unmatched.push(rawName); continue }
                const days = {}
                for (let d = 1; d <= daysInMonth; d++) {
                    const colIdx = header.findIndex(h => h === String(d))
                    if (colIdx >= 0) {
                        const v = String(row[colIdx] || '').trim().toUpperCase()
                        if (['H', 'S', 'I', 'A', 'P'].includes(v)) days[d] = v
                    }
                }
                matched.push({ sid, name: rawName, days })
            }
            setPreview({ matched, unmatched })
        } catch (e) {
            setError(e.message)
        }
        setLoading(false)
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faFileImport} className="text-blue-500 text-sm" />
                        </div>
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">Import Absensi</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Upload file Excel/CSV {BULAN_NAMA[bulan]} {tahun}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center">
                        <FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)]" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {/* Format hint */}
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <p className="text-[10px] font-black text-blue-600 mb-1">Format yang didukung:</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                            Baris pertama = header. Harus ada kolom <strong>Nama</strong>. Kolom tanggal = angka (1, 2, 3, ...).
                            Nilai: <strong>H</strong> Hadir · <strong>S</strong> Sakit · <strong>I</strong> Izin · <strong>A</strong> Alpa · <strong>P</strong> Pulang Awal.
                        </p>
                    </div>
                    {/* Drop zone */}
                    <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/3 transition-all cursor-pointer">
                        <FontAwesomeIcon icon={faUpload} className="text-2xl text-[var(--color-text-muted)]" />
                        <p className="text-[12px] font-bold text-[var(--color-text-muted)]">
                            {file ? file.name : 'Klik atau seret file di sini'}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">.xlsx, .xls, .csv</p>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                            onChange={e => handleFile(e.target.files[0])} />
                    </label>
                    {loading && <div className="flex items-center justify-center gap-2 py-4"><FontAwesomeIcon icon={faSpinner} className="animate-spin text-[var(--color-primary)]" /><span className="text-[11px] text-[var(--color-text-muted)]">Membaca file...</span></div>}
                    {error && <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-[11px] font-bold text-red-600">{error}</div>}
                    {preview && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">{preview.matched.length} cocok</span>
                                {preview.unmatched.length > 0 && <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">{preview.unmatched.length} tidak ditemukan</span>}
                            </div>
                            {preview.unmatched.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <p className="text-[9px] font-black text-amber-600 mb-1 uppercase tracking-wider">Tidak ditemukan di daftar siswa:</p>
                                    {preview.unmatched.slice(0, 5).map((n, i) => <p key={i} className="text-[10px] text-[var(--color-text-muted)]">· {n}</p>)}
                                    {preview.unmatched.length > 5 && <p className="text-[9px] text-[var(--color-text-muted)]">...dan {preview.unmatched.length - 5} lainnya</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex gap-2 justify-end">
                    <button onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Batal</button>
                    <button
                        disabled={!preview || preview.matched.length === 0}
                        onClick={() => { onImport(preview.matched); onClose() }}
                        className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                        Terapkan ({preview?.matched.length || 0} siswa)
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── AlertThresholdModal — konfigurasi ambang batas alert ────────────────────

function AlertThresholdModal({ threshold, onSave, onClose }) {
    const [alpa, setAlpa] = useState(threshold.alpa)
    const [hadirPct, setHadirPct] = useState(threshold.hadirPct)
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-xs overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBell} className="text-amber-500 text-sm" />
                        </div>
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">Ambang Batas Alert</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Tampilkan notifikasi otomatis</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center">
                        <FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)]" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                            Alpa ≥ <span className="text-red-600 text-[14px] ml-1">{alpa}</span> hari → merah
                        </label>
                        <input type="range" min={1} max={10} value={alpa} onChange={e => setAlpa(+e.target.value)}
                            className="w-full accent-red-500 h-1.5 cursor-pointer" />
                        <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1">
                            <span>1</span><span>5</span><span>10</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                            Kehadiran &lt; <span className="text-amber-600 text-[14px] ml-1">{hadirPct}%</span> → kuning
                        </label>
                        <input type="range" min={30} max={90} step={5} value={hadirPct} onChange={e => setHadirPct(+e.target.value)}
                            className="w-full accent-amber-500 h-1.5 cursor-pointer" />
                        <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1">
                            <span>30%</span><span>60%</span><span>90%</span>
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex gap-2 justify-end">
                    <button onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Batal</button>
                    <button onClick={() => { onSave({ alpa, hadirPct }); onClose() }}
                        className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black hover:opacity-90 transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                        Simpan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── ColFillPopup — klik angka header tanggal → isi semua siswa ───────────────

function ColFillPopup({ day, dow, x, y, onFill, onClear, onClose, studentCount }) {
    const ref = useRef(null)
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [onClose])

    return createPortal(
        <div ref={ref} style={{
            position: 'fixed', left: Math.min(x, window.innerWidth - 210), top: y + 4, zIndex: 9999,
            width: 200, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                    {DOW_SHORT[dow]} · Tanggal {day}
                </p>
                <p style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Isi semua {studentCount} siswa dengan:
                </p>
            </div>
            <div style={{ padding: '4px 0' }}>
                {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => { onFill(s); onClose() }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--color-surface-alt)] transition-colors text-left`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`} style={{ flexShrink: 0 }}>
                            {s}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{STATUS_META[s].label}</span>
                    </button>
                ))}
                <div style={{ margin: '4px 12px', height: 1, background: 'var(--color-border)' }} />
                <button onClick={() => { onClear(); onClose() }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/5 transition-colors text-left"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)]" style={{ flexShrink: 0 }}>
                        <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 9, color: 'var(--color-text-muted)' }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Kosongkan hari ini</span>
                </button>
            </div>
        </div>,
        document.body
    )
}

// ─── RowFillPopup — klik nama siswa → isi semua hari kerjanya ─────────────────

function RowFillPopup({ student, x, y, onFill, onClear, onClose, weekdays }) {
    const ref = useRef(null)
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [onClose])

    return createPortal(
        <div ref={ref} style={{
            position: 'fixed', left: Math.min(x, window.innerWidth - 210), top: y + 4, zIndex: 9999,
            width: 200, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.name.split(' ').slice(0, 2).join(' ')}
                </p>
                <p style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Isi {weekdays} hari kerja dengan:
                </p>
            </div>
            <div style={{ padding: '4px 0' }}>
                {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => { onFill(s); onClose() }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`} style={{ flexShrink: 0 }}>
                            {s}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{STATUS_META[s].label}</span>
                    </button>
                ))}
                <div style={{ margin: '4px 12px', height: 1, background: 'var(--color-border)' }} />
                <button onClick={() => { onClear(); onClose() }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/5 transition-colors text-left"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)]" style={{ flexShrink: 0 }}>
                        <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 9, color: 'var(--color-text-muted)' }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Reset siswa ini</span>
                </button>
            </div>
        </div>,
        document.body
    )
}



function RekapBulananPanel({ classId, tahun, bulan, studentList, dataMap }) {
    const { addToast } = useToast()
    const { profile } = useAuth()

    const [raportMap, setRaportMap] = useState({})
    const [syncing, setSyncing] = useState(false)
    const [syncDone, setSyncDone] = useState(false)
    // Feature 9: Delta vs bulan lalu
    const [lastMonthMap, setLastMonthMap] = useState({})

    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])
    const rekapData = useMemo(() => {
        const r = {}
        for (const s of studentList) r[s.id] = summarize(dataMap[s.id] || {}, tahun, bulan)
        return r
    }, [studentList, dataMap, tahun, bulan])

    const summary = useMemo(() => {
        if (!studentList.length) return null
        const total = studentList.length
        const avgHadir = Math.round(studentList.reduce((a, s) => a + (rekapData[s.id]?.H || 0), 0) / total * 10) / 10
        const alpaCount = studentList.filter(s => (rekapData[s.id]?.A || 0) >= 3).length
        return { total, avgHadir, alpaCount }
    }, [rekapData, studentList])

    useEffect(() => {
        if (!classId || !studentList.length) return
        setSyncDone(false)
        const ids = studentList.map(s => s.id)
        supabase.from('student_monthly_reports')
            .select('student_id, hari_sakit, hari_izin, hari_alpa, hari_pulang')
            .in('student_id', ids).eq('month', bulan).eq('year', tahun)
            .then(({ data }) => {
                const m = {}
                for (const r of (data || [])) m[r.student_id] = r
                setRaportMap(m)
            })
        // Feature 9: Load previous month
        const prevBulanVal = bulan === 1 ? 12 : bulan - 1
        const prevTahunVal = bulan === 1 ? tahun - 1 : tahun
        supabase.from('attendance_monthly')
            .select('student_id, days')
            .in('student_id', ids).eq('year', prevTahunVal).eq('month', prevBulanVal)
            .then(({ data }) => {
                const m = {}
                for (const r of (data || [])) {
                    m[r.student_id] = summarize(r.days || {}, prevTahunVal, prevBulanVal)
                }
                setLastMonthMap(m)
            })
    }, [classId, tahun, bulan, studentList])

    const handleSync = async () => {
        if (syncing) return
        setSyncing(true)
        const upserts = studentList.map(s => ({
            student_id: s.id, month: bulan, year: tahun,
            hari_sakit: rekapData[s.id]?.S || 0,
            hari_izin: rekapData[s.id]?.I || 0,
            hari_alpa: rekapData[s.id]?.A || 0,
            hari_pulang: rekapData[s.id]?.P || 0,
            updated_by: profile?.id,
        }))
        const { error } = await supabase.from('student_monthly_reports')
            .upsert(upserts, { onConflict: 'student_id,month,year' })
        setSyncing(false)
        if (error) {
            addToast('Gagal sinkronisasi: ' + error.message, 'error')
        } else {
            addToast(`${studentList.length} siswa berhasil disinkronkan ke Raport ✓`, 'success')
            setSyncDone(true)
            const ids = studentList.map(s => s.id)
            const { data } = await supabase.from('student_monthly_reports')
                .select('student_id, hari_sakit, hari_izin, hari_alpa, hari_pulang')
                .in('student_id', ids).eq('month', bulan).eq('year', tahun)
            if (data) { const m = {}; for (const r of data) m[r.student_id] = r; setRaportMap(m) }
        }
    }

    // Feature 8: Cetak rekap
    const handlePrint = useCallback(() => {
        const prevBulanVal = bulan === 1 ? 12 : bulan - 1
        const hasLastMonth = Object.keys(lastMonthMap).length > 0
        const rows = studentList.map((s, idx) => {
            const r = rekapData[s.id] || {}
            const pct = weekdays > 0 ? Math.round(((r.H || 0) / weekdays) * 100) : 0
            const lm = lastMonthMap[s.id] || {}
            const delta = (r.H || 0) - (lm.H || 0)
            return `<tr>
                <td>${idx + 1}</td>
                <td style="text-align:left">${s.name}</td>
                <td style="color:#059669">${r.H || 0}</td>
                <td style="color:#d97706">${r.S || 0}</td>
                <td style="color:#2563eb">${r.I || 0}</td>
                <td style="color:${(r.A || 0) > 0 ? '#dc2626' : '#999'}">${r.A || 0}</td>
                <td style="color:#7c3aed">${r.P || 0}</td>
                <td style="font-weight:900;color:${pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626'}">${pct}%</td>
                ${hasLastMonth ? `<td style="font-weight:900;color:${delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#999'}">${delta > 0 ? '+' : ''}${delta}</td>` : ''}
            </tr>`
        }).join('')
        const win = window.open('', '_blank', 'width=900,height=700')
        win.document.write(`<!DOCTYPE html><html><head>
            <title>Rekap Absensi — ${BULAN_NAMA[bulan]} ${tahun}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
                h1 { font-size: 14px; font-weight: 900; margin-bottom: 4px; }
                p.sub { font-size: 10px; color: #666; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: center; }
                th { background: #f5f5f5; font-weight: 900; font-size: 9px; text-transform: uppercase; }
                td:nth-child(2) { text-align: left; }
                tr:nth-child(even) { background: #fafafa; }
                @media print { body { padding: 10mm; } }
            </style>
        </head><body>
            <h1>Rekap Absensi — ${BULAN_NAMA[bulan]} ${tahun}</h1>
            <p class="sub">${weekdays} hari kerja efektif &middot; ${studentList.length} siswa</p>
            <table>
                <thead><tr>
                    <th width="32">#</th>
                    <th style="text-align:left">Nama Siswa</th>
                    <th>H</th><th>S</th><th>I</th><th>A</th><th>P</th>
                    <th>Hadir %</th>
                    ${hasLastMonth ? `<th>Δ vs ${BULAN_NAMA[prevBulanVal]}</th>` : ''}
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <script>window.onload=()=>window.print()<\/script>
        </body></html>`)
        win.document.close()
    }, [studentList, rekapData, lastMonthMap, weekdays, bulan, tahun])

    const handleExport = async () => {
        if (!window.XLSX) {
            addToast('Memuat library export...', 'info')
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
                s.onload = res; s.onerror = () => rej(new Error('Gagal memuat XLSX'))
                document.head.appendChild(s)
            })
        }
        const dim = getDaysInMonth(tahun, bulan)
        const rows = studentList.map((s, i) => {
            const row = { No: i + 1, Nama: s.name, NISN: s.nisn || '' }
            for (let d = 1; d <= dim; d++) row[`${d}`] = dataMap[s.id]?.[d] || ''
            const r = rekapData[s.id] || {}
            row.H = r.H || 0; row.S = r.S || 0; row.I = r.I || 0; row.A = r.A || 0; row.P = r.P || 0
            row['%'] = weekdays > 0 ? `${Math.round(((r.H || 0) / weekdays) * 100)}%` : '0%'
            return row
        })
        const ws = window.XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 14 },
        ...Array.from({ length: dim }, () => ({ wch: 3 })),
        ...Array.from({ length: 6 }, () => ({ wch: 5 })),
        ]
        const wb = window.XLSX.utils.book_new()
        window.XLSX.utils.book_append_sheet(wb, ws, `${BULAN_NAMA[bulan]} ${tahun}`)
        window.XLSX.writeFile(wb, `Absensi_${BULAN_NAMA[bulan]}_${tahun}.xlsx`)
        addToast('Export Excel berhasil ✓', 'success')
    }

    return (
        <div>
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Rekap — {BULAN_NAMA[bulan]} {tahun}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{weekdays} hari kerja efektif (Senin–Jumat)</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExport}
                        className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faFileExport} className="text-[10px]" /> Export Excel
                    </button>
                    {/* Feature 8: Cetak rekap */}
                    <button onClick={handlePrint}
                        className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faPrint} className="text-[10px]" /> Cetak
                    </button>
                    <button onClick={handleSync} disabled={syncing}
                        className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${syncDone
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                            : 'bg-[var(--color-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60'
                            }`}>
                        <FontAwesomeIcon icon={syncing ? faSpinner : syncDone ? faCircleCheck : faCloudArrowUp} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Menyinkronkan...' : syncDone ? 'Tersinkronkan' : 'Sync ke Raport'}
                    </button>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-[var(--color-border)]">
                    {[
                        { label: 'Rata-rata Hadir', val: summary.avgHadir, sub: `hari / ${weekdays} efektif`, color: 'text-emerald-600' },
                        { label: 'Kehadiran Kelas', val: `${weekdays > 0 ? Math.round((summary.avgHadir / weekdays) * 100) : 0}%`, sub: 'rata-rata kelas', color: 'text-[var(--color-primary)]' },
                        { label: 'Alpa ≥ 3 hari', val: summary.alpaCount, sub: 'siswa perlu perhatian', color: summary.alpaCount > 0 ? 'text-red-600' : 'text-[var(--color-text-muted)]' },
                    ].map(c => (
                        <div key={c.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{c.label}</p>
                            <p className={`text-[20px] font-black leading-none ${c.color}`}>{c.val}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{c.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left w-10"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">#</span></th>
                            <th className="px-4 py-3 text-left"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama</span></th>
                            {STATUS_LIST.map(s => (
                                <th key={s} className="px-3 py-3 text-center">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${STATUS_META[s].color}`}>
                                        <FontAwesomeIcon icon={STATUS_META[s].icon} className="mr-1" />{STATUS_META[s].label}
                                    </span>
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Hadir %</span></th>
                            <th className="px-3 py-3 text-center"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Δ Bulan Lalu</span></th>
                            <th className="px-3 py-3 text-center"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Di Raport</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {studentList.map((s, idx) => {
                            const r = rekapData[s.id] || {}
                            const pct = weekdays > 0 ? Math.round(((r.H || 0) / weekdays) * 100) : 0
                            const rap = raportMap[s.id]
                            const synced = rap && rap.hari_sakit === (r.S || 0) && rap.hari_izin === (r.I || 0) && rap.hari_alpa === (r.A || 0)
                            const alertAlpa = (r.A || 0) >= 3
                            return (
                                <tr key={s.id} className={`transition-colors hover:bg-[var(--color-surface-alt)]/50 ${alertAlpa ? 'bg-red-500/[0.02]' : ''}`}>
                                    <td className="px-4 py-2.5">
                                        <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black text-[var(--color-text-muted)]">{idx + 1}</div>
                                    </td>
                                    <td className="px-4 py-2.5 min-w-[160px]">
                                        <p className="text-[13px] font-bold text-[var(--color-text)]">{s.name}</p>
                                        {alertAlpa && <p className="text-[9px] font-black text-red-600 flex items-center gap-1 mt-0.5"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />Alpa {r.A} hari</p>}
                                    </td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-emerald-600">{r.H || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-amber-600">{r.S || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-blue-600">{r.I || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className={`text-[13px] font-black ${(r.A || 0) > 0 ? 'text-red-600' : 'text-[var(--color-text-muted)]'}`}>{r.A || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-purple-600">{r.P || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[12px] font-black ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                                            <div className="w-12 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }} />
                                            </div>
                                        </div>
                                    </td>
                                    {/* Feature 9: Delta vs bulan lalu */}
                                    <td className="px-3 py-2.5 text-center">
                                        {(() => {
                                            const lm = lastMonthMap[s.id]
                                            if (!lm) return <span className="text-[9px] text-[var(--color-text-muted)]">—</span>
                                            const delta = (r.H || 0) - (lm.H || 0)
                                            return (
                                                <span className={`text-[11px] font-black flex items-center justify-center gap-1 ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-[var(--color-text-muted)]'}`}>
                                                    {delta > 0 && <FontAwesomeIcon icon={faArrowTrendUp} className="text-[9px]" />}
                                                    {delta < 0 && <FontAwesomeIcon icon={faArrowTrendDown} className="text-[9px]" />}
                                                    {delta > 0 ? `+${delta}` : delta}
                                                </span>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {rap
                                            ? synced
                                                ? <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md"><FontAwesomeIcon icon={faCircleCheck} className="text-[8px]" /> Sinkron</span>
                                                : <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" /> Beda</span>
                                            : <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Belum ada</span>
                                        }
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── TutorialModal ────────────────────────────────────────────────────────────

function TutorialModal({ onClose }) {
    const [step, setStep] = useState(0)

    const SLIDES = [
        {
            icon: faCalendarDays,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-500/15',
            title: 'Selamat Datang di Absensi Bulanan',
            subtitle: 'Format baru — lebih detail, lebih mudah',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                            Pilih Kelas & Bulan
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Gunakan dropdown kelas di kiri dan tombol navigasi bulan untuk memilih periode absensi yang ingin diisi.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                            Isi Absensi Harian
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Tabel menampilkan 31 kolom tanggal. Klik sel untuk mengisi status kehadiran siswa per hari.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">3</span>
                            Simpan & Sync ke Raport
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Tekan Simpan atau Ctrl+S. Setelah tersimpan, gunakan tab Rekap untuk sinkronisasi data ke Raport bulanan.</p>
                    </div>
                </div>
            ),
            tips: 'Tabel ini menggantikan format mingguan lama. Semua data tersimpan per hari sehingga detail kehadiran bisa dilacak kapan saja.',
        },
        {
            icon: faArrowPointer,
            iconColor: 'text-indigo-500',
            iconBg: 'bg-indigo-500/15',
            title: 'Cara Mengisi Sel Absensi',
            subtitle: 'Klik sel untuk ganti status — cycling otomatis',
            body: (
                <div className="space-y-2.5 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <p className="text-[var(--color-text-muted)]">Setiap klik pada sel akan berpindah ke status berikutnya secara berurutan:</p>
                    {/* Satu baris: badge + panah */}
                    <div className="flex items-center gap-1 flex-nowrap">
                        {[...STATUS_LIST, ''].map((s, i) => (
                            <div key={i} className="flex items-center gap-1 shrink-0">
                                {s
                                    ? <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`}>{s}</span>
                                    : <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">—</span>
                                }
                                {i < 5 && <FontAwesomeIcon icon={faChevronRight} className="text-[var(--color-text-muted)] opacity-25 text-[8px] shrink-0" />}
                            </div>
                        ))}
                    </div>
                    {/* Legend: huruf → label */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {STATUS_LIST.map(s => (
                            <div key={s} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${STATUS_META[s].cellBg} ${STATUS_META[s].cellBorder}`}>
                                <span className={`text-[11px] font-black ${STATUS_META[s].color}`}>{s}</span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)]">=</span>
                                <span className={`text-[10px] font-black ${STATUS_META[s].color}`}>{STATUS_META[s].label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                            <span className="text-[11px] font-black text-[var(--color-text-muted)]">—</span>
                            <span className="text-[9px] font-bold text-[var(--color-text-muted)]">=</span>
                            <span className="text-[10px] font-black text-[var(--color-text-muted)]">Kosong</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] mt-2">
                        <p className="font-bold text-[var(--color-text-muted)] mb-2">Keterangan kolom warna:</p>
                        <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-red-400/20 border border-red-400/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <FontAwesomeIcon icon={faCalendarDays} className="text-red-400 text-[7px]" />
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">Kolom <b>Sabtu &amp; Minggu</b> — angka merah &amp; redup, tetap bisa diisi jika sekolah masuk</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-0.5">
                                    <FontAwesomeIcon icon={faCircleXmark} className="text-[var(--color-text-muted)]/30 text-[8px]" />
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">Kolom <b>tanggal tidak valid</b> (misal Feb 30–31) — disabled otomatis, tidak bisa diklik</span>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            tips: 'Klik lagi saat sudah Pulang Awal (P) akan balik ke kosong. Siklus: kosong → H → S → I → A → P → kosong.',
        },
        {
            icon: faListCheck,
            iconColor: 'text-rose-500',
            iconBg: 'bg-rose-500/15',
            title: 'Aksi Massal',
            subtitle: 'Isi banyak siswa sekaligus dengan cepat',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <p className="text-[var(--color-text-muted)]">Tombol <strong>Aksi Massal</strong> di toolbar memungkinkan kamu mengisi semua hari kerja (Senin–Jumat) untuk semua siswa sekaligus.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {STATUS_LIST.map(s => (
                            <div key={s} className={`flex items-center gap-2 p-2 rounded-xl border ${STATUS_META[s].cellBg} ${STATUS_META[s].cellBorder}`}>
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`}>{s}</span>
                                <div>
                                    <p className={`text-[10px] font-black ${STATUS_META[s].color}`}>{STATUS_META[s].label}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)]">Isi semua hari kerja</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-2">
                        <FontAwesomeIcon icon={faArrowsRotate} className="text-red-500 text-[11px] shrink-0" />
                        <p className="text-[10px] text-red-600"><strong>Reset Semua</strong> — hapus seluruh isian bulan ini dan mulai dari kosong.</p>
                    </div>
                </div>
            ),
            tips: 'Aksi massal berguna untuk awal bulan — isi semua Hadir dulu, lalu koreksi siswa yang tidak hadir satu per satu.',
        },
        {
            icon: faFloppyDisk,
            iconColor: 'text-sky-500',
            iconBg: 'bg-sky-500/15',
            title: 'Simpan, Draft & Ctrl+S',
            subtitle: 'Data aman meski koneksi terputus',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faFloppyDisk} className="text-sky-500 text-[8px]" />
                            </span>
                            Simpan ke Server
                        </p>
                        <p className="text-[var(--color-text-muted)]">Klik tombol <strong>Simpan Perubahan</strong> di pojok kanan bawah tabel, atau gunakan pintasan <strong>Ctrl+S</strong> (Cmd+S di Mac) untuk menyimpan ke database.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faTableList} className="text-indigo-500 text-[8px]" />
                            </span>
                            Auto-Draft Lokal
                        </p>
                        <p className="text-[var(--color-text-muted)]">Setiap perubahan otomatis disimpan sebagai draft di browser (0.5 detik setelah mengetik). Jika tiba-tiba browser tertutup, draft bisa dipulihkan saat membuka halaman kembali.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <p className="font-black text-amber-600 mb-1 flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-[10px]" />
                            Floating Save Bar
                        </p>
                        <p className="text-amber-700/70">Bar oranye di bagian bawah layar muncul jika ada perubahan belum disimpan. Klik <strong>Reset</strong> untuk membatalkan atau <strong>Simpan</strong> untuk menyimpan.</p>
                    </div>
                </div>
            ),
            tips: 'Draft lokal hanya tersimpan di browser yang sama. Jika membuka dari perangkat lain, data hanya tersedia setelah disimpan ke server.',
        },
        {
            icon: faChartSimple,
            iconColor: 'text-violet-500',
            iconBg: 'bg-violet-500/15',
            title: 'Tab Rekap & Sync ke Raport',
            subtitle: 'Akumulasi dan sinkronisasi data absensi',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <p className="text-[var(--color-text-muted)]">Tab <strong>Rekap</strong> menampilkan akumulasi H/S/I/A/P per siswa untuk bulan yang dipilih, beserta persentase kehadiran.</p>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 text-violet-600 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faArrowsRotate} className="text-violet-500 text-[8px]" />
                            </span>
                            Sync ke Raport
                        </p>
                        <p className="text-[var(--color-text-muted)]">Tombol <strong>Sync ke Raport</strong> menyalin data S/I/A/P ke tabel <code className="text-[9px] bg-[var(--color-border)] px-1 py-0.5 rounded">student_monthly_reports</code> yang dipakai halaman Raport.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faFileExport} className="text-emerald-500 text-[8px]" />
                            </span>
                            Export Excel
                        </p>
                        <p className="text-[var(--color-text-muted)]">Download data absensi lengkap (per hari + rekap) dalam format .xlsx. Kolom tanggal menampilkan kode H/S/I/A/P.</p>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl border border-red-500/20 bg-red-500/5">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" />
                        <p className="text-[10px] text-red-600">Siswa alpa <strong>≥ 3 hari</strong> ditandai merah di rekap sebagai peringatan perhatian khusus.</p>
                    </div>
                </div>
            ),
            tips: 'Selalu klik Simpan sebelum pindah ke tab Rekap agar data yang ditampilkan sudah ter-update.',
        },
    ]

    const slide = SLIDES[step]
    const isLast = step === SLIDES.length - 1
    const isFirst = step === 0

    return createPortal(
        <div
            className="fixed inset-0 z-[203] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                role="dialog" aria-modal="true" aria-label="Tutorial Absensi"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${slide.iconBg}`}>
                            <FontAwesomeIcon icon={slide.icon} className={`text-base ${slide.iconColor}`} />
                        </div>
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">{slide.title}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">{slide.subtitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Tutup tutorial"
                        className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all shrink-0">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {/* Dot navigator */}
                <div className="flex items-center justify-center gap-1.5 pt-4 px-6">
                    {SLIDES.map((_, i) => (
                        <button key={i} onClick={() => setStep(i)}
                            className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-emerald-500' : 'w-2 h-2 bg-[var(--color-border)] hover:bg-emerald-500/40'}`}
                            aria-label={`Slide ${i + 1}`} />
                    ))}
                    <span className="ml-2 text-[9px] text-[var(--color-text-muted)] font-bold">{step + 1}/{SLIDES.length}</span>
                </div>

                {/* Body */}
                <div className="px-6 pt-4 pb-2 overflow-y-auto flex-1">
                    {typeof slide.body === 'string'
                        ? <p className="text-[12px] text-[var(--color-text)] leading-relaxed">{slide.body}</p>
                        : slide.body
                    }
                </div>

                {/* Tips */}
                <div className="px-6 pb-2">
                    <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-start gap-2">
                        <FontAwesomeIcon icon={faLightbulb} className="text-emerald-500 text-[11px] mt-0.5 shrink-0" />
                        <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">{slide.tips}</p>
                    </div>
                </div>

                {/* Footer nav */}
                <div className="flex items-center gap-3 px-6 py-4">
                    <button onClick={() => setStep(v => Math.max(0, v - 1))} disabled={isFirst}
                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all disabled:opacity-30 flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" /> Sebelumnya
                    </button>
                    <div className="flex-1" />
                    {isLast ? (
                        <button onClick={onClose}
                            className="h-9 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Selesai
                        </button>
                    ) : (
                        <button onClick={() => setStep(v => Math.min(SLIDES.length - 1, v + 1))}
                            className="h-9 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                            Berikutnya <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AbsensiPage() {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const now = new Date()

    const [classList, setClassList] = useState([])
    const [classId, setClassId] = useState('')
    const [tahun, setTahun] = useState(now.getFullYear())
    const [bulan, setBulan] = useState(now.getMonth() + 1)
    const [studentList, setStudentList] = useState([])
    const [dataMap, setDataMap] = useState({})
    const [originalMap, setOriginalMap] = useState({})
    const [loadingClass, setLoadingClass] = useState(true)
    const [loadingData, setLoadingData] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [activeTab, setActiveTab] = useState('input')
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
    const [draftAvail, setDraftAvail] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)

    // Undo/Redo history
    const historyRef = useRef([])
    const historyIdxRef = useRef(-1)
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    // Drag-to-fill state
    const dragRef = useRef({ active: false, status: null })

    // ColFill & RowFill popup
    const [colFillTarget, setColFillTarget] = useState(null) // { d, dow, x, y }
    const [rowFillTarget, setRowFillTarget] = useState(null) // { student, x, y }

    // Today
    const todayRef = useRef({ d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() })
    const todayDate = (bulan === todayRef.current.m && tahun === todayRef.current.y)
        ? todayRef.current.d : null

    const [searchRaw, setSearchRaw] = useState('')
    const search = useDeferredValue(searchRaw)

    // ── Feature 1: Copy bulan lalu ──
    const [copyingLastMonth, setCopyingLastMonth] = useState(false)
    // ── Feature 2: Keyboard nav state ──
    const [focusedCell, setFocusedCell] = useState(null) // { rowIdx, day }
    const tableBodyRef = useRef(null)
    // ── Feature 3: Hide weekend ──
    const [hideWeekend, setHideWeekend] = useState(false)
    // ── Feature 4: Filter row siswa ──
    const [filterMode, setFilterMode] = useState('all') // 'all' | 'alpa' | 'empty' | 'belum'
    // ── Feature 5: Scroll ke hari ini handled via ref ──
    const todayColRef = useRef(null)
    // ── Feature 6: Catatan per siswa ──
    const [notesMap, setNotesMap] = useState({}) // { studentId: string }
    const [noteTarget, setNoteTarget] = useState(null) // { student, x, y }
    // ── Feature 7: Import CSV/Excel ──
    const [showImport, setShowImport] = useState(false)
    // ── Feature 10: Alert threshold ──
    const [alertThreshold, setAlertThreshold] = useState(() => {
        try { return JSON.parse(localStorage.getItem('absensi_alert_threshold') || 'null') || { alpa: 3, hadirPct: 75 } }
        catch { return { alpa: 3, hadirPct: 75 } }
    })
    const [showAlertConfig, setShowAlertConfig] = useState(false)

    const daysInMonth = useMemo(() => getDaysInMonth(tahun, bulan), [tahun, bulan])

    const dayMeta = useMemo(() => Array.from({ length: 31 }, (_, i) => {
        const d = i + 1
        return {
            d,
            invalid: d > daysInMonth,
            weekend: d <= daysInMonth && isWeekend(tahun, bulan, d),
            dow: d <= daysInMonth ? getDow(tahun, bulan, d) : null,
        }
    }), [daysInMonth, tahun, bulan])

    // Feature 3: visibleDays — filtered by hideWeekend
    const visibleDays = useMemo(() =>
        dayMeta.filter(dm => !dm.invalid && !(hideWeekend && dm.weekend)).map(dm => dm.d),
        [dayMeta, hideWeekend]
    )

    const filteredStudents = useMemo(() => {
        let list = studentList
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(s => s.name.toLowerCase().includes(q) || (s.nisn && s.nisn.includes(q)))
        }
        // Feature 4: Filter row siswa
        if (filterMode === 'alpa') list = list.filter(s => (dataMap[s.id] ? Object.values(dataMap[s.id]).filter(v => v === 'A').length : 0) >= alertThreshold.alpa)
        else if (filterMode === 'belum') list = list.filter(s => {
            const days = dataMap[s.id] || {}
            const filledWeekdays = Object.entries(days).filter(([d, v]) => v && !isWeekend(tahun, bulan, +d)).length
            return filledWeekdays === 0
        })
        else if (filterMode === 'empty') list = list.filter(s => {
            const days = dataMap[s.id] || {}
            return Object.values(days).some(v => !v) || Object.keys(days).length < visibleDays.filter(d => !isWeekend(tahun, bulan, d)).length
        })
        return list
    }, [studentList, search, filterMode, dataMap, tahun, bulan, alertThreshold.alpa, visibleDays])

    const colSummary = useMemo(() => {
        const out = {}
        for (let d = 1; d <= daysInMonth; d++) {
            let h = 0, x = 0
            for (const s of studentList) {
                const v = dataMap[s.id]?.[d] || ''
                if (v === 'H') h++; else if (v) x++
            }
            out[d] = { h, x }
        }
        return out
    }, [dataMap, studentList, daysInMonth])

    // Progress completion: % hari kerja yang sudah terisi (semua siswa)
    const completionPct = useMemo(() => {
        if (!studentList.length) return 0
        let filled = 0, total = 0
        for (let d = 1; d <= daysInMonth; d++) {
            if (isWeekend(tahun, bulan, d)) continue
            total += studentList.length
            for (const s of studentList) {
                if (dataMap[s.id]?.[d]) filled++
            }
        }
        return total > 0 ? Math.round((filled / total) * 100) : 0
    }, [dataMap, studentList, daysInMonth, tahun, bulan])

    // Push snapshot ke history untuk undo/redo
    const pushHistory = useCallback((map) => {
        const MAX = 30
        const stack = historyRef.current
        const idx = historyIdxRef.current
        // Hapus redo branch
        stack.splice(idx + 1)
        stack.push(JSON.parse(JSON.stringify(map)))
        if (stack.length > MAX) stack.shift()
        historyIdxRef.current = stack.length - 1
        setCanUndo(historyIdxRef.current > 0)
        setCanRedo(false)
    }, [])

    const applyUndo = useCallback(() => {
        const stack = historyRef.current
        if (historyIdxRef.current <= 0) return
        historyIdxRef.current--
        const snapshot = JSON.parse(JSON.stringify(stack[historyIdxRef.current]))
        setDataMap(snapshot)
        setIsDirty(true)
        setCanUndo(historyIdxRef.current > 0)
        setCanRedo(true)
    }, [])

    const applyRedo = useCallback(() => {
        const stack = historyRef.current
        if (historyIdxRef.current >= stack.length - 1) return
        historyIdxRef.current++
        const snapshot = JSON.parse(JSON.stringify(stack[historyIdxRef.current]))
        setDataMap(snapshot)
        setIsDirty(true)
        setCanUndo(true)
        setCanRedo(historyIdxRef.current < stack.length - 1)
    }, [])

    const draftTimerRef = useRef(null)
    const handleSaveRef = useRef(null)

    useEffect(() => {
        const cls = classList.find(c => c.id === classId)
        document.title = cls ? `Absensi ${cls.name} · ${BULAN_NAMA[bulan]} ${tahun} | Laporanmu` : 'Absensi Bulanan | Laporanmu'
        return () => { document.title = 'Laporanmu' }
    }, [classId, classList, bulan, tahun])

    useEffect(() => {
        const on = () => { setIsOnline(true); addToast('Koneksi kembali', 'success') }
        const off = () => { setIsOnline(false); addToast('Offline — perubahan disimpan lokal', 'warning') }
        window.addEventListener('online', on); window.addEventListener('offline', off)
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
    }, [addToast])

    useEffect(() => {
        const h = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
        window.addEventListener('beforeunload', h)
        return () => window.removeEventListener('beforeunload', h)
    }, [isDirty])

    useEffect(() => {
        const h = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveRef.current?.() }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); applyUndo() }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); applyRedo() }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [applyUndo, applyRedo])

    useEffect(() => {
        setLoadingClass(true)
        supabase.from('classes').select('id, name').order('name').then(({ data }) => {
            if (data?.length) { setClassList(data); setClassId(data[0].id) }
            setLoadingClass(false)
        })
    }, [])

    useEffect(() => {
        if (!classId) return
        try { setDraftAvail(!!localStorage.getItem(draftKey(classId, tahun, bulan))) }
        catch { setDraftAvail(false) }
    }, [classId, tahun, bulan])

    useEffect(() => {
        if (!classId || !studentList.length || !isDirty) return
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        draftTimerRef.current = setTimeout(() => {
            try {
                const payload = JSON.stringify({ dataMap, savedAt: Date.now() })
                if (payload.length < 2 * 1024 * 1024) { localStorage.setItem(draftKey(classId, tahun, bulan), payload); setDraftAvail(true) }
            } catch { /* quota */ }
        }, 500)
        return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
    }, [dataMap, isDirty, classId, tahun, bulan, studentList.length])

    const loadData = useCallback(async () => {
        if (!classId) return
        setLoadingData(true); setSearchRaw('')
        const [{ data: students }, { data: attendance }] = await Promise.all([
            supabase.from('students').select('id, name, nisn')
                .eq('class_id', classId).is('deleted_at', null).eq('is_active', true).order('name'),
            supabase.from('attendance_monthly').select('student_id, days')
                .eq('class_id', classId).eq('year', tahun).eq('month', bulan),
        ])
        setStudentList(students || [])
        const map = {}
        for (const s of (students || [])) {
            const ex = attendance?.find(a => a.student_id === s.id)
            map[s.id] = ex?.days ? { ...ex.days } : {}
        }
        setDataMap(map); setOriginalMap(JSON.parse(JSON.stringify(map)))
        setIsDirty(false); setLoadingData(false)
        // Reset undo/redo history
        historyRef.current = [JSON.parse(JSON.stringify(map))]
        historyIdxRef.current = 0
        setCanUndo(false); setCanRedo(false)
    }, [classId, tahun, bulan])

    useEffect(() => { loadData() }, [loadData])

    const handleCellClick = useCallback((sid, day) => {
        setDataMap(prev => {
            const curr = prev[sid] || {}
            const next = cycleStatus(curr[day] || '')
            const newDays = { ...curr }
            if (next === '') delete newDays[day]; else newDays[day] = next
            const updated = { ...prev, [sid]: newDays }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
    }, [pushHistory])

    // Drag-to-fill: mousedown → set drag status, mouseenter → apply
    const handleCellMouseDown = useCallback((sid, day) => {
        setDataMap(prev => {
            const curr = prev[sid] || {}
            const next = cycleStatus(curr[day] || '')
            dragRef.current = { active: true, status: next }
            const newDays = { ...curr }
            if (next === '') delete newDays[day]; else newDays[day] = next
            const updated = { ...prev, [sid]: newDays }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
    }, [pushHistory])

    const handleCellMouseEnter = useCallback((sid, day) => {
        if (!dragRef.current.active) return
        const status = dragRef.current.status
        setDataMap(prev => {
            const curr = prev[sid] || {}
            if ((curr[day] || '') === status) return prev
            const newDays = { ...curr }
            if (status === '') delete newDays[day]; else newDays[day] = status
            return { ...prev, [sid]: newDays }
        })
        setIsDirty(true)
    }, [])

    // Stop drag on mouseup anywhere
    useEffect(() => {
        const stop = () => {
            if (dragRef.current.active) {
                dragRef.current = { active: false, status: null }
                setDataMap(prev => { pushHistory(prev); return prev })
            }
        }
        window.addEventListener('mouseup', stop)
        return () => window.removeEventListener('mouseup', stop)
    }, [pushHistory])

    // Col fill: isi semua siswa untuk satu tanggal
    const handleColFill = useCallback((day, status) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) {
                const newDays = { ...next[s.id] }
                if (status === '') delete newDays[day]; else newDays[day] = status
                next[s.id] = newDays
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
    }, [studentList, pushHistory])

    const handleColClear = useCallback((day) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) {
                const newDays = { ...next[s.id] }
                delete newDays[day]
                next[s.id] = newDays
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
    }, [studentList, pushHistory])

    // Row fill: isi semua hari kerja satu siswa
    const handleRowFill = useCallback((sid, status) => {
        setDataMap(prev => {
            const newDays = {}
            for (let d = 1; d <= daysInMonth; d++) {
                if (!isWeekend(tahun, bulan, d)) {
                    if (status !== '') newDays[d] = status
                } else {
                    if (prev[sid]?.[d]) newDays[d] = prev[sid][d] // preserve weekend entries
                }
            }
            const updated = { ...prev, [sid]: newDays }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
    }, [daysInMonth, tahun, bulan, pushHistory])

    const handleRowClear = useCallback((sid) => {
        setDataMap(prev => {
            const updated = { ...prev, [sid]: {} }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
    }, [pushHistory])

    const markDirty = useCallback(() => setIsDirty(true), [])

    const handleReset = useCallback(() => {
        setDataMap(JSON.parse(JSON.stringify(originalMap))); setIsDirty(false)
    }, [originalMap])

    const handleChangeClass = useCallback((newId) => {
        if (isDirty && !window.confirm('Ada perubahan belum disimpan. Ganti kelas?')) return
        setClassId(newId); setIsDirty(false)
    }, [isDirty])

    const prevBulan = useCallback(() => {
        if (isDirty && !window.confirm('Ada perubahan belum disimpan. Pindah bulan?')) return
        if (bulan === 1) { setTahun(t => t - 1); setBulan(12) } else setBulan(b => b - 1)
        setIsDirty(false)
    }, [bulan, isDirty])

    const nextBulan = useCallback(() => {
        if (isDirty && !window.confirm('Ada perubahan belum disimpan. Pindah bulan?')) return
        if (bulan === 12) { setTahun(t => t + 1); setBulan(1) } else setBulan(b => b + 1)
        setIsDirty(false)
    }, [bulan, isDirty])

    const handleSave = useCallback(async () => {
        if (saving || !isDirty || !classId) return
        const prevOriginal = JSON.parse(JSON.stringify(originalMap))
        setOriginalMap(JSON.parse(JSON.stringify(dataMap)))
        setIsDirty(false); setSaving(true)
        if (!isOnline) {
            setSaving(false); addToast('Offline — data tersimpan lokal, sync saat online', 'warning'); return
        }
        const upserts = studentList.map(s => ({
            student_id: s.id, class_id: classId, year: tahun, month: bulan,
            days: dataMap[s.id] || {}, updated_by: profile?.id ?? null,
        }))
        const { error } = await supabase.from('attendance_monthly')
            .upsert(upserts, { onConflict: 'student_id,year,month' })
        setSaving(false)
        if (error) {
            setOriginalMap(prevOriginal); setIsDirty(true)
            addToast('Gagal menyimpan: ' + error.message, 'error')
        } else {
            try { localStorage.removeItem(draftKey(classId, tahun, bulan)) } catch { }
            setDraftAvail(false)
            addToast(`Absensi ${BULAN_NAMA[bulan]} ${tahun} tersimpan ✓`, 'success')
        }
    }, [saving, isDirty, classId, tahun, bulan, studentList, dataMap, originalMap, profile, isOnline, addToast])

    useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])

    // ── Feature 1: Copy bulan lalu ────────────────────────────────────────────
    const handleCopyLastMonth = useCallback(async () => {
        if (!classId || copyingLastMonth) return
        const prevBulanVal = bulan === 1 ? 12 : bulan - 1
        const prevTahunVal = bulan === 1 ? tahun - 1 : tahun
        setCopyingLastMonth(true)
        const { data } = await supabase.from('attendance_monthly')
            .select('student_id, days')
            .eq('class_id', classId).eq('year', prevTahunVal).eq('month', prevBulanVal)
        setCopyingLastMonth(false)
        if (!data || data.length === 0) {
            addToast(`Tidak ada data absensi ${BULAN_NAMA[prevBulanVal]} ${prevTahunVal}`, 'info')
            return
        }
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) {
                const found = data.find(d => d.student_id === s.id)
                if (found?.days) next[s.id] = { ...found.days }
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        addToast(`Data ${BULAN_NAMA[prevBulanVal]} ${prevTahunVal} disalin ✓`, 'success')
    }, [classId, bulan, tahun, studentList, copyingLastMonth, pushHistory, addToast])

    // ── Feature 5: Scroll ke hari ini ────────────────────────────────────────
    const handleScrollToToday = useCallback(() => {
        if (todayColRef.current) {
            todayColRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
    }, [])

    // ── Feature 2: Keyboard nav ───────────────────────────────────────────────
    useEffect(() => {
        const h = (e) => {
            if (!focusedCell) return
            const { rowIdx, day } = focusedCell
            const activeDays = visibleDays
            if (!activeDays.length) return
            const dayPos = activeDays.indexOf(day)

            if (e.key === 'ArrowRight') {
                e.preventDefault()
                const nextDay = activeDays[Math.min(dayPos + 1, activeDays.length - 1)]
                setFocusedCell({ rowIdx, day: nextDay })
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                const prevDay = activeDays[Math.max(dayPos - 1, 0)]
                setFocusedCell({ rowIdx, day: prevDay })
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                const nextRow = Math.min(rowIdx + 1, filteredStudents.length - 1)
                setFocusedCell({ rowIdx: nextRow, day })
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                const prevRow = Math.max(rowIdx - 1, 0)
                setFocusedCell({ rowIdx: prevRow, day })
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                const s = filteredStudents[rowIdx]
                if (s) handleCellClick(s.id, day)
            } else if (e.key === 'Escape') {
                setFocusedCell(null)
            }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [focusedCell, filteredStudents, visibleDays, handleCellClick])

    // ── Feature 6: Notes persistence ─────────────────────────────────────────
    useEffect(() => {
        if (!classId) return
        try {
            const raw = localStorage.getItem(`absensi_notes_${classId}_${tahun}_${bulan}`)
            setNotesMap(raw ? JSON.parse(raw) : {})
        } catch { setNotesMap({}) }
    }, [classId, tahun, bulan])

    const handleSaveNote = useCallback((studentId, text) => {
        setNotesMap(prev => {
            const next = text ? { ...prev, [studentId]: text } : Object.fromEntries(Object.entries({ ...prev }).filter(([k]) => k !== studentId))
            try { localStorage.setItem(`absensi_notes_${classId}_${tahun}_${bulan}`, JSON.stringify(next)) } catch { }
            return next
        })
    }, [classId, tahun, bulan])

    // ── Feature 7: Import CSV/Excel ───────────────────────────────────────────
    const handleImport = useCallback((matched) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const { sid, days } of matched) next[sid] = { ...days }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        addToast(`${matched.length} siswa diimport ✓`, 'success')
    }, [pushHistory, addToast])

    // ── Feature 10: Save alert threshold ─────────────────────────────────────
    const handleSaveThreshold = useCallback((val) => {
        setAlertThreshold(val)
        try { localStorage.setItem('absensi_alert_threshold', JSON.stringify(val)) } catch { }
        addToast('Ambang batas alert disimpan ✓', 'success')
    }, [addToast])

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <AbsensiErrorBoundary>
            <DashboardLayout>
                <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                    {/* Page header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-[18px] font-black text-[var(--color-text)] flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faCalendarDays} className="text-[var(--color-primary)] text-[14px]" />
                                </div>
                                Absensi Bulanan
                            </h1>
                            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 ml-10.5">
                                Klik sel untuk ganti status · Tahan &amp; geser untuk isi banyak sekaligus · Klik nama/tanggal untuk isi cepat
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Tutorial button */}
                            <button
                                onClick={() => setShowTutorial(true)}
                                className="h-8 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 text-emerald-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-emerald-500/15 transition-all"
                                title="Panduan & Tutorial"
                            >
                                <FontAwesomeIcon icon={faLightbulb} className="text-[9px]" />
                                Tutorial
                            </button>
                            {/* Online indicator */}
                            <div className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border transition-colors ${isOnline
                                ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5'
                                : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                {isOnline ? 'Online' : 'Offline'}
                            </div>
                        </div>
                    </div>

                    {/* Controls bar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {loadingClass ? (
                            <div className="h-9 w-40 rounded-xl bg-[var(--color-border)] animate-pulse" />
                        ) : (
                            <div className="relative">
                                <FontAwesomeIcon icon={faChalkboardTeacher} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                <select value={classId} onChange={e => handleChangeClass(e.target.value)}
                                    className="h-9 pl-8 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer">
                                    {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Month nav */}
                        <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5">
                            <button onClick={prevBulan} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all">
                                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                            </button>
                            <span className="px-3 text-[12px] font-black text-[var(--color-text)] min-w-[115px] text-center tabular-nums">
                                {BULAN_NAMA[bulan]} {tahun}
                            </span>
                            <button onClick={nextBulan} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all">
                                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 ml-auto">
                            {[
                                { key: 'input', label: 'Input', icon: faCalendarDays },
                                { key: 'rekap', label: 'Rekap', icon: faChartSimple },
                            ].map(t => (
                                <button key={t.key} onClick={() => setActiveTab(t.key)}
                                    className={`h-8 px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${activeTab === t.key
                                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                    <FontAwesomeIcon icon={t.icon} className="text-[10px]" />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Draft banner */}
                    {draftAvail && !isDirty && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 shrink-0" />
                            <p className="text-[11px] text-amber-600 font-medium flex-1">Ada draft dari sesi sebelumnya</p>
                            <button onClick={() => {
                                try {
                                    const raw = localStorage.getItem(draftKey(classId, tahun, bulan))
                                    if (raw) { const { dataMap: dm } = JSON.parse(raw); setDataMap(dm); setIsDirty(true); setDraftAvail(false) }
                                } catch { }
                            }} className="text-[10px] font-black text-amber-600 hover:text-amber-700 underline underline-offset-2">Pulihkan</button>
                            <button onClick={() => {
                                try { localStorage.removeItem(draftKey(classId, tahun, bulan)) } catch { }
                                setDraftAvail(false)
                            }} className="text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Buang</button>
                        </div>
                    )}

                    {/* Main card */}
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

                        {/* ══ TAB INPUT ══════════════════════════════════════════ */}
                        {activeTab === 'input' && (
                            <>
                                {/* ── Toolbar ── */}
                                <div className="px-4 py-2.5 border-b border-[var(--color-border)] space-y-2">

                                    {/* ── Baris 1: Actions & View controls ── */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">

                                        {/* Grup kiri: Data actions */}
                                        <div className="flex items-center gap-1.5">
                                            {/* Aksi Massal */}
                                            <MassActionDropdown
                                                studentList={studentList}
                                                dataMap={dataMap}
                                                setDataMap={setDataMap}
                                                tahun={tahun}
                                                bulan={bulan}
                                                daysInMonth={daysInMonth}
                                                onDirty={markDirty}
                                                addToast={addToast}
                                            />

                                            {/* Feature 1: Copy bulan lalu */}
                                            <button
                                                onClick={handleCopyLastMonth}
                                                disabled={copyingLastMonth || loadingData}
                                                className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40"
                                                title="Salin semua data dari bulan lalu"
                                            >
                                                {copyingLastMonth
                                                    ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" />
                                                    : <FontAwesomeIcon icon={faCopy} className="text-[9px]" />
                                                }
                                                Copy Bln Lalu
                                            </button>

                                            {/* Feature 7: Import */}
                                            <button
                                                onClick={() => setShowImport(true)}
                                                className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1.5"
                                                title="Import dari file Excel/CSV"
                                            >
                                                <FontAwesomeIcon icon={faFileImport} className="text-[9px]" />
                                                Import
                                            </button>

                                            {/* Separator */}
                                            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

                                            {/* Undo / Redo */}
                                            <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5">
                                                <button onClick={applyUndo} disabled={!canUndo} title="Batalkan (Ctrl+Z)"
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
                                                </button>
                                                <button onClick={applyRedo} disabled={!canRedo} title="Ulangi (Ctrl+Y)"
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                                    <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
                                                </button>
                                            </div>

                                            {/* Separator */}
                                            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

                                            {/* Feature 3: Hide Weekend */}
                                            <button
                                                onClick={() => setHideWeekend(v => !v)}
                                                className={`h-8 px-3 rounded-xl border text-[10px] font-black active:scale-95 transition-all flex items-center gap-1.5 ${hideWeekend
                                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                                title="Sembunyikan kolom Sabtu & Minggu"
                                            >
                                                <FontAwesomeIcon icon={hideWeekend ? faEyeSlash : faEye} className="text-[9px]" />
                                                {hideWeekend ? 'Tampilkan Weekend' : 'Sembunyikan Weekend'}
                                            </button>

                                            {/* Feature 4: Filter row */}
                                            <select
                                                value={filterMode}
                                                onChange={e => setFilterMode(e.target.value)}
                                                className={`h-8 pl-3 pr-3 rounded-xl border text-[10px] font-black appearance-none cursor-pointer transition-all focus:outline-none focus:border-[var(--color-primary)] ${filterMode !== 'all'
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}
                                                style={{ backgroundImage: 'none' }}
                                                title="Filter siswa"
                                            >
                                                <option value="all">Semua Siswa</option>
                                                <option value="alpa">Alpa ≥ {alertThreshold.alpa} hari</option>
                                                <option value="belum">Belum diisi</option>
                                            </select>
                                        </div>

                                        {/* Grup kanan: Legend */}
                                        <div className="hidden xl:flex items-center gap-1.5">
                                            {STATUS_LIST.map(s => (
                                                <span key={s} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${STATUS_META[s].cellBg} ${STATUS_META[s].color} ${STATUS_META[s].cellBorder}`}>
                                                    {s} = {STATUS_META[s].label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── Baris 2: Konteks & Search ── */}
                                    <div className="flex items-center justify-between gap-2">

                                        {/* Grup kiri: Nav shortcuts */}
                                        <div className="flex items-center gap-1.5">
                                            {/* Feature 5: Scroll ke hari ini */}
                                            {todayDate && (
                                                <button
                                                    onClick={handleScrollToToday}
                                                    className="h-7 px-3 rounded-lg border border-indigo-500/30 bg-indigo-500/8 text-indigo-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-indigo-500/15 transition-all"
                                                    title="Auto-scroll ke kolom hari ini"
                                                >
                                                    <FontAwesomeIcon icon={faCrosshairs} className="text-[9px]" />
                                                    Hari Ini
                                                </button>
                                            )}

                                            {/* Feature 10: Alert config */}
                                            <button
                                                onClick={() => setShowAlertConfig(true)}
                                                className="h-7 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all flex items-center gap-1.5"
                                                title="Konfigurasi ambang batas alert"
                                            >
                                                <FontAwesomeIcon icon={faBell} className="text-[9px]" />
                                                Alert
                                            </button>
                                        </div>

                                        {/* Grup kanan: Progress + Search */}
                                        <div className="flex items-center gap-3">
                                            {/* Completion progress */}
                                            {studentList.length > 0 && (
                                                <div className="hidden sm:flex items-center gap-2">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Terisi</span>
                                                    <div className="w-24 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${completionPct}%`,
                                                                background: completionPct === 100 ? '#059669' : completionPct >= 60 ? '#6366f1' : '#d97706',
                                                            }} />
                                                    </div>
                                                    <span className={`text-[10px] font-black tabular-nums min-w-[32px] ${completionPct === 100 ? 'text-emerald-600' : completionPct >= 60 ? 'text-indigo-500' : 'text-amber-600'}`}>
                                                        {completionPct}%
                                                    </span>
                                                </div>
                                            )}

                                            {/* Search */}
                                            {studentList.length > 5 && (
                                                <div className="flex items-center gap-2 h-7 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 w-52">
                                                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[var(--color-text-muted)] text-[10px] shrink-0" />
                                                    <input type="text" placeholder="Cari nama / NISN..."
                                                        value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
                                                        className="flex-1 text-[11px] bg-transparent border-none outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50" />
                                                    {searchRaw && (
                                                        <button onClick={() => setSearchRaw('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px]">&times;</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>{/* end grup kanan baris 2 */}
                                    </div>{/* end baris 2 */}
                                </div>{/* end toolbar */}

                                {/* Landscape table */}
                                <div className="overflow-x-auto">
                                    <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
                                        <thead>
                                            {/* Row 1: angka tanggal — # dan Nama span 2 baris */}
                                            <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                                {/* No header — rowSpan 2 */}
                                                <th
                                                    rowSpan={2}
                                                    style={{
                                                        position: 'sticky', left: 0, zIndex: 6,
                                                        width: W_NO, minWidth: W_NO,
                                                        backgroundColor: 'var(--color-surface-alt)',
                                                        borderRight: '1px solid var(--color-border)',
                                                        borderBottom: '2px solid var(--color-border)',
                                                        padding: '8px 4px', textAlign: 'center',
                                                        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <span className="text-[9px] font-black text-[var(--color-text-muted)]">#</span>
                                                </th>
                                                {/* Nama header — rowSpan 2 */}
                                                <th
                                                    rowSpan={2}
                                                    style={{
                                                        position: 'sticky', left: W_NO, zIndex: 6,
                                                        width: W_NAMA, minWidth: W_NAMA,
                                                        backgroundColor: 'var(--color-surface-alt)',
                                                        borderRight: '2px solid var(--color-border)',
                                                        borderBottom: '2px solid var(--color-border)',
                                                        padding: '8px 12px', textAlign: 'left',
                                                        boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)',
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Siswa</span>
                                                </th>
                                                {/* Day number headers */}
                                                {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend, dow }) => (
                                                    <th key={d}
                                                        ref={d === todayDate ? todayColRef : undefined}
                                                        onClick={!loadingData && studentList.length > 0
                                                            ? (e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                setColFillTarget({ d, dow, x: rect.left, y: rect.bottom })
                                                            }
                                                            : undefined
                                                        }
                                                        style={{
                                                            width: 32, minWidth: 32,
                                                            padding: '6px 0',
                                                            textAlign: 'center',
                                                            borderBottom: '2px solid var(--color-border)',
                                                            borderLeft: d === todayDate ? '1px solid #6366f180' : '1px solid var(--color-border)',
                                                            backgroundColor: d === todayDate ? '#6366f108' : 'var(--color-surface-alt)',
                                                            cursor: 'pointer',
                                                        }}
                                                        title={`Klik untuk isi semua siswa — tgl ${d}`}
                                                        className="hover:brightness-95"
                                                    >
                                                        <span style={{
                                                            fontSize: 10, fontWeight: 900,
                                                            color: d === todayDate ? '#6366f1' : weekend ? '#f87171' : 'var(--color-text-muted)',
                                                        }}>
                                                            {d}
                                                        </span>
                                                    </th>
                                                ))}
                                                {/* Summary headers — rowSpan 2, merge vertikal */}
                                                {STATUS_LIST.map((s, i) => (
                                                    <th key={s}
                                                        rowSpan={2}
                                                        style={{
                                                            width: 14, minWidth: 14,
                                                            padding: '4px 2px', textAlign: 'center',
                                                            borderBottom: '2px solid var(--color-border)',
                                                            borderLeft: i === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                                                            background: 'var(--color-surface-alt)',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        <span className={`text-[9px] font-black ${STATUS_META[s].color}`}>{s}</span>
                                                    </th>
                                                ))}
                                                <th rowSpan={2} style={{
                                                    width: 40, minWidth: 40,
                                                    padding: '6px 2px', textAlign: 'center',
                                                    borderBottom: '2px solid var(--color-border)',
                                                    borderLeft: '2px solid var(--color-border)',
                                                    background: 'var(--color-surface-alt)',
                                                    verticalAlign: 'middle',
                                                }}>
                                                    <span className="text-[9px] font-black text-[var(--color-text-muted)]">%</span>
                                                </th>
                                            </tr>

                                            {/* Row 2: nama hari */}
                                            <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                                {/* # dan Nama sudah di-rowSpan dari Row 1, tidak perlu placeholder */}
                                                {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend, dow }) => (
                                                    <th key={d}
                                                        style={{
                                                            width: 32, minWidth: 32, padding: '2px 0', textAlign: 'center',
                                                            borderBottom: '1px solid var(--color-border)',
                                                            borderLeft: '1px solid var(--color-border)',
                                                            background: 'var(--color-surface-alt)',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 8, fontWeight: 700, color: weekend ? '#fca5a5' : 'var(--color-text-muted)', opacity: weekend ? 0.8 : 0.4 }}>
                                                            {DOW_SHORT[dow]}
                                                        </span>
                                                    </th>
                                                ))}
                                                {/* H/S/I/A/P dan % sudah di-rowSpan dari Row 1, tidak perlu placeholder */}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {loadingData
                                                ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} colCount={visibleDays.length} />)
                                                : filteredStudents.length === 0
                                                    ? (
                                                        <tr>
                                                            <td colSpan={38} className="py-16 text-center border border-[var(--color-border)]">
                                                                <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                                                                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-2xl opacity-20" />
                                                                    <p className="text-[12px] font-bold">
                                                                        {searchRaw ? `Tidak ada hasil untuk "${searchRaw}"` : 'Tidak ada siswa aktif'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                    : filteredStudents.map((s, idx) => (
                                                        <StudentRow
                                                            key={s.id}
                                                            student={s} idx={idx}
                                                            days={dataMap[s.id] || {}}
                                                            tahun={tahun} bulan={bulan}
                                                            daysInMonth={daysInMonth}
                                                            todayDate={todayDate}
                                                            onCellMouseDown={(sid, day) => {
                                                                setFocusedCell({ rowIdx: idx, day })
                                                                handleCellMouseDown(sid, day)
                                                            }}
                                                            onCellMouseEnter={handleCellMouseEnter}
                                                            onRowFill={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                setRowFillTarget({ student: s, x: rect.right, y: rect.bottom })
                                                            }}
                                                            onNoteClick={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                setNoteTarget({ student: s, x: rect.left, y: rect.bottom })
                                                            }}
                                                            note={notesMap[s.id]}
                                                            hideWeekend={hideWeekend}
                                                            visibleDays={visibleDays}
                                                            focusedDay={focusedCell?.rowIdx === idx ? focusedCell.day : null}
                                                            alpaThreshold={alertThreshold.alpa}
                                                            hadirThreshold={alertThreshold.hadirPct}
                                                        />
                                                    ))
                                            }
                                        </tbody>

                                        {/* Footer total per kolom */}
                                        {!loadingData && studentList.length > 0 && (
                                            <tfoot>
                                                <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                                    <td
                                                        style={{ position: 'sticky', left: 0, zIndex: 4, width: W_NO, minWidth: W_NO, backgroundColor: 'var(--color-surface-alt)', borderTop: '2px solid var(--color-border)', borderRight: '1px solid var(--color-border)', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)' }}
                                                    />
                                                    <td
                                                        style={{ position: 'sticky', left: W_NO, zIndex: 4, width: W_NAMA, minWidth: W_NAMA, backgroundColor: 'var(--color-surface-alt)', borderTop: '2px solid var(--color-border)', borderRight: '2px solid var(--color-border)', padding: '6px 12px', boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)' }}
                                                    >
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Total / Hari</span>
                                                    </td>
                                                    {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend }) => {
                                                        const { h, x } = colSummary[d] || { h: 0, x: 0 }
                                                        return (
                                                            <td key={d}
                                                                style={{
                                                                    width: 32, minWidth: 32, padding: '4px 0', textAlign: 'center',
                                                                    borderTop: '2px solid var(--color-border)',
                                                                    borderLeft: '1px solid var(--color-border)',
                                                                    background: 'var(--color-surface-alt)',
                                                                    opacity: weekend ? 0.35 : 1,
                                                                }}
                                                            >
                                                                {h > 0 && <span style={{ display: 'block', fontSize: 8, fontWeight: 900, color: '#059669', lineHeight: '1.2' }}>{h}</span>}
                                                                {x > 0 && <span style={{ display: 'block', fontSize: 8, fontWeight: 900, color: '#dc2626', lineHeight: '1.2' }}>{x}</span>}
                                                            </td>
                                                        )
                                                    })}
                                                    {STATUS_LIST.map((s, i) => {
                                                        const total = studentList.reduce((acc, st) =>
                                                            acc + Object.values(dataMap[st.id] || {}).filter(v => v === s).length, 0)
                                                        return (
                                                            <td key={s} style={{
                                                                width: 28, minWidth: 28, textAlign: 'center',
                                                                borderTop: '2px solid var(--color-border)',
                                                                borderLeft: i === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                                                                background: 'var(--color-surface-alt)',
                                                            }}>
                                                                <span className={`text-[10px] font-black ${STATUS_META[s].color} ${total === 0 ? 'opacity-20' : ''}`}>{total}</span>
                                                            </td>
                                                        )
                                                    })}
                                                    <td style={{ width: 40, minWidth: 40, borderTop: '2px solid var(--color-border)', borderLeft: '2px solid var(--color-border)', background: 'var(--color-surface-alt)' }} />
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Footer bar */}
                                {studentList.length > 0 && (
                                    <div className="px-5 py-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-alt)]/20">
                                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                            {filteredStudents.length !== studentList.length
                                                ? `${filteredStudents.length} dari ${studentList.length} siswa`
                                                : `${studentList.length} siswa`
                                            } &middot; {BULAN_NAMA[bulan]} {tahun} &middot; {daysInMonth} hari
                                        </p>
                                        <button onClick={handleSave} disabled={saving || !isDirty}
                                            className={`h-9 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isDirty
                                                ? 'bg-[var(--color-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed opacity-60'
                                                }`}>
                                            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                                            {isDirty ? 'Simpan Perubahan' : 'Tersimpan'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ══ TAB REKAP ══════════════════════════════════════════ */}
                        {activeTab === 'rekap' && (
                            <RekapBulananPanel
                                classId={classId} tahun={tahun} bulan={bulan}
                                studentList={studentList} dataMap={dataMap}
                            />
                        )}

                    </div>
                </div>

                {/* Floating save bar */}
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${isDirty && activeTab === 'input'
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-2xl">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-400" />
                        <span className="text-[12px] text-[var(--color-text-muted)] font-medium">Ada perubahan belum disimpan</span>
                        <button onClick={handleReset}
                            className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" /> Reset
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="h-8 px-4 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60">
                            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                            Simpan
                        </button>
                    </div>
                </div>

                <div className="h-8" />

                {/* Tutorial modal */}
                {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

                {/* Feature 6: Note popup */}
                {noteTarget && (
                    <NotePopup
                        student={noteTarget.student}
                        note={notesMap[noteTarget.student.id]}
                        x={noteTarget.x}
                        y={noteTarget.y}
                        onSave={(text) => handleSaveNote(noteTarget.student.id, text)}
                        onClose={() => setNoteTarget(null)}
                    />
                )}

                {/* Feature 7: Import modal */}
                {showImport && (
                    <ImportModal
                        studentList={studentList}
                        tahun={tahun}
                        bulan={bulan}
                        daysInMonth={daysInMonth}
                        onImport={handleImport}
                        onClose={() => setShowImport(false)}
                    />
                )}

                {/* Feature 10: Alert threshold modal */}
                {showAlertConfig && (
                    <AlertThresholdModal
                        threshold={alertThreshold}
                        onSave={handleSaveThreshold}
                        onClose={() => setShowAlertConfig(false)}
                    />
                )}

                {/* ColFill popup */}
                {colFillTarget && (
                    <ColFillPopup
                        day={colFillTarget.d}
                        dow={colFillTarget.dow}
                        x={colFillTarget.x}
                        y={colFillTarget.y}
                        studentCount={studentList.length}
                        onFill={(status) => handleColFill(colFillTarget.d, status)}
                        onClear={() => handleColClear(colFillTarget.d)}
                        onClose={() => setColFillTarget(null)}
                    />
                )}

                {/* RowFill popup */}
                {rowFillTarget && (
                    <RowFillPopup
                        student={rowFillTarget.student}
                        x={rowFillTarget.x}
                        y={rowFillTarget.y}
                        weekdays={countWeekdays(tahun, bulan)}
                        onFill={(status) => handleRowFill(rowFillTarget.student.id, status)}
                        onClear={() => handleRowClear(rowFillTarget.student.id)}
                        onClose={() => setRowFillTarget(null)}
                    />
                )}
            </DashboardLayout>
        </AbsensiErrorBoundary>
    )
}