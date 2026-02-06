import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIdCard, faKey, faSearch, faSpinner, faArrowLeft, faPhone } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { useToast } from '../../context/ToastContext'

// Demo data for parent check
const DEMO_STUDENTS = [
    {
        id: 1,
        code: 'REG-7K3Q-9P2X',
        pin: '1234',
        name: 'Ahmad Rizki Pratama',
        class: 'XII IPA 1',
        photo: null,
        points: -15,
        reports: [
            { id: 1, date: '2024-01-15', type: 'Terlambat', points: -5, teacher: 'Ibu Sari' },
            { id: 2, date: '2024-01-20', type: 'Tidak mengerjakan PR', points: -10, teacher: 'Bapak Budi' },
        ],
        achievements: [
            { id: 1, date: '2024-01-10', type: 'Juara Kelas', points: 20, teacher: 'Wali Kelas' },
        ],
    },
]

export default function ParentCheckPage() {
    const [code, setCode] = useState('')
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [student, setStudent] = useState(null)
    const { addToast } = useToast()

    const handleCheck = async (e) => {
        e.preventDefault()
        if (!code || !pin) {
            addToast('Silakan isi kode registrasi dan PIN', 'warning')
            return
        }

        setLoading(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        const found = DEMO_STUDENTS.find(s =>
            s.code.toLowerCase() === code.toLowerCase() && s.pin === pin
        )

        setLoading(false)

        if (found) {
            setStudent(found)
            addToast('Data ditemukan!', 'success')
        } else {
            addToast('Kode registrasi atau PIN tidak valid', 'error')
        }
    }

    const handleReset = () => {
        setStudent(null)
        setCode('')
        setPin('')
    }

    if (student) {
        return (
            <div className="min-h-screen bg-[var(--color-surface-alt)] py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Cari Siswa Lain
                        </button>
                        <Link to="/" className="text-sm text-indigo-500 hover:text-indigo-600">
                            Kembali ke Beranda
                        </Link>
                    </div>

                    {/* Student Card */}
                    <div className="card mb-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                flex items-center justify-center text-white text-2xl font-bold">
                                {student.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-1">{student.name}</h2>
                                <p className="text-[var(--color-text-muted)]">{student.class}</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    Kode: {student.code}
                                </p>
                            </div>
                        </div>

                        {/* Points Summary */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--color-surface-alt)] rounded-xl">
                            <div className="text-center">
                                <p className={`text-2xl font-bold ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)]">Total Poin</p>
                            </div>
                            <div className="text-center border-x border-[var(--color-border)]">
                                <p className="text-2xl font-bold text-red-500">{student.reports.length}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Pelanggaran</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-500">{student.achievements.length}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Prestasi</p>
                            </div>
                        </div>
                    </div>

                    {/* Violations */}
                    <div className="card mb-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500" />
                            Riwayat Pelanggaran
                        </h3>
                        {student.reports.length > 0 ? (
                            <div className="space-y-3">
                                {student.reports.map(report => (
                                    <div key={report.id} className="flex items-center justify-between p-3 
                    bg-[var(--color-surface-alt)] rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{report.type}</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                {report.date} • {report.teacher}
                                            </p>
                                        </div>
                                        <span className="badge badge-danger">{report.points} poin</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[var(--color-text-muted)] text-sm text-center py-4">
                                Tidak ada pelanggaran 🎉
                            </p>
                        )}
                    </div>

                    {/* Achievements */}
                    <div className="card mb-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            Riwayat Prestasi
                        </h3>
                        {student.achievements.length > 0 ? (
                            <div className="space-y-3">
                                {student.achievements.map(achievement => (
                                    <div key={achievement.id} className="flex items-center justify-between p-3 
                    bg-[var(--color-surface-alt)] rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{achievement.type}</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                {achievement.date} • {achievement.teacher}
                                            </p>
                                        </div>
                                        <span className="badge badge-success">+{achievement.points} poin</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[var(--color-text-muted)] text-sm text-center py-4">
                                Belum ada prestasi tercatat
                            </p>
                        )}
                    </div>

                    {/* Contact */}
                    <div className="card">
                        <h3 className="font-semibold mb-4">Butuh Bantuan?</h3>
                        <div className="flex gap-3">
                            <a
                                href="https://wa.me/6281234567890?text=Halo, saya wali murid..."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary flex-1"
                            >
                                <FontAwesomeIcon icon={faWhatsapp} />
                                Hubungi Sekolah
                            </a>
                            <a href="tel:+6281234567890" className="btn btn-secondary flex-1">
                                <FontAwesomeIcon icon={faPhone} />
                                Telepon
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-alt)] p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
              flex items-center justify-center">
                            <span className="text-white font-bold text-xl">L</span>
                        </div>
                        <span className="text-2xl font-bold gradient-text">Laporanmu</span>
                    </Link>
                    <h1 className="text-2xl font-bold mb-2">Cek Data Anak Anda</h1>
                    <p className="text-[var(--color-text-muted)]">
                        Masukkan kode registrasi dan PIN yang diberikan sekolah
                    </p>
                </div>

                <div className="card">
                    <form onSubmit={handleCheck} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2">Kode Registrasi</label>
                            <div className="relative">
                                <FontAwesomeIcon
                                    icon={faIdCard}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                                />
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="REG-XXXX-XXXX"
                                    className="input pl-10 uppercase"
                                />
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                Contoh: REG-7K3Q-9P2X
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">PIN (4 Digit)</label>
                            <div className="relative">
                                <FontAwesomeIcon
                                    icon={faKey}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                                />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="input pl-10 tracking-[0.5em] text-center"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3"
                        >
                            {loading ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSearch} />
                                    Cek Data
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                        <p className="text-sm text-[var(--color-text-muted)]">
                            <strong className="text-[var(--color-text)]">Demo:</strong> Gunakan kode{' '}
                            <code className="text-indigo-500">REG-7K3Q-9P2X</code> dan PIN{' '}
                            <code className="text-indigo-500">1234</code>
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text)]">
                        Anda staff sekolah? Login di sini
                    </Link>
                </div>
            </div>
        </div>
    )
}
