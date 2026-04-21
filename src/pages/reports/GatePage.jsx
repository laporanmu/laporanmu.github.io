import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSignInAlt, faSignOutAlt, faUserFriends, faClipboardList,
  faCalendarDay, faCalendarWeek, faPrint, faSearch, faPlus, faPaperPlane,
  faChevronLeft, faChevronRight, faSpinner, faClock,
  faBuilding, faChalkboardTeacher, faBriefcase,
  faLock, faRotateLeft, faPersonWalkingArrowRight,
  faEdit, faTrash, faCheck, faCheckDouble, faMousePointer,
  faArrowsRotate, faBell, faXmark, faTag, faKeyboard,
  faDownload, faFilter, faIdCard, faMotorcycle,
  faFileCsv, faFilePdf, faCircleCheck, faCircleDot, faUserGraduate, faUndo, faGear
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StatsCarousel from '../../components/StatsCarousel'
import Breadcrumb from '../../components/ui/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import { StatCard, EmptyState } from '../../components/ui/DataDisplay'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'

// ─── Constants ────────────────────────────────────────────────────────────────

const VISITOR_TYPES = [
  { key: 'guru', label: 'Guru', icon: faChalkboardTeacher, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  { key: 'karyawan', label: 'Karyawan', icon: faBriefcase, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { key: 'santri', label: 'Santri', icon: faUserGraduate, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { key: 'tamu', label: 'Tamu', icon: faUserFriends, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
]
const TYPE_META = Object.fromEntries(VISITOR_TYPES.map(t => [t.key, t]))
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const PRESETS_GURU = ['Makan siang', 'Urusan bank', 'Ke apotek', 'Belanja', 'Keperluan keluarga', 'Urusan pribadi', 'Ke dokter', 'Pengambilan barang']
const PRESETS_KARYAWAN = ['Dinas luar', 'Urusan bank', 'Rapat eksternal', 'Ke apotek', 'Keperluan kantor', 'Keperluan keluarga', 'Belanja kebutuhan', 'Ke dokter']
const PRESETS_SANTRI = ['Sakit / Rawat Inap', 'Pulang kampung', 'Tugas pondok', 'Urusan keluarga', 'Membeli keperluan', 'Lain-lain']
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
  if (!dateStr || !timeStr) return null
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

/** Simple Webhook Notification Helper (Discord/Telegram) */
const sendLogNotification = async (log, type = 'OUT') => {
  // TIPS: In production, move DISCORD_WEBHOOK_URL to .env
  // Users can set this in their Supabase/App settings (GATE_WEBHOOK_URL)
  // format: https://discord.com/api/webhooks/... or https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>
  const WEBHOOK_URL = localStorage.getItem('GATE_WEBHOOK_URL')
  if (!WEBHOOK_URL) return { success: false, error: 'URL tidak ditemukan' }

  try {
    const isInternal = log.visitor_type !== 'tamu'

    // Format Narasi Minimalis (Tanpa Emoji & Italic)
    const timeStr = `<b>${fmtTime(new Date()).replace('.', ':')}</b>`
    const nameStr = `<b>${log.visitor_name}</b>`
    const purposeStr = `<b>${log.purpose || '-'}</b>`
    const plateStr = log.vehicle_plate ? ` (${log.vehicle_plate})` : ''

    let message = ''
    if (type === 'OUT') {
      message = isInternal
        ? `${nameStr} izin keluar sekolah pada pukul ${timeStr} untuk ${purposeStr}${plateStr}.`
        : `Tamu ${nameStr} telah masuk pada pukul ${timeStr} untuk ${purposeStr}${plateStr}.`
      if (log.estimated_return) {
        const etaTime = `<b>${fmtTime(log.estimated_return).replace('.', ':')}</b>`
        message += `\nEstimasi kembali pukul ${etaTime}.`
      }
    } else {
      message = isInternal
        ? `${nameStr} sudah kembali ke sekolah pada pukul ${timeStr}${plateStr}.`
        : `Tamu ${nameStr} telah keluar/meninggalkan sekolah pada pukul ${timeStr}${plateStr}.`
    }

    const contentHTML = message

    // Simple check for Discord vs Telegram
    if (WEBHOOK_URL.includes('discord.com')) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentHTML.replace(/<[^>]*>?/gm, '') })
      })
    } else if (WEBHOOK_URL.includes('api.telegram.org')) {
      // Revert to GET for maximum compatibility, but with HTML
      const url = new URL(WEBHOOK_URL.replace('/getUpdates', '/sendMessage'))
      url.searchParams.set('text', contentHTML)
      url.searchParams.set('parse_mode', 'HTML')

      // Try adding simple button if possible via GET (limited but works)
      // NOTE: Telegram will reject 'localhost' URLs in inline buttons.
      if (!window.location.hostname.includes('localhost')) {
        try {
          url.searchParams.set('reply_markup', JSON.stringify({
            inline_keyboard: [[{ text: '🌐 Dashboard', url: window.location.origin }]]
          }))
        } catch (e) { }
      }

      const resp = await fetch(url.toString())
      const result = await resp.json()

      if (resp.ok) return { success: true }
      return { success: false, error: `${resp.status} - ${result.description || 'Unknown error'}` }
    }
    return { success: false, error: 'URL tidak dikenali' }
  } catch (err) {
    console.error('Failed to send notification:', err)
    return { success: false, error: err.message }
  }
}

/** Sends a formatted summary of today's logs to Telegram/Discord */
const sendDailySummary = async (logs) => {
  const WEBHOOK_URL = localStorage.getItem('GATE_WEBHOOK_URL')
  if (!WEBHOOK_URL) return { success: false, error: 'URL tidak ditemukan' }
  if (!logs || logs.length === 0) return { success: false, error: 'Tidak ada data hari ini' }

  try {
    const dateStr = fmtDate(new Date())
    const stats = {
      total: logs.length,
      internal: logs.filter(l => l.visitor_type !== 'tamu').length,
      tamu: logs.filter(l => l.visitor_type === 'tamu').length,
      selesai: logs.filter(l => l.check_out).length,
      aktif: logs.filter(l => !l.check_out).length
    }

    const sep = '────────────────'
    const header = `<b>📊 RINGKASAN HARIAN</b>\n<b>${dateStr.toUpperCase()}</b>`

    let detailText = logs.slice(0, 15).map(l => {
      const time = fmtTime(l.check_in).replace('.', ':')
      const type = l.visitor_type === 'tamu' ? 'Tamu' : 'Intrn'
      const status = l.check_out ? '✓' : '...'
      return `• ${time} | ${type} | ${l.visitor_name.split(' ')[0]} ${status}`
    }).join('\n')

    if (logs.length > 15) detailText += `\n...dan ${logs.length - 15} lainnya.`

    const summaryHTML = `${header}\n${sep}\n` +
      `Total Aktivitas: <b>${stats.total}</b>\n` +
      `- Internal: ${stats.internal}\n` +
      `- Tamu: ${stats.tamu}\n` +
      `${sep}\n` +
      `Status: ${stats.selesai} Selesai, ${stats.aktif} Aktif\n` +
      `${sep}\n` +
      `<b>Log Terakhir:</b>\n` +
      `<code>${detailText}</code>\n` +
      `${sep}`

    if (WEBHOOK_URL.includes('discord.com')) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: summaryHTML.replace(/<[^>]*>?/gm, '') })
      })
    } else if (WEBHOOK_URL.includes('api.telegram.org')) {
      const url = new URL(WEBHOOK_URL.replace('/getUpdates', '/sendMessage'))
      url.searchParams.set('text', summaryHTML)
      url.searchParams.set('parse_mode', 'HTML')
      await fetch(url.toString())
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
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
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2 text-[var(--color-text)]">
        <FontAwesomeIcon icon={faClock} className="text-[10px] text-[var(--color-primary)] animate-pulse" />
        <span className="text-[15px] font-black tabular-nums tracking-tight">
          {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50 mt-0.5">
        {fmtDate(time)}
      </div>
    </div>
  )
}



