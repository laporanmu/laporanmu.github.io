import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIdCard, faKey, faSearch, faSpinner, faArrowLeft, faPhone, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'

// Demo data for parent check
// Demo data removed - using Supabase live

export default function ParentCheckPage() {
    const [code, setCode] = useState('')
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [student, setStudent] = useState(null)
    const [errorMessage, setErrorMessage] = useState('')
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()

    // Support Auto-Login from QR Code
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlCode = params.get('code')
        const urlPin = params.get('pin')

        if (urlCode && urlPin) {
            setCode(urlCode)
            setPin(urlPin)
            // Trigger check automatically
            performCheck(urlCode, urlPin)
        }
    }, [])

    const performCheck = async (checkCode, checkPin) => {
        if (!checkCode || !checkPin) return

        setLoading(true)
        setErrorMessage('')

        try {
            // Fetch student with class info
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select(`
                    *,
                    classes (id, name)
                `)
                .eq('registration_code', checkCode)
                .eq('pin', checkPin)
                .single()

            if (studentError || !studentData) {
                throw new Error('Kode registrasi atau PIN tidak valid')
            }

            // Fetch behavior history
            const { data: historyData, error: historyError } = await supabase
                .from('behavior_reports')
                .select('*')
                .eq('student_id', studentData.id)
                .order('created_at', { ascending: false })

            const reports = (historyData || []).filter(h => h.points < 0).map(h => ({
                id: h.id,
                date: new Date(h.created_at).toLocaleDateString('id-ID'),
                type: h.type,
                points: h.points,
                teacher: h.teacher_name || 'Staff Sekolah'
            }))

            const achievements = (historyData || []).filter(h => h.points >= 0).map(h => ({
                id: h.id,
                date: new Date(h.created_at).toLocaleDateString('id-ID'),
                type: h.type,
                points: h.points,
                teacher: h.teacher_name || 'Staff Sekolah'
            }))

            setStudent({
                ...studentData,
                class: studentData.classes?.name || '-',
                points: studentData.total_points || 0,
                reports,
                achievements
            })

            addToast('Data ditemukan!', 'success')
        } catch (err) {
            setErrorMessage(err.message)
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

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
        performCheck(code, pin)
    }

    const handleReset = () => {
        setStudent(null)
        setCode('')
        setPin('')
        setErrorMessage('')
    }

    if (student) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-950 py-6 px-4 font-poppins transition-all">
                <div className="max-w-[400px] mx-auto space-y-5 animate-in slide-in-from-bottom-3 duration-500 relative">
                    {/* Theme Toggle Floating */}
                    <button
                        onClick={toggleTheme}
                        className="absolute -top-1 -right-1 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-all border border-gray-100 dark:border-gray-800 shadow-sm z-10"
                    >
                        <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-xs" />
                    </button>

                    {/* Ultra-Slim Header */}
                    <div className="flex items-center justify-between px-0.5">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className="text-[7px]" />
                            Cari Lain
                        </button>
                        <Link to="/" className="text-[9px] font-bold text-gray-400 dark:text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest">
                            Beranda
                        </Link>
                    </div>

                    {/* Compact Profile Card */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-600/10 shrink-0 overflow-hidden">
                                {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    student.name.charAt(0)
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate leading-tight mb-1">{student.name}</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                                        {student.class}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                        {student.registration_code}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Ultra-Slim Stats */}
                        <div className="grid grid-cols-3 border-t border-gray-50 dark:border-gray-800 pt-3">
                            <div className="text-center">
                                <p className={`text-base font-black ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Poin</p>
                            </div>
                            <div className="text-center border-x border-gray-50 dark:border-gray-800">
                                <p className="text-base font-black text-red-500">{student.reports.length}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Laporan</p>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-black text-emerald-500">{student.achievements.length}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Prestasi</p>
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        {/* Reports List */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                                <span className="w-1 h-3 bg-red-500 rounded-full" />
                                Riwayat Pelanggaran
                            </p>
                            {student.reports.length > 0 ? (
                                <div className="space-y-1.5">
                                    {student.reports.map((report) => (
                                        <div key={report.id} className="bg-white dark:bg-gray-900 shadow-sm border border-gray-50 dark:border-gray-800 rounded-xl p-3 flex justify-between items-center gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate mb-0.5">{report.type}</p>
                                                <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-medium">
                                                    <span>{report.date}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span className="truncate">{report.teacher}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-lg shrink-0">
                                                {report.points}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-[10px] font-bold text-gray-300">TIDAK ADA DATA</p>
                                </div>
                            )}
                        </div>

                        {/* Achievements List */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                                <span className="w-1 h-3 bg-emerald-500 rounded-full" />
                                Riwayat Prestasi
                            </p>
                            {student.achievements.length > 0 ? (
                                <div className="space-y-1.5">
                                    {student.achievements.map((item) => (
                                        <div key={item.id} className="bg-white dark:bg-gray-900 shadow-sm border border-gray-50 dark:border-gray-800 rounded-xl p-3 flex justify-between items-center gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate mb-0.5">{item.type}</p>
                                                <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-medium">
                                                    <span>{item.date}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span className="truncate">{item.teacher}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-lg shrink-0">
                                                +{item.points}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-[10px] font-bold text-gray-300">BELUM ADA DATA</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Support Button (Floating Style) */}
                    <div className="bg-gray-900 dark:bg-gray-900 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h4 className="text-[12px] font-bold text-white mb-0.5">Butuh Bimbingan?</h4>
                            <p className="text-[10px] text-gray-400 truncate">Konsultasi dengan pihak sekolah</p>
                        </div>
                        <div className="flex gap-1.5">
                            <a href={`https://wa.me/6281234567890`} className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs hover:bg-emerald-600 transition-colors">
                                <FontAwesomeIcon icon={faWhatsapp} />
                            </a>
                            <a href={`tel:+6281234567890`} className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-white text-xs hover:bg-gray-700 transition-colors">
                                <FontAwesomeIcon icon={faPhone} />
                            </a>
                        </div>
                    </div>

                    <p className="text-center text-[8px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest pt-2">
                        Laporanmu © 2026 • Portal Orang Tua
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-white dark:bg-gray-950 p-4 pt-[12vh] font-poppins transition-colors">
            <div className="w-full max-w-[340px] animate-in zoom-in-95 duration-500 relative">
                {/* Theme Toggle Floating */}
                <button
                    onClick={toggleTheme}
                    className="absolute -top-1 -right-1 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-all border border-gray-100 dark:border-gray-800 shadow-sm z-10"
                >
                    <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-xs" />
                </button>

                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 mb-5 group">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold text-base">L</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Laporanmu</span>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Cek Data Anak</h1>
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mb-4">
                        Gunakan kode registrasi & PIN dari sekolah
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                    <form onSubmit={handleCheck} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                                Kode Registrasi
                            </label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                                    <FontAwesomeIcon icon={faIdCard} className="text-xs" />
                                </span>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(formatCode(e.target.value))}
                                    placeholder="REG-XXXX-XXXX"
                                    className="w-full bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-[13px] font-semibold uppercase tracking-wide placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                                PIN (4 Digit)
                            </label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                                    <FontAwesomeIcon icon={faKey} className="text-xs" />
                                </span>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-[13px] font-bold tracking-[0.4em] placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <p className="text-[10px] font-medium text-red-500 px-1">
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold transition-all ${loading ? 'opacity-80' : 'hover:bg-indigo-700 active:scale-[0.98]'}`}
                        >
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                                    <span>Memeriksa...</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSearch} className="text-xs" />
                                    <span>Cek Data Siswa</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 text-center flex flex-col gap-0.5">
                            <p className="flex items-center justify-center gap-1.5 opacity-60">
                                <span className="w-1 h-1 rounded-full bg-indigo-500" />
                                PORTAL RESMI SEKOLAH
                            </p>
                            <p className="mt-1">Dapatkan Kode & PIN dari Wali Kelas</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col items-center gap-4">
                    <Link to="/login" className="flex items-center gap-2 group">
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Staff sekolah?</span>
                        <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 group-hover:underline">Login di sini</span>
                    </Link>

                    <Link to="/" className="text-[9px] font-bold text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-500 transition-colors uppercase tracking-widest flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faArrowLeft} className="text-[7px]" />
                        Kembali Ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    )
}

