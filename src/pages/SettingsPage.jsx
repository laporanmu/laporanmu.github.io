import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave, faSchool, faPalette, faBell, faShieldAlt } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

export default function SettingsPage() {
    const { isDark, toggleTheme } = useTheme()
    const { addToast } = useToast()

    const handleSave = () => {
        addToast('Pengaturan berhasil disimpan', 'success')
    }

    return (
        <DashboardLayout title="Pengaturan">
            <div className="max-w-4xl">
                <h1 className="text-2xl font-black font-heading tracking-tight mb-8 text-[var(--color-text)]">Pengaturan</h1>

                {/* School Info */}
                <div className="glass rounded-[1.5rem] mb-8 p-6 lg:p-8 border border-[var(--color-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-4 mb-6 relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)] flex items-center justify-center text-lg shadow-sm">
                            <FontAwesomeIcon icon={faSchool} />
                        </div>
                        <h2 className="text-lg font-black font-heading text-[var(--color-text)]">Informasi Sekolah</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5 relative">
                        <div><label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Nama Sekolah</label><input type="text" defaultValue="SMA Negeri 1 Jakarta" className="input-field font-bold text-sm h-11" /></div>
                        <div><label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Alamat</label><input type="text" defaultValue="Jl. Pendidikan No. 1" className="input-field font-bold text-sm h-11" /></div>
                        <div><label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">No. Telepon</label><input type="tel" defaultValue="021-12345678" className="input-field font-bold text-sm h-11" /></div>
                        <div><label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Email</label><input type="email" defaultValue="info@sman1jkt.sch.id" className="input-field font-bold text-sm h-11 lowercase italic opacity-90" /></div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="glass rounded-[1.5rem] mb-8 p-6 lg:p-8 border border-[var(--color-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-4 mb-6 relative">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg shadow-sm">
                            <FontAwesomeIcon icon={faPalette} />
                        </div>
                        <h2 className="text-lg font-black font-heading text-[var(--color-text)]">Tampilan</h2>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-[var(--color-surface-alt)]/50 rounded-xl border border-[var(--color-border)] relative">
                        <div>
                            <p className="font-bold text-sm text-[var(--color-text)]">Mode Gelap</p>
                            <p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1">Aktifkan tampilan gelap untuk kenyamanan mata saat cahaya redup.</p>
                        </div>
                        <button onClick={toggleTheme} className={`w-14 h-8 rounded-full transition-colors shrink-0 shadow-inner ${isDark ? 'bg-[var(--color-primary)]' : 'bg-gray-300 dark:bg-gray-700'} relative`}>
                            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isDark ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div className="glass rounded-[1.5rem] mb-8 p-6 lg:p-8 border border-[var(--color-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-4 mb-6 relative">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg shadow-sm">
                            <FontAwesomeIcon icon={faBell} />
                        </div>
                        <h2 className="text-lg font-black font-heading text-[var(--color-text)]">Notifikasi</h2>
                    </div>
                    <div className="space-y-4 relative">
                        <label className="flex items-center justify-between p-5 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl cursor-pointer hover:bg-[var(--color-surface-alt)] transition-colors">
                            <div><p className="font-bold text-sm text-[var(--color-text)]">Notifikasi Email</p><p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1">Kirim ringkasan otomatis via email ke wali murid.</p></div>
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-[var(--color-primary)] rounded" />
                        </label>
                        <label className="flex items-center justify-between p-5 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl cursor-pointer hover:bg-[var(--color-surface-alt)] transition-colors">
                            <div><p className="font-bold text-sm text-[var(--color-text)]">Notifikasi WhatsApp</p><p className="text-[11px] font-medium text-[var(--color-text-muted)] mt-1">Kirim peringatan instan via WhatsApp.</p></div>
                            <input type="checkbox" className="w-5 h-5 accent-[var(--color-primary)] rounded" />
                        </label>
                    </div>
                </div>

                {/* Security */}
                <div className="glass rounded-[1.5rem] mb-8 p-6 lg:p-8 border border-[var(--color-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-4 mb-6 relative">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-lg shadow-sm">
                            <FontAwesomeIcon icon={faShieldAlt} />
                        </div>
                        <h2 className="text-lg font-black font-heading text-[var(--color-text)]">Keamanan Akun</h2>
                    </div>
                    <div className="space-y-5 relative">
                        <div><label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Password Saat Ini</label><input type="password" placeholder="••••••••" className="input-field font-bold text-sm h-11" /></div>
                        <div className="grid sm:grid-cols-2 gap-5">
                            <div><label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Password Baru</label><input type="password" placeholder="••••••••" className="input-field font-bold text-sm h-11" /></div>
                            <div><label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Konfirmasi Password</label><input type="password" placeholder="••••••••" className="input-field font-bold text-sm h-11" /></div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mb-10">
                    <button onClick={handleSave} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-12 px-8 font-bold text-sm rounded-xl">
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        <span className="uppercase tracking-widest">SIMPAN PERUBAHAN</span>
                    </button>
                </div>
            </div>
        </DashboardLayout>
    )
}
