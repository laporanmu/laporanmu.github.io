import { useState, useEffect, useCallback, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faLayerGroup, faCompass, faUserShield, faGear,
    faToggleOn, faTriangleExclamation, faSpinner,
    faRotateRight, faBolt, faFileLines, faSave,
    faRotateLeft, faUpload, faSchool, faUser,
    faPalette, faEye, faCheck,
    faChevronRight, faSearch, faXmark, faSkull,
    faTrash, faCircleExclamation, faCode,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import { useSchoolSettings, DEFAULT_SETTINGS } from '../../context/SchoolSettingsContext'
import { useAuth } from '../../context/AuthContext'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'flags', label: 'Feature Flags', icon: faToggleOn },
    { id: 'raport', label: 'Raport', icon: faFileLines },
    { id: 'danger', label: 'Bahaya', icon: faSkull },
]

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
    {
        id: 'module', label: 'Modul',
        desc: 'Aktifkan atau nonaktifkan fitur utama aplikasi',
        icon: faLayerGroup,
        color: 'text-indigo-500', bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/25',
        gradient: 'from-indigo-500/8 to-transparent',
        barColor: 'bg-indigo-500', toggleActive: 'bg-indigo-500',
    },
    {
        id: 'nav', label: 'Navigasi',
        desc: 'Kontrol item yang tampil di menu navigasi',
        icon: faCompass,
        color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/25',
        gradient: 'from-emerald-500/8 to-transparent',
        barColor: 'bg-emerald-500', toggleActive: 'bg-emerald-500',
    },
    {
        id: 'access', label: 'Hak Akses',
        desc: 'Izin per-role untuk mengakses fitur tertentu',
        icon: faUserShield,
        color: 'text-orange-500', bg: 'bg-orange-500/10',
        border: 'border-orange-500/25',
        gradient: 'from-orange-500/8 to-transparent',
        barColor: 'bg-orange-500', toggleActive: 'bg-orange-500',
    },
    {
        id: 'system', label: 'Sistem',
        desc: 'Pengaturan sistem & mode khusus developer',
        icon: faGear,
        color: 'text-rose-500', bg: 'bg-rose-500/10',
        border: 'border-rose-500/25',
        gradient: 'from-rose-500/8 to-transparent',
        barColor: 'bg-rose-500', toggleActive: 'bg-rose-500',
    },
]

