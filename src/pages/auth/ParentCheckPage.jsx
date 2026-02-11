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

    // Memoized perform check function
    const performCheck = useCallback(async (checkCode, checkPin) => {
        if (!checkCode || !checkPin) {
            setErrorMessage('Kode registrasi dan PIN harus diisi')
            return
        }

        // Normalize input - remove spaces, ensure uppercase
        const normalizedCode = checkCode.trim().toUpperCase()
        const normalizedPin = checkPin.trim()

        console.log('🔍 Checking with:', { code: normalizedCode, pin: normalizedPin })

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
                .eq('registration_code', normalizedCode)
                .eq('pin', normalizedPin)
                .single()

            console.log('📊 Student query result:', { studentData, studentError })

            if (studentError || !studentData) {
                throw new Error('Kode registrasi atau PIN tidak valid. Pastikan Anda memasukkan data yang benar.')
            }

            // Fetch behavior history
            const { data: historyData, error: historyError } = await supabase
                .from('behavior_reports')
                .select('*')
                .eq('student_id', studentData.id)
                .order('created_at', { ascending: false })

            console.log('📜 History query result:', { count: historyData?.length || 0, historyError })

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
            console.error('❌ Check error:', err)
            setErrorMessage(err.message)
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
            setAutoChecking(false)
        }
    }, [addToast])

    // Support Auto-Login from QR Code - FIXED
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlCode = params.get('code')
        const urlPin = params.get('pin')

        console.log('🔗 URL Params detected:', { urlCode, urlPin })

        if (urlCode && urlPin) {
            setCode(urlCode)
            setPin(urlPin)
            setAutoChecking(true)

            // Add small delay to ensure state is set
            setTimeout(() => {
                performCheck(urlCode, urlPin)
            }, 300)
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

        // Clear URL params
        window.history.replaceState({}, '', '/check')
    }

    // Auto-checking loading screen
    if (autoChecking) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4 font-poppins">
                <div className="text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20 mx-auto mb-4">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Memuat Data Siswa...</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Mohon tunggu sebentar</p>
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        )
    }

    if (student) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-950 py-6 px-4 font-poppins transition-all">
                <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-3 duration-500 relative">
                    {/* Header Navigation */}
                    <div className="flex items-center justify-between px-1">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                            Cari Lain
                        </button>
                        <div className="flex items-center gap-2">
                            <Link to="/" className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider">
                                Beranda
                            </Link>
                            {/* Theme Toggle - Moved here */}
                            <button
                                onClick={toggleTheme}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-all border border-gray-100 dark:border-gray-800"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-xs" />
                            </button>
                        </div>
                    </div>

                    {/* Profile Card - BIGGER */}
                    <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-lg">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-indigo-600/10 shrink-0 overflow-hidden">
                                {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    student.name.charAt(0)
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">{student.name}</h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg">
                                        {student.class}
                                    </span>
                                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                                        {student.registration_code}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid - BIGGER */}
                        <div className="grid grid-cols-3 border-t border-gray-50 dark:border-gray-800 pt-5">
                            <div className="text-center">
                                <p className={`text-2xl font-black ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'} mb-1`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Poin</p>
                            </div>
                            <div className="text-center border-x border-gray-50 dark:border-gray-800">
                                <p className="text-2xl font-black text-red-500 mb-1">{student.reports.length}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Laporan</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-emerald-500 mb-1">{student.achievements.length}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prestasi</p>
                            </div>
                        </div>
                    </div>

                    {/* History Section - BIGGER */}
                    <div className="space-y-5">
                        {/* Reports List */}
                        <div className="space-y-3">
                            <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 flex items-center gap-2">
                                <span className="w-1 h-4 bg-red-500 rounded-full" />
                                Riwayat Pelanggaran
                            </p>
                            {student.reports.length > 0 ? (
                                <div className="space-y-2">
                                    {student.reports.map((report) => (
                                        <div key={report.id} className="bg-white dark:bg-gray-900 shadow-sm border border-gray-50 dark:border-gray-800 rounded-2xl p-4 flex justify-between items-center gap-4">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-tight">{report.type}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                    <span>{report.date}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span className="truncate">{report.teacher}</span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg shrink-0">
                                                {report.points}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-xs font-bold text-gray-300">TIDAK ADA DATA</p>
                                </div>
                            )}
                        </div>

                        {/* Achievements List */}
                        <div className="space-y-3">
                            <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 flex items-center gap-2">
                                <span className="w-1 h-4 bg-emerald-500 rounded-full" />
                                Riwayat Prestasi
                            </p>
                            {student.achievements.length > 0 ? (
                                <div className="space-y-2">
                                    {student.achievements.map((item) => (
                                        <div key={item.id} className="bg-white dark:bg-gray-900 shadow-sm border border-gray-50 dark:border-gray-800 rounded-2xl p-4 flex justify-between items-center gap-4">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-tight">{item.type}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                    <span>{item.date}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span className="truncate">{item.teacher}</span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg shrink-0">
                                                +{item.points}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-xs font-bold text-gray-300">BELUM ADA DATA</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Support Button - BIGGER */}
                    <div className="bg-gray-900 dark:bg-gray-900 rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white mb-1">Butuh Bimbingan?</h4>
                            <p className="text-xs text-gray-400 truncate">Konsultasi dengan pihak sekolah</p>
                        </div>
                        <div className="flex gap-2">
                            <a href={`https://wa.me/6281234567890`} className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm hover:bg-emerald-600 transition-colors shadow-lg">
                                <FontAwesomeIcon icon={faWhatsapp} />
                            </a>
                            <a href={`tel:+6281234567890`} className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-white text-sm hover:bg-gray-700 transition-colors">
                                <FontAwesomeIcon icon={faPhone} />
                            </a>
                        </div>
                    </div>

                    <p className="text-center text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest pt-2">
                        Laporanmu © 2026 • Portal Orang Tua
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 p-4 pt-8 font-poppins transition-colors">
            <div className="w-full max-w-md mx-auto animate-in zoom-in-95 duration-500 relative flex-1 flex flex-col">
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-6 relative">
                        <Link to="/" className="inline-flex items-center gap-3 group">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                <span className="text-white font-bold text-xl">L</span>
                            </div>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Laporanmu</span>
                        </Link>
                        {/* Theme Toggle - Inline */}
                        <button
                            onClick={toggleTheme}
                            className="absolute right-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-all border border-gray-100 dark:border-gray-800 shadow-sm"
                        >
                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-sm" />
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cek Data Anak</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                        Gunakan kode registrasi & PIN dari sekolah
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900/50 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
                    <form onSubmit={handleCheck} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">
                                Kode Registrasi
                            </label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                                    <FontAwesomeIcon icon={faIdCard} className="text-base" />
                                </span>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(formatCode(e.target.value))}
                                    placeholder="REG-XXXX-XXXX"
                                    className="w-full bg-gray-50/50 dark:bg-gray-800/30 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-12 pr-4 py-3.5 text-base font-semibold uppercase tracking-wide placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">
                                PIN (4 Digit)
                            </label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                                    <FontAwesomeIcon icon={faKey} className="text-base" />
                                </span>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full bg-gray-50/50 dark:bg-gray-800/30 border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-12 pr-4 py-3.5 text-lg font-bold tracking-[0.5em] placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-900/30 rounded-xl p-4">
                                <p className="text-sm font-medium text-red-600 dark:text-red-400 leading-relaxed">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-indigo-600 text-white text-base font-bold shadow-lg shadow-indigo-600/20 transition-all ${loading ? 'opacity-80' : 'hover:bg-indigo-700 active:scale-[0.98]'}`}
                        >
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-base" />
                                    <span>Memeriksa...</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSearch} className="text-base" />
                                    <span>Cek Data Siswa</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-gray-50 dark:border-gray-800">
                        <div className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center space-y-1">
                            <p className="flex items-center justify-center gap-2 opacity-70">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                PORTAL RESMI SEKOLAH
                            </p>
                            <p>Dapatkan Kode & PIN dari Wali Kelas</p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex flex-col items-center gap-5">
                    <Link to="/login" className="flex items-center gap-2 group">
                        <span className="text-sm text-gray-400 dark:text-gray-500">Staff sekolah?</span>
                        <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400 group-hover:underline">Login di sini</span>
                    </Link>

                    <Link to="/" className="text-xs font-bold text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-500 transition-colors uppercase tracking-widest flex items-center gap-2">
                        <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                        Kembali Ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    )
}