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
            <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-4">
                <div className="text-center glass p-8 rounded-3xl">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--color-primary)]/30">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-white" />
                    </div>
                    <p className="font-heading font-bold text-lg text-[var(--color-text)]">Memuat Data Anak...</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Sistem sedang memverifikasi</p>
                </div>
            </div>
        )
    }

    // Student result view
    if (student) {
        return (
            <div className="min-h-screen bg-[var(--color-surface)] py-8 px-4 relative overflow-x-hidden">
                {/* Ambient Background Glows */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-[480px] mx-auto space-y-6 relative z-10">
                    {/* Nav */}
                    <div className="flex items-center justify-between glass px-5 py-3 rounded-2xl">
                        <button onClick={handleReset} className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 uppercase tracking-wide">
                            <span className="w-7 h-7 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)]"><FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" /></span>
                            Kembali
                        </button>
                        <div className="flex items-center gap-3">
                            <Link to="/" className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-wide">Beranda</Link>
                            <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all">
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-xs" />
                            </button>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)]">
                        <div className="p-6 pb-0 flex items-center gap-5">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-3xl font-bold text-white shrink-0 overflow-hidden shadow-lg shadow-[var(--color-primary)]/20 shadow-inner">
                                {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    student.name.charAt(0)
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold font-heading text-[var(--color-text)] leading-tight truncate">{student.name}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                        {student.class}
                                    </span>
                                    <span className="text-xs font-mono font-medium text-[var(--color-text-muted)]">{student.registration_code}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 mt-6 bg-[var(--color-surface-alt)]/50 border-t border-[var(--color-border)] divide-x divide-[var(--color-border)]">
                            <div className="p-4 text-center">
                                <p className={`text-2xl font-bold font-heading mb-0.5 ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Total Poin</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold font-heading text-red-500 mb-0.5">{student.reports.length}</p>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Pelanggaran</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold font-heading text-emerald-500 mb-0.5">{student.achievements.length}</p>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Prestasi</p>
                            </div>
                        </div>
                    </div>

                    {/* Reports */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest px-2 flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            Riwayat Pelanggaran
                        </p>
                        {student.reports.length > 0 ? (
                            <div className="space-y-2">
                                {student.reports.map((report) => (
                                    <div key={report.id} className="glass rounded-xl px-5 py-4 flex justify-between items-center gap-4 hover:border-red-500/30 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--color-text)] leading-tight truncate mb-1">{report.type}</p>
                                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
                                                <span>{report.date}</span>
                                                <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
                                                <span className="truncate">{report.teacher}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-bold font-mono text-sm">
                                            {report.points}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 bg-[var(--color-surface-alt)] rounded-2xl border border-dashed border-[var(--color-border)] text-center">
                                <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-3 border border-[var(--color-border)]">
                                    <span className="text-xl text-emerald-500">🎉</span>
                                </div>
                                <p className="text-sm font-bold text-[var(--color-text-muted)]">Nihil Pelanggaran</p>
                                <p className="text-xs text-[var(--color-text-muted)] opacity-70 mt-1">Siswa berlaku sangat baik sejauh ini.</p>
                            </div>
                        )}
                    </div>

                    {/* Achievements */}
                    <div className="space-y-3 pt-2">
                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest px-2 flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            Riwayat Prestasi
                        </p>
                        {student.achievements.length > 0 ? (
                            <div className="space-y-2">
                                {student.achievements.map((item) => (
                                    <div key={item.id} className="glass rounded-xl px-5 py-4 flex justify-between items-center gap-4 hover:border-emerald-500/30 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--color-text)] leading-tight truncate mb-1">{item.type}</p>
                                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
                                                <span>{item.date}</span>
                                                <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
                                                <span className="truncate">{item.teacher}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold font-mono text-sm">
                                            +{item.points}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 bg-[var(--color-surface-alt)] rounded-2xl border border-dashed border-[var(--color-border)] text-center">
                                <p className="text-xs font-semibold text-[var(--color-text-muted)]">Belum ada data prestasi tercatat.</p>
                            </div>
                        )}
                    </div>

                    {/* Support */}
                    <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 mt-8 shadow-xl">
                        <div className="min-w-0">
                            <p className="font-bold text-white mb-1">Perlu Bantuan?</p>
                            <p className="text-xs text-slate-300 truncate">Konsultasi langsung dengan wali kelas / BK</p>
                        </div>
                        <div className="flex gap-2">
                            <a href="https://wa.me/6281234567890" className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg hover:bg-emerald-500 hover:text-white transition-all">
                                <FontAwesomeIcon icon={faWhatsapp} />
                            </a>
                            <a href="tel:+6281234567890" className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-sm hover:bg-white/20 transition-all">
                                <FontAwesomeIcon icon={faPhone} />
                            </a>
                        </div>
                    </div>

                    <p className="text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.2em] pt-4 opacity-70">
                        Laporanmu © 2026
                    </p>
                </div>
            </div>
        )
    }

    // Form view
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] relative overflow-hidden px-4 py-8 transition-colors">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-[var(--color-primary)]/10 blur-[80px]" />
                <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[var(--color-accent)]/10 blur-[100px]" />
            </div>

            <div className="w-full max-w-[420px] space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold font-heading text-lg">L</span>
                        </div>
                        <span className="font-heading font-bold text-xl text-[var(--color-text)]">Laporan<span className="text-[var(--color-primary)]">mu</span></span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all"
                        aria-label="Toggle theme"
                    >
                        <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-sm" />
                    </button>
                </div>

                {/* Title */}
                <div className="text-center sm:text-left mt-8 mb-4">
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Cek Data Anak</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">Gunakan kode registrasi & PIN dari sekolah</p>
                </div>

                {/* Form Card */}
                <div className="glass rounded-[2rem] p-6 sm:p-8">
                    <form onSubmit={handleCheck} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">Kode Registrasi</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faIdCard} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(formatCode(e.target.value))}
                                    placeholder="REG-XXXX-XXXX"
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold uppercase tracking-widest text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:font-medium placeholder:tracking-normal placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">PIN Rahasia</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faKey} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-lg font-bold tracking-[0.5em] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:text-sm placeholder:tracking-normal placeholder:font-medium placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">!</div>
                                <p className="text-xs font-medium text-red-500">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`btn btn-primary w-full py-3.5 mt-2 shadow-lg shadow-[var(--color-primary)]/20 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <><FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> Memeriksa...</>
                            ) : (
                                <><FontAwesomeIcon icon={faSearch} className="text-sm mr-1" /> Cek Data</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
                        <p className="text-[11px] font-medium tracking-wide text-[var(--color-text-muted)] text-center">Belum punya kode? Hubungi wali kelas.</p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex items-center justify-between text-xs px-2">
                    <Link to="/login" className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                        Guru/Staff Login di sini
                    </Link>
                    <Link to="/" className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                        ← Kembali
                    </Link>
                </div>
            </div>
        </div>
    )
}