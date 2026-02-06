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
            <div className="max-w-3xl">
                <h1 className="text-2xl font-bold mb-6">Pengaturan</h1>

                {/* School Info */}
                <div className="card mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <FontAwesomeIcon icon={faSchool} />
                        </div>
                        <h2 className="font-semibold">Informasi Sekolah</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium mb-2">Nama Sekolah</label><input type="text" defaultValue="SMA Negeri 1 Jakarta" className="input" /></div>
                        <div><label className="block text-sm font-medium mb-2">Alamat</label><input type="text" defaultValue="Jl. Pendidikan No. 1" className="input" /></div>
                        <div><label className="block text-sm font-medium mb-2">No. Telepon</label><input type="tel" defaultValue="021-12345678" className="input" /></div>
                        <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" defaultValue="info@sman1jkt.sch.id" className="input" /></div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="card mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <FontAwesomeIcon icon={faPalette} />
                        </div>
                        <h2 className="font-semibold">Tampilan</h2>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[var(--color-surface-alt)] rounded-lg">
                        <div>
                            <p className="font-medium">Mode Gelap</p>
                            <p className="text-sm text-[var(--color-text-muted)]">Aktifkan tampilan gelap untuk kenyamanan mata</p>
                        </div>
                        <button onClick={toggleTheme} className={`w-14 h-8 rounded-full transition-colors ${isDark ? 'bg-indigo-500' : 'bg-gray-300'} relative`}>
                            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${isDark ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div className="card mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBell} />
                        </div>
                        <h2 className="font-semibold">Notifikasi</h2>
                    </div>
                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 bg-[var(--color-surface-alt)] rounded-lg cursor-pointer">
                            <div><p className="font-medium">Notifikasi Email</p><p className="text-sm text-[var(--color-text-muted)]">Kirim email ke wali murid saat ada laporan baru</p></div>
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-indigo-500" />
                        </label>
                        <label className="flex items-center justify-between p-4 bg-[var(--color-surface-alt)] rounded-lg cursor-pointer">
                            <div><p className="font-medium">Notifikasi WhatsApp</p><p className="text-sm text-[var(--color-text-muted)]">Kirim pesan WhatsApp otomatis</p></div>
                            <input type="checkbox" className="w-5 h-5 accent-indigo-500" />
                        </label>
                    </div>
                </div>

                {/* Security */}
                <div className="card mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                            <FontAwesomeIcon icon={faShieldAlt} />
                        </div>
                        <h2 className="font-semibold">Keamanan</h2>
                    </div>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium mb-2">Password Lama</label><input type="password" placeholder="••••••••" className="input" /></div>
                        <div><label className="block text-sm font-medium mb-2">Password Baru</label><input type="password" placeholder="••••••••" className="input" /></div>
                        <div><label className="block text-sm font-medium mb-2">Konfirmasi Password</label><input type="password" placeholder="••••••••" className="input" /></div>
                    </div>
                </div>

                <button onClick={handleSave} className="btn btn-primary">
                    <FontAwesomeIcon icon={faSave} /> Simpan Pengaturan
                </button>
            </div>
        </DashboardLayout>
    )
}
