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
    const [errorMessage, setErrorMessage] = useState('')
    const { addToast } = useToast()

    const formatCode = (value) => {
        const raw = value.replace(/-/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
        const part1 = raw.slice(0, 3)
        const part2 = raw.slice(3, 7)
        const part3 = raw.slice(7, 11)
        let formatted = part1
        if (part2) formatted += '-' + part2
        if (part3) formatted += '-' + part3
        return formatted
    }

    const handleCheck = async (e) => {
        e.preventDefault()
        if (!code || !pin) {
            const msg = 'Silakan isi kode registrasi dan PIN'
            setErrorMessage(msg)
            addToast(msg, 'warning')
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
            setErrorMessage('')
            addToast('Data ditemukan!', 'success')
            return
        }

        const msg = 'Kode registrasi atau PIN tidak valid'
        setErrorMessage(msg)
        addToast(msg, 'error')
    }

    const handleReset = () => {
        setStudent(null)
        setCode('')
        setPin('')
        setErrorMessage('')
    }

    if (student) {
        return (
            <div className="min-h-screen bg-[var(--color-surface-alt)] py-8 px-4 font-poppins animate-in fade-in duration-500">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors group"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className="group-hover:-translate-x-1 transition-transform" />
                            Cari Siswa Lain
                        </button>
                        <Link to="/" className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
                            Kembali ke Beranda
                        </Link>
                    </div>

                    {/* Student Card */}
                    <div className="card overflow-hidden shadow-lg shadow-indigo-500/10 border-t-4 border-indigo-500">
                        <div className="bg-indigo-500/5 -mx-6 -mt-6 p-6 mb-6 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-indigo-600 
                    flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-white dark:ring-gray-800">
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">{student.name}</h2>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="badge badge-primary">{student.class}</span>
                                        <span className="badge badge-secondary text-xs">{student.code}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Points Summary */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                            <div className="text-center">
                                <p className={`text-2xl sm:text-3xl font-bold ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mt-1">Total Poin</p>
                            </div>
                            <div className="text-center border-x border-[var(--color-border)]">
                                <p className="text-2xl sm:text-3xl font-bold text-red-500">{student.reports.length}</p>
                                <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mt-1">Pelanggaran</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-emerald-500">{student.achievements.length}</p>
                                <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mt-1">Prestasi</p>
                            </div>
                        </div>
                    </div>

                    {/* Violations */}
                    <div className="card shadow-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="w-2 h-8 rounded-full bg-red-500" />
                            Riwayat Pelanggaran
                        </h3>
                        {student.reports.length > 0 ? (
                            <div className="space-y-3">
                                {student.reports.map((report, idx) => (
                                    <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 
                    bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] hover:border-red-200 dark:hover:border-red-900/30 transition-colors gap-3 animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div>
                                            <p className="font-semibold text-[var(--color-text)]">{report.type}</p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                                                <span>📅 {report.date}</span>
                                                <span>•</span>
                                                <span>👨‍🏫 {report.teacher}</span>
                                            </p>
                                        </div>
                                        <span className="badge badge-danger self-start sm:self-center shrink-0">{report.points} poin</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-[var(--color-surface-alt)] rounded-xl border border-dashed border-[var(--color-border)]">
                                <p className="text-[var(--color-text-muted)]">Tidak ada pelanggaran 🎉</p>
                            </div>
                        )}
                    </div>

                    {/* Achievements */}
                    <div className="card shadow-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="w-2 h-8 rounded-full bg-emerald-500" />
                            Riwayat Prestasi
                        </h3>
                        {student.achievements.length > 0 ? (
                            <div className="space-y-3">
                                {student.achievements.map((achievement, idx) => (
                                    <div key={achievement.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 
                    bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-colors gap-3 animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div>
                                            <p className="font-semibold text-[var(--color-text)]">{achievement.type}</p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                                                <span>📅 {achievement.date}</span>
                                                <span>•</span>
                                                <span>🏆 {achievement.teacher}</span>
                                            </p>
                                        </div>
                                        <span className="badge badge-success self-start sm:self-center shrink-0">+{achievement.points} poin</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-[var(--color-surface-alt)] rounded-xl border border-dashed border-[var(--color-border)]">
                                <p className="text-[var(--color-text-muted)]">Belum ada prestasi tercatat</p>
                            </div>
                        )}
                    </div>

                    {/* Contact */}
                    <div className="card shadow-sm border-indigo-500/20">
                        <h3 className="font-semibold mb-4 text-center sm:text-left">Butuh Bantuan?</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href="https://wa.me/6281234567890?text=Halo, saya wali murid..."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary flex-1 justify-center py-3"
                            >
                                <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                                <span className="ml-2">Hubungi Sekolah</span>
                            </a>
                            <a href="tel:+6281234567890" className="btn btn-secondary flex-1 justify-center py-3">
                                <FontAwesomeIcon icon={faPhone} />
                                <span className="ml-2">Telepon</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-alt)] p-4 font-poppins">
            <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 
              flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold text-xl">L</span>
                        </div>
                        <span className="text-2xl font-bold text-[var(--color-text)]">Laporanmu</span>
                    </Link>
                    <h1 className="text-2xl font-bold mb-2">Cek Data Anak Anda</h1>
                    <p className="text-[var(--color-text-muted)]">
                        Masukkan kode registrasi dan PIN yang diberikan sekolah
                    </p>
                </div>

                <div className="card shadow-xl shadow-indigo-500/10 border-t-4 border-indigo-500">
                    <form onSubmit={handleCheck} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2">Kode Registrasi</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--color-text-muted)]">
                                    <FontAwesomeIcon icon={faIdCard} />
                                </span>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(formatCode(e.target.value))}
                                    placeholder="REG-XXXX-XXXX"
                                    className="input pl-10 pr-3 py-3 uppercase tracking-wide font-medium w-full"
                                />
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1.5 flex justify-between">
                                <span>Contoh: REG-7K3Q-9P2X</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">PIN (4 Digit)</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[var(--color-text-muted)]">
                                    <FontAwesomeIcon icon={faKey} />
                                </span>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="input pl-10 pr-3 py-3 tracking-[0.5em] text-center font-bold text-lg w-full"
                                    aria-invalid={!!errorMessage}
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <p className="text-xs text-red-500 -mt-2">
                                {errorMessage}
                            </p>
                        )}


                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3.5 font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                                    Memeriksa data...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSearch} className="mr-2" />
                                    Cek Data
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                        <p className="text-sm text-[var(--color-text-muted)] flex flex-col gap-1">
                            <span className="font-semibold text-[var(--color-text)] flex items-center gap-2">
                                💡 Info Demo:
                            </span>
                            <span>Gunakan Kode: <code className="bg-white dark:bg-black/20 px-1.5 py-0.5 rounded text-indigo-500 font-mono font-bold mx-1 border border-indigo-500/20">REG-7K3Q-9P2X</code></span>
                            <span>PIN: <code className="bg-white dark:bg-black/20 px-1.5 py-0.5 rounded text-indigo-500 font-mono font-bold mx-1 border border-indigo-500/20">1234</code></span>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center space-y-4">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--color-border)]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">Atau</span>
                        </div>
                    </div>

                    <Link to="/login" className="inline-flex items-center gap-2 text-[var(--color-text-muted)] text-sm hover:text-indigo-500 transition-colors group">
                        <span>Anda staff sekolah?</span>
                        <span className="font-semibold underline decoration-2 decoration-transparent group-hover:decoration-indigo-500 transition-all">Login Staff</span>
                    </Link>

                    <div className="pt-4 border-t border-[var(--color-border)] w-full max-w-xs mx-auto">
                        <Link to="/" className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text)] transition-colors flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                            Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </div >
        </div >
    )
}

