import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIdCard, faKey, faSearch, faSpinner, faArrowLeft, faPhone, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'

export default function ParentCheckPage() {
    const [code, setCode] = useState('')
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [autoChecking, setAutoChecking] = useState(false)
    const [student, setStudent] = useState(null)
    const [errorMessage, setErrorMessage] = useState('')
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()

    const performCheck = useCallback(async (checkCode, checkPin) => {
        if (!checkCode || !checkPin) {
            setErrorMessage('Kode registrasi dan PIN harus diisi')
            return
        }
        const normalizedCode = checkCode.trim().toUpperCase()
        const normalizedPin = checkPin.trim()

        setLoading(true)
        setErrorMessage('')

        try {
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select(`*, classes (id, name)`)
                .eq('registration_code', normalizedCode)
                .eq('pin', normalizedPin)
                .single()

            if (studentError || !studentData) {
                throw new Error('Kode registrasi atau PIN tidak valid. Pastikan Anda memasukkan data yang benar.')
            }

            const { data: historyData } = await supabase
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
            addToast('Data siswa berhasil ditemukan!', 'success')
        } catch (err) {
            setErrorMessage(err.message)
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
            setAutoChecking(false)
        }
    }, [addToast])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlCode = params.get('code')
        const urlPin = params.get('pin')
        if (urlCode && urlPin) {
            setCode(urlCode)
            setPin(urlPin)
            setAutoChecking(true)
            setTimeout(() => performCheck(urlCode, urlPin), 300)
        }
    }, [performCheck])

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
        window.history.replaceState({}, '', '/check')
    }

    // Auto-checking loading
    if (autoChecking) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-11 h-11 rounded-lg bg-indigo-600 flex items-center justify-center mx-auto mb-3">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-base text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Memuat Data...</p>
                    <p className="text-xs text-gray-400 mt-1">Mohon tunggu sebentar</p>
                </div>
            </div>
        )
    }

    // Student result view
    if (student) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 px-4 transition-colors">
                <div className="max-w-[420px] mx-auto space-y-4">
                    {/* Nav */}
                    <div className="flex items-center justify-between">
                        <button onClick={handleReset} className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5 uppercase tracking-wide">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" /> Cari Lain
                        </button>
                        <div className="flex items-center gap-2">
                            <Link to="/" className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wide">Beranda</Link>
                            <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-xs" />
                            </button>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden">
                                {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    student.name.charAt(0)
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight truncate">{student.name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                        {student.class}
                                    </span>
                                    <span className="text-[11px] font-mono text-gray-400">{student.registration_code}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <div className="text-center">
                                <p className={`text-lg font-bold ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Poin</p>
                            </div>
                            <div className="text-center border-x border-gray-100 dark:border-gray-800">
                                <p className="text-lg font-bold text-red-500">{student.reports.length}</p>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Laporan</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-emerald-500">{student.achievements.length}</p>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Prestasi</p>
                            </div>
                        </div>
                    </div>

                    {/* Reports */}
                    <div className="space-y-2.5">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-0.5 flex items-center gap-1.5">
                            <span className="w-0.5 h-3.5 bg-red-500 rounded-full" /> Riwayat Pelanggaran
                        </p>
                        {student.reports.length > 0 ? (
                            <div className="space-y-2">
                                {student.reports.map((report) => (
                                    <div key={report.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 flex justify-between items-center gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate">{report.type}</p>
                                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                                <span>{report.date}</span>
                                                <span className="opacity-30">·</span>
                                                <span className="truncate">{report.teacher}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded shrink-0">
                                            {report.points}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center">
                                <p className="text-[11px] font-medium text-gray-300">TIDAK ADA DATA</p>
                            </div>
                        )}
                    </div>

                    {/* Achievements */}
                    <div className="space-y-2.5">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-0.5 flex items-center gap-1.5">
                            <span className="w-0.5 h-3.5 bg-emerald-500 rounded-full" /> Riwayat Prestasi
                        </p>
                        {student.achievements.length > 0 ? (
                            <div className="space-y-2">
                                {student.achievements.map((item) => (
                                    <div key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 flex justify-between items-center gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate">{item.type}</p>
                                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                                <span>{item.date}</span>
                                                <span className="opacity-30">·</span>
                                                <span className="truncate">{item.teacher}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded shrink-0">
                                            +{item.points}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center">
                                <p className="text-[11px] font-medium text-gray-300">BELUM ADA DATA</p>
                            </div>
                        )}
                    </div>

                    {/* Support */}
                    <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white">Butuh Bimbingan?</p>
                            <p className="text-[11px] text-gray-400 truncate">Konsultasi dengan pihak sekolah</p>
                        </div>
                        <div className="flex gap-2">
                            <a href="https://wa.me/6281234567890" className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-sm hover:bg-emerald-600 transition-colors">
                                <FontAwesomeIcon icon={faWhatsapp} />
                            </a>
                            <a href="tel:+6281234567890" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-white text-sm hover:bg-gray-700 transition-colors">
                                <FontAwesomeIcon icon={faPhone} />
                            </a>
                        </div>
                    </div>

                    <p className="text-center text-[10px] font-medium text-gray-300 dark:text-gray-700 uppercase tracking-widest pt-1">
                        Laporanmu © 2026 • Portal Orang Tua
                    </p>
                </div>
            </div>
        )
    }

    // Form view
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 transition-colors">
            <div className="w-full max-w-[420px] space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <span className="text-white font-semibold text-base">L</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-800 dark:text-white">Laporanmu</span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                        <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-sm" />
                    </button>
                </div>

                {/* Title */}
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cek Data Anak</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Gunakan kode registrasi & PIN dari sekolah</p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                    <form onSubmit={handleCheck} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kode Registrasi</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faIdCard} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-300 dark:text-gray-600" />
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(formatCode(e.target.value))}
                                    placeholder="REG-XXXX-XXXX"
                                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-medium uppercase tracking-wide text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">PIN (4 Digit)</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faKey} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-300 dark:text-gray-600" />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-medium tracking-[0.3em] text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 rounded-lg">
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium transition-all ${loading ? 'opacity-70' : 'hover:bg-indigo-700 active:scale-[0.98]'}`}
                        >
                            {loading ? (
                                <><FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> Memeriksa...</>
                            ) : (
                                <><FontAwesomeIcon icon={faSearch} className="text-sm" /> Cek Data Siswa</>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-[11px] text-gray-400 text-center">Dapatkan Kode & PIN dari Wali Kelas</p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex items-center justify-between text-xs">
                    <Link to="/login" className="text-gray-400 hover:text-indigo-500 transition-colors">
                        Staff sekolah? <span className="font-medium text-indigo-500">Login di sini</span>
                    </Link>
                    <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        ← Beranda
                    </Link>
                </div>
            </div>
        </div>
    )
}