import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSignInAlt, faSignOutAlt, faUserFriends, faClipboardList,
    faCalendarDay, faCalendarWeek, faPrint, faSearch, faPlus,
    faChevronLeft, faChevronRight, faSpinner, faClock,
    faBuilding, faChalkboardTeacher, faBriefcase,
    faLock, faRotateLeft, faPersonWalkingArrowRight,
    faEdit, faTrash, faCheck,
    faArrowsRotate, faBell, faXmark, faTag, faKeyboard,
    faDownload, faFilter, faIdCard, faMotorcycle,
    faFileCsv, faFilePdf, faCircleCheck, faCircleDot,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const VISITOR_TYPES = [
    { key: 'guru', label: 'Guru', icon: faChalkboardTeacher, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
    { key: 'karyawan', label: 'Karyawan', icon: faBriefcase, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    { key: 'tamu', label: 'Tamu', icon: faUserFriends, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
]
const TYPE_META = Object.fromEntries(VISITOR_TYPES.map(t => [t.key, t]))
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const PRESETS_GURU = ['Makan siang', 'Urusan bank', 'Ke apotek', 'Belanja', 'Keperluan keluarga', 'Urusan pribadi', 'Ke dokter', 'Pengambilan barang']
const PRESETS_KARYAWAN = ['Dinas luar', 'Urusan bank', 'Rapat eksternal', 'Ke apotek', 'Keperluan kantor', 'Keperluan keluarga', 'Belanja kebutuhan', 'Ke dokter']
const PRESETS_TAMU = ['Silaturahmi', 'Menjemput santri', 'Wali murid', 'Urusan administrasi', 'Kunjungan keluarga', 'Antar barang / kiriman', 'Rapat / pertemuan', 'Urusan lainnya']

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtDate(d) {
    const x = new Date(d)
    return `${x.getDate()} ${MONTHS_ID[x.getMonth()]} ${x.getFullYear()}`
}
function fmtTime(d) {
    if (!d) return '-'
    const x = new Date(d)
    return x.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtDateTime(d) { return `${fmtDate(d)}, ${fmtTime(d)}` }
function iso(d) { return new Date(d).toISOString() }
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function nowTimeStr() { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}` }
function nowDateStr() { return new Date().toISOString().slice(0, 10) }

/** Gabungkan date string (YYYY-MM-DD) + time string (HH:MM) → ISO */
function dateTimeToISO(dateStr, timeStr) {
    if (!dateStr || !timeStr) return new Date().toISOString()
    return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

/** Masih dipakai di EditLogModal & handleConfirmTime (edit log yang tanggalnya sudah diketahui) */
function timeStrToISO(dateRef, timeStr) {
    if (!timeStr) return new Date(dateRef).toISOString()
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date(dateRef)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
}

function durasi(cin, cout) {
    if (!cin || !cout) return null
    const diff = new Date(cout) - new Date(cin)
    if (diff <= 0) return null
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}j ${m}m` : `${m}m`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveClock() {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(t)
    }, [])
    return (
        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <FontAwesomeIcon icon={faClock} className="text-[9px] opacity-60" />
            <span className="text-[11px] font-black tabular-nums">
                {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[9px] opacity-50">
                {fmtDate(time)}
            </span>
        </div>
    )
}

// ─── DateTimeInput — date + time picker berdampingan ──────────────────────────

function DateTimeInput({ dateValue, timeValue, onDateChange, onTimeChange, label }) {
    return (
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
                {label} <span className="normal-case opacity-70">(otomatis, bisa diubah)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
                {/* Tanggal */}
                <div className="relative">
                    <FontAwesomeIcon icon={faCalendarDay} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                    <input
                        type="date"
                        value={dateValue}
                        onChange={e => onDateChange(e.target.value)}
                        className="w-full h-10 pl-8 pr-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                    />
                </div>
                {/* Jam — force 24h lewat input type="time" (selalu 24h di semua browser) */}
                <div className="relative">
                    <FontAwesomeIcon icon={faClock} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                    <input
                        type="time"
                        value={timeValue}
                        onChange={e => onTimeChange(e.target.value)}
                        className="w-full h-10 pl-8 pr-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                    />
                </div>
            </div>
        </div>
    )
}

// TimeInput lama — tetap dipakai di EditLogModal & ConfirmTimeModal (selalu hari ini)
function TimeInput({ value, onChange, label }) {
    return (
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
                {label} <span className="normal-case opacity-70">(otomatis, bisa diubah)</span>
            </label>
            <div className="relative">
                <FontAwesomeIcon icon={faClock} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                <input type="time" value={value} onChange={e => onChange(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-black text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
            </div>
        </div>
    )
}

function TeacherSearch({ teacherList, value, onChange, label }) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(-1)
    const ref = useRef(null)
    const listRef = useRef(null)
    const selected = teacherList.find(t => t.id === value)
    const filtered = useMemo(() => {
        if (!query.trim()) return teacherList
        const q = query.toLowerCase()
        return teacherList.filter(t => t.name.toLowerCase().includes(q) || (t.nbm || '').toLowerCase().includes(q))
    }, [teacherList, query])

    useEffect(() => {
        const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setFocusedIdx(-1) } }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Scroll focused item into view
    useEffect(() => {
        if (focusedIdx >= 0 && listRef.current) {
            const item = listRef.current.children[focusedIdx]
            if (item) item.scrollIntoView({ block: 'nearest' })
        }
    }, [focusedIdx])

    const handleSelect = t => { onChange(t.id); setQuery(''); setOpen(false); setFocusedIdx(-1) }
    const handleClear = e => { e.stopPropagation(); onChange(''); setQuery(''); setFocusedIdx(-1) }

    const handleKeyDown = e => {
        if (!open) { if (e.key === 'Enter' || e.key === 'ArrowDown') { setOpen(true); setFocusedIdx(0) }; return }
        if (e.key === 'Escape') { setOpen(false); setFocusedIdx(-1); return }
        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, filtered.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)) }
        else if (e.key === 'Enter') {
            e.preventDefault()
            if (focusedIdx >= 0 && filtered[focusedIdx]) handleSelect(filtered[focusedIdx])
        }
    }

    return (
        <div ref={ref} className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{label}</label>
            <div onClick={() => { setOpen(true); setFocusedIdx(0) }}
                className={`w-full h-10 px-3 rounded-xl border bg-[var(--color-surface)] flex items-center gap-2 cursor-text transition-all ${open ? 'border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20' : 'border-[var(--color-border)]'}`}>
                <FontAwesomeIcon icon={faSearch} className="text-[10px] text-[var(--color-text-muted)] shrink-0" />
                {open ? (
                    <input autoFocus value={query}
                        onChange={e => { setQuery(e.target.value); setFocusedIdx(0) }}
                        onKeyDown={handleKeyDown}
                        placeholder={`Cari ${label.toLowerCase()} by nama / NIP...`}
                        className="flex-1 text-[12px] font-bold text-[var(--color-text)] bg-transparent outline-none placeholder:text-[var(--color-text-muted)]/40"
                        onClick={e => e.stopPropagation()} />
                ) : (
                    <span className={`flex-1 text-[12px] font-bold truncate ${selected ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]/40'}`}>
                        {selected ? `${selected.name}${selected.nbm ? ` · ${selected.nbm}` : ''}` : `-- Pilih ${label} --`}
                    </span>
                )}
                {selected && !open && (
                    <button onClick={handleClear} className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] transition-all">
                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                    </button>
                )}
            </div>
            {open && (
                <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-4 text-[11px] text-[var(--color-text-muted)] text-center opacity-50">Tidak ditemukan</div>
                    ) : filtered.map((t, idx) => (
                        <button key={t.id} onClick={() => handleSelect(t)}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors ${focusedIdx === idx ? 'bg-[var(--color-primary)]/10' : 'hover:bg-[var(--color-surface-alt)]'
                                } ${value === t.id ? 'bg-[var(--color-primary)]/10' : ''}`}>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[12px] font-black truncate ${value === t.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{t.name}</p>
                                {t.nbm && <p className="text-[9px] text-[var(--color-text-muted)] font-bold">{t.nbm}</p>}
                            </div>
                            {value === t.id && <FontAwesomeIcon icon={faCheck} className="text-[9px] text-[var(--color-primary)] shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── PresetPills ──────────────────────────────────────────────────────────────

function PresetPills({ presets, value, onSelect }) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {presets.map(p => (
                <button key={p} type="button" onClick={() => onSelect(p)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all border ${value === p
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}>
                    {p}
                </button>
            ))}
        </div>
    )
}

// ─── FormGuru ─────────────────────────────────────────────────────────────────

function FormGuru({ teacherList, onSubmit, loading }) {
    const [visitorType, setVisitorType] = useState('guru')
    const [teacherId, setTeacherId] = useState('')
    const [purpose, setPurpose] = useState('')
    // FIX: lazy initializer — jam dicapture saat form pertama kali di-mount, bukan saat modul dimuat
    const [dateOut, setDateOut] = useState(() => nowDateStr())
    const [timeOut, setTimeOut] = useState(() => nowTimeStr())

    // FIX: Filter daftar berdasarkan tipe — kolom `type` di tabel teachers
    const filteredList = useMemo(
        () => teacherList.filter(t => !t.type || t.type === visitorType),
        [teacherList, visitorType]
    )

    // Preset berbeda untuk guru dan karyawan
    const activePresets = visitorType === 'karyawan' ? PRESETS_KARYAWAN : PRESETS_GURU

    const canSubmit = teacherId && purpose.trim()

    const submit = () => {
        if (!canSubmit) return
        const teacher = teacherList.find(t => t.id === teacherId)
        onSubmit({
            flow: 'guru',
            visitorType,
            teacherId,
            name: teacher?.name || '',
            nbm: teacher?.nbm || '',
            purpose: purpose.trim(),
            dateOut,
            timeOut,
        })
        setTeacherId('')
        setPurpose('')
        setDateOut(nowDateStr())
        setTimeOut(nowTimeStr())
    }

    const handleKeyDown = e => { if (e.key === 'Enter' && canSubmit && !loading) submit() }

    return (
        <div className="space-y-4" onKeyDown={handleKeyDown}>
            {/* Guru / Karyawan toggle */}
            <div className="flex gap-2">
                {VISITOR_TYPES.filter(t => t.key !== 'tamu').map(t => (
                    <button key={t.key} onClick={() => { setVisitorType(t.key); setTeacherId('') }}
                        className={`flex-1 h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 border transition-all ${visitorType === t.key
                            ? `${t.bg} ${t.color} ${t.border}`
                            : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                        <FontAwesomeIcon icon={t.icon} className="text-[10px]" />{t.label}
                    </button>
                ))}
            </div>

            {/* Pilih person */}
            <TeacherSearch teacherList={filteredList} value={teacherId} onChange={setTeacherId} label={TYPE_META[visitorType].label} />

            {/* Keperluan + presets */}
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
                    Keperluan Keluar
                </label>
                <div className="relative">
                    <FontAwesomeIcon icon={faTag} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                    <input value={purpose} onChange={e => setPurpose(e.target.value)}
                        placeholder="Contoh: Keluar makan, urusan bank..."
                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                </div>
                <PresetPills presets={activePresets} value={purpose} onSelect={setPurpose} />
            </div>

            {/* Tanggal & Jam Keluar */}
            <DateTimeInput
                dateValue={dateOut} timeValue={timeOut}
                onDateChange={setDateOut} onTimeChange={setTimeOut}
                label="Tanggal & Jam Keluar"
            />

            {/* Submit */}
            <button onClick={submit} disabled={loading || !canSubmit}
                className="w-full h-11 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white shadow-lg shadow-red-500/20">
                {loading
                    ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    : <FontAwesomeIcon icon={faSignOutAlt} />}
                Catat Keluar
            </button>

            {/* Hint shortcut */}
            <div className="flex items-center gap-1.5 justify-end opacity-40">
                <FontAwesomeIcon icon={faKeyboard} className="text-[9px] text-[var(--color-text-muted)]" />
                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Enter untuk submit cepat</span>
            </div>

            {/* Panduan / tips */}
            <div className="pt-3 border-t border-[var(--color-border)]">
                {teacherId ? (
                    <>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2">Panduan Cepat</p>
                        <div className="space-y-1.5 text-[10px] text-[var(--color-text-muted)]">
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />Pilih nama → isi keperluan → klik Catat Keluar</p>
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />Saat kembali, klik tombol <strong>Kembali</strong> di panel kanan</p>
                            <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />Jam keluar bisa diubah jika terlambat mencatat</p>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2">Cara Penggunaan</p>
                        <div className="space-y-1.5 text-[10px] text-[var(--color-text-muted)]">
                            {['Pilih guru atau karyawan dari daftar', 'Pilih atau ketik keperluan keluar', 'Sesuaikan jam jika perlu, lalu catat', 'Klik Kembali di panel kanan saat sudah kembali'].map((t, i) => (
                                <p key={i} className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</span>
                                    {t}
                                </p>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// ─── FormTamu ─────────────────────────────────────────────────────────────────

function FormTamu({ onSubmit, loading }) {
    const [name, setName] = useState('')
    const [institution, setInstitution] = useState('')
    const [purpose, setPurpose] = useState('')
    const [destination, setDestination] = useState('')
    const [vehicle, setVehicle] = useState('')
    // FIX: lazy initializer — jam dicapture saat form pertama kali di-mount, bukan saat modul dimuat
    const [dateIn, setDateIn] = useState(() => nowDateStr())
    const [timeIn, setTimeIn] = useState(() => nowTimeStr())

    const canSubmit = name.trim() && purpose.trim()

    const submit = () => {
        if (!canSubmit) return
        onSubmit({ flow: 'tamu', visitorType: 'tamu', name: name.trim(), institution: institution.trim(), purpose: purpose.trim(), destination: destination.trim(), vehicle: vehicle.trim(), dateIn, timeIn })
        setName(''); setInstitution(''); setPurpose(''); setDestination(''); setVehicle('')
        setDateIn(nowDateStr()); setTimeIn(nowTimeStr())
    }

    const handleKeyDown = e => { if (e.key === 'Enter' && canSubmit && !loading) submit() }

    return (
        <div className="space-y-4" onKeyDown={handleKeyDown}>
            {/* Nama & Instansi */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Nama Tamu <span className="text-red-400">*</span></label>
                    <div className="relative">
                        <FontAwesomeIcon icon={faIdCard} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap..."
                            className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Instansi / Asal</label>
                    <div className="relative">
                        <FontAwesomeIcon icon={faBuilding} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                        <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Asal instansi / desa..."
                            className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                    </div>
                </div>
            </div>

            {/* Keperluan + presets tamu */}
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
                    Keperluan <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                    <FontAwesomeIcon icon={faTag} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                    <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Keperluan kunjungan..."
                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                </div>
                {/* FIX: Tambah preset keperluan untuk tamu */}
                <PresetPills presets={PRESETS_TAMU} value={purpose} onSelect={setPurpose} />
            </div>

            {/* Menemui & Kendaraan */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Menemui / Tujuan</label>
                    <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ustadz X, ruang TU..."
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">No. Kendaraan</label>
                    <div className="relative">
                        <FontAwesomeIcon icon={faMotorcycle} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                        <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="P 1234 AB..."
                            className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                    </div>
                </div>
            </div>

            {/* Tanggal & Jam Masuk */}
            <DateTimeInput
                dateValue={dateIn} timeValue={timeIn}
                onDateChange={setDateIn} onTimeChange={setTimeIn}
                label="Tanggal & Jam Masuk"
            />

            {/* Submit */}
            <button onClick={submit} disabled={loading || !canSubmit}
                className="w-full h-11 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white shadow-lg shadow-emerald-500/20">
                {loading
                    ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    : <FontAwesomeIcon icon={faSignInAlt} />}
                Catat Masuk Tamu
            </button>

            {/* Hint shortcut */}
            <div className="flex items-center gap-1.5 justify-end opacity-40">
                <FontAwesomeIcon icon={faKeyboard} className="text-[9px] text-[var(--color-text-muted)]" />
                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Enter untuk submit cepat</span>
            </div>

            {/* Tips */}
            <div className="pt-3 border-t border-[var(--color-border)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2">Panduan</p>
                <div className="space-y-1.5 text-[10px] text-[var(--color-text-muted)]">
                    <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />Isi nama &amp; keperluan tamu, lalu Catat Masuk</p>
                    <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />Saat tamu keluar, klik tombol <strong>Keluar</strong> di panel kanan</p>
                    <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />No. kendaraan opsional, untuk keamanan pesantren</p>
                </div>
            </div>
        </div>
    )
}

// ─── ConfirmTimeModal ─────────────────────────────────────────────────────────

function ConfirmTimeModal({ log, onConfirm, onCancel }) {
    const isGuru = log.visitor_type === 'guru' || log.visitor_type === 'karyawan'
    const [time, setTime] = useState(nowTimeStr())
    const label = isGuru ? 'Kembali' : 'Keluar'
    const colorCls = isGuru
        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
        : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
            <div className="w-full max-w-xs bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                    <p className="text-[13px] font-black text-[var(--color-text)] mb-0.5">Konfirmasi {label}</p>
                    <p className="text-[12px] font-bold text-[var(--color-primary)]">{log.visitor_name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{log.purpose}</p>
                </div>
                <div className="px-5 pb-4"><TimeInput value={time} onChange={setTime} label={`Jam ${label}`} /></div>
                <div className="flex gap-2 px-5 pb-5">
                    <button onClick={onCancel} className="flex-1 h-9 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                    <button onClick={() => onConfirm(time)} className={`flex-1 h-9 rounded-xl text-white text-[11px] font-black transition-all shadow-lg ${colorCls}`}>Catat {label}</button>
                </div>
            </div>
        </div>
    )
}

// ─── EditLogModal ─────────────────────────────────────────────────────────────

function EditLogModal({ log, onSave, onDelete, onCancel, saving }) {
    const isGuru = log.visitor_type === 'guru' || log.visitor_type === 'karyawan'
    const [purpose, setPurpose] = useState(log.purpose || '')
    const [destination, setDestination] = useState(log.destination || '')
    const [vehicle, setVehicle] = useState(log.vehicle_plate || '')
    const [timeIn, setTimeIn] = useState(fmtTime(log.check_in).replace('.', ':'))
    const [timeOut, setTimeOut] = useState(log.check_out ? fmtTime(log.check_out).replace('.', ':') : '')
    const [confirmDel, setConfirmDel] = useState(false)

    const handleSave = () => {
        const today = new Date(log.check_in)
        onSave({
            purpose: purpose.trim() || log.purpose,
            destination: destination.trim() || null,
            vehicle_plate: vehicle.trim() || null,
            check_in: timeStrToISO(today, timeIn),
            check_out: timeOut ? timeStrToISO(today, timeOut) : null,
        })
    }

    const meta = TYPE_META[log.visitor_type] || TYPE_META.tamu
    const activePresets = log.visitor_type === 'karyawan' ? PRESETS_KARYAWAN : log.visitor_type === 'tamu' ? PRESETS_TAMU : PRESETS_GURU

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
            <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                    <div>
                        <p className="text-[13px] font-black text-[var(--color-text)]">Edit Log</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span>
                            <p className="text-[10px] text-[var(--color-text-muted)]">{log.visitor_name}</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">
                        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Keperluan</label>
                        <input value={purpose} onChange={e => setPurpose(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                        <PresetPills presets={activePresets} value={purpose} onSelect={setPurpose} />
                    </div>
                    {!isGuru && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Menemui / Tujuan</label>
                            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Opsional..."
                                className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <TimeInput value={timeIn} onChange={setTimeIn} label={isGuru ? 'Jam Keluar' : 'Jam Masuk'} />
                        <TimeInput value={timeOut} onChange={setTimeOut} label={isGuru ? 'Jam Kembali' : 'Jam Keluar'} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">No. Kendaraan</label>
                        <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Opsional..."
                            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                    </div>
                </div>
                <div className="px-5 pb-5 flex gap-2">
                    {!confirmDel ? (
                        <button onClick={() => setConfirmDel(true)} className="h-9 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-[10px] font-black hover:bg-red-500/20 transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faTrash} className="text-[9px]" />Hapus
                        </button>
                    ) : (
                        <button onClick={onDelete} className="h-9 px-3 rounded-xl bg-red-500 text-white text-[10px] font-black hover:bg-red-600 transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" />Yakin Hapus?
                        </button>
                    )}
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 h-9 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : null}Simpan
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── LogCard ──────────────────────────────────────────────────────────────────

function LogCard({ log, onReturn, onCheckout, onEdit }) {
    const meta = TYPE_META[log.visitor_type] || TYPE_META.tamu
    const isGuru = log.visitor_type === 'guru' || log.visitor_type === 'karyawan'
    const isActive = !log.check_out
    const dur = durasi(log.check_in, log.check_out)
    const overTime = isGuru && isActive && (Date.now() - new Date(log.check_in).getTime()) > 2 * 60 * 60 * 1000

    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all group ${overTime
            ? 'border-amber-500/40 bg-amber-500/[0.05]'
            : isActive
                ? (isGuru ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-emerald-500/25 bg-emerald-500/[0.04]')
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                <FontAwesomeIcon icon={meta.icon} className={`text-[13px] ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12px] font-black text-[var(--color-text)] truncate">{log.visitor_name}</p>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    {isActive && isGuru && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 animate-pulse">● Sedang Keluar</span>}
                    {isActive && !isGuru && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 animate-pulse">● Di Dalam</span>}
                    {overTime && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 flex items-center gap-1"><FontAwesomeIcon icon={faBell} className="text-[7px]" />Lama keluar</span>}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">{log.purpose}</p>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    {isGuru ? (<>
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                            <FontAwesomeIcon icon={faSignOutAlt} className="text-[8px]" />Keluar {fmtTime(log.check_in)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <FontAwesomeIcon icon={faSignInAlt} className="text-[8px]" />Kembali {log.check_out ? fmtTime(log.check_out) : '—'}
                        </span>
                    </>) : (<>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <FontAwesomeIcon icon={faSignInAlt} className="text-[8px]" />Masuk {fmtTime(log.check_in)}
                        </span>
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                            <FontAwesomeIcon icon={faSignOutAlt} className="text-[8px]" />Keluar {log.check_out ? fmtTime(log.check_out) : '—'}
                        </span>
                    </>)}
                    {dur && <span className="text-[9px] text-[var(--color-text-muted)] font-bold bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded-md">{dur}</span>}
                    {log.vehicle_plate && <span className="text-[9px] text-[var(--color-text-muted)] font-bold">{log.vehicle_plate}</span>}
                </div>
                {log.destination && <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">→ {log.destination}</p>}
                {log.visitor_nip && <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 mt-0.5">{log.visitor_nip}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(log)}
                    className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 text-[10px] flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100">
                    <FontAwesomeIcon icon={faEdit} />
                </button>
                {isActive && (
                    <button onClick={() => isGuru ? onReturn(log) : onCheckout(log)}
                        className={`h-8 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all active:scale-95 ${isGuru
                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            : 'border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
                        <FontAwesomeIcon icon={isGuru ? faSignInAlt : faSignOutAlt} className="text-[9px]" />
                        <span className="hidden sm:inline">{isGuru ? 'Kembali' : 'Keluar'}</span>
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GatePage() {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const navigate = useNavigate()

    const ALLOWED_ROLES = ['admin', 'satpam', 'developer']
    const isAllowed = profile ? ALLOWED_ROLES.includes(profile.role?.toLowerCase()) : null

    const [activeTab, setActiveTab] = useState('input')
    const [inputMode, setInputMode] = useState('guru')
    const [teacherList, setTeacherList] = useState([])
    const [todayLogs, setTodayLogs] = useState([])
    const [rekapData, setRekapData] = useState([])
    const [loadingLogs, setLoadingLogs] = useState(false)
    const [loadingRekap, setLoadingRekap] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [rekapMode, setRekapMode] = useState('harian')
    const todayRef = useRef(startOfDay(new Date()))
    const [rekapDate, setRekapDate] = useState(todayRef.current)
    const [filterType, setFilterType] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [searchLog, setSearchLog] = useState('')
    const [filterRekap, setFilterRekap] = useState('all') // 'all' | 'guru' | 'karyawan' | 'tamu'
    const [searchRekap, setSearchRekap] = useState('')
    const [rekapView, setRekapView] = useState('log') // 'log' | 'ringkasan'
    const [confirmModal, setConfirmModal] = useState(null)
    const [editLog, setEditLog] = useState(null)
    const [editSaving, setEditSaving] = useState(false)
    const [lastRefresh, setLastRefresh] = useState(Date.now())
    const [dismissedOvertime, setDismissedOvertime] = useState(false)

    // ── Derived stats ──────────────────────────────────────────────────────────

    const stats = useMemo(() => ({
        total: todayLogs.length,
        keluar: todayLogs.filter(l => (l.visitor_type === 'guru' || l.visitor_type === 'karyawan') && !l.check_out).length,
        dalamTamu: todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).length,
        tamu: todayLogs.filter(l => l.visitor_type === 'tamu').length,
    }), [todayLogs])

    const dailySummary = useMemo(() => {
        const guruLogs = todayLogs.filter(l => l.visitor_type === 'guru' || l.visitor_type === 'karyawan')
        const finished = guruLogs.filter(l => l.check_out)
        const avgMs = finished.length ? finished.reduce((sum, l) => sum + (new Date(l.check_out) - new Date(l.check_in)), 0) / finished.length : 0
        const avgMin = Math.round(avgMs / 60000)
        const overTimeList = todayLogs.filter(l =>
            (l.visitor_type === 'guru' || l.visitor_type === 'karyawan') && !l.check_out
            && (Date.now() - new Date(l.check_in).getTime()) > 2 * 60 * 60 * 1000
        )
        return { avgMin, overTimeList, totalGuru: guruLogs.length, selesai: finished.length }
    }, [todayLogs])

    // Auto-reset dismiss saat jumlah overtime bertambah (ada orang baru yang overtime)
    const prevOvertimeCount = useRef(0)
    useEffect(() => {
        const cur = dailySummary.overTimeList.length
        if (cur > prevOvertimeCount.current) setDismissedOvertime(false)
        prevOvertimeCount.current = cur
    }, [dailySummary.overTimeList.length])

    // ── Data fetching ──────────────────────────────────────────────────────────

    useEffect(() => {
        supabase.from('teachers').select('id,name,nbm,status,type').is('deleted_at', null).order('name')
            .then(({ data, error }) => {
                if (error) console.error('[GatePage] Teachers fetch error:', error)
                setTeacherList(data || [])
            })
    }, [])

    const loadTodayLogs = useCallback(async () => {
        setLoadingLogs(true)
        const t0 = startOfDay(new Date()), t1 = addDays(t0, 1)
        const { data, error } = await supabase
            .from('gate_logs').select('*')
            .gte('check_in', iso(t0))
            .lt('check_in', iso(t1))
            .order('check_in', { ascending: false })
        if (error) console.error('[GatePage] loadTodayLogs error:', error)
        else setTodayLogs(data || [])
        setLoadingLogs(false)
    }, [])

    useEffect(() => { loadTodayLogs() }, [loadTodayLogs])

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => {
            loadTodayLogs()
            setLastRefresh(Date.now())
        }, 30000)
        return () => clearInterval(interval)
    }, [loadTodayLogs])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase.channel('gate_logs_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () => {
                loadTodayLogs()
                setLastRefresh(Date.now())
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [loadTodayLogs])

    const loadRekap = useCallback(async () => {
        setLoadingRekap(true)
        let from, to
        if (rekapMode === 'harian') {
            from = startOfDay(rekapDate); to = addDays(from, 1)
        } else if (rekapMode === 'bulanan') {
            const d = new Date(rekapDate)
            from = new Date(d.getFullYear(), d.getMonth(), 1)
            to = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        } else {
            // mingguan
            const d = new Date(rekapDate), day = d.getDay()
            const mon = addDays(d, -(day === 0 ? 6 : day - 1))
            from = startOfDay(mon); to = addDays(from, 7)
        }
        const { data } = await supabase.from('gate_logs').select('*')
            .gte('check_in', iso(from)).lt('check_in', iso(to))
            .order('check_in', { ascending: false })
        setRekapData(data || [])
        setLoadingRekap(false)
    }, [rekapMode, rekapDate])

    useEffect(() => { if (activeTab === 'rekap') loadRekap() }, [activeTab, loadRekap])

    // ── Submit handler ─────────────────────────────────────────────────────────
    /**
     * Pakai dateTimeToISO(dateStr, timeStr) → ISO string tanpa bug tanggal loncat.
     * recorded_by hanya dikirim jika profile.id tersedia.
     */
    const handleSubmit = useCallback(async (form) => {
        setSubmitting(true)
        try {
            let payload
            if (form.flow === 'guru') {
                payload = {
                    visitor_type: form.visitorType,
                    teacher_id: form.teacherId,
                    visitor_name: form.name,
                    visitor_nip: form.nbm || null,
                    purpose: form.purpose,
                    check_in: dateTimeToISO(form.dateOut, form.timeOut),
                    check_out: null,
                }
            } else {
                payload = {
                    visitor_type: 'tamu',
                    teacher_id: null,
                    visitor_name: form.name,
                    visitor_nip: form.institution || null,
                    purpose: form.purpose,
                    destination: form.destination || null,
                    vehicle_plate: form.vehicle || null,
                    check_in: dateTimeToISO(form.dateIn, form.timeIn),
                    check_out: null,
                }
            }

            // Tambah recorded_by hanya jika ada profile.id
            if (profile?.id) payload.recorded_by = profile.id

            const { data, error } = await supabase.from('gate_logs').insert(payload).select()

            if (error) {
                addToast(`Gagal simpan: ${error.message}`, 'error')
            } else {
                const who = form.flow === 'guru' ? form.name : `Tamu ${form.name}`
                const act = form.flow === 'guru' ? 'keluar' : 'masuk'
                addToast(`${who} ${act} berhasil dicatat ✓`, 'success')
                await loadTodayLogs()
            }
        } catch (err) {
            addToast(`Error tidak terduga: ${err.message}`, 'error')
        }
        setSubmitting(false)
    }, [profile, loadTodayLogs, addToast])

    const handleReturn = useCallback((log) => setConfirmModal({ log, action: 'return' }), [])
    const handleCheckout = useCallback((log) => setConfirmModal({ log, action: 'checkout' }), [])

    const handleConfirmTime = useCallback(async (timeStr) => {
        const { log, action } = confirmModal
        setConfirmModal(null)

        // FIX: Handle cross-midnight scenario — if checkout < checkin, assume next day
        const checkInDate = new Date(log.check_in)
        let checkOutISO = timeStrToISO(checkInDate, timeStr)
        if (new Date(checkOutISO) < checkInDate) {
            const nextDay = new Date(checkInDate)
            nextDay.setDate(nextDay.getDate() + 1)
            checkOutISO = timeStrToISO(nextDay, timeStr)
        }

        const { error } = await supabase.from('gate_logs')
            .update({ check_out: checkOutISO })
            .eq('id', log.id)
        if (error) addToast('Gagal: ' + error.message, 'error')
        else { addToast(action === 'return' ? 'Kembali dicatat ✓' : 'Tamu keluar dicatat ✓', 'success'); loadTodayLogs() }
    }, [confirmModal, loadTodayLogs, addToast])

    const handleSaveEdit = useCallback(async (updates) => {
        setEditSaving(true)
        const { error } = await supabase.from('gate_logs').update(updates).eq('id', editLog.id)
        setEditSaving(false)
        if (error) addToast('Gagal menyimpan: ' + error.message, 'error')
        else { addToast('Log diperbarui ✓', 'success'); setEditLog(null); loadTodayLogs() }
    }, [editLog, loadTodayLogs, addToast])

    const handleDeleteLog = useCallback(async () => {
        const { error } = await supabase.from('gate_logs').delete().eq('id', editLog.id)
        if (error) addToast('Gagal hapus: ' + error.message, 'error')
        else { addToast('Log dihapus ✓', 'success'); setEditLog(null); loadTodayLogs() }
    }, [editLog, loadTodayLogs, addToast])

    // ── Filters ────────────────────────────────────────────────────────────────

    const filteredLogs = useMemo(() => {
        let list = filterType === 'all' ? todayLogs : todayLogs.filter(l => l.visitor_type === filterType)
        if (filterStatus === 'aktif') list = list.filter(l => !l.check_out)
        if (filterStatus === 'selesai') list = list.filter(l => !!l.check_out)
        if (searchLog.trim()) {
            const q = searchLog.toLowerCase()
            list = list.filter(l => l.visitor_name.toLowerCase().includes(q) || (l.purpose || '').toLowerCase().includes(q))
        }
        return list
    }, [todayLogs, filterType, filterStatus, searchLog])

    // ── Print HTML builders — didefinisikan SEBELUM handlePrint ──────────────

    const PRINT_BASE_STYLE = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1f2937;background:#fff}.page{padding:24px}.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7eb}.header-left h1{font-size:18px;font-weight:900;color:#1f2937;margin-bottom:2px}.header-left p{font-size:10px;color:#6b7280}.badge{display:inline-block;background:#6366f1;color:#fff;font-size:10px;font-weight:900;padding:3px 10px;border-radius:999px;margin-bottom:6px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}.stat{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px}.stat p.l{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;font-weight:900;margin-bottom:2px}.stat p.v{font-size:20px;font-weight:900;color:#1f2937}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:900;color:#6b7280;padding:8px 10px;text-align:left;border-bottom:2px solid #e5e7eb}td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top;line-height:1.4}tr:hover td{background:#fafafa}.footer{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#9ca3af;font-size:9px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:12mm}@page{margin:0;size:A4 landscape}}`

    const buildPrintHTMLDetail = useCallback((src, title) => {
        const now = new Date()
        const rows = src.map((l, i) => {
            const isG = l.visitor_type === 'guru' || l.visitor_type === 'karyawan'
            const dur = durasi(l.check_in, l.check_out)
            const statusColor = !l.check_out ? '#f59e0b' : '#10b981'
            const statusLabel = !l.check_out ? (isG ? 'Belum Kembali' : 'Masih di Dalam') : (isG ? 'Sudah Kembali' : 'Sudah Keluar')
            const typeColor = l.visitor_type === 'guru' ? '#6366f1' : l.visitor_type === 'karyawan' ? '#3b82f6' : '#f59e0b'
            return `<tr><td style="color:#999">${i + 1}</td><td style="font-weight:900">${l.visitor_name}<br><span style="font-size:9px;color:#999;font-weight:400">${l.visitor_nip || ''}</span></td><td><span style="background:${typeColor}18;color:${typeColor};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900">${TYPE_META[l.visitor_type]?.label || l.visitor_type}</span></td><td>${l.purpose}</td><td style="color:#ef4444">${isG ? fmtTime(l.check_in) : '-'}</td><td style="color:#10b981">${isG ? fmtTime(l.check_out) : fmtTime(l.check_in)}</td><td style="color:#ef4444">${!isG ? fmtTime(l.check_out) : '-'}</td><td style="color:#6b7280">${dur || '-'}</td><td><span style="background:${statusColor}18;color:${statusColor};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900">${statusLabel}</span></td></tr>`
        }).join('')
        const statsHtml = [['Total', src.length, '#6366f1'], ['Guru', src.filter(l => l.visitor_type === 'guru').length, '#6366f1'], ['Karyawan', src.filter(l => l.visitor_type === 'karyawan').length, '#3b82f6'], ['Tamu', src.filter(l => l.visitor_type === 'tamu').length, '#f59e0b']].map(([l, v, c]) => `<div class="stat"><p class="l">${l}</p><p class="v" style="color:${c}">${v}</p></div>`).join('')
        return `<!DOCTYPE html><html><head><title>${title}</title><style>${PRINT_BASE_STYLE}</style></head><body><div class="page"><div class="header"><div class="header-left"><div class="badge">Portal Keluar Masuk</div><h1>${title}</h1><p>Dicetak oleh sistem · ${fmtDateTime(now)}</p></div><div style="text-align:right"><p style="font-size:13px;font-weight:900;color:#6366f1">${src.length}</p><p style="font-size:9px;color:#9ca3af">Total Entri</p></div></div><div class="stats">${statsHtml}</div><table><thead><tr><th>#</th><th>Nama / NIP</th><th>Jenis</th><th>Keperluan</th><th>Jam Keluar</th><th>Jam Kembali / Masuk</th><th>Jam Keluar (Tamu)</th><th>Durasi</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="footer"><span>Pesantren · Laporanmu v2</span><span>Total ${src.length} entri · ${fmtDate(now)}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`
    }, [])

    const buildPrintHTMLRingkasan = useCallback((ringkasan, title, periodLabel) => {
        const now = new Date()
        const rows = ringkasan.map((r, i) => {
            const meta = TYPE_META[r.type] || TYPE_META.tamu
            const typeColor = r.type === 'guru' ? '#6366f1' : r.type === 'karyawan' ? '#3b82f6' : '#f59e0b'
            const totalH = Math.floor(r.totalMs / 3600000), totalM = Math.floor((r.totalMs % 3600000) / 60000)
            const totalStr = r.totalMs > 0 ? (totalH > 0 ? `${totalH}j ${totalM}m` : `${totalM}m`) : '-'
            const completedCount = r.count - r.belumKembali
            const avgMs = completedCount > 0 ? r.totalMs / completedCount : 0
            const avgH = Math.floor(avgMs / 3600000), avgM = Math.floor((avgMs % 3600000) / 60000)
            const avgStr = avgMs > 0 ? (avgH > 0 ? `${avgH}j ${avgM}m` : `${avgM}m`) : '-'
            const belumBadge = r.belumKembali > 0 ? `<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900">${r.belumKembali}×</span>` : '-'
            return `<tr><td style="color:#999">${i + 1}</td><td style="font-weight:900">${r.name}<br><span style="font-size:9px;color:#999;font-weight:400">${r.nip !== '-' ? r.nip : ''}</span></td><td><span style="background:${typeColor}18;color:${typeColor};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900">${meta.label}</span></td><td style="font-weight:900;font-size:13px">${r.count}×</td><td style="color:#ef4444;font-weight:900">${totalStr}</td><td style="color:#6b7280">${avgStr}</td><td>${belumBadge}</td><td style="font-size:10px;color:#6b7280">${r.purposes.slice(0, 4).join(', ')}${r.purposes.length > 4 ? ` +${r.purposes.length - 4} lainnya` : ''}</td></tr>`
        }).join('')
        const totalBelum = ringkasan.reduce((s, r) => s + r.belumKembali, 0)
        const totalKeluar = ringkasan.reduce((s, r) => s + r.count, 0)
        const statsHtml = [['Total Orang', ringkasan.length, '#6366f1'], ['Total Keluar', totalKeluar, '#ef4444'], ['Belum Kembali', totalBelum, '#f59e0b'], ['Sudah Kembali', totalKeluar - totalBelum, '#10b981']].map(([l, v, c]) => `<div class="stat"><p class="l">${l}</p><p class="v" style="color:${c}">${v}</p></div>`).join('')
        return `<!DOCTYPE html><html><head><title>${title}</title><style>${PRINT_BASE_STYLE}</style></head><body><div class="page"><div class="header"><div class="header-left"><div class="badge">Portal Keluar Masuk · Ringkasan</div><h1>${title}</h1><p>Periode: ${periodLabel} · Dicetak ${fmtDateTime(now)}</p></div><div style="text-align:right"><p style="font-size:13px;font-weight:900;color:#6366f1">${ringkasan.length}</p><p style="font-size:9px;color:#9ca3af">Total Orang</p></div></div><div class="stats">${statsHtml}</div><table><thead><tr><th>#</th><th>Nama / NIP</th><th>Jenis</th><th>Jml Keluar</th><th>Total Durasi</th><th>Rata-rata</th><th>Belum Kembali</th><th>Keperluan</th></tr></thead><tbody>${rows}</tbody></table><div class="footer"><span>Pesantren · Laporanmu v2</span><span>${ringkasan.length} orang · ${fmtDate(now)}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`
    }, [])

    // ── Rekap nav & labels ────────────────────────────────────────────────────

    const navRekap = dir => {
        if (rekapMode === 'harian') setRekapDate(prev => addDays(prev, dir))
        else if (rekapMode === 'mingguan') setRekapDate(prev => addDays(prev, dir * 7))
        else {
            // bulanan: geser 1 bulan
            setRekapDate(prev => {
                const d = new Date(prev)
                d.setMonth(d.getMonth() + dir)
                return d
            })
        }
    }
    const rekapLabel = useMemo(() => {
        if (rekapMode === 'harian') return fmtDate(rekapDate)
        if (rekapMode === 'bulanan') {
            const d = new Date(rekapDate)
            return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
        }
        // mingguan
        const d = new Date(rekapDate), day = d.getDay()
        const mon = addDays(d, -(day === 0 ? 6 : day - 1)), sun = addDays(mon, 6)
        return `${mon.getDate()} – ${sun.getDate()} ${MONTHS_ID[sun.getMonth()]} ${sun.getFullYear()}`
    }, [rekapMode, rekapDate])
    const rekapSummary = useMemo(() => ({
        total: rekapData.length,
        guru: rekapData.filter(l => l.visitor_type === 'guru').length,
        karyawan: rekapData.filter(l => l.visitor_type === 'karyawan').length,
        tamu: rekapData.filter(l => l.visitor_type === 'tamu').length,
    }), [rekapData])

    const filteredRekapData = useMemo(() => {
        let list = filterRekap === 'all' ? rekapData : rekapData.filter(l => l.visitor_type === filterRekap)
        if (searchRekap.trim()) {
            const q = searchRekap.toLowerCase()
            list = list.filter(l => l.visitor_name.toLowerCase().includes(q) || (l.purpose || '').toLowerCase().includes(q))
        }
        return list
    }, [rekapData, filterRekap, searchRekap])

    // Ringkasan per orang — extracted to pure function for reuse in export
    const rekapRingkasan = useMemo(() => {
        const map = new Map()
        const src = filterRekap === 'all' ? rekapData : rekapData.filter(l => l.visitor_type === filterRekap)
        const filtered = searchRekap.trim()
            ? src.filter(l => l.visitor_name.toLowerCase().includes(searchRekap.toLowerCase()))
            : src

        filtered.forEach(l => {
            const isGuru = l.visitor_type === 'guru' || l.visitor_type === 'karyawan'
            const key = l.teacher_id || l.visitor_name
            if (!map.has(key)) {
                map.set(key, { id: key, name: l.visitor_name, nip: l.visitor_nip || '-', type: l.visitor_type, count: 0, totalMs: 0, belumKembali: 0, purposes: [] })
            }
            const entry = map.get(key)
            entry.count++
            if (isGuru && l.check_out) {
                const ms = new Date(l.check_out) - new Date(l.check_in)
                if (ms > 0) entry.totalMs += ms
            }
            if (isGuru && !l.check_out) entry.belumKembali++
            if (l.purpose && !entry.purposes.includes(l.purpose)) entry.purposes.push(l.purpose)
        })

        return Array.from(map.values()).sort((a, b) => b.totalMs - a.totalMs)
    }, [rekapData, filterRekap, searchRekap])

    // ── Print — defined here so rekapRingkasan & filteredRekapData are in scope ─

    const handlePrint = useCallback(() => {
        const periodLabel = rekapMode === 'harian' ? fmtDate(rekapDate) : rekapMode === 'bulanan' ? rekapLabel : `Mingguan ${rekapLabel}`

        if (activeTab === 'rekap' && rekapView === 'ringkasan') {
            const win = window.open('', '_blank', 'width=1200,height=750')
            if (!win) return
            win.document.write(buildPrintHTMLRingkasan(rekapRingkasan, `Ringkasan ${periodLabel}`, periodLabel))
            win.document.close()
            return
        }

        const src = activeTab === 'rekap' ? filteredRekapData : todayLogs
        const title = activeTab === 'rekap'
            ? `Rekap ${periodLabel}`
            : `Log Hari Ini — ${fmtDate(new Date())}`
        const win = window.open('', '_blank', 'width=1200,height=750')
        if (!win) return
        win.document.write(buildPrintHTMLDetail(src, title))
        win.document.close()
    }, [activeTab, rekapView, rekapRingkasan, filteredRekapData, todayLogs, rekapMode, rekapDate, rekapLabel, buildPrintHTMLDetail, buildPrintHTMLRingkasan])

    // ── Export CSV ─────────────────────────────────────────────────────────────

    const handleExportCSV = useCallback((source = 'rekap') => {
        const periodLabel = (rekapMode === 'harian' ? fmtDate(rekapDate) : rekapLabel).replace(/\s/g, '_')
        const label = source === 'rekap' ? periodLabel : fmtDate(new Date()).replace(/\s/g, '_')

        // FIX: jika di tab rekap & view ringkasan, export format ringkasan per orang
        if (source === 'rekap' && rekapView === 'ringkasan') {
            const header = ['No', 'Nama', 'NIP', 'Jenis', 'Jml Keluar', 'Total Durasi Keluar', 'Rata-rata Durasi', 'Belum Kembali', 'Keperluan']
            const rows = rekapRingkasan.map((r, i) => {
                const totalH = Math.floor(r.totalMs / 3600000), totalM = Math.floor((r.totalMs % 3600000) / 60000)
                const totalStr = r.totalMs > 0 ? (totalH > 0 ? `${totalH}j ${totalM}m` : `${totalM}m`) : '-'
                // FIX: fix avgMs precedence — gunakan completedCount, bukan (count - belumKembali || 1)
                const completedCount = r.count - r.belumKembali
                const avgMs = completedCount > 0 ? r.totalMs / completedCount : 0
                const avgH = Math.floor(avgMs / 3600000), avgM = Math.floor((avgMs % 3600000) / 60000)
                const avgStr = avgMs > 0 ? (avgH > 0 ? `${avgH}j ${avgM}m` : `${avgM}m`) : '-'
                return [
                    i + 1, r.name, r.nip,
                    TYPE_META[r.type]?.label || r.type,
                    `${r.count}x`, totalStr, avgStr, r.belumKembali,
                    `"${r.purposes.join(', ').replace(/"/g, '""')}"`,
                ].join(',')
            })
            const csv = [header.join(','), ...rows].join('\n')
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `ringkasan_${label}.csv`; a.click()
            URL.revokeObjectURL(url)
            addToast(`CSV Ringkasan berhasil diunduh (${rekapRingkasan.length} orang) ✓`, 'success')
            return
        }

        // Export format detail log (default)
        const src = source === 'rekap' ? filteredRekapData : filteredLogs
        const header = ['No', 'Nama', 'Jenis', 'NIP / Instansi', 'Keperluan', 'Jam Keluar (Guru)', 'Jam Kembali / Masuk Tamu', 'Jam Keluar (Tamu)', 'Durasi', 'Kendaraan', 'Status']
        const rows = src.map((l, i) => {
            const isG = l.visitor_type === 'guru' || l.visitor_type === 'karyawan'
            const dur = durasi(l.check_in, l.check_out) || '-'
            const stat = !l.check_out ? (isG ? 'Belum Kembali' : 'Masih di Dalam') : (isG ? 'Sudah Kembali' : 'Sudah Keluar')
            return [
                i + 1, l.visitor_name,
                TYPE_META[l.visitor_type]?.label || l.visitor_type,
                l.visitor_nip || '-',
                `"${(l.purpose || '').replace(/"/g, '""')}"`,
                isG ? fmtTime(l.check_in) : '-',
                isG ? fmtTime(l.check_out) : fmtTime(l.check_in),
                !isG ? fmtTime(l.check_out) : '-',
                dur, l.vehicle_plate || '-', stat,
            ].join(',')
        })
        const csv = [header.join(','), ...rows].join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `gate_log_${label}.csv`; a.click()
        URL.revokeObjectURL(url)
        addToast(`CSV berhasil diunduh (${src.length} baris) ✓`, 'success')
    }, [rekapView, rekapRingkasan, filteredRekapData, filteredLogs, rekapMode, rekapDate, rekapLabel, addToast])

    // FIX: handleExportPDF — aware of rekapView, fix deps
    const handleExportPDF = useCallback((source = 'rekap') => {
        const periodLabel = rekapMode === 'harian' ? fmtDate(rekapDate) : rekapLabel

        if (source === 'rekap' && rekapView === 'ringkasan') {
            const title = `Ringkasan ${periodLabel}`
            const win = window.open('', '_blank', 'width=1200,height=750')
            if (!win) return
            win.document.write(buildPrintHTMLRingkasan(rekapRingkasan, title, periodLabel))
            win.document.close()
            return
        }

        const src = source === 'rekap' ? filteredRekapData : filteredLogs
        const title = source === 'rekap'
            ? `Rekap ${periodLabel}`
            : `Log Hari Ini — ${fmtDate(new Date())}`
        const win = window.open('', '_blank', 'width=1200,height=750')
        if (!win) return
        win.document.write(buildPrintHTMLDetail(src, title))
        win.document.close()
    }, [rekapView, rekapRingkasan, filteredRekapData, filteredLogs, rekapMode, rekapDate, rekapLabel, buildPrintHTMLDetail, buildPrintHTMLRingkasan])

    const TABS = [
        { key: 'input', label: 'Input', icon: faPlus },
        { key: 'log', label: 'Log Hari Ini', icon: faCalendarDay },
        { key: 'rekap', label: 'Rekap', icon: faCalendarWeek },
    ]

    // ── Guards ─────────────────────────────────────────────────────────────────

    if (isAllowed === null) return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
            </div>
        </DashboardLayout>
    )
    if (!isAllowed) return (
        <DashboardLayout>
            <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faLock} className="text-2xl text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Akses Ditolak</h2>
                    <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">Halaman ini hanya dapat diakses oleh <strong>Admin</strong> dan <strong>Satpam</strong>.</p>
                </div>
                <button onClick={() => navigate(-1)} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">Kembali</button>
            </div>
        </DashboardLayout>
    )

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 max-w-[1800px] mx-auto">

                {/* PAGE HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Portal Keluar Masuk</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium opacity-70">Pencatatan izin keluar guru/karyawan dan kunjungan tamu.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <LiveClock />
                        <button onClick={handlePrint}
                            className="h-9 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-2 transition-all shrink-0">
                            <FontAwesomeIcon icon={faPrint} />Cetak
                        </button>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Total Hari Ini', value: stats.total, icon: faClipboardList, bg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]', border: 'border-t-[var(--color-primary)]' },
                        { label: 'Guru Sedang Keluar', value: stats.keluar, icon: faPersonWalkingArrowRight, bg: 'bg-red-500/10 text-red-500', border: 'border-t-red-500' },
                        { label: 'Tamu di Dalam', value: stats.dalamTamu, icon: faBuilding, bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-t-emerald-500' },
                        { label: 'Total Tamu', value: stats.tamu, icon: faUserFriends, bg: 'bg-amber-500/10 text-amber-500', border: 'border-t-amber-500' },
                    ].map((s, i) => (
                        <div key={i} className={`glass rounded-[1.5rem] p-4 border-t-[3px] ${s.border} flex items-center gap-3 hover:border-t-4 transition-all cursor-default`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${s.bg}`}>
                                <FontAwesomeIcon icon={s.icon} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 leading-none mb-1">{s.label}</p>
                                <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)] tabular-nums">{s.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* TABS */}
                <div className="flex gap-1 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] mb-6 w-fit">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`h-8 px-4 rounded-xl text-[11px] font-black flex items-center gap-2 transition-all ${activeTab === t.key
                                ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={t.icon} className="text-[10px]" />{t.label}
                            {t.key === 'log' && todayLogs.length > 0 && (
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                                    {todayLogs.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── TAB: INPUT ── */}
                {activeTab === 'input' && (
                    // FIX: items-stretch agar kedua kolom sama tingginya
                    <div className="grid lg:grid-cols-2 gap-6 items-stretch">

                        {/* Kolom kiri: Form — flex flex-col h-full agar mengisi penuh */}
                        <div className="glass rounded-[1.5rem] p-5 flex flex-col h-full">
                            {/* Mode switcher Guru / Tamu */}
                            <div className="flex gap-2 mb-5">
                                {[
                                    { k: 'guru', l: 'Guru / Karyawan', icon: faChalkboardTeacher, desc: 'Izin keluar dari dalam', active: 'border-red-500/30 bg-red-500/5', activeText: 'text-red-500' },
                                    { k: 'tamu', l: 'Tamu', icon: faUserFriends, desc: 'Masuk dari luar', active: 'border-emerald-500/30 bg-emerald-500/5', activeText: 'text-emerald-600' },
                                ].map(m => (
                                    <button key={m.k} onClick={() => setInputMode(m.k)}
                                        className={`flex-1 py-3 px-4 rounded-xl border transition-all text-left ${inputMode === m.k ? m.active : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)]'}`}>
                                        <div className={`flex items-center gap-2 font-black text-[12px] ${inputMode === m.k ? m.activeText : 'text-[var(--color-text-muted)]'}`}>
                                            <FontAwesomeIcon icon={m.icon} className="text-[11px]" />{m.l}
                                        </div>
                                        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 font-medium">{m.desc}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Form content — flex-1 agar mendorong tombol submit ke bawah */}
                            <div className="flex-1">
                                {inputMode === 'guru'
                                    ? <FormGuru teacherList={teacherList} onSubmit={handleSubmit} loading={submitting} />
                                    : <FormTamu onSubmit={handleSubmit} loading={submitting} />
                                }
                            </div>
                        </div>

                        {/* Kolom kanan: Status — flex flex-col h-full agar mengisi penuh */}
                        <div className="flex flex-col gap-4 h-full">

                            {/* Sedang Keluar */}
                            <div className="glass rounded-[1.5rem] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">Sedang Keluar</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Guru &amp; karyawan belum kembali</p>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${stats.keluar > 0 ? 'text-red-500 bg-red-500/10' : 'text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]'}`}>
                                        {stats.keluar} orang
                                    </span>
                                </div>
                                {loadingLogs
                                    ? <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                                    : todayLogs.filter(l => (l.visitor_type === 'guru' || l.visitor_type === 'karyawan') && !l.check_out).length === 0
                                        ? <div className="flex flex-col items-center gap-2 py-6 opacity-40">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faCheck} className="text-emerald-500" />
                                            </div>
                                            <p className="text-[11px] text-[var(--color-text-muted)] font-bold">Semua guru &amp; karyawan ada di dalam</p>
                                        </div>
                                        : <div className="space-y-2">
                                            {todayLogs.filter(l => (l.visitor_type === 'guru' || l.visitor_type === 'karyawan') && !l.check_out).map(log => (
                                                <LogCard key={log.id} log={log} onReturn={handleReturn} onCheckout={handleCheckout} onEdit={setEditLog} />
                                            ))}
                                        </div>
                                }
                            </div>

                            {/* Tamu di Dalam */}
                            <div className="glass rounded-[1.5rem] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">Tamu di Dalam</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Belum checkout</p>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${stats.dalamTamu > 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]'}`}>
                                        {stats.dalamTamu} orang
                                    </span>
                                </div>
                                {loadingLogs
                                    ? <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                                    : todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).length === 0
                                        ? <div className="flex flex-col items-center gap-2 py-6 opacity-40">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                                <FontAwesomeIcon icon={faUserFriends} className="text-[var(--color-text-muted)]" />
                                            </div>
                                            <p className="text-[11px] text-[var(--color-text-muted)] font-bold">Tidak ada tamu</p>
                                        </div>
                                        : <div className="space-y-2">
                                            {todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).map(log => (
                                                <LogCard key={log.id} log={log} onReturn={handleReturn} onCheckout={handleCheckout} onEdit={setEditLog} />
                                            ))}
                                        </div>
                                }
                            </div>

                            {/* Ringkasan Hari Ini — flex-1 agar mengisi sisa ruang */}
                            <div className="glass rounded-[1.5rem] p-5 flex-1">
                                <div className="mb-4">
                                    <p className="text-[13px] font-black text-[var(--color-text)]">Ringkasan Hari Ini</p>
                                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Statistik keluar masuk</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { l: 'Total Aktivitas', v: stats.total, c: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                                        { l: 'Guru Kembali', v: dailySummary.selesai, c: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                                        { l: 'Rata-rata Keluar', v: dailySummary.avgMin > 0 ? (dailySummary.avgMin >= 60 ? `${Math.floor(dailySummary.avgMin / 60)}j ${dailySummary.avgMin % 60}m` : `${dailySummary.avgMin}m`) : '-', c: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                                        { l: 'Perlu Perhatian', v: dailySummary.overTimeList.length, c: dailySummary.overTimeList.length > 0 ? 'text-amber-600' : 'text-emerald-600', bg: dailySummary.overTimeList.length > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10' },
                                    ].map((s, i) => (
                                        <div key={i} className={`rounded-xl p-3 ${s.bg}`}>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70 mb-1">{s.l}</p>
                                            <p className={`text-lg font-black font-heading tabular-nums ${s.c}`}>{s.v}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center gap-2">
                                    <button onClick={() => { loadTodayLogs(); setLastRefresh(Date.now()) }}
                                        className="p-1 rounded-md hover:bg-[var(--color-surface-alt)] transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                        <FontAwesomeIcon icon={faArrowsRotate} className="text-[9px]" />
                                    </button>
                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Auto-refresh setiap 30 detik</span>
                                    <span className="ml-auto text-[9px] text-[var(--color-text-muted)] tabular-nums">
                                        {new Date(lastRefresh).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: LOG HARI INI ── */}
                {activeTab === 'log' && (
                    <div className="glass rounded-[1.5rem] overflow-hidden">
                        {/* Toolbar baris 1: Search + filter jenis */}
                        <div className="px-4 pt-3 pb-2 border-b border-[var(--color-border)] flex items-center gap-2 flex-wrap">
                            <div className="relative flex-1 min-w-[160px]">
                                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                <input value={searchLog} onChange={e => setSearchLog(e.target.value)}
                                    placeholder="Cari nama atau keperluan..."
                                    className="w-full h-8 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                                {searchLog && (
                                    <button onClick={() => setSearchLog('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1">
                                {[{ k: 'all', l: 'Semua' }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: t.label }))].map(f => (
                                    <button key={f.k} onClick={() => setFilterType(f.k)}
                                        className={`h-8 px-3 rounded-xl text-[10px] font-black transition-all ${filterType === f.k
                                            ? 'bg-[var(--color-primary)] text-white'
                                            : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        {f.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Toolbar baris 2: Filter status + export + counter */}
                        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center gap-2 flex-wrap bg-[var(--color-surface-alt)]/40">
                            <div className="flex gap-1">
                                {[
                                    { k: 'all', l: 'Semua Status', icon: faFilter },
                                    { k: 'aktif', l: 'Masih Aktif', icon: faCircleDot },
                                    { k: 'selesai', l: 'Sudah Selesai', icon: faCircleCheck },
                                ].map(f => {
                                    const count = f.k === 'all'
                                        ? todayLogs.filter(l => filterType === 'all' ? true : l.visitor_type === filterType).length
                                        : todayLogs.filter(l => {
                                            const typeOk = filterType === 'all' || l.visitor_type === filterType
                                            const statOk = f.k === 'aktif' ? !l.check_out : !!l.check_out
                                            return typeOk && statOk
                                        }).length
                                    const activeColor = f.k === 'aktif' ? 'bg-red-500 text-white' : f.k === 'selesai' ? 'bg-emerald-500 text-white' : 'bg-[var(--color-primary)] text-white'
                                    return (
                                        <button key={f.k} onClick={() => setFilterStatus(f.k)}
                                            className={`h-7 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all ${filterStatus === f.k
                                                ? activeColor
                                                : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                            <FontAwesomeIcon icon={f.icon} className="text-[8px]" />
                                            {f.l}
                                            <span className={`text-[8px] font-black px-1 py-0.5 rounded-md min-w-[16px] text-center ${filterStatus === f.k ? 'bg-white/25' : 'bg-[var(--color-surface-alt)]'}`}>{count}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{filteredLogs.length} entri</span>
                                <div className="w-px h-4 bg-[var(--color-border)]" />
                                <button onClick={() => handleExportCSV('log')}
                                    className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 flex items-center gap-1.5 transition-all">
                                    <FontAwesomeIcon icon={faFileCsv} className="text-[9px]" />CSV
                                </button>
                                <button onClick={() => handleExportPDF('log')}
                                    className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center gap-1.5 transition-all">
                                    <FontAwesomeIcon icon={faFilePdf} className="text-[9px]" />PDF
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            {loadingLogs
                                ? <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                                : filteredLogs.length === 0
                                    ? <div className="flex flex-col items-center gap-2 py-16 opacity-40">
                                        <FontAwesomeIcon icon={faClipboardList} className="text-4xl" />
                                        <p className="text-[12px] font-black">
                                            {filterStatus !== 'all' || filterType !== 'all' || searchLog ? 'Tidak ada data yang cocok dengan filter' : 'Tidak ada data'}
                                        </p>
                                        {(filterStatus !== 'all' || filterType !== 'all' || searchLog) && (
                                            <button onClick={() => { setFilterStatus('all'); setFilterType('all'); setSearchLog('') }}
                                                className="mt-1 h-7 px-3 rounded-lg border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                                Reset Filter
                                            </button>
                                        )}
                                    </div>
                                    : <div className="space-y-2">
                                        {filteredLogs.map(log => <LogCard key={log.id} log={log} onReturn={handleReturn} onCheckout={handleCheckout} onEdit={setEditLog} />)}
                                    </div>
                            }
                        </div>
                    </div>
                )}

                {/* ── TAB: REKAP ── */}
                {activeTab === 'rekap' && (
                    <div className="space-y-4">
                        {/* Baris 1: Mode + Navigasi + Export */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                            {/* Mode: Harian / Mingguan / Bulanan */}
                            <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-fit">
                                {[{ k: 'harian', l: 'Harian' }, { k: 'mingguan', l: 'Mingguan' }, { k: 'bulanan', l: 'Bulanan' }].map(m => (
                                    <button key={m.k} onClick={() => setRekapMode(m.k)}
                                        className={`h-7 px-3 rounded-lg text-[11px] font-black transition-all ${rekapMode === m.k ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        {m.l}
                                    </button>
                                ))}
                            </div>
                            {/* Navigasi tanggal */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => navRekap(-1)} className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-[11px]" />
                                </button>
                                <span className="text-[13px] font-black text-[var(--color-text)] min-w-[180px] text-center">{rekapLabel}</span>
                                <button onClick={() => navRekap(1)} className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[11px]" />
                                </button>
                            </div>
                            {/* Export */}
                            <div className="sm:ml-auto flex items-center gap-2">
                                <button onClick={() => handleExportCSV('rekap')}
                                    className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/5 flex items-center gap-2 transition-all">
                                    <FontAwesomeIcon icon={faFileCsv} className="text-[10px]" />CSV
                                </button>
                                <button onClick={() => handleExportPDF('rekap')}
                                    className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 flex items-center gap-2 transition-all">
                                    <FontAwesomeIcon icon={faFilePdf} className="text-[10px]" />PDF
                                </button>
                                <button onClick={handlePrint}
                                    className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-2 transition-all">
                                    <FontAwesomeIcon icon={faPrint} />Cetak
                                </button>
                            </div>
                        </div>

                        {/* Summary cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { l: 'Total', v: rekapSummary.total, c: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                                { l: 'Guru', v: rekapSummary.guru, c: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                                { l: 'Karyawan', v: rekapSummary.karyawan, c: 'text-blue-500', bg: 'bg-blue-500/10' },
                                { l: 'Tamu', v: rekapSummary.tamu, c: 'text-amber-500', bg: 'bg-amber-500/10' },
                            ].map((s, i) => (
                                <div key={i} className={`glass rounded-2xl p-4 ${s.bg} cursor-pointer transition-all hover:scale-[1.02]`}
                                    onClick={() => setFilterRekap(filterRekap === (i === 0 ? 'all' : VISITOR_TYPES[i - 1]?.key) ? 'all' : (i === 0 ? 'all' : VISITOR_TYPES[i - 1]?.key))}>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70 mb-1">{s.l}</p>
                                    <p className={`text-2xl font-black font-heading tabular-nums ${s.c}`}>{loadingRekap ? '…' : s.v}</p>
                                </div>
                            ))}
                        </div>

                        {/* Baris 2: View toggle + Search + Filter type */}
                        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2 flex-wrap">
                            {/* View toggle */}
                            <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                {[{ k: 'log', l: 'Detail Log' }, { k: 'ringkasan', l: 'Ringkasan' }].map(v => (
                                    <button key={v.k} onClick={() => setRekapView(v.k)}
                                        className={`h-7 px-3 rounded-md text-[10px] font-black transition-all ${rekapView === v.k ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        {v.l}
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex-1 min-w-[180px]">
                                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                <input value={searchRekap} onChange={e => setSearchRekap(e.target.value)}
                                    placeholder="Cari nama atau keperluan..."
                                    className="w-full h-8 pl-8 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                                {searchRekap && (
                                    <button onClick={() => setSearchRekap('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1">
                                {[{ k: 'all', l: 'Semua' }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: t.label }))].map(f => (
                                    <button key={f.k} onClick={() => setFilterRekap(f.k)}
                                        className={`h-8 px-3 rounded-xl text-[10px] font-black transition-all ${filterRekap === f.k
                                            ? 'bg-[var(--color-primary)] text-white'
                                            : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        {f.l}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] ml-auto shrink-0">
                                {rekapView === 'log' ? `${filteredRekapData.length} entri` : `${rekapRingkasan.length} orang`}
                            </span>
                        </div>

                        {/* ── VIEW: DETAIL LOG ── */}
                        {rekapView === 'log' && (
                            <div className="glass rounded-[1.5rem] overflow-hidden">
                                {loadingRekap
                                    ? <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                                    : filteredRekapData.length === 0
                                        ? <div className="flex flex-col items-center gap-2 py-16 opacity-40">
                                            <FontAwesomeIcon icon={faClipboardList} className="text-4xl" />
                                            <p className="text-[12px] font-black">{rekapData.length === 0 ? 'Tidak ada data periode ini' : 'Tidak ada data yang cocok'}</p>
                                            {(filterRekap !== 'all' || searchRekap) && (
                                                <button onClick={() => { setFilterRekap('all'); setSearchRekap('') }}
                                                    className="mt-1 h-7 px-3 rounded-lg border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                                    Reset Filter
                                                </button>
                                            )}
                                        </div>
                                        : <div className="overflow-x-auto">
                                            <table className="w-full min-w-[750px]">
                                                <thead>
                                                    <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                                        {['#', 'Nama', 'Jenis', 'NIP / Instansi', 'Keperluan', 'Jam Keluar', 'Jam Kembali / Masuk', 'Jam Keluar (Tamu)', 'Durasi', 'Kendaraan'].map(h => (
                                                            <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)] whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRekapData.map((log, i) => {
                                                        const meta = TYPE_META[log.visitor_type] || TYPE_META.tamu
                                                        const isG = log.visitor_type === 'guru' || log.visitor_type === 'karyawan'
                                                        const dur = durasi(log.check_in, log.check_out)
                                                        return (
                                                            <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors cursor-pointer"
                                                                onClick={() => setEditLog(log)}>
                                                                <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)]">{i + 1}</td>
                                                                <td className="px-3 py-2.5 text-[12px] font-black text-[var(--color-text)]">{log.visitor_name}</td>
                                                                <td className="px-3 py-2.5"><span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span></td>
                                                                <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)]">{log.visitor_nip || '-'}</td>
                                                                <td className="px-3 py-2.5 text-[11px] text-[var(--color-text)]">{log.purpose}</td>
                                                                <td className="px-3 py-2.5 text-[11px] font-bold text-red-500">{isG ? fmtTime(log.check_in) : '-'}</td>
                                                                <td className="px-3 py-2.5 text-[11px] font-bold text-emerald-600">{isG ? fmtTime(log.check_out) : fmtTime(log.check_in)}</td>
                                                                <td className="px-3 py-2.5 text-[11px] font-bold text-red-500">{!isG ? fmtTime(log.check_out) : '-'}</td>
                                                                <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)] font-bold">{dur || '-'}</td>
                                                                <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)]">{log.vehicle_plate || '-'}</td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                }
                            </div>
                        )}

                        {/* ── VIEW: RINGKASAN PER ORANG ── */}
                        {rekapView === 'ringkasan' && (
                            <div className="glass rounded-[1.5rem] overflow-hidden">
                                {loadingRekap
                                    ? <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                                    : rekapRingkasan.length === 0
                                        ? <div className="flex flex-col items-center gap-2 py-16 opacity-40">
                                            <FontAwesomeIcon icon={faClipboardList} className="text-4xl" />
                                            <p className="text-[12px] font-black">Tidak ada data periode ini</p>
                                        </div>
                                        : <div className="overflow-x-auto">
                                            <table className="w-full min-w-[600px]">
                                                <thead>
                                                    <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                                        {['#', 'Nama', 'Jenis', 'Jml Keluar', 'Total Durasi Keluar', 'Rata-rata', 'Belum Kembali', 'Keperluan'].map(h => (
                                                            <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)] whitespace-nowrap">{h}</th>
                                                        ))}
                                                        <th className="px-3 py-2.5 border-b border-[var(--color-border)]">
                                                            <span className="text-[8px] text-[var(--color-text-muted)]/50 font-bold italic normal-case tracking-normal">klik baris → detail log</span>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rekapRingkasan.map((r, i) => {
                                                        const meta = TYPE_META[r.type] || TYPE_META.tamu
                                                        const isGuru = r.type === 'guru' || r.type === 'karyawan'
                                                        const totalH = Math.floor(r.totalMs / 3600000)
                                                        const totalM = Math.floor((r.totalMs % 3600000) / 60000)
                                                        const totalStr = r.totalMs > 0 ? (totalH > 0 ? `${totalH}j ${totalM}m` : `${totalM}m`) : '-'
                                                        // FIX: use completedCount variable — avoids (r.count - r.belumKembali || 1) precedence bug
                                                        const completedCount = r.count - r.belumKembali
                                                        const avgMs = completedCount > 0 ? r.totalMs / completedCount : 0
                                                        const avgH = Math.floor(avgMs / 3600000)
                                                        const avgM = Math.floor((avgMs % 3600000) / 60000)
                                                        const avgStr = avgMs > 0 ? (avgH > 0 ? `${avgH}j ${avgM}m` : `${avgM}m`) : '-'
                                                        // Bar visual proporsi total durasi
                                                        const maxMs = rekapRingkasan[0]?.totalMs || 1
                                                        const barPct = maxMs > 0 ? Math.round((r.totalMs / maxMs) * 100) : 0
                                                        return (
                                                            <tr key={r.id}
                                                                onClick={() => { setRekapView('log'); setSearchRekap(r.name) }}
                                                                className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/60 transition-colors cursor-pointer group"
                                                                title={`Klik untuk lihat detail log ${r.name}`}>
                                                                <td className="px-3 py-3 text-[11px] text-[var(--color-text-muted)]">{i + 1}</td>
                                                                <td className="px-3 py-3">
                                                                    <p className="text-[12px] font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{r.name}</p>
                                                                    {r.nip !== '-' && <p className="text-[9px] text-[var(--color-text-muted)]">{r.nip}</p>}
                                                                </td>
                                                                <td className="px-3 py-3">
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span>
                                                                </td>
                                                                <td className="px-3 py-3 text-[13px] font-black text-[var(--color-text)] tabular-nums">{r.count}×</td>
                                                                <td className="px-3 py-3">
                                                                    {isGuru ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[12px] font-black tabular-nums ${r.totalMs > 0 ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>{totalStr}</span>
                                                                            {barPct > 0 && (
                                                                                <div className="flex-1 max-w-[60px] h-1.5 rounded-full bg-[var(--color-surface-alt)]">
                                                                                    <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${barPct}%` }} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : <span className="text-[11px] text-[var(--color-text-muted)]">-</span>}
                                                                </td>
                                                                <td className="px-3 py-3 text-[11px] font-bold text-[var(--color-text-muted)] tabular-nums">{isGuru ? avgStr : '-'}</td>
                                                                <td className="px-3 py-3">
                                                                    {r.belumKembali > 0
                                                                        ? <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600">{r.belumKembali}×</span>
                                                                        : <span className="text-[10px] text-[var(--color-text-muted)] opacity-40">-</span>}
                                                                </td>
                                                                <td className="px-3 py-3 text-[10px] text-[var(--color-text-muted)] max-w-[180px]">
                                                                    <p className="truncate">{r.purposes.slice(0, 3).join(', ')}{r.purposes.length > 3 ? ` +${r.purposes.length - 3}` : ''}</p>
                                                                </td>
                                                                <td className="px-3 py-3">
                                                                    <span className="text-[9px] text-[var(--color-primary)]/50 font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Detail →</span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                }
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Overtime alert banner */}
            {dailySummary.overTimeList.length > 0 && !dismissedOvertime && (
                <div className="fixed top-20 right-4 z-40 w-72 bg-amber-500/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 border border-amber-600/30">
                    <div className="flex items-center gap-2 mb-3">
                        <FontAwesomeIcon icon={faBell} className="text-white animate-bounce" />
                        <p className="text-[12px] font-black text-white">Guru Lama Keluar</p>
                        <span className="ml-auto text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full">{dailySummary.overTimeList.length}</span>
                        <button
                            onClick={() => setDismissedOvertime(true)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all shrink-0"
                            title="Tutup notifikasi">
                            <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {dailySummary.overTimeList.map(l => {
                            const mnt = Math.round((Date.now() - new Date(l.check_in).getTime()) / 60000)
                            const h = Math.floor(mnt / 60), m = mnt % 60
                            return (
                                <div key={l.id} className="flex items-center justify-between gap-2 bg-white/15 rounded-xl px-3 py-2">
                                    <p className="text-[11px] font-black text-white truncate">{l.visitor_name}</p>
                                    <span className="text-[10px] font-black text-white/80 shrink-0 tabular-nums">{h > 0 ? `${h}j ${m}m` : `${m}m`}</span>
                                </div>
                            )
                        })}
                    </div>
                    <p className="text-[9px] text-white/60 font-bold text-center mt-3">Klik × untuk sembunyikan sementara</p>
                </div>
            )}

            {/* Modals */}
            {confirmModal && (
                <ConfirmTimeModal
                    log={confirmModal.log}
                    action={confirmModal.action}
                    onConfirm={handleConfirmTime}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
            {editLog && (
                <EditLogModal
                    log={editLog}
                    onSave={handleSaveEdit}
                    onDelete={handleDeleteLog}
                    onCancel={() => setEditLog(null)}
                    saving={editSaving}
                />
            )}
        </DashboardLayout>
    )
}