// ─── Raport sections ──────────────────────────────────────────────────────────
const RAPORT_SECTIONS = [
    {
        id: 'identitas',
        label: 'Identitas Sekolah',
        desc: 'Nama, alamat, dan logo yang tampil di header raport',
        icon: faSchool,
        color: 'text-indigo-500', bg: 'bg-indigo-500/10',
        gradient: 'from-indigo-500/8 to-transparent',
    },
    {
        id: 'kepala',
        label: 'Kepala Sekolah / Direktur',
        desc: 'Nama dan jabatan yang tercetak di footer raport',
        icon: faUser,
        color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        gradient: 'from-emerald-500/8 to-transparent',
    },
    {
        id: 'warna',
        label: 'Warna & Tampilan',
        desc: 'Palet warna header raport dan footer WhatsApp',
        icon: faPalette,
        color: 'text-purple-500', bg: 'bg-purple-500/10',
        gradient: 'from-purple-500/8 to-transparent',
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FL({ children }) {
    return (
        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 ml-0.5">
            {children}
        </label>
    )
}

function SectionHeader({ section }) {
    return (
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r ${section.gradient}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${section.bg}`}>
                <FontAwesomeIcon icon={section.icon} className={`text-sm ${section.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-[13px] text-[var(--color-text)] leading-tight">{section.label}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{section.desc}</p>
            </div>
        </div>
    )
}

function ColorInput({ label, value, onChange }) {
    return (
        <div>
            <FL>{label}</FL>
            <div className="flex items-center gap-2.5">
                <div
                    className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-[var(--color-border)] shrink-0 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                    style={{ background: value }}
                >
                    <input
                        type="color" value={value}
                        onChange={e => onChange(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                <input
                    type="text" value={value}
                    onChange={e => onChange(e.target.value)}
                    maxLength={7} placeholder="#000000"
                    className="input-field font-mono font-bold text-sm h-11 flex-1 uppercase"
                />
            </div>
        </div>
    )
}

function RaportPreview({ form }) {
    const c1 = form.report_color_primary || '#1a5c35'
    const c2 = form.report_color_secondary || '#c8a400'
    return (
        <div className="rounded-xl overflow-hidden bg-white text-black shadow-md border border-gray-200">
            <div className="flex items-center gap-3 p-3">
                {form.logo_url
                    ? <img src={form.logo_url} alt="logo" className="w-10 h-10 object-contain rounded shrink-0" onError={e => e.target.style.display = 'none'} />
                    : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[8px] font-bold shrink-0">LOGO</div>
                }
                <div className="flex-1 text-center leading-tight min-w-0">
                    {form.school_subtitle_ar && <div className="text-[7px] text-gray-400 truncate" dir="rtl">{form.school_subtitle_ar}</div>}
                    <div className="text-[11px] font-black truncate" style={{ color: c1 }} dir="rtl">{form.school_name_ar || '—'}</div>
                    <div className="text-[9px] font-bold text-gray-600 truncate">{form.school_name_id || '—'}</div>
                    <div className="text-[8px] text-gray-400 truncate">{form.school_address || '—'}</div>
                </div>
            </div>
            <div style={{ height: 3, background: `linear-gradient(90deg,${c1},${c2},${c1})` }} />
            <div style={{ borderBottom: `2px double ${c1}`, marginTop: 2 }} />
            <div className="flex justify-between px-3 py-2 text-[8px] text-gray-400">
                <span>Musyrif / Wali Kamar</span>
                <span>{form.headmaster_name_id || '—'}</span>
                <span>Wali Santri</span>
            </div>
        </div>
    )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false, activeColor = 'bg-[var(--color-primary)]' }) {
    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            type="button" disabled={disabled} role="switch" aria-checked={checked}
            style={{ WebkitTapHighlightColor: 'transparent', minWidth: 44 }}
            className={[
                'relative inline-flex items-center flex-shrink-0',
                'w-11 h-6 rounded-full',
                'transition-colors duration-200 ease-in-out focus:outline-none',
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                checked ? activeColor : 'bg-[var(--color-border)]',
            ].join(' ')}
        >
            <span className={[
                'pointer-events-none inline-block w-[18px] h-[18px]',
                'rounded-full bg-white shadow-md',
                'transform transition-transform duration-200 ease-in-out',
                checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
            ].join(' ')} />
        </button>
    )
}

// ─── FlagRow ──────────────────────────────────────────────────────────────────
function FlagRow({ flag, cat, onToggle, isSaving }) {
    return (
        <div className={[
            'flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-150',
            flag.enabled
                ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                : 'border-[var(--color-border)]/40 bg-[var(--color-surface-alt)]/30',
        ].join(' ')}>
            {/* Accent dot */}
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${flag.enabled ? cat.barColor : 'bg-[var(--color-border)]'}`} />

            {/* Label + desc */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[13px] font-bold leading-tight ${flag.enabled ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                        {flag.label}
                    </span>
                    {!flag.enabled && (
                        <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-[var(--color-border)]/60 text-[var(--color-text-muted)]">off</span>
                    )}
                </div>
                {flag.description && (
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{flag.description}</p>
                )}
            </div>

            {/* Toggle area */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {isSaving && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px] text-[var(--color-text-muted)]" />}
                <Toggle
                    checked={flag.enabled}
                    onChange={() => onToggle(flag)}
                    disabled={isSaving}
                    activeColor={cat.toggleActive}
                />
            </div>
        </div>
    )
}

// ─── CategoryNavCard ──────────────────────────────────────────────────────────
function CategoryNavCard({ cat, flags, isActive, onClick }) {
    const items = flags.filter(f => f.category === cat.id)
    const active = items.filter(f => f.enabled).length
    const total = items.length
    const pct = total ? (active / total) * 100 : 0

    return (
        <button
            onClick={onClick} type="button"
            className={[
                'w-full text-left rounded-2xl border transition-all duration-200 overflow-hidden',
                isActive
                    ? `border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ring-2 ring-[var(--color-primary)]/20`
                    : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] bg-transparent',
            ].join(' ')}
        >
            <div className="p-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                    <FontAwesomeIcon icon={cat.icon} className={`text-sm ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <p className={`text-[12px] font-black leading-none ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                            {cat.label}
                        </p>
                        <span className={`text-[10px] font-black ${active === total ? cat.color : 'text-[var(--color-text-muted)]'}`}>
                            {active}/{total}
                        </span>
                    </div>
                    {/* Mini progress */}
                    <div className="h-1 rounded-full bg-[var(--color-border)]">
                        <div className={`h-full rounded-full transition-all duration-500 ${cat.barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                </div>
                {isActive && (
                    <FontAwesomeIcon icon={faChevronRight} className={`text-[9px] flex-shrink-0 ${cat.color}`} />
                )}
            </div>
        </button>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
    const { addToast } = useToast()
    const { settings, loading: settingsLoading, saveSettings } = useSchoolSettings()
    const { profile } = useAuth()

    const [activeTab, setActiveTab] = useState('flags')
    const [activeCategory, setActiveCategory] = useState('module')
    const [flags, setFlags] = useState([])
    const [loading, setLoading] = useState(true)
    const [savingKey, setSavingKey] = useState(null)
    const [refreshing, setRefreshing] = useState(false)

    const [form, setForm] = useState({ ...DEFAULT_SETTINGS })
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!settingsLoading) { setForm({ ...DEFAULT_SETTINGS, ...settings }); setDirty(false) }
    }, [settingsLoading, settings])

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true) }
    const handleReset = () => { setForm({ ...DEFAULT_SETTINGS, ...settings }); setDirty(false) }
    const handleSaveRaport = async () => {
        if (saving) return
        setSaving(true)
        const err = await saveSettings(form)
        setSaving(false)
        if (err) addToast('Gagal: ' + err.message, 'error')
        else {
            addToast('Konfigurasi raport disimpan', 'success'); setDirty(false)
            await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'school_settings', newData: { settings_saved: true, keys: Object.keys(form) } })
        }
    }

    const fetchFlags = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true); else setRefreshing(true)
        const { data, error } = await supabase
            .from('feature_flags').select('*').order('category').order('sort_order')
        if (error) addToast('Gagal memuat flags: ' + error.message, 'error')
        else setFlags(data || [])
        setLoading(false); setRefreshing(false)
    }, [addToast])

    useEffect(() => { fetchFlags() }, [fetchFlags])

    const handleToggle = async (flag) => {
        const newVal = !flag.enabled
        setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: newVal } : f))
        setSavingKey(flag.key)
        const { error } = await supabase.from('feature_flags').update({ enabled: newVal }).eq('key', flag.key)
        setSavingKey(null)
        if (error) {
            setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: !newVal } : f))
            addToast('Gagal: ' + error.message, 'error')
            await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'feature_flags', newData: { key: flag.key, label: flag.label, enabled: newVal } })
        } else if (flag.key === 'system.maintenance') {
            addToast(newVal ? 'Maintenance mode AKTIF' : 'Maintenance mode dinonaktifkan', newVal ? 'warning' : 'success')
        }
    }

    const maintenanceOn = flags.find(f => f.key === 'system.maintenance')?.enabled
    const activeCat = CATEGORIES.find(c => c.id === activeCategory)

    // ── Search flags
    const [flagSearch, setFlagSearch] = useState('')
    const activeFlagRows = useMemo(() => {
        let rows = flags.filter(f => f.category === activeCategory).sort((a, b) => a.sort_order - b.sort_order)
        if (flagSearch.trim()) {
            const q = flagSearch.toLowerCase()
            rows = rows.filter(f => f.label?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) || f.key?.toLowerCase().includes(q))
        }
        return rows
    }, [flags, activeCategory, flagSearch])

    const totalEnabled = flags.filter(f => f.enabled).length
    const totalFlags = flags.length

    return (
        <DashboardLayout title="Developer Settings">
            <div className="p-4 md:p-6 space-y-5 max-w-[1800px] mx-auto">

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="mb-7 flex items-start justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['Internal Flags']} className="mb-1" />
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">
                                Developer Settings
                            </h1>
                            {maintenanceOn && (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" /> Maintenance
                                </span>
                            )}
                        </div>
                        <p className="text-[12px] text-[var(--color-text-muted)] font-medium">
                            Feature flags &amp; konfigurasi sistem. Perubahan langsung berlaku real-time.
                        </p>
                    </div>
                    <button
                        onClick={() => fetchFlags(true)} disabled={refreshing} type="button"
                        className="flex-shrink-0 w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition flex items-center justify-center"
                    >
                        <FontAwesomeIcon icon={faRotateRight} className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* ── Tab bar ─────────────────────────────────────────── */}
                <div className="flex items-center gap-2 mb-7">
                    <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5">
                        {TABS.map(t => (
                            <button
                                key={t.id} onClick={() => setActiveTab(t.id)} type="button"
                                className={`relative h-8 px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all
                                    ${activeTab === t.id
                                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}
                            >
                                <FontAwesomeIcon icon={t.icon} className="text-[10px]" />
                                {t.label}
                                {t.id === 'raport' && dirty && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════
                    TAB: FEATURE FLAGS
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'flags' && (
                    <>
                        {/* Maintenance banner */}
                        {maintenanceOn && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 mb-6">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-rose-500" />
                                </div>
                                <div>
                                    <p className="font-black text-sm text-rose-500">Maintenance Mode Aktif</p>
                                    <p className="text-[11px] text-rose-400/80 mt-0.5">
                                        Seluruh user (kecuali developer) tidak dapat mengakses aplikasi.
                                    </p>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            /* ── Skeleton ── */
                            <div className="grid lg:grid-cols-[220px_1fr] gap-5">
                                <div className="space-y-2.5">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-[62px] rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse" />
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-[220px_1fr] gap-5 items-start">

                                {/* ── Left sidebar ── */}
                                <div className="space-y-2">
                                    {/* Stats strip */}
                                    <div className="glass rounded-2xl border border-[var(--color-border)] p-3 grid grid-cols-2 gap-2 mb-1">
                                        <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-[var(--color-surface-alt)]/60">
                                            <span className="text-xl font-black text-[var(--color-primary)]">{totalEnabled}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Aktif</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-[var(--color-surface-alt)]/60">
                                            <span className="text-xl font-black text-[var(--color-text)]">{totalFlags - totalEnabled}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nonaktif</span>
                                        </div>
                                    </div>

                                    {/* Category nav */}
                                    {CATEGORIES.map(cat => (
                                        <CategoryNavCard
                                            key={cat.id}
                                            cat={cat}
                                            flags={flags}
                                            isActive={activeCategory === cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                        />
                                    ))}

                                    <div className="flex items-start gap-2 px-1 pt-2">
                                        <FontAwesomeIcon icon={faBolt} className="text-[9px] text-amber-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-[var(--color-text-muted)] leading-snug">
                                            Perubahan tersimpan real-time ke Supabase.
                                        </p>
                                    </div>
                                </div>

                                {/* ── Right panel ── */}
                                <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                                    {/* Panel header */}
                                    {activeCat && (
                                        <div className={`flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r ${activeCat.gradient}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activeCat.bg}`}>
                                                <FontAwesomeIcon icon={activeCat.icon} className={`${activeCat.color}`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-black text-[14px] text-[var(--color-text)]">{activeCat.label}</p>
                                                <p className="text-[11px] text-[var(--color-text-muted)]">{activeCat.desc}</p>
                                            </div>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${activeCat.bg} ${activeCat.color}`}>
                                                {activeFlagRows.filter(f => f.enabled).length}/{activeFlagRows.length} aktif
                                            </span>
                                        </div>
                                    )}

                                    <div className="p-3 space-y-2">
                                        {/* Search inside flags */}
                                        <div className="relative mb-1">
                                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                            <input
                                                type="text" value={flagSearch} onChange={e => setFlagSearch(e.target.value)}
                                                placeholder="Cari flag..."
                                                className="w-full h-8 pl-8 pr-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-medium focus:outline-none focus:border-[var(--color-primary)] transition-all"
                                            />
                                            {flagSearch && (
                                                <button onClick={() => setFlagSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                                    <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                                </button>
                                            )}
                                        </div>
                                        {activeFlagRows.length === 0
                                            ? <div className="py-12 text-center text-[var(--color-text-muted)] text-[12px]">
                                                {flagSearch ? 'Tidak ada flag yang cocok' : 'Tidak ada flag'}
                                            </div>
                                            : activeFlagRows.map(flag => (
                                                <FlagRow
                                                    key={flag.key}
                                                    flag={flag}
                                                    cat={activeCat}
                                                    onToggle={handleToggle}
                                                    isSaving={savingKey === flag.key}
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ══════════════════════════════════════════════════════
                    TAB: RAPORT
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'raport' && (
                    <div className="space-y-5">

                        {/* ── Section: Identitas Sekolah ── */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <SectionHeader section={RAPORT_SECTIONS[0]} />
                            <div className="p-5 grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <FL>Nama Sekolah (Latin)</FL>
                                    <input
                                        type="text" value={form.school_name_id}
                                        onChange={e => set('school_name_id', e.target.value)}
                                        className="input-field font-bold text-sm h-11"
                                        placeholder="Muhammadiyah Boarding School"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Nama Sekolah (Arab)</FL>
                                    <input
                                        type="text" value={form.school_name_ar}
                                        onChange={e => set('school_name_ar', e.target.value)}
                                        dir="rtl" className="input-field font-bold text-sm h-11 text-right"
                                        placeholder="معهد ..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Sub-judul Arab (opsional)</FL>
                                    <input
                                        type="text" value={form.school_subtitle_ar}
                                        onChange={e => set('school_subtitle_ar', e.target.value)}
                                        dir="rtl" className="input-field text-sm h-11 text-right"
                                        placeholder="المجلس التعليمي ..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Alamat</FL>
                                    <input
                                        type="text" value={form.school_address}
                                        onChange={e => set('school_address', e.target.value)}
                                        className="input-field text-sm h-11"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>URL / Path Logo</FL>
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {form.logo_url
                                                ? <img src={form.logo_url} alt="logo" className="w-9 h-9 object-contain" onError={e => e.target.style.display = 'none'} />
                                                : <FontAwesomeIcon icon={faUpload} className="text-[var(--color-text-muted)] text-xs" />
                                            }
                                        </div>
                                        <input
                                            type="text" value={form.logo_url}
                                            onChange={e => set('logo_url', e.target.value)}
                                            className="input-field text-sm h-11 flex-1"
                                            placeholder="/src/assets/logo.png"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Section: Kepala Sekolah ── */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <SectionHeader section={RAPORT_SECTIONS[1]} />
                            <div className="p-5 grid sm:grid-cols-2 gap-4">
                                <div>
                                    <FL>Jabatan (Indonesia)</FL>
                                    <input
                                        type="text" value={form.headmaster_title_id}
                                        onChange={e => set('headmaster_title_id', e.target.value)}
                                        className="input-field text-sm h-11"
                                    />
                                </div>
                                <div>
                                    <FL>Nama (Indonesia)</FL>
                                    <input
                                        type="text" value={form.headmaster_name_id}
                                        onChange={e => set('headmaster_name_id', e.target.value)}
                                        className="input-field font-bold text-sm h-11"
                                    />
                                </div>
                                <div>
                                    <FL>Jabatan (Arab)</FL>
                                    <input
                                        type="text" value={form.headmaster_title_ar}
                                        onChange={e => set('headmaster_title_ar', e.target.value)}
                                        dir="rtl" className="input-field text-sm h-11 text-right"
                                    />
                                </div>
                                <div>
                                    <FL>Nama (Arab)</FL>
                                    <input
                                        type="text" value={form.headmaster_name_ar}
                                        onChange={e => set('headmaster_name_ar', e.target.value)}
                                        dir="rtl" className="input-field font-bold text-sm h-11 text-right"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Section: Warna & Tampilan ── */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <SectionHeader section={RAPORT_SECTIONS[2]} />
                            <div className="p-5 space-y-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <ColorInput
                                        label="Warna Primer"
                                        value={form.report_color_primary}
                                        onChange={v => set('report_color_primary', v)}
                                    />
                                    <ColorInput
                                        label="Warna Sekunder"
                                        value={form.report_color_secondary}
                                        onChange={v => set('report_color_secondary', v)}
                                    />
                                </div>

                                {/* Preview */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <FontAwesomeIcon icon={faEye} className="text-[10px] text-[var(--color-text-muted)]" />
                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                                            Preview Header Raport
                                        </span>
                                    </div>
                                    <RaportPreview form={form} />
                                </div>

                                {/* WhatsApp footer */}
                                <div className="pt-4 border-t border-[var(--color-border)]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FontAwesomeIcon icon={faWhatsapp} className="text-[10px] text-emerald-500" />
                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                                            Footer WhatsApp
                                        </span>
                                    </div>
                                    <input
                                        type="text" value={form.wa_footer}
                                        onChange={e => set('wa_footer', e.target.value)}
                                        className="input-field text-sm h-11"
                                        placeholder="Nama Sekolah · Sistem Laporanmu"
                                    />
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-2 ml-0.5">
                                        Tampil sebagai: <em className="text-[var(--color-text)]">_{form.wa_footer || '...'}_</em>
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    TAB: BAHAYA (DANGER ZONE)
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'danger' && (
                    <div className="space-y-4">

                        {/* Warning banner */}
                        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/8">
                            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-red-600">Zona Berbahaya</p>
                                <p className="text-[11px] text-red-500/80 mt-0.5">
                                    Tindakan di halaman ini bersifat permanen dan tidak dapat dibatalkan. Lanjutkan dengan hati-hati.
                                </p>
                            </div>
                        </div>

                        {/* Maintenance Mode */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-rose-500/8 to-transparent">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faGear} className="text-rose-500 text-sm" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-[13px] text-[var(--color-text)]">Maintenance Mode</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Nonaktifkan akses semua user kecuali developer</p>
                                </div>
                                {(() => {
                                    const mFlag = flags.find(f => f.key === 'system.maintenance')
                                    if (!mFlag) return <span className="text-[10px] text-[var(--color-text-muted)]">Flag tidak ditemukan</span>
                                    return (
                                        <div className="flex items-center gap-3 shrink-0">
                                            {mFlag.enabled && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse uppercase tracking-widest">
                                                    AKTIF
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleToggle(mFlag)}
                                                disabled={savingKey === mFlag.key}
                                                className={`h-9 px-4 rounded-xl text-[11px] font-black flex items-center gap-2 transition-all ${mFlag.enabled
                                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/30 hover:bg-rose-500 hover:text-white'}`}>
                                                {savingKey === mFlag.key
                                                    ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                                    : null}
                                                {mFlag.enabled ? 'Matikan Maintenance' : 'Aktifkan Maintenance'}
                                            </button>
                                        </div>
                                    )
                                })()}
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                    Saat maintenance mode aktif, seluruh user yang login akan mendapat halaman maintenance. Hanya akun dengan role <code className="bg-[var(--color-surface-alt)] px-1 rounded text-[10px]">developer</code> yang tetap bisa mengakses sistem.
                                </p>
                            </div>
                        </div>

                        {/* System Info */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-slate-500/8 to-transparent">
                                <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faCode} className="text-slate-500 text-sm" />
                                </div>
                                <div>
                                    <p className="font-black text-[13px] text-[var(--color-text)]">Info Sistem</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">Status dan informasi konfigurasi</p>
                                </div>
                            </div>
                            <div className="p-5 grid sm:grid-cols-2 gap-3">
                                {[
                                    { label: 'Total Feature Flags', val: `${totalFlags} flag (${totalEnabled} aktif)` },
                                    { label: 'Supabase URL', val: import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').slice(0, 24) + '...' || '—' },
                                    { label: 'Environment', val: import.meta.env.MODE || 'production' },
                                    { label: 'App Version', val: import.meta.env.VITE_APP_VERSION || '1.0.0' },
                                ].map((item, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{item.label}</p>
                                        <p className="text-[11px] font-bold text-[var(--color-text)] font-mono">{item.val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reset Settings */}
                        <div className="glass rounded-2xl border border-red-500/20 overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/20 bg-gradient-to-r from-red-500/8 to-transparent">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faTrash} className="text-red-500 text-sm" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-[13px] text-red-600">Reset Konfigurasi Raport</p>
                                    <p className="text-[11px] text-red-500/70 mt-0.5">Kembalikan semua konfigurasi raport ke nilai default</p>
                                </div>
                            </div>
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                    Ini akan menghapus nama sekolah, logo, warna, dan semua konfigurasi raport. Tidak mempengaruhi data siswa atau laporan.
                                </p>
                                <button
                                    onClick={() => {
                                        if (confirm('Reset semua konfigurasi raport ke default? Tindakan ini tidak bisa dibatalkan.')) {
                                            handleReset()
                                            addToast('Konfigurasi direset ke default', 'success')
                                        }
                                    }}
                                    className="shrink-0 h-9 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 text-[11px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                    Reset
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                <div className="h-24" />
            </div>

            {/* ── Floating save bar (Raport tab only) ── */}
            <div className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 px-4 w-full sm:w-auto
                ${dirty && activeTab === 'raport'
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            >
                <div className="flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-2xl">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-400 shrink-0" />
                    <span className="text-[11px] text-[var(--color-text-muted)] font-medium flex-1 sm:flex-none">
                        <span className="hidden sm:inline">Ada perubahan belum disimpan</span>
                        <span className="sm:hidden">Belum disimpan</span>
                    </span>
                    <button
                        onClick={handleReset}
                        className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                    <button
                        onClick={handleSaveRaport} disabled={saving}
                        className="h-8 px-4 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60 shrink-0"
                    >
                        {saving
                            ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            : <FontAwesomeIcon icon={faSave} />
                        }
                        Simpan
                    </button>
                </div>
            </div>

        </DashboardLayout>
    )
}