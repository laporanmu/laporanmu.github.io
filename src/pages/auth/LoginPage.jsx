import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faArrowRight, faSpinner, faEye, faEyeSlash, faShieldAlt, faClock, faArrowLeft, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'

// NASA-Level Security Constants
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { signIn, isDemoMode } = useAuth()
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()
    const navigate = useNavigate()

    // Security State
    const [failedAttempts, setFailedAttempts] = useState(() => Number(localStorage.getItem('login_failed_attempts')) || 0)
    const [lockoutUntil, setLockoutUntil] = useState(() => Number(localStorage.getItem('login_lockout_until')) || 0)
    const [timeLeft, setTimeLeft] = useState(0)

    const emailInputRef = useRef(null)

    useEffect(() => {
        emailInputRef.current?.focus()
    }, [])

    // Lockout Timer Logic
    useEffect(() => {
        if (!lockoutUntil) return

        const checkLockout = () => {
            const now = Date.now()
            if (now >= lockoutUntil) {
                setLockoutUntil(0)
                setFailedAttempts(0)
                localStorage.removeItem('login_lockout_until')
                localStorage.setItem('login_failed_attempts', '0')
                setTimeLeft(0)
            } else {
                setTimeLeft(Math.ceil((lockoutUntil - now) / 1000))
            }
        }

        checkLockout()
        const interval = setInterval(checkLockout, 1000)
        return () => clearInterval(interval)
    }, [lockoutUntil])

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Check if locked out
        if (lockoutUntil && Date.now() < lockoutUntil) {
            addToast(`Terlalu banyak percobaan. Coba lagi dalam ${formatTime(timeLeft)}`, 'error')
            return
        }

        if (!email || !password) {
            setErrorMessage('Email and password required')
            return
        }

        setLoading(true)
        const { error } = await signIn(email.trim(), password)
        setLoading(false)

        if (error) {
            const newAttempts = failedAttempts + 1
            setFailedAttempts(newAttempts)
            localStorage.setItem('login_failed_attempts', newAttempts.toString())

            if (newAttempts >= MAX_ATTEMPTS) {
                const lockoutTime = Date.now() + LOCKOUT_DURATION
                setLockoutUntil(lockoutTime)
                localStorage.setItem('login_lockout_until', lockoutTime.toString())
                addToast('Sistem Keamanan Aktif: Akses dibatasi selama 5 menit.', 'error')
            } else {
                const remaining = MAX_ATTEMPTS - newAttempts
                setErrorMessage(`Kredensial salah. Sisa percobaan: ${remaining}`)
                addToast(`Login Gagal. ${remaining} percobaan tersisa.`, 'warning')
            }
            return
        }

        // Reset security state on success
        setFailedAttempts(0)
        setLockoutUntil(0)
        localStorage.removeItem('login_failed_attempts')
        localStorage.removeItem('login_lockout_until')

        addToast('Akses Diberikan. Selamat datang kembali.', 'success')
        navigate('/dashboard')
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-white dark:bg-gray-950 p-4 pt-[12vh] font-poppins transition-colors">
            <div className="w-full max-w-[340px] animate-in zoom-in-95 duration-500 relative">
                {/* Theme Toggle */}
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

                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Selamat Datang 👋</h1>
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mb-4">
                        Platform Manajemen Perilaku Siswa
                    </p>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-xs text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Secure Staff Login</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                    {/* Lockout Overlay */}
                    {lockoutUntil > 0 && Date.now() < lockoutUntil && (
                        <div className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
                                <FontAwesomeIcon icon={faClock} className="text-red-500 text-xl animate-pulse" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Sistem Terkunci</h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                Terlalu banyak percobaan masuk yang salah.<br />Keamanan akun diaktifkan.
                            </p>
                            <div className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold text-lg border border-gray-200 dark:border-gray-700">
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                                Email Staff
                            </label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                                    <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@sekolah.id"
                                    ref={emailInputRef}
                                    autoComplete="username"
                                    className="w-full bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-[13px] font-semibold placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                                    <FontAwesomeIcon icon={faLock} className="text-xs" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-9 pr-10 py-2 text-[13px] font-semibold tracking-wider placeholder:text-gray-300 dark:placeholder:text-gray-700 transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-gray-500 dark:hover:text-gray-400"
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-xs" />
                                </button>
                            </div>
                        </div>

                        {errorMessage && (
                            <p className="text-[10px] font-medium text-red-500 px-1">
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (lockoutUntil > 0)}
                            className={`w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold transition-all ${loading ? 'opacity-80' : 'hover:bg-indigo-700 active:scale-[0.98]'}`}
                        >
                            {loading ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                            ) : (
                                <>
                                    <span>Masuk Ke Dashboard</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Compact Demo Section */}
                    {isDemoMode && (
                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                            <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 space-y-1 bg-amber-500/5 p-2 rounded-lg">
                                <p className="text-amber-600 dark:text-amber-400 font-bold tracking-widest text-[8px] uppercase">Akses Demo</p>
                                <div className="space-y-0.5">
                                    <p className="flex justify-between">
                                        <span>User: <b className="text-gray-600 dark:text-gray-400 uppercase">admin@laporanmu.id</b></span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span>Pass: <b className="text-gray-600 dark:text-gray-400 uppercase">demo123</b></span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-col items-center gap-4">
                    <Link to="/check" className="flex items-center gap-2 group">
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Bukan staff?</span>
                        <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 group-hover:underline">Cek Data Siswa</span>
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
