import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faArrowRight, faSpinner, faEye, faEyeSlash, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'

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
    const emailInputRef = useRef(null)

    useEffect(() => { emailInputRef.current?.focus() }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            const msg = 'Silakan isi email dan password'
            setErrorMessage(msg)
            addToast(msg, 'warning')
            return
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            const msg = 'Format email tidak valid'
            setErrorMessage(msg)
            addToast(msg, 'warning')
            return
        }
        setLoading(true)
        const { error } = await signIn(email, password)
        setLoading(false)
        if (error) {
            const msg = error.message || 'Login gagal, periksa kembali email dan password.'
            setErrorMessage(msg)
            addToast(msg, 'error')
            return
        }
        setErrorMessage('')
        addToast('Login berhasil! Selamat datang.', 'success')
        navigate('/dashboard')
    }

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
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Masuk ke akun Anda</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Portal khusus staff & guru sekolah</p>
                </div>

                {/* Demo Mode */}
                {isDemoMode && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-lg text-xs">
                        <p className="font-semibold text-amber-600 dark:text-amber-400 mb-2">🎮 Mode Demo</p>
                        <div className="text-gray-500 dark:text-gray-400 space-y-1 font-medium">
                            <p className="flex justify-between"><span>Admin:</span> <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">admin@laporanmu.id</code></p>
                            <p className="flex justify-between"><span>Guru:</span> <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">guru@laporanmu.id</code></p>
                            <p className="flex justify-between"><span>Pengurus:</span> <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">pengurus@laporanmu.id</code></p>
                            <div className="border-t border-amber-200/60 dark:border-amber-500/20 pt-1.5 mt-1.5 flex justify-between">
                                <span>Password:</span>
                                <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded font-bold">demo123</code>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-300 dark:text-gray-600" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@sekolah.id"
                                    ref={emailInputRef}
                                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-300 dark:text-gray-600" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-xs" />
                                </button>
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
                                <><FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> Memproses...</>
                            ) : (
                                <>Masuk <FontAwesomeIcon icon={faArrowRight} className="text-sm" /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="flex items-center justify-between text-xs">
                    <Link to="/check" className="text-gray-400 hover:text-indigo-500 transition-colors">
                        Wali murid? <span className="font-medium text-indigo-500">Cek data anak</span>
                    </Link>
                    <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        ← Beranda
                    </Link>
                </div>
            </div>
        </div>
    )
}
