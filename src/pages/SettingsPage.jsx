import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSave, faBell, faShieldAlt, faFileLines, faSpinner,
    faUpload, faRotateLeft, faMoon, faSun,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp as faWhatsappBrand } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { useSchoolSettings, DEFAULT_SETTINGS } from '../context/SchoolSettingsContext'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'umum', label: 'Umum', icon: faMoon },
    { id: 'raport', label: 'Raport', icon: faFileLines },
    { id: 'keamanan', label: 'Keamanan', icon: faShieldAlt },
]

// ─── Primitives ───────────────────────────────────────────────────────────────
function FL({ children }) {
    return <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">{children}</label>
}

function Divider() {
    return <div className="h-px bg-[var(--color-border)] my-6" />
}

function Toggle({ checked, onChange }) {
    return (
        <button onClick={() => onChange(!checked)} type="button"
            className={`w-12 h-7 rounded-full transition-colors shrink-0 relative shadow-inner ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
    )
}

function ColorInput({ label, value, onChange }) {
    return (
        <div>
            <FL>{label}</FL>
            <div className="flex items-center gap-2">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-[var(--color-border)] shrink-0 cursor-pointer" style={{ background: value }}>
                    <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <input type="text" value={value} onChange={e => onChange(e.target.value)} maxLength={7} placeholder="#000000"
                    className="input-field font-mono font-bold text-sm h-11 flex-1 uppercase" />
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { isDark, toggleTheme } = useTheme()
    const { addToast } = useToast()
    const { settings, loading: settingsLoading, saveSettings } = useSchoolSettings()

    const [activeTab, setActiveTab] = useState('umum')
    const [saving, setSaving] = useState(false)
    const [savingPw, setSavingPw] = useState(false)
    const [form, setForm] = useState({ ...DEFAULT_SETTINGS })
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const [dirty, setDirty] = useState(false)
    const [notifEmail, setNotifEmail] = useState(true)
    const [notifWa, setNotifWa] = useState(false)

    useEffect(() => {
        if (!settingsLoading) { setForm({ ...DEFAULT_SETTINGS, ...settings }); setDirty(false) }
    }, [settingsLoading, settings])

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true) }

    const handleSave = async () => {
        if (saving) return
        setSaving(true)
        const err = await saveSettings(form)
        setSaving(false)
        if (err) addToast('Gagal: ' + err.message, 'error')
        else { addToast('Pengaturan raport disimpan', 'success'); setDirty(false) }
    }

    const handleReset = () => { setForm({ ...DEFAULT_SETTINGS, ...settings }); setDirty(false) }

    const handleSavePw = async () => {
        if (!pw.current) { addToast('Isi password saat ini', 'warning'); return }
        if (!pw.next) { addToast('Isi password baru', 'warning'); return }
        if (pw.next !== pw.confirm) { addToast('Konfirmasi tidak cocok', 'error'); return }
        setSavingPw(true)
        await new Promise(r => setTimeout(r, 700)) // TODO: supabase.auth.updateUser
        setSavingPw(false)
        addToast('Password berhasil diubah', 'success')
        setPw({ current: '', next: '', confirm: '' })
    }

    return (
        <DashboardLayout title="Pengaturan">
            <div>

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Pengaturan</h1>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium">
                        Preferensi aplikasi, konfigurasi raport, dan keamanan akun.
                    </p>
                </div>

                {/* Tab Bar */}
                <div className="glass rounded-2xl border border-[var(--color-border)] p-1.5 flex gap-1 mb-5">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} type="button"
                            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-black transition-all relative
                                ${activeTab === t.id
                                    ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)/50]'}`}>
                            <FontAwesomeIcon icon={t.icon} className="text-[10px]" />
                            {t.label}
                            {t.id === 'raport' && dirty && (
                                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Panel */}
                <div className="glass rounded-2xl border border-[var(--color-border)] p-6">

                    {/* ── UMUM ── */}
                    {activeTab === 'umum' && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Tampilan & Notifikasi</p>

                            {/* Dark mode */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-sm">
                                        <FontAwesomeIcon icon={isDark ? faMoon : faSun} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-[var(--color-text)]">Mode Gelap</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)]">{isDark ? 'Aktif' : 'Nonaktif'}</p>
                                    </div>
                                </div>
                                <Toggle checked={isDark} onChange={toggleTheme} />
                            </div>

                            <Divider />

                            {/* Notifikasi */}
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Notifikasi</p>
                            {[
                                { label: 'Email', desc: 'Ringkasan otomatis ke wali murid', icon: faBell, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', checked: notifEmail, set: setNotifEmail },
                                { label: 'WhatsApp', desc: 'Peringatan instan via WA', icon: faWhatsappBrand, iconBg: 'bg-green-500/10', iconColor: 'text-green-500', checked: notifWa, set: setNotifWa },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 mt-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${item.iconBg} ${item.iconColor}`}>
                                            <FontAwesomeIcon icon={item.icon} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-[var(--color-text)]">Notifikasi {item.label}</p>
                                            <p className="text-[11px] text-[var(--color-text-muted)]">{item.desc}</p>
                                        </div>
                                    </div>
                                    <Toggle checked={item.checked} onChange={item.set} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── RAPORT ── */}
                    {activeTab === 'raport' && (
                        <div>
                            {/* Identitas */}
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Identitas Sekolah</p>
                            <div className="grid sm:grid-cols-2 gap-4 mb-0">
                                <div className="sm:col-span-2">
                                    <FL>Nama Sekolah (Latin)</FL>
                                    <input type="text" value={form.school_name_id} onChange={e => set('school_name_id', e.target.value)}
                                        className="input-field font-bold text-sm h-11" placeholder="Muhammadiyah Boarding School" />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Nama Sekolah (Arab)</FL>
                                    <input type="text" value={form.school_name_ar} onChange={e => set('school_name_ar', e.target.value)}
                                        dir="rtl" className="input-field font-bold text-sm h-11 text-right" placeholder="معهد ..." />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Sub-judul Arab (opsional)</FL>
                                    <input type="text" value={form.school_subtitle_ar} onChange={e => set('school_subtitle_ar', e.target.value)}
                                        dir="rtl" className="input-field text-sm h-11 text-right" placeholder="المجلس التعليمي ..." />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Alamat</FL>
                                    <input type="text" value={form.school_address} onChange={e => set('school_address', e.target.value)}
                                        className="input-field text-sm h-11" />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>URL / Path Logo</FL>
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center overflow-hidden shrink-0">
                                            {form.logo_url
                                                ? <img src={form.logo_url} alt="logo" className="w-9 h-9 object-contain" onError={e => e.target.style.display = 'none'} />
                                                : <FontAwesomeIcon icon={faUpload} className="text-[var(--color-text-muted)] text-xs" />
                                            }
                                        </div>
                                        <input type="text" value={form.logo_url} onChange={e => set('logo_url', e.target.value)}
                                            className="input-field text-sm h-11 flex-1" placeholder="/src/assets/logo.png" />
                                    </div>
                                </div>
                            </div>

                            <Divider />

                            {/* Kepala */}
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Kepala Sekolah / Direktur</p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <FL>Jabatan (Indonesia)</FL>
                                    <input type="text" value={form.headmaster_title_id} onChange={e => set('headmaster_title_id', e.target.value)}
                                        className="input-field text-sm h-11" />
                                </div>
                                <div>
                                    <FL>Nama (Indonesia)</FL>
                                    <input type="text" value={form.headmaster_name_id} onChange={e => set('headmaster_name_id', e.target.value)}
                                        className="input-field font-bold text-sm h-11" />
                                </div>
                                <div>
                                    <FL>Jabatan (Arab)</FL>
                                    <input type="text" value={form.headmaster_title_ar} onChange={e => set('headmaster_title_ar', e.target.value)}
                                        dir="rtl" className="input-field text-sm h-11 text-right" />
                                </div>
                                <div>
                                    <FL>Nama (Arab)</FL>
                                    <input type="text" value={form.headmaster_name_ar} onChange={e => set('headmaster_name_ar', e.target.value)}
                                        dir="rtl" className="input-field font-bold text-sm h-11 text-right" />
                                </div>
                            </div>

                            <Divider />

                            {/* Warna */}
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Warna & Tampilan</p>
                            <div className="grid sm:grid-cols-2 gap-4 mb-5">
                                <ColorInput label="Warna Primer" value={form.report_color_primary} onChange={v => set('report_color_primary', v)} />
                                <ColorInput label="Warna Sekunder" value={form.report_color_secondary} onChange={v => set('report_color_secondary', v)} />
                            </div>
                            <FL>Preview Header Raport</FL>
                            <RaportPreview form={form} />

                            <Divider />

                            {/* WA Footer */}
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Footer WhatsApp</p>
                            <input type="text" value={form.wa_footer} onChange={e => set('wa_footer', e.target.value)}
                                className="input-field text-sm h-11" placeholder="Nama Sekolah · Sistem Laporanmu" />
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-2 ml-1">
                                Tampil sebagai: <em className="text-[var(--color-text)]">_{form.wa_footer || '...'}_</em>
                            </p>

                            {/* Save footer */}
                            <div className={`flex items-center justify-end gap-2 mt-6 pt-5 border-t border-[var(--color-border)] transition-opacity duration-200 ${dirty ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <span className="text-[10px] text-[var(--color-text-muted)] font-medium mr-auto">Ada perubahan belum disimpan</span>
                                <button onClick={handleReset}
                                    className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" /> Reset
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="h-9 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                                    {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" /> : <FontAwesomeIcon icon={faSave} className="text-[9px]" />}
                                    Simpan
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── KEAMANAN ── */}
                    {activeTab === 'keamanan' && (
                        <div>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Ubah Password</p>
                            <div className="space-y-4">
                                <div>
                                    <FL>Password Saat Ini</FL>
                                    <input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
                                        placeholder="••••••••" className="input-field font-bold text-sm h-11" />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <FL>Password Baru</FL>
                                        <input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                                            placeholder="••••••••" className="input-field font-bold text-sm h-11" />
                                    </div>
                                    <div>
                                        <FL>Konfirmasi</FL>
                                        <input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                                            placeholder="••••••••" className="input-field font-bold text-sm h-11" />
                                    </div>
                                </div>

                                {/* Password strength */}
                                {pw.next && (
                                    <div className="flex items-center gap-2">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${pw.next.length > i * 3
                                                    ? pw.next.length >= 12 ? 'bg-emerald-400' : pw.next.length >= 8 ? 'bg-amber-400' : 'bg-red-400'
                                                    : 'bg-[var(--color-border)]'
                                                }`} />
                                        ))}
                                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 font-bold">
                                            {pw.next.length >= 12 ? 'Kuat' : pw.next.length >= 8 ? 'Cukup' : 'Lemah'}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button onClick={handleSavePw} disabled={savingPw}
                                        className="h-10 px-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-black hover:bg-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                                        {savingPw ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faShieldAlt} />}
                                        Ubah Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8" />
            </div>
        </DashboardLayout>
    )
}