// ─── DateTimeInput — date + time picker berdampingan ──────────────────────────

// ─── Skeletons ──────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-alt)] flex-shrink-0" />
        <div className="flex-1 space-y-2 mt-1">
          <div className="h-3 bg-[var(--color-border)] rounded-md w-1/3" />
          <div className="h-2 bg-[var(--color-border)] rounded-md w-1/2" />
          <div className="h-2 bg-[var(--color-border)] rounded-md w-1/4" />
        </div>
      </div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="p-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse space-y-2">
      <div className="w-8 h-8 rounded-xl bg-[var(--color-surface-alt)]" />
      <div className="h-2 bg-[var(--color-border)] rounded-md w-1/2" />
      <div className="h-3 bg-[var(--color-border)] rounded-md w-3/4" />
    </div>
  )
}

function TableSkeleton({ cols = 5, rows = 6 }) {
  return (
    <div className="w-full overflow-hidden animate-pulse">
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 px-4 py-3.5">
            <div className="h-2 bg-[var(--color-border)] rounded-full w-12" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="flex-1 px-4 py-5">
                <div className={`h-2 bg-[var(--color-border)]/60 rounded-full ${j === 1 ? 'w-24' : j === 0 ? 'w-6' : 'w-16'}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function DateTimeInput({ dateValue, timeValue, onDateChange, onTimeChange, label }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
        {label} <span className="normal-case opacity-70">(Otomatis/Bisa diubah)</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <FontAwesomeIcon icon={faCalendarDay} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="date"
            value={dateValue}
            onChange={e => onDateChange(e.target.value)}
            className="w-full h-9 pl-8 pr-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
          />
        </div>
        <div className="relative">
          <FontAwesomeIcon icon={faClock} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="time"
            value={timeValue}
            onChange={e => onTimeChange(e.target.value)}
            className="w-full h-9 pl-8 pr-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
          />
        </div>
      </div>
    </div>
  )
}

function QuickGuide({ mode = 'internal' }) {
  const isTamu = mode === 'tamu'
  const items = isTamu
    ? [
      { icon: faPlus, text: 'Isi nama & keperluan tamu, lalu Catat Masuk', color: 'bg-emerald-400' },
      { icon: faSignOutAlt, text: 'Saat tamu keluar, klik tombol Keluar di panel kanan', color: 'bg-red-400' },
      { icon: faMotorcycle, text: 'No. kendaraan opsional, untuk keamanan pesantren', color: 'bg-amber-400' }
    ]
    : [
      { icon: faSearch, text: 'Pilih orang dari daftar (Guru/Karyawan/Santri)', color: 'bg-[var(--color-primary)]' },
      { icon: faTag, text: 'Pilih atau ketik keperluan keluar dari preset', color: 'bg-indigo-400' },
      { icon: faClock, text: 'Sesuaikan jam jika perlu, lalu catat keluar', color: 'bg-emerald-400' },
      { icon: faRotateLeft, text: 'Klik Kembali di panel kanan saat orang sudah kembali', color: 'bg-amber-400' }
    ]

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={faKeyboard} className="text-[9px]" /> Cara Penggunaan & Panduan
      </p>
      <div className="space-y-3">
        {items.map((t, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <div className={`w-6 h-6 rounded-lg ${t.color}/10 text-[10px] ${t.color.replace('bg-', 'text-')} flex items-center justify-center shrink-0 font-black group-hover:scale-110 transition-transform`}>
              {i + 1}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed group-hover:text-[var(--color-text)] transition-colors">
              {t.text}
            </p>
          </div>
        ))}
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
        data-search-trigger
        className={`w-full h-9 px-3 rounded-xl border bg-[var(--color-surface)] flex items-center gap-2 cursor-text transition-all ${open ? 'border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20' : 'border-[var(--color-border)]'}`}>
        <FontAwesomeIcon icon={faSearch} className="text-[10px] text-[var(--color-text-muted)] shrink-0" />
        {open ? (
          <input autoFocus value={query}
            onChange={e => { setQuery(e.target.value); setFocusedIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder={`Cari ${label.toLowerCase()} by nama...`}
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

// ─── FormInternal ──────────────────────────────────────────────────────────────

function FormInternal({ internalList, onSubmit, loading }) {
  const [visitorType, setVisitorType] = useState('guru')
  const [personId, setPersonId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [dateOut, setDateOut] = useState(() => nowDateStr())
  const [timeOut, setTimeOut] = useState(() => nowTimeStr())
  const [timeEst, setTimeEst] = useState('') // ETA Time

  const filteredList = useMemo(
    () => internalList.filter(t => {
      if (visitorType === 'santri') return t.type === 'santri'
      return t.type === visitorType || (!t.type && visitorType !== 'santri')
    }),
    [internalList, visitorType]
  )

  const activePresets = visitorType === 'karyawan' ? PRESETS_KARYAWAN : visitorType === 'santri' ? PRESETS_SANTRI : PRESETS_GURU

  const canSubmit = personId && purpose.trim()

  const submit = () => {
    if (!canSubmit) return
    const person = internalList.find(t => t.id === personId)
    onSubmit({
      flow: 'internal',
      visitorType,
      personId,
      name: person?.name || '',
      nbm: person?.nbm || '',
      purpose: purpose.trim(),
      dateOut,
      timeOut,
      estimatedReturn: timeEst ? dateTimeToISO(dateOut, timeEst) : null,
    })
    setPersonId('')
    setPurpose('')
    setDateOut(nowDateStr())
    setTimeOut(nowTimeStr())
    setTimeEst('')
  }

  const handleKeyDown = e => { if (e.key === 'Enter' && canSubmit && !loading) submit() }

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      {/* Toggle Tipe Internal */}
      <div className="flex gap-2">
        {VISITOR_TYPES.filter(t => t.key !== 'tamu').map(t => (
          <button key={t.key} onClick={() => { setVisitorType(t.key); setPersonId('') }}
            className={`flex-1 h-8 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 border transition-all ${visitorType === t.key
              ? `${t.bg} ${t.color} ${t.border}`
              : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
            <FontAwesomeIcon icon={t.icon} className="text-[10px]" />{t.label}
          </button>
        ))}
      </div>

      {/* Pilih person */}
      <TeacherSearch teacherList={filteredList} value={personId} onChange={setPersonId} label={TYPE_META[visitorType].label} />

      {/* Keperluan + presets */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
          Keperluan Keluar
        </label>
        <div className="relative">
          <FontAwesomeIcon icon={faTag} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
          <input value={purpose} onChange={e => setPurpose(e.target.value)}
            placeholder="Contoh: Keluar makan, urusan bank..."
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
        <PresetPills presets={activePresets} value={purpose} onSelect={setPurpose} />
      </div>

      <DateTimeInput
        dateValue={dateOut} timeValue={timeOut}
        onDateChange={setDateOut} onTimeChange={setTimeOut}
        label="Waktu Keluar"
      />

      {/* Estimasi Kembali (ETA) */}
      <div className={`p-3 rounded-xl border transition-all ${timeEst ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-[var(--color-surface-alt)]/30 border-dashed border-[var(--color-border)]'}`}>
        <div className="flex items-center gap-2 mb-2.5">
          <FontAwesomeIcon icon={faClock} className={`text-[9px] ${timeEst ? 'text-indigo-500' : 'text-[var(--color-text-muted)]'}`} />
          <span className="text-[9px] font-black uppercase tracking-wider">Estimasi Kembali</span>
        </div>
        <div className="relative">
          <input type="time" value={timeEst} onChange={e => setTimeEst(e.target.value)}
            className="w-full h-9 px-3 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black text-[var(--color-text)] focus:outline-none focus:border-indigo-500 transition-all" />
          {timeEst && (
            <button onClick={() => setTimeEst('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-red-500 transition-all">
              <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
            </button>
          )}
        </div>
      </div>

      {/* Submit */}
      <button onClick={submit} disabled={loading || !canSubmit}
        className="w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] text-white shadow-lg shadow-[var(--color-primary)]/20 px-4">
        {loading
          ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          : <FontAwesomeIcon icon={faSignOutAlt} />}
        <span className="whitespace-nowrap">Catat Keluar</span>
      </button>

      {/* Hint shortcut */}
      <div className="flex items-center gap-1.5 justify-end opacity-30 mt-1.5 cursor-default hover:opacity-100 transition-opacity">
        <FontAwesomeIcon icon={faKeyboard} className="text-[9px]" />
        <span className="text-[9px] font-bold">Tekan Enter untuk Catat</span>
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
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      {/* Nama & Instansi */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">Nama <span className="text-red-400">*</span></label>
          <div className="relative">
            <FontAwesomeIcon icon={faIdCard} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">Instansi</label>
          <div className="relative">
            <FontAwesomeIcon icon={faBuilding} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
            <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Asal/Desa..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
      </div>

      {/* Keperluan + presets tamu */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">
          Keperluan <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <FontAwesomeIcon icon={faTag} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
          <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Keperluan kunjungan..."
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
        <PresetPills presets={PRESETS_TAMU} value={purpose} onSelect={setPurpose} />
      </div>

      {/* Menemui & Kendaraan */}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">Menemui / Tujuan</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ustadz X, TU..."
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">Kendaraan</label>
          <div className="relative">
            <FontAwesomeIcon icon={faMotorcycle} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
            <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Nopol opsional..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
      </div>

      {/* Tanggal & Jam Masuk */}
      <DateTimeInput
        dateValue={dateIn} timeValue={timeIn}
        onDateChange={setDateIn} onTimeChange={setTimeIn}
        label="Waktu Masuk"
      />

      {/* Photo Capture Placeholder UI - compact mode */}
      <div className="p-2.5 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group cursor-pointer hover:border-emerald-500/30 transition-all">
            <FontAwesomeIcon icon={faPlus} className="text-[9px] opacity-40 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[var(--color-text)] leading-tight">Foto Identitas (Opsional)</p>
            <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">Fitur di versi Enterprise</p>
          </div>
        </div>
        <FontAwesomeIcon icon={faIdCard} className="text-[14px] text-emerald-500/20" />
      </div>

      {/* Submit */}
      <button onClick={submit} disabled={loading || !canSubmit}
        className="w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] text-white shadow-lg shadow-[var(--color-primary)]/20 px-4">
        {loading
          ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          : <FontAwesomeIcon icon={faSignInAlt} />}
        <span className="whitespace-nowrap">Catat Masuk Tamu</span>
      </button>

      {/* Hint shortcut */}
      <div className="flex items-center gap-1.5 justify-end opacity-30 mt-1.5 cursor-default hover:opacity-100 transition-opacity">
        <FontAwesomeIcon icon={faKeyboard} className="text-[9px]" />
        <span className="text-[9px] font-bold">Tekan Enter untuk Catat</span>
      </div>
    </div>
  )
}

// ─── ConfirmTimeModal ─────────────────────────────────────────────────────────

function ConfirmTimeModal({ log, onConfirm, onCancel }) {
  const isInternal = log.visitor_type !== 'tamu'
  const [time, setTime] = useState(nowTimeStr())
  const label = isInternal ? 'Kembali' : 'Keluar'
  const colorCls = isInternal
    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
    : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`Konfirmasi ${label}`}
      description={log.purpose}
      icon={faClock}
      iconBg={isInternal ? 'bg-emerald-500/10' : 'bg-red-500/10'}
      iconColor={isInternal ? 'text-emerald-500' : 'text-red-500'}
      size="sm"
      footer={
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[12px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
          <button onClick={() => onConfirm(time)} className={`flex-1 h-10 rounded-xl text-white text-[12px] font-black transition-all shadow-lg ${colorCls}`}>Catat {label}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-xl">
          <p className="text-[12px] font-black text-[var(--color-primary)] mb-1">{log.visitor_name}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-snug">{log.purpose}</p>
        </div>
        <TimeInput value={time} onChange={setTime} label={`Jam ${label}`} />
      </div>
    </Modal>
  )
}

// ─── EditLogModal ─────────────────────────────────────────────────────────────

function EditLogModal({ log, onSave, onDelete, onCancel, saving }) {
  const isInternal = log.visitor_type !== 'tamu'
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
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Edit Log"
      description={log.visitor_name}
      icon={faEdit}
      iconBg={meta.bg}
      iconColor={meta.color}
      size="md"
      footer={
        <div className="flex gap-2 items-center">
          {onDelete && (
            confirmDel ? (
              <>
                <button onClick={() => setConfirmDel(false)} className="h-10 px-4 rounded-xl text-[11px] font-black text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all flex-1 sm:flex-none">Batal</button>
                <button onClick={onDelete} disabled={saving} className="flex-[1.5] h-10 rounded-xl text-white text-[11px] font-black bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2">
                  {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faTrash} />}
                  Yakin Hapus?
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDel(true)} disabled={saving} className="h-10 px-4 rounded-xl border border-red-500/30 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )
          )}
          {!confirmDel && (
            <>
              <button onClick={onCancel} disabled={saving} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Tutup</button>
              <button onClick={handleSave} disabled={saving} className="flex-[2] h-10 rounded-xl text-white text-[11px] font-black bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2">
                {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
                Simpan Perubahan
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-3 pt-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Keperluan</label>
          <input value={purpose} onChange={e => setPurpose(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          <PresetPills presets={activePresets} value={purpose} onSelect={setPurpose} />
        </div>
        {!isInternal && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Menemui / Tujuan</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Opsional..."
              className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <TimeInput value={timeIn} onChange={setTimeIn} label={isInternal ? 'Jam Keluar' : 'Jam Masuk'} />
          <TimeInput value={timeOut} onChange={setTimeOut} label={isInternal ? 'Jam Kembali' : 'Jam Keluar'} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">No. Kendaraan</label>
          <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Opsional..."
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
      </div>
    </Modal>
  )
}

// ─── LogCard ──────────────────────────────────────────────────────────────────

function LogCard({ log, onReturn, onCheckout, onEdit, isSelected, onToggleSelect, selectionMode }) {
  const meta = TYPE_META[log.visitor_type] || TYPE_META.tamu
  const isInternal = log.visitor_type !== 'tamu'
  const isActive = !log.check_out
  const dur = durasi(log.check_in, log.check_out)
  const overTime = isInternal && isActive && (Date.now() - new Date(log.check_in).getTime()) > 2 * 60 * 60 * 1000

  // ETA Alert: Jika lewat dari jam estimasi
  const etaPassed = isActive && log.estimated_return && new Date(log.estimated_return) < new Date()

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all group relative ${isSelected ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)]' : ''} ${etaPassed
      ? 'border-red-500/70 bg-red-500/[0.08] shadow-lg shadow-red-500/10 animate-[pulse_2s_infinite]'
      : overTime
        ? 'border-amber-500/40 bg-amber-500/[0.05]'
        : isActive
          ? (isInternal ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-emerald-500/25 bg-emerald-500/[0.04]')
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>

      {/* Multi-select check */}
      {selectionMode && isActive && (
        <div className="shrink-0 flex items-center h-9 pr-1 animate-in fade-in slide-in-from-left-2 duration-300">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(log.id)}
            className="w-5 h-5 rounded-lg border-2 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30 cursor-pointer transition-all bg-[var(--color-surface)] checked:bg-[var(--color-primary)]"
          />
        </div>
      )}

      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
        <FontAwesomeIcon icon={meta.icon} className={`text-[13px] ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-black text-[var(--color-text)] truncate">{log.visitor_name}</p>
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span>
          {isActive && isInternal && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 animate-pulse">● Sedang Keluar</span>}
          {isActive && !isInternal && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 animate-pulse">● Di Dalam</span>}
          {overTime && !etaPassed && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 flex items-center gap-1"><FontAwesomeIcon icon={faBell} className="text-[7px]" />Lama keluar</span>}
          {etaPassed && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-600 text-white flex items-center gap-1 animate-bounce shadow-lg"><FontAwesomeIcon icon={faClock} className="text-[7px]" />Lewat Estimasi</span>}
        </div>
        <p className="text-[11px] font-bold text-[var(--color-text-muted)] mt-0.5 opacity-80 leading-tight">
          {log.purpose}
        </p>

        {/* Check-in / ETA info */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider opacity-60">
            <FontAwesomeIcon icon={isInternal ? faSignOutAlt : faSignInAlt} className="text-[8px]" />
            {fmtTime(log.check_in)}
          </div>
          {log.estimated_return && isActive && (
            <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${etaPassed ? 'text-red-600' : 'opacity-60'}`}>
              <FontAwesomeIcon icon={faClock} className="text-[8px]" />
              Estimasi {fmtTime(log.estimated_return)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
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
          <button onClick={() => isInternal ? onReturn(log) : onCheckout(log)}
            className={`h-8 px-3 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-lg ${isInternal
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
              : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'}`}>
            <FontAwesomeIcon icon={isInternal ? faSignInAlt : faSignOutAlt} className="text-[9px]" />
            <span className="hidden sm:inline">{isInternal ? 'Kembali' : 'Keluar'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ConfigModal ──────────────────────────────────────────────────────────────

function ConfigModal({ onSave, onCancel, testNotification }) {
  const [url, setUrl] = useState(localStorage.getItem('GATE_WEBHOOK_URL') || '')
  const [testing, setTesting] = useState(false)

  const handleSave = () => {
    localStorage.setItem('GATE_WEBHOOK_URL', url.trim())
    onSave()
  }

  const handleTest = async () => {
    if (!url) return
    setTesting(true)
    localStorage.setItem('GATE_WEBHOOK_URL', url.trim()) // Save temporarily for test
    const success = await testNotification()
    setTesting(false)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Konfigurasi Notifikasi"
      description="Telegram / Discord Webhook URL"
      icon={faGear}
      iconBg="bg-indigo-500/10"
      iconColor="text-indigo-500"
      size="sm"
      footer={
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
          <button onClick={handleSave} className="flex-1 h-10 rounded-xl bg-indigo-500 text-white text-[11px] font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all">Simpan</button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2 block">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>"
              className="flex-1 h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all shadow-inner"
            />
            <button onClick={handleTest} disabled={testing || !url}
              className="h-10 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-[10px] font-black text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 shadow-sm"
              title="Test Kirim Notifikasi">
              {testing ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[12px]" />
              ) : (
                <FontAwesomeIcon icon={faPaperPlane} className="text-[12px]" />
              )}
              <span className="hidden sm:inline">{testing ? 'Mengirim...' : 'Test'}</span>
            </button>
          </div>
          <p className="mt-2 text-[9px] text-[var(--color-text-muted)] italic opacity-60">Pastikan URL webhook sudah benar (Telegram atau Discord).</p>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GatePage() {
  const { addToast, addUndoToast } = useToast()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const ALLOWED_ROLES = ['admin', 'satpam', 'developer']
  const isAllowed = profile ? ALLOWED_ROLES.includes(profile.role?.toLowerCase()) : null

  const [activeTab, setActiveTab] = useState('input')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [inputMode, setInputMode] = useState('internal')
  const [teacherList, setTeacherList] = useState([])
  const [studentList, setStudentList] = useState([])
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  // Responsive state for Floating Bar
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') document.activeElement.blur()
        return
      }

      const key = e.key.toLowerCase()
      if (key === 'n') {
        e.preventDefault()
        setActiveTab('input')
        // Wait for tab switch
        setTimeout(() => {
          const searchBox = document.querySelector('[data-search-trigger]')
          if (searchBox) searchBox.click()
        }, 50)
      }
      else if (key === 'l') { e.preventDefault(); setActiveTab('log') }
      else if (key === 'r') { e.preventDefault(); setActiveTab('rekap') }
      else if (key === 'i') { e.preventDefault(); setActiveTab('input') }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: todayLogs.length,
    keluar: todayLogs.filter(l => (l.visitor_type !== 'tamu') && !l.check_out).length,
    dalamTamu: todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).length,
    tamu: todayLogs.filter(l => l.visitor_type === 'tamu').length,
  }), [todayLogs])

  const dailySummary = useMemo(() => {
    const internalLogs = todayLogs.filter(l => l.visitor_type !== 'tamu')
    const finished = internalLogs.filter(l => l.check_out)
    const avgMs = finished.length ? finished.reduce((sum, l) => sum + (new Date(l.check_out) - new Date(l.check_in)), 0) / finished.length : 0
    const avgMin = Math.round(avgMs / 60000)
    const overTimeList = todayLogs.filter(l =>
      (l.visitor_type !== 'tamu') && !l.check_out
      && (Date.now() - new Date(l.check_in).getTime()) > 2 * 60 * 60 * 1000
    )
    return { avgMin, overTimeList, totalInternal: internalLogs.length, selesai: finished.length }
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
    supabase.from('students').select('id,name,nisn').is('deleted_at', null).order('name')
      .then(({ data, error }) => {
        if (error) console.error('[GatePage] Students fetch error:', error)
        const mapped = (data || []).map(s => ({ ...s, nbm: s.nisn, type: 'santri' }))
        setStudentList(mapped)
      })
  }, [])

  const internalList = useMemo(() => [...teacherList, ...studentList], [teacherList, studentList])

  const loadTodayLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingLogs(true)
    else setIsRefreshing(true)

    const t0 = startOfDay(new Date()), t1 = addDays(t0, 1)
    const { data, error } = await supabase
      .from('gate_logs').select('*')
      .gte('check_in', iso(t0))
      .lt('check_in', iso(t1))
      .order('check_in', { ascending: false })

    if (error) console.error('[GatePage] loadTodayLogs error:', error)
    else setTodayLogs(data || [])

    setLoadingLogs(false)
    setIsRefreshing(false)
  }, [])

  useEffect(() => { loadTodayLogs() }, [loadTodayLogs])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      loadTodayLogs(true)
      setLastRefresh(Date.now())
    }, 30000)
    return () => clearInterval(interval)
  }, [loadTodayLogs])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('gate_logs_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () => {
        loadTodayLogs(true)
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

  // ── Operational Audit Logging ──────────────────────────────────────────────
  useEffect(() => {
    if (!searchLog.trim()) return
    const t = setTimeout(() => {
      logAudit({
        action: 'SEARCH', source: 'OPERATIONAL', tableName: 'gate_logs',
        newData: { query: searchLog, tab: 'log' }
      })
    }, 2000)
    return () => clearTimeout(t)
  }, [searchLog])

  useEffect(() => {
    if (!searchRekap.trim()) return
    const t = setTimeout(() => {
      logAudit({
        action: 'SEARCH', source: 'OPERATIONAL', tableName: 'gate_logs',
        newData: { query: searchRekap, tab: 'rekap' }
      })
    }, 2000)
    return () => clearTimeout(t)
  }, [searchRekap])

  useEffect(() => {
    if (filterType === 'all' && filterStatus === 'all') return
    logAudit({
      action: 'FILTER', source: 'OPERATIONAL', tableName: 'gate_logs',
      newData: { type: filterType, status: filterStatus, tab: 'log' }
    })
  }, [filterType, filterStatus])

  useEffect(() => {
    if (filterRekap === 'all') return
    logAudit({
      action: 'FILTER', source: 'OPERATIONAL', tableName: 'gate_logs',
      newData: { type: filterRekap, tab: 'rekap' }
    })
  }, [filterRekap])

  // ── Manual Refresh Logic ──────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    const promises = [loadTodayLogs(true)]
    if (activeTab === 'rekap') promises.push(loadRekap())

    await Promise.all(promises)
    setLastRefresh(Date.now())
    setIsRefreshing(false)
    addToast('Data berhasil diperbarui', 'success')

    logAudit({
      action: 'REFRESH',
      source: 'OPERATIONAL',
      tableName: 'gate_logs',
      newData: { tab: activeTab }
    })
  }, [loadTodayLogs, loadRekap, activeTab, addToast])

  // ── Submit handler ─────────────────────────────────────────────────────────
  /**
   * Pakai dateTimeToISO(dateStr, timeStr) → ISO string tanpa bug tanggal loncat.
   * recorded_by hanya dikirim jika profile.id tersedia.
   */
  const handleSubmit = useCallback(async (form) => {
    setSubmitting(true)
    try {
      let payload
      if (form.flow === 'internal') {
        payload = {
          visitor_type: form.visitorType,
          // Kita asumsikan teacher_id dipakai untuk internal (termasuk santri) atau kalau mau pakai kolom berbeda bisa di-null-kan jika struktur beda.
          // Namun di sini kita set null untuk santri biar gak tabrakan dengan relasi FK public.teachers (jika FK ketat).
          // Karena id murid berbentuk beda. Sebenarnya form.personId bisa.
          teacher_id: form.visitorType === 'santri' ? null : form.personId,
          visitor_name: form.name,
          visitor_nip: form.nbm || null,
          purpose: form.purpose,
          check_in: dateTimeToISO(form.dateOut, form.timeOut),
          check_out: null,
          estimated_return: form.estimatedReturn || null,
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
        const insertedRow = data?.[0]
        const who = form.flow === 'internal' ? form.name : `Tamu ${form.name}`
        const act = form.flow === 'internal' ? 'keluar' : 'masuk'

        // addToast(`${who} ${act} berhasil dicatat`, 'success')

        // Enhanced Undo implementation
        addUndoToast(`${who} ${act} berhasil dicatat`, async () => {
          if (insertedRow?.id) {
            const { error: delErr } = await supabase.from('gate_logs').delete().eq('id', insertedRow.id)
            if (delErr) addToast('Gagal membatalkan log', 'error')
            else {
              addToast('Pencatatan dibatalkan', 'info')
              loadTodayLogs(true)
            }
          }
        })

        // Audit log untuk INSERT
        await logAudit({
          action: 'INSERT',
          source: 'SYSTEM',
          tableName: 'gate_logs',
          recordId: insertedRow?.id || null,
          newData: insertedRow || payload,
        })

        await loadTodayLogs(true)
        // Konsisten stay di tab input agar bisa lanjut catat orang lain

        // Webhook Notification
        sendLogNotification(insertedRow || payload, 'OUT')
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
    else {
      addToast(action === 'return' ? 'Kembali dicatat' : 'Tamu keluar dicatat', 'success')

      // Audit log untuk UPDATE (Check-out/Return)
      await logAudit({
        action: 'UPDATE',
        source: 'SYSTEM',
        tableName: 'gate_logs',
        recordId: log.id,
        oldData: log,
        newData: { ...log, check_out: checkOutISO }
      })

      // Webhook notification
      sendLogNotification({ ...log, check_out: checkOutISO }, action === 'return' ? 'IN' : 'OUT_TAMU')

      loadTodayLogs()
      if (activeTab === 'rekap') loadRekap()
    }
  }, [confirmModal, loadTodayLogs, loadRekap, activeTab, addToast])

  const handleSaveEdit = useCallback(async (updates) => {
    setEditSaving(true)
    const { error } = await supabase.from('gate_logs').update(updates).eq('id', editLog.id)
    setEditSaving(false)
    if (error) addToast('Gagal menyimpan: ' + error.message, 'error')
    else {
      addToast('Log diperbarui', 'success')
      await logAudit({
        action: 'UPDATE',
        source: 'SYSTEM',
        tableName: 'gate_logs',
        recordId: editLog.id,
        oldData: editLog,
        newData: { ...editLog, ...updates },
      })
      setEditLog(null)
      loadTodayLogs()
      if (activeTab === 'rekap') loadRekap()
    }
  }, [editLog, loadTodayLogs, loadRekap, activeTab, addToast])

  const handleDeleteLog = useCallback(async () => {
    const { error } = await supabase.from('gate_logs').delete().eq('id', editLog.id)
    if (error) addToast('Gagal hapus: ' + error.message, 'error')
    else {
      addToast('Log dihapus', 'success')
      await logAudit({
        action: 'DELETE',
        source: 'SYSTEM',
        tableName: 'gate_logs',
        recordId: editLog.id,
        oldData: editLog,
      })
      setEditLog(null)
      loadTodayLogs()
      if (activeTab === 'rekap') loadRekap()
    }
  }, [editLog, loadTodayLogs, loadRekap, activeTab, addToast])

  const handleBulkCheckout = async () => {
    if (selectedIds.length === 0) return
    setSubmitting(true)
    const now = new Date().toISOString()

    try {
      // Fetch the logs first so we have the data for notifications
      const { data: logsToUpdate } = await supabase.from('gate_logs')
        .select('*')
        .in('id', selectedIds)

      const { error } = await supabase.from('gate_logs')
        .update({ check_out: now })
        .in('id', selectedIds)

      if (error) throw error

      addToast(`${selectedIds.length} entri berhasil diproses`, 'success')

      // Send notifications for each
      if (logsToUpdate) {
        logsToUpdate.forEach(log => {
          const actionType = log.visitor_type === 'tamu' ? 'OUT_TAMU' : 'IN'
          sendLogNotification({ ...log, check_out: now }, actionType)
        })
      }

      // Audit log for BULK UPDATE
      await logAudit({
        action: 'UPDATE',
        source: 'OPERATIONAL',
        tableName: 'gate_logs',
        newData: { bulkCount: selectedIds.length, ids: selectedIds, action: 'Bulk Checkout/Return' }
      })

      await loadTodayLogs(true)
      setSelectedIds([])
      setSelectionMode(false)
    } catch (err) {
      addToast('Gagal update massal: ' + err.message, 'error')
    }
    setSubmitting(false)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Hapus ${selectedIds.length} log terpilih secara permanen?`)) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('gate_logs').delete().in('id', selectedIds)
      if (error) throw error

      addToast(`${selectedIds.length} log berhasil dihapus`, 'success')

      await logAudit({
        action: 'DELETE',
        source: 'OPERATIONAL',
        tableName: 'gate_logs',
        newData: { bulkCount: selectedIds.length, ids: selectedIds }
      })

      await loadTodayLogs(true)
      setSelectedIds([])
      setSelectionMode(false)
    } catch (err) {
      addToast('Gagal hapus massal: ' + err.message, 'error')
    }
    setSubmitting(false)
  }

  const handleSelectAll = (list) => {
    const allIds = list.map(l => l.id)
    if (selectedIds.length === allIds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(allIds)
    }
  }

  const toggleSelect = id => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

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
      const isG = l.visitor_type !== 'tamu'
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
      const isInternal = l.visitor_type !== 'tamu'
      const key = l.teacher_id || l.visitor_name
      if (!map.has(key)) {
        map.set(key, { id: key, name: l.visitor_name, nip: l.visitor_nip || '-', type: l.visitor_type, count: 0, totalMs: 0, belumKembali: 0, purposes: [] })
      }
      const entry = map.get(key)
      entry.count++
      if (isInternal && l.check_out) {
        const ms = new Date(l.check_out) - new Date(l.check_in)
        if (ms > 0) entry.totalMs += ms
      }
      if (isInternal && !l.check_out) entry.belumKembali++
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

    logAudit({
      action: 'PRINT', source: 'OPERATIONAL', tableName: 'gate_logs',
      newData: { tab: activeTab, view: rekapView, count: src.length, period: periodLabel }
    })
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
      addToast(`CSV Ringkasan berhasil diunduh (${rekapRingkasan.length} orang)`, 'success')

      logAudit({
        action: 'EXPORT', source: 'OPERATIONAL', tableName: 'gate_logs',
        newData: { format: 'CSV', source, view: 'ringkasan', count: rekapRingkasan.length, period: label }
      })
      return

    }

    // Export format detail log (default)
    const src = source === 'rekap' ? filteredRekapData : filteredLogs
    const header = ['No', 'Nama', 'Jenis', 'NIP / Instansi', 'Keperluan', 'Jam Keluar (Guru)', 'Jam Kembali / Masuk Tamu', 'Jam Keluar (Tamu)', 'Durasi', 'Kendaraan', 'Status']
    const rows = src.map((l, i) => {
      const isG = l.visitor_type !== 'tamu'
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
    addToast(`CSV berhasil diunduh (${src.length} baris)`, 'success')

    logAudit({
      action: 'EXPORT', source: 'OPERATIONAL', tableName: 'gate_logs',
      newData: { format: 'CSV', source, view: rekapView, count: src.length, period: label }
    })
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

      logAudit({
        action: 'EXPORT', source: 'OPERATIONAL', tableName: 'gate_logs',
        newData: { format: 'PDF', source, view: 'ringkasan', count: rekapRingkasan.length, period: periodLabel }
      })
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

    logAudit({
      action: 'EXPORT', source: 'OPERATIONAL', tableName: 'gate_logs',
      newData: { format: 'PDF', source, view: rekapView, count: src.length, period: periodLabel }
    })
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
        <PageHeader
          badge="Reports"
          breadcrumbs={['Gate Monitor']}
          title="Log Keluar Masuk"
          subtitle="Pencatatan real-time warga sekolah & tamu eksternal."
          actions={
            <div className="flex items-center gap-3">
              <LiveClock />
              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} disabled={isRefreshing}
                  className={`h-9 w-10 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] ${isRefreshing ? 'opacity-50' : ''}`}
                  title="Refresh Data">
                  <FontAwesomeIcon icon={faArrowsRotate} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setShowConfig(true)}
                  className="h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]"
                  title="Konfigurasi Bot">
                  <FontAwesomeIcon icon={faGear} />
                </button>
                <button onClick={handlePrint}
                  className="h-9 w-9 sm:w-auto sm:px-3 rounded-lg border flex items-center justify-center sm:justify-start gap-2 transition-all active:scale-95 bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  title="Cetak Log">
                  <FontAwesomeIcon icon={faPrint} className="text-sm" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">CETAK</span>
                </button>
              </div>
            </div>
          }
        />

        {/* STATS */}
        <StatsCarousel count={4} className="mb-4">
          {[
            { label: 'Total Hari Ini', value: stats.total, icon: faClipboardList, bg: 'bg-indigo-500/10 text-indigo-500', border: 'bg-indigo-500' },
            { label: 'Siswa/Guru Keluar', value: stats.keluar, icon: faPersonWalkingArrowRight, bg: 'bg-rose-500/10 text-rose-500', border: 'bg-rose-500' },
            { label: 'Tamu di Dalam', value: stats.dalamTamu, icon: faBuilding, bg: 'bg-emerald-500/10 text-emerald-500', border: 'bg-emerald-500' },
            { label: 'Kunjungan Tamu', value: stats.tamu, icon: faUserFriends, bg: 'bg-amber-500/10 text-amber-500', border: 'bg-amber-500' },
          ].map((s, i) => (
            <StatCard
              key={i}
              icon={s.icon}
              label={s.label}
              value={s.value}
              borderColor={s.border}
              iconBg={s.bg}
              loading={loadingLogs}
              className="min-w-[200px]"
            />
          ))}
        </StatsCarousel>

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
          <div className="grid lg:grid-cols-2 gap-6 items-start animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Kolom kiri: Form */}
            <div className="glass rounded-[1.5rem] p-5">
              {/* Mode switcher Guru / Tamu */}
              <div className="flex gap-2 mb-5">
                {[
                  { k: 'internal', l: 'Internal', icon: faBuilding, desc: 'Keluar masuk warga sekolah', active: 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5', activeText: 'text-[var(--color-primary)]' },
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
                {inputMode === 'internal'
                  ? <FormInternal internalList={internalList} onSubmit={handleSubmit} loading={submitting} />
                  : <FormTamu onSubmit={handleSubmit} loading={submitting} />
                }
              </div>

              {/* Cara Penggunaan / Guide moved back to Left Column below search/form */}
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <QuickGuide mode={inputMode} />
              </div>
            </div>

            {/* Kolom kanan: Status — Mengikuti konten agar tidak terlalu ditarik ke bawah */}
            <div className="flex flex-col gap-4">

              {/* Sedang Keluar */}
              <div className="glass rounded-[1.5rem] p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Sedang Keluar</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Guru & karyawan belum kembali</p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-black tabular-nums transition-all ${stats.keluar > 0 ? 'bg-rose-500/10 text-rose-600 shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]/50'}`}>
                    {stats.keluar} ORANG
                  </div>
                </div>

                {/* Bulk Selection Toolbar */}
                {stats.keluar > 0 && (
                  <div className="flex items-center justify-between mb-3 px-1">
                    <button onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]) }}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all ${selectionMode ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                      {selectionMode ? 'Batal Pilih' : 'Pilih Multi'}
                    </button>
                  </div>
                )}

                {loadingLogs
                  ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                  : todayLogs.filter(l => (l.visitor_type !== 'tamu') && !l.check_out).length === 0
                    ? <EmptyState
                      variant="plain"
                      color="emerald"
                      icon={faCheck}
                      title="Semua Hadir & Terdata"
                      description="Tidak ada catatan guru atau karyawan yang sedang berada di luar area sekolah saat ini."
                    />
                    : <div className="space-y-2">
                      {todayLogs.filter(l => (l.visitor_type !== 'tamu') && !l.check_out).map(log => (
                        <LogCard key={log.id} log={log} onReturn={handleReturn} onCheckout={handleCheckout} onEdit={setEditLog}
                          selectionMode={selectionMode} onToggleSelect={toggleSelect} isSelected={selectedIds.includes(log.id)} />
                      ))}
                    </div>
                }
              </div>

              {/* Tamu di Dalam */}
              <div className="glass rounded-[1.5rem] p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Tamu di Dalam</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Kunjungan masih aktif</p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-black tabular-nums transition-all ${stats.dalamTamu > 0 ? 'bg-emerald-500/10 text-emerald-600 shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]/50'}`}>
                    {stats.dalamTamu} ORANG
                  </div>
                </div>
                {loadingLogs
                  ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                  : todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).length === 0
                    ? <EmptyState
                      variant="plain"
                      color="slate"
                      icon={faUserFriends}
                      title="Belum Ada Tamu"
                      description="Tidak ada kunjungan tamu eksternal yang terdaftar aktif di sistem saat ini."
                    />
                    : <div className="space-y-2">
                      {todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).map(log => (
                        <LogCard key={log.id} log={log} onReturn={handleReturn} onCheckout={handleCheckout} onEdit={setEditLog} />
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: LOG HARI INI ── */}
        {activeTab === 'log' && (
          <div className="glass rounded-[1.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Toolbar baris 1: Search + filter jenis */}
            <div className="px-4 pt-3 pb-2 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                <input value={searchLog} onChange={e => setSearchLog(e.target.value)}
                  placeholder="Cari nama atau keperluan..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                {searchLog && (
                  <button onClick={() => setSearchLog('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                  </button>
                )}
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide -mx-1 px-1">
                {[{ k: 'all', l: 'Semua' }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: t.label }))].map(f => (
                  <button key={f.k} onClick={() => setFilterType(f.k)}
                    className={`h-8 px-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${filterType === f.k
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Toolbar baris 2: Filter status + export + counter */}
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center gap-4 bg-[var(--color-surface-alt)]/40">
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide -mx-1 px-1">
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
                      className={`h-8 px-3 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${filterStatus === f.k
                        ? activeColor
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                      <FontAwesomeIcon icon={f.icon} className="text-[8px]" />
                      {f.l}
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center ${filterStatus === f.k ? 'bg-white/25' : 'bg-[var(--color-surface-alt)]'}`}>{count}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:ml-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--color-border)]">
                <div className="flex items-center gap-1.5 mr-auto sm:mr-0">
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode)
                      if (selectionMode) setSelectedIds([])
                    }}
                    className={`h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectionMode ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    <FontAwesomeIcon icon={selectionMode ? faCheckDouble : faMousePointer} className="text-[10px]" />
                    <span className="hidden xs:inline">{selectionMode ? 'Batal Pilih' : 'Pilih Multiple'}</span>
                  </button>

                  {selectionMode && (
                    <button
                      onClick={() => handleSelectAll(filteredLogs)}
                      className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2"
                    >
                      {selectedIds.length === filteredLogs.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  )}
                </div>

                <span className="text-[10px] font-extrabold text-[var(--color-text-muted)] tabular-nums">{filteredLogs.length} Entri</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleExportCSV('log')}
                    className="h-8 w-8 sm:w-auto sm:px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all"
                    title="Export CSV">
                    <FontAwesomeIcon icon={faFileCsv} className="text-[10px]" /><span className="hidden sm:inline">CSV</span>
                  </button>
                  <button onClick={() => handleExportPDF('log')}
                    className="h-8 w-8 sm:w-auto sm:px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center justify-center gap-1.5 transition-all"
                    title="Export PDF">
                    <FontAwesomeIcon icon={faFilePdf} className="text-[10px]" /><span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4">
              {loadingLogs ? (
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : filteredLogs.length === 0 ? (
                <EmptyState
                  variant="plain"
                  color="slate"
                  icon={faClipboardList}
                  title={todayLogs.length === 0 ? 'Belum Ada Data' : 'Pencarian Kosong'}
                  description={todayLogs.length === 0 ? 'Tidak ada aktivitas tercatat untuk hari ini.' : 'Tidak ada hasil yang cocok dengan filter atau pencarian Anda.'}
                  action={(filterType !== 'all' || filterStatus !== 'all' || searchLog) && (
                    <button onClick={() => { setFilterType('all'); setFilterStatus('all'); setSearchLog('') }}
                      className="h-8 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                      Reset Filter
                    </button>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map(log => (
                    <LogCard
                      key={log.id}
                      log={log}
                      onReturn={handleReturn}
                      onCheckout={handleCheckout}
                      onEdit={setEditLog}
                      selectionMode={selectionMode}
                      onToggleSelect={toggleSelect}
                      isSelected={selectedIds.includes(log.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: REKAP ── */}
        {activeTab === 'rekap' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Baris 1: Mode + Navigasi + Export */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Mode: Harian / Mingguan / Bulanan */}
                <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full sm:w-fit overflow-x-auto scrollbar-hide">
                  {[{ k: 'harian', l: 'Harian' }, { k: 'mingguan', l: 'Mingguan' }, { k: 'bulanan', l: 'Bulanan' }].map(m => (
                    <button key={m.k} onClick={() => setRekapMode(m.k)}
                      className={`h-8 flex-1 sm:flex-none sm:px-4 rounded-lg text-[11px] font-black transition-all whitespace-nowrap ${rekapMode === m.k ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                      {m.l}
                    </button>
                  ))}
                </div>
                {/* Navigasi tanggal */}
                <div className="flex items-center justify-between sm:justify-start gap-2 bg-[var(--color-surface-alt)]/50 p-1 rounded-xl sm:bg-transparent sm:p-0">
                  <button onClick={() => navRekap(-1)} className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                    <FontAwesomeIcon icon={faChevronLeft} className="text-[11px]" />
                  </button>
                  <span className="text-[13px] font-black text-[var(--color-text)] min-w-[140px] text-center">{rekapLabel}</span>
                  <button onClick={() => navRekap(1)} className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                    <FontAwesomeIcon icon={faChevronRight} className="text-[11px]" />
                  </button>
                </div>
              </div>

              {/* Export Actions Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                <button onClick={() => handleExportCSV('rekap')}
                  className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 flex items-center gap-2 transition-all whitespace-nowrap">
                  <FontAwesomeIcon icon={faFileCsv} className="text-[11px]" />CSV
                </button>
                <button onClick={() => handleExportPDF('rekap')}
                  className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center gap-2 transition-all whitespace-nowrap">
                  <FontAwesomeIcon icon={faFilePdf} className="text-[11px]" />PDF
                </button>
                <button onClick={async () => {
                  const res = await sendDailySummary(rekapData)
                  if (res.success) addToast('Rekapan berhasil dikirim ke Telegram', 'success')
                  else addToast('Gagal: ' + res.error, 'error')
                }} className="h-9 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black flex items-center gap-2 whitespace-nowrap">
                  <FontAwesomeIcon icon={faPaperPlane} />Kirim ke Telegram
                </button>
                <button onClick={handlePrint}
                  className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-2 transition-all whitespace-nowrap ml-auto">
                  <FontAwesomeIcon icon={faPrint} />Cetak
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <StatsCarousel count={4} className="mb-4">
              {[
                { label: 'TOTAL', value: rekapSummary.total, icon: faClipboardList, bg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]', border: 'bg-[var(--color-primary)]', filterKey: 'all' },
                { label: 'GURU', value: rekapSummary.guru, icon: faChalkboardTeacher, bg: 'bg-indigo-500/10 text-indigo-500', border: 'bg-indigo-500', filterKey: 'guru' },
                { label: 'KARYAWAN', value: rekapSummary.karyawan, icon: faBriefcase, bg: 'bg-blue-500/10 text-blue-500', border: 'bg-blue-500', filterKey: 'karyawan' },
                { label: 'TAMU', value: rekapSummary.tamu, icon: faUserFriends, bg: 'bg-amber-500/10 text-amber-500', border: 'bg-amber-500', filterKey: 'tamu' },
              ].map((s, i) => (
                <StatCard
                  key={i}
                  icon={s.icon}
                  label={s.label}
                  value={s.value}
                  borderColor={s.border}
                  iconBg={s.bg}
                  loading={loadingRekap}
                  className={`min-w-[200px] ${filterRekap === s.filterKey ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)]' : ''}`}
                  onClick={() => setFilterRekap(s.filterKey)}
                />
              ))}
            </StatsCarousel>

            <div className="glass rounded-[1.5rem] overflow-hidden">
              {/* Baris 2: View toggle + Search + Filter type */}
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--color-surface-alt)]/40">
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] shrink-0">
                    {[{ k: 'log', l: 'Detail Log' }, { k: 'ringkasan', l: 'Ringkasan' }].map(v => (
                      <button key={v.k} onClick={() => setRekapView(v.k)}
                        className={`h-7 px-3 rounded-md text-[10px] font-black transition-all ${rekapView === v.k ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                        {v.l}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] ml-auto sm:hidden shrink-0">
                    {rekapView === 'log' ? `${filteredRekapData.length} entri` : `${rekapRingkasan.length} orang`}
                  </span>
                </div>
                <div className="relative flex-1">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                  <input value={searchRekap} onChange={e => setSearchRekap(e.target.value)}
                    placeholder="Cari nama atau keperluan..."
                    className="w-full h-9 pl-8 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                  {searchRekap && (
                    <button onClick={() => setSearchRekap('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide -mx-1 px-1">
                  {[{ k: 'all', l: 'Semua' }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: t.label }))].map(f => (
                    <button key={f.k} onClick={() => setFilterRekap(f.k)}
                      className={`h-8 px-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${filterRekap === f.k
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                      {f.l}
                    </button>
                  ))}
                </div>
                <span className="hidden sm:block text-[10px] font-bold text-[var(--color-text-muted)] ml-auto shrink-0">
                  {rekapView === 'log' ? `${filteredRekapData.length} entri` : `${rekapRingkasan.length} orang`}
                </span>
              </div>

              {/* ── VIEW: DETAIL LOG ── */}
              {rekapView === 'log' && (
                <div>
                  {loadingRekap
                    ? <TableSkeleton cols={10} rows={8} />
                    : filteredRekapData.length === 0
                      ? <EmptyState
                        variant="plain"
                        color="slate"
                        icon={faClipboardList}
                        title={rekapData.length === 0 ? 'Belum Ada Data' : 'Pencarian Kosong'}
                        description={rekapData.length === 0 ? `Tidak ada aktivitas tercatat pada ${rekapLabel}.` : 'Tidak ada hasil yang cocok dengan filter atau pencarian Anda.'}
                        action={(filterRekap !== 'all' || searchRekap) && (
                          <button onClick={() => { setFilterRekap('all'); setSearchRekap('') }}
                            className="h-8 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                            Reset Filter
                          </button>
                        )}
                      />
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
                              const isG = log.visitor_type !== 'tamu'
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
                <div>
                  {loadingRekap
                    ? <TableSkeleton cols={8} rows={8} />
                    : rekapRingkasan.length === 0
                      ? <EmptyState
                        variant="plain"
                        color="slate"
                        icon={faUserFriends}
                        title="Data Kosong"
                        description={`Belum ada ringkasan orang yang tercatat untuk periode ${rekapLabel}.`}
                      />
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
                              const isInternal = r.type !== 'tamu'
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
                                    {isInternal ? (
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
                                  <td className="px-3 py-3 text-[11px] font-bold text-[var(--color-text-muted)] tabular-nums">{isInternal ? avgStr : '-'}</td>
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
          </div>
        )}

      </div>

      {/* Overtime alert banner */}
      {dailySummary.overTimeList.length > 0 && !dismissedOvertime && (
        <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-[100] w-auto max-w-[calc(100vw-2rem)] sm:w-72 bg-red-600/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-red-400/20 animate-in slide-in-from-right-8 duration-500">
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
      {showConfig && (
        <ConfigModal
          onSave={() => { setShowConfig(false); addToast('Webhook URL berhasil disimpan', 'success') }}
          onCancel={() => setShowConfig(false)}
          testNotification={async () => {
            const res = await sendLogNotification({ visitor_name: 'Developer', purpose: 'Uji Coba Sistem', visitor_type: 'developer' }, 'OUT')
            if (res?.success) addToast('Pesan test berhasil dikirim!', 'success')
            else addToast('Gagal: ' + (res?.error || 'Unknown error'), 'error')
            return res?.success
          }}
        />
      )}

      {selectedIds.length > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[250] w-[95%] max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
          style={{
            bottom: isMobile
              ? 'max(80px, calc(12px + env(safe-area-inset-bottom)))'
              : '16px'
          }}
        >
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-[var(--color-primary)] to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />

            <div className="relative bg-[#0f172a]/90 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-2 py-2 flex items-center justify-between gap-2 text-white overflow-hidden">
              {/* Count Indicator */}
              <div className="flex items-center gap-3 pl-2 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center font-black text-[14px] shadow-lg shadow-[var(--color-primary)]/30 shrink-0">
                  {selectedIds.length}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">Entri Terpilih</p>
                  <p className="text-[11px] font-bold leading-none mt-0.5">Aksi Massal</p>
                </div>
              </div>

              {/* Actions Area */}
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                <button
                  onClick={handleBulkCheckout}
                  disabled={submitting}
                  className="h-10 sm:h-9 px-3 sm:px-4 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {submitting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheckDouble} className="text-[12px]" />}
                  <span className="hidden xs:inline">Check-out Massal</span>
                  <span className="xs:hidden">Check-out</span>
                </button>

                <button
                  onClick={handleBulkDelete}
                  disabled={submitting}
                  className="h-10 sm:h-9 px-3 sm:px-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                  title="Hapus Terpilih"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-[12px]" />
                  <span className="inline">Hapus</span>
                </button>
              </div>

              {/* Close Button */}
              <div className="flex items-center pr-1 shrink-0">
                <div className="w-px h-6 bg-white/10 mx-1.5 hidden sm:block" />
                <button
                  onClick={() => { setSelectedIds([]); setSelectionMode(false) }}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center translate-x-0 active:scale-90"
                  title="Tutup & Batal"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}