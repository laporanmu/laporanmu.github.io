import { useState, useEffect, useCallback, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCalendarWeek, faChevronLeft, faChevronRight,
    faSave, faSpinner, faExclamationTriangle,
    faUserCheck, faHeartPulse, faFileCircleCheck, faCircleXmark,
    faChalkboardTeacher, faRotateLeft, faDoorOpen,
    faWandMagicSparkles, faTrash, faBolt, faChevronDown, faCheck,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const BULAN_NAMA = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const FIELDS = [
    { key: 'hari_hadir', label: 'Hadir', icon: faUserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', btnColor: 'bg-emerald-500 hover:bg-emerald-600' },
    { key: 'hari_sakit', label: 'Sakit', icon: faHeartPulse, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', btnColor: 'bg-amber-500 hover:bg-amber-600' },
    { key: 'hari_izin', label: 'Izin', icon: faFileCircleCheck, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', btnColor: 'bg-blue-500 hover:bg-blue-600' },
    { key: 'hari_alpa', label: 'Alpa', icon: faCircleXmark, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', btnColor: 'bg-red-500 hover:bg-red-600' },
    { key: 'hari_pulang', label: 'Pulang', icon: faDoorOpen, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20', btnColor: 'bg-purple-500 hover:bg-purple-600' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMingguList(tahun, bulan) {
    const daysInMonth = new Date(tahun, bulan, 0).getDate()
    const blocks = [
        { ke: 1, start: 1, end: 7 },
        { ke: 2, start: 8, end: 14 },
        { ke: 3, start: 15, end: 21 },
        { ke: 4, start: 22, end: 28 },
        { ke: 5, start: 29, end: daysInMonth },
    ]
    return blocks
        .filter(w => w.start <= daysInMonth)
        .map(w => {
            const actualEnd = Math.min(w.end, daysInMonth)
            let hariKerja = 0
            for (let d = w.start; d <= actualEnd; d++) {
                const day = new Date(tahun, bulan - 1, d).getDay()
                if (day >= 1 && day <= 5) hariKerja++
            }
            return {
                ke: w.ke,
                label: `Pekan ${w.ke} (${w.start}–${actualEnd} ${BULAN_NAMA[bulan].slice(0, 3)})`,
                maxHari: hariKerja,
            }
        })
}

function emptyRow() {
    return { hari_hadir: 0, hari_sakit: 0, hari_izin: 0, hari_alpa: 0, hari_pulang: 0, catatan: '', _id: null }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RowSkeleton() {
    return (
        <tr className="border-b border-[var(--color-border)] animate-pulse">
            <td className="px-4 py-3"><div className="w-6 h-6 rounded-full bg-[var(--color-border)]" /></td>
            <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-[var(--color-border)]" /></td>
            {FIELDS.map(f => (
                <td key={f.key} className="px-3 py-3">
                    <div className="h-8 w-24 rounded-lg bg-[var(--color-border)] mx-auto" />
                </td>
            ))}
            <td className="px-4 py-3"><div className="h-4 w-10 rounded bg-[var(--color-border)] ml-auto" /></td>
        </tr>
    )
}

function NumInput({ value, onChange, max, field }) {
    return (
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg border ${field.bg}`}>
            <button type="button"
                onClick={() => onChange(Math.max(0, value - 1))}
                className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black ${field.color} hover:bg-black/5 transition-colors`}>
                −
            </button>
            <input
                type="number" min={0} max={max} value={value}
                onChange={e => onChange(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))}
                className={`w-7 text-center text-[13px] font-black bg-transparent border-none outline-none ${field.color}`}
            />
            <button type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black ${field.color} hover:bg-black/5 transition-colors`}>
                +
            </button>
        </div>
    )
}

// ─── Mass Action Dropdown ─────────────────────────────────────────────────────

function MassActionDropdown({ studentList, dataMap, setDataMap, maxHari }) {
    const [open, setOpen] = useState(false)
    const [activeField, setActiveField] = useState(null)
    const [bulkVal, setBulkVal] = useState(0)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setActiveField(null) } }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const applyAll = (key, val) => {
        setDataMap(prev => {
            const next = { ...prev }
            studentList.forEach(s => { next[s.id] = { ...next[s.id], [key]: Math.min(maxHari, Math.max(0, val)) } })
            return next
        })
        setActiveField(null)
        setOpen(false)
    }

    const hadirSemua = () => {
        setDataMap(prev => {
            const next = { ...prev }
            studentList.forEach(s => { next[s.id] = { ...next[s.id], hari_hadir: maxHari, hari_sakit: 0, hari_izin: 0, hari_alpa: 0, hari_pulang: 0 } })
            return next
        })
        setOpen(false)
    }

    const resetSemua = () => {
        setDataMap(prev => {
            const next = { ...prev }
            studentList.forEach(s => { next[s.id] = { ...next[s.id], hari_hadir: 0, hari_sakit: 0, hari_izin: 0, hari_alpa: 0, hari_pulang: 0 } })
            return next
        })
        setOpen(false)
    }

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen(v => !v)}
                className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${open
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                    }`}>
                <FontAwesomeIcon icon={faBolt} />
                Mass Action
                <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">

                    {/* Hadir Semua */}
                    <div className="p-2 border-b border-[var(--color-border)]">
                        <button type="button" onClick={hadirSemua}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-500/5 transition-all group">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
                            </div>
                            <div className="text-left">
                                <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">Hadir Semua</p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Set hadir = {maxHari}h · sisanya 0</p>
                            </div>
                        </button>
                    </div>

                    {/* Set per kolom */}
                    <div className="p-2 border-b border-[var(--color-border)]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-1.5">Set nilai ke semua siswa</p>
                        {FIELDS.map(f => (
                            <div key={f.key}>
                                <button type="button"
                                    onClick={() => { setActiveField(activeField === f.key ? null : f.key); setBulkVal(0) }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${activeField === f.key ? f.bg : 'hover:bg-[var(--color-surface-alt)]'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 ${f.bg}`}>
                                        <FontAwesomeIcon icon={f.icon} className={`text-xs ${f.color}`} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`text-[11px] font-black leading-tight ${activeField === f.key ? f.color : 'text-[var(--color-text)]'}`}>Set {f.label}</p>
                                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Semua {studentList.length} siswa</p>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] text-[var(--color-text-muted)] transition-transform ${activeField === f.key ? 'rotate-180' : ''}`} />
                                </button>

                                {activeField === f.key && (
                                    <div className={`mx-2 mb-1 p-3 rounded-xl border ${f.bg}`}>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min={0} max={maxHari} value={bulkVal}
                                                onChange={e => setBulkVal(Math.min(maxHari, Math.max(0, parseInt(e.target.value) || 0)))}
                                                className={`input-field font-black text-center h-8 w-20 text-sm ${f.color}`}
                                                autoFocus
                                            />
                                            <span className={`text-[10px] font-bold ${f.color}`}>/ {maxHari}h</span>
                                            <button type="button" onClick={() => applyAll(f.key, bulkVal)}
                                                className={`ml-auto h-8 px-3 rounded-lg text-[11px] font-black text-white transition-all flex items-center gap-1.5 ${f.btnColor}`}>
                                                <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Apply
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Reset */}
                    <div className="p-2">
                        <button type="button" onClick={resetSemua}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/5 transition-all group">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            </div>
                            <div className="text-left">
                                <p className="text-[11px] font-black text-red-500 leading-tight">Reset Semua</p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Kosongkan semua nilai</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AbsensiPage() {
    const { addToast } = useToast()
    const now = new Date()

    const [classList, setClassList] = useState([])
    const [classId, setClassId] = useState('')
    const [tahun, setTahun] = useState(now.getFullYear())
    const [bulan, setBulan] = useState(now.getMonth() + 1)
    const [weekNum, setWeekNum] = useState(1)
    const [studentList, setStudentList] = useState([])
    const [dataMap, setDataMap] = useState({})
    const [originalMap, setOriginalMap] = useState({})
    const [loadingClass, setLoadingClass] = useState(true)
    const [loadingData, setLoadingData] = useState(false)
    const [saving, setSaving] = useState(false)

    const weekList = getMingguList(tahun, bulan)
    const weekInfo = weekList.find(w => w.ke === weekNum) || weekList[0]

    useEffect(() => {
        async function load() {
            setLoadingClass(true)
            const { data } = await supabase.from('classes').select('id, name').order('name')
            if (data?.length) { setClassList(data); setClassId(data[0].id) }
            setLoadingClass(false)
        }
        load()
    }, [])

    const loadData = useCallback(async () => {
        if (!classId) return
        setLoadingData(true)
        const [{ data: students }, { data: attendance }] = await Promise.all([
            supabase.from('students').select('id, name, nisn')
                .eq('class_id', classId).is('deleted_at', null).eq('is_active', true).order('name'),
            supabase.from('attendance_weekly').select('*')
                .eq('class_id', classId).eq('year', tahun).eq('month', bulan).eq('week_number', weekNum),
        ])
        setStudentList(students || [])
        const map = {}
        for (const s of (students || [])) {
            const ex = attendance?.find(a => a.student_id === s.id)
            map[s.id] = {
                hari_hadir: ex?.hari_hadir ?? 0,
                hari_sakit: ex?.hari_sakit ?? 0,
                hari_izin: ex?.hari_izin ?? 0,
                hari_alpa: ex?.hari_alpa ?? 0,
                hari_pulang: ex?.hari_pulang ?? 0,
                catatan: ex?.catatan ?? '',
                _id: ex?.id ?? null,
            }
        }
        setDataMap(map)
        setOriginalMap(JSON.parse(JSON.stringify(map)))
        setLoadingData(false)
    }, [classId, tahun, bulan, weekNum])

    useEffect(() => { loadData() }, [loadData])

    const setField = (sid, key, val) =>
        setDataMap(prev => ({ ...prev, [sid]: { ...prev[sid], [key]: val } }))

    const isDirty = JSON.stringify(dataMap) !== JSON.stringify(originalMap)

    const handleSave = async () => {
        if (saving) return
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()
        const upserts = studentList.map(s => {
            const row = {
                student_id: s.id, class_id: classId, year: tahun, month: bulan, week_number: weekNum,
                hari_hadir: dataMap[s.id]?.hari_hadir ?? 0,
                hari_sakit: dataMap[s.id]?.hari_sakit ?? 0,
                hari_izin: dataMap[s.id]?.hari_izin ?? 0,
                hari_alpa: dataMap[s.id]?.hari_alpa ?? 0,
                hari_pulang: dataMap[s.id]?.hari_pulang ?? 0,
                catatan: dataMap[s.id]?.catatan ?? '',
                created_by: user?.id,
            }
            if (dataMap[s.id]?._id) row.id = dataMap[s.id]._id
            return row
        })
        const { error } = await supabase
            .from('attendance_weekly')
            .upsert(upserts, { onConflict: 'student_id,year,month,week_number' })
        setSaving(false)
        if (error) addToast('Gagal menyimpan: ' + error.message, 'error')
        else { addToast('Absensi berhasil disimpan ✓', 'success'); loadData() }
    }

    const prevBulan = () => { setBulan(b => b === 1 ? (setTahun(t => t - 1), 12) : b - 1); setWeekNum(1) }
    const nextBulan = () => { setBulan(b => b === 12 ? (setTahun(t => t + 1), 1) : b + 1); setWeekNum(1) }

    const filledCount = studentList.filter(s => {
        const a = dataMap[s.id]; return a && (a.hari_hadir + a.hari_sakit + a.hari_izin + a.hari_alpa) > 0
    }).length

    return (
        <DashboardLayout title="Absensi Mingguan">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">
                        Absensi Mingguan
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Rekap kehadiran siswa per pekan · otomatis terakumulasi ke raport bulanan
                    </p>
                </div>

                {/* Bulan navigator */}
                <div className="flex items-center gap-2 bg-[var(--color-surface-alt)] rounded-xl px-3 py-2 border border-[var(--color-border)] shrink-0">
                    <button onClick={prevBulan} className="w-7 h-7 rounded-lg hover:bg-[var(--color-border)] transition-colors flex items-center justify-center">
                        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                    </button>
                    <span className="text-[13px] font-black text-[var(--color-text)] w-36 text-center">
                        {BULAN_NAMA[bulan]} {tahun}
                    </span>
                    <button onClick={nextBulan} className="w-7 h-7 rounded-lg hover:bg-[var(--color-border)] transition-colors flex items-center justify-center">
                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                    </button>
                </div>
            </div>

            {/* ── Main Card ── */}
            <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">

                {/* Toolbar: Kelas + Pekan + Mass Action */}
                <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[var(--color-border)]">

                    {/* Kelas */}
                    <div className="flex items-center gap-2 shrink-0">
                        <FontAwesomeIcon icon={faChalkboardTeacher} className="text-[var(--color-text-muted)] text-sm" />
                        {loadingClass ? (
                            <div className="h-9 w-36 rounded-xl bg-[var(--color-border)] animate-pulse" />
                        ) : (
                            <select value={classId} onChange={e => setClassId(e.target.value)}
                                className="input-field text-sm h-9 rounded-xl border-[var(--color-border)] font-bold bg-transparent">
                                {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-[var(--color-border)] hidden sm:block" />

                    {/* Pekan pills */}
                    <div className="flex items-center gap-1">
                        {weekList.map(w => (
                            <button key={w.ke} onClick={() => setWeekNum(w.ke)} title={w.label}
                                className={`h-9 px-3.5 rounded-xl text-[11px] font-black transition-all border ${weekNum === w.ke
                                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/30'
                                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'
                                    }`}>
                                W{w.ke}
                            </button>
                        ))}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Mass Action — kanan */}
                    {studentList.length > 0 && !loadingData && (
                        <MassActionDropdown
                            studentList={studentList}
                            dataMap={dataMap}
                            setDataMap={setDataMap}
                            maxHari={weekInfo?.maxHari || 5}
                        />
                    )}
                </div>

                {/* Info strip */}
                {weekInfo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-primary)]/[0.04] border-b border-[var(--color-primary)]/10">
                        <span className="text-[11px] font-bold text-[var(--color-primary)]">{weekInfo.label}</span>
                        <div className="flex items-center gap-4 text-[10px]">
                            <span className="text-[var(--color-text-muted)]">Hari efektif: <strong className="text-[var(--color-text)]">{weekInfo.maxHari}</strong></span>
                            <span className="text-[var(--color-text-muted)]">
                                Diisi: <strong className={filledCount === studentList.length && studentList.length > 0 ? 'text-emerald-500' : 'text-amber-500'}>
                                    {filledCount}/{studentList.length}
                                </strong>
                            </span>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left w-10">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">#</span>
                                </th>
                                <th className="px-4 py-3 text-left">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Siswa</span>
                                </th>
                                {FIELDS.map(f => (
                                    <th key={f.key} className="px-3 py-3 text-center">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${f.color}`}>
                                            <FontAwesomeIcon icon={f.icon} className="mr-1" />{f.label}
                                        </span>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Total</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {loadingData ? (
                                Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                            ) : studentList.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-20">
                                        <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faChalkboardTeacher} className="text-3xl opacity-20" />
                                            <p className="text-sm font-bold">Tidak ada siswa aktif di kelas ini</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                studentList.map((s, idx) => {
                                    const a = dataMap[s.id] || emptyRow()
                                    const total = a.hari_hadir + a.hari_sakit + a.hari_izin + a.hari_alpa
                                    const maxHari = weekInfo?.maxHari || 6
                                    const isOver = total > maxHari
                                    const isFull = total === maxHari && maxHari > 0

                                    return (
                                        <tr key={s.id}
                                            className={`transition-colors hover:bg-[var(--color-surface-alt)]/50 ${isOver ? 'bg-red-500/[0.03]' : ''}`}>
                                            <td className="px-4 py-2.5">
                                                <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black text-[var(--color-text-muted)]">
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <p className="text-[13px] font-bold text-[var(--color-text)]">{s.name}</p>
                                                {s.nisn && <p className="text-[10px] text-[var(--color-text-muted)]">{s.nisn}</p>}
                                            </td>
                                            {FIELDS.map(f => (
                                                <td key={f.key} className="px-3 py-2.5 text-center">
                                                    <NumInput
                                                        value={a[f.key] || 0}
                                                        onChange={v => setField(s.id, f.key, v)}
                                                        max={maxHari}
                                                        field={f}
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-2.5 text-right">
                                                <span className={`text-[12px] font-black ${isOver ? 'text-red-500' : isFull ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`}>
                                                    {total}/{maxHari}
                                                    {isOver && <FontAwesomeIcon icon={faExclamationTriangle} className="ml-1 text-[10px]" />}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {studentList.length > 0 && (
                    <div className="px-6 py-4 bg-[var(--color-surface-alt)]/20 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                            {studentList.length} siswa · Pekan {weekNum} · {BULAN_NAMA[bulan]} {tahun}
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
            </div>

            {/* Sticky floating save — muncul saat scroll */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${isDirty ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-2xl">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-400" />
                    <span className="text-[12px] text-[var(--color-text-muted)] font-medium">Ada perubahan belum disimpan</span>
                    <button onClick={() => setDataMap(JSON.parse(JSON.stringify(originalMap)))}
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
        </DashboardLayout>
    )
}