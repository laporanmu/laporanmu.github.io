import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faBell, faShieldAlt, faSpinner,
    faMoon, faSun,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'umum', label: 'Umum', icon: faMoon },
    { id: 'keamanan', label: 'Keamanan', icon: faShieldAlt },
]

// ─── Primitives ───────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { isDark, toggleTheme } = useTheme()
    const { addToast } = useToast()

    const [activeTab, setActiveTab] = useState('umum')
    const [savingPw, setSavingPw] = useState(false)
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const [notifEmail, setNotifEmail] = useState(true)
    const [notifWa, setNotifWa] = useState(false)

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
                                { label: 'WhatsApp', desc: 'Peringatan instan via WA', icon: faWhatsapp, iconBg: 'bg-green-500/10', iconColor: 'text-green-500', checked: notifWa, set: setNotifWa },
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

                    {/* ── KEAMANAN ── */}
                    {activeTab === 'keamanan' && (
                        <div>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Ubah Password</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Password Saat Ini</label>
                                    <input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
                                        placeholder="••••••••" className="input-field font-bold text-sm h-11" />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Password Baru</label>
                                        <input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                                            placeholder="••••••••" className="input-field font-bold text-sm h-11" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Konfirmasi</label>
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