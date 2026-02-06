import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faArrowRight, faSpinner, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { signIn, isDemoMode } = useAuth()
    const { addToast } = useToast()
    const navigate = useNavigate()

    const emailInputRef = useRef(null)

    useEffect(() => {
        emailInputRef.current?.focus()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            const msg = 'Silakan isi email dan password'
            setErrorMessage(msg)
            addToast(msg, 'warning')
            return
        }

        // Simple format check before hitting backend
        const emailPattern = /\S+@\S+\.\S+/
        if (!emailPattern.test(email)) {
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
        <div className="min-h-screen flex font-poppins">
            {/* Left Side - Branding */}
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
                {/* Simplified Background Pattern - No blobs */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold text-2xl">L</span>
                        </div>
                        <span className="text-white text-2xl font-bold tracking-tight">Laporanmu</span>
                    </Link>
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                        Kelola Perilaku Siswa<br />dengan Mudah
                    </h1>
                    <p className="text-white/80 text-lg max-w-md leading-relaxed">
                        Platform digital untuk mencatat, memantau, dan mengelola data perilaku siswa
                        secara real-time.
                    </p>
                </div>

                <div className="relative z-10">
                    <p className="text-white/60 text-sm">
                        © 2024 Laporanmu. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[var(--color-surface)]">
                <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-700">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <Link to="/" className="inline-flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 
                flex items-center justify-center shadow-md">
                                <span className="text-white font-bold text-lg">L</span>
                            </div>
                            <span className="text-xl font-bold text-[var(--color-text)]">Laporanmu</span>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Selamat Datang 👋</h2>
                        <p className="text-[var(--color-text-muted)]">
                            Masuk ke akun Anda untuk melanjutkan
                        </p>
                    </div>

                    {/* Demo Mode Info */}
                    {isDemoMode && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in zoom-in duration-300">
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-bold mb-2 flex items-center gap-2">
                                🎮 Mode Demo Aktif
                            </p>
                            <div className="text-xs text-[var(--color-text-muted)] space-y-1.5 font-medium">
                                <p className="flex justify-between"><span>Admin:</span> <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">admin@laporanmu.id</code></p>
                                <p className="flex justify-between"><span>Guru:</span> <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">guru@laporanmu.id</code></p>
                                <p className="flex justify-between"><span>Pengurus:</span> <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">pengurus@laporanmu.id</code></p>
                                <div className="border-t border-amber-500/20 my-2 pt-2 flex justify-between">
                                    <span>Password semua akun:</span>
                                    <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded font-bold">demo123</code>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nama@sekolah.id"
                                ref={emailInputRef}
                                className="input px-4 py-3 w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input px-4 py-3 w-full pr-10"
                                    aria-invalid={!!errorMessage}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                </button>
                            </div>
                            {errorMessage && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errorMessage}
                                </p>
                            )}
                        </div>


                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3.5 font-semibold text-base shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            ) : (
                                <>
                                    Masuk
                                    <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[var(--color-border)]"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[var(--color-surface)] text-[var(--color-text-muted)]">Atau</span>
                            </div>
                        </div>

                        <p className="text-[var(--color-text-muted)] text-sm">
                            Wali murid?{' '}
                            <Link to="/check" className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline">
                                Cek data anak di sini
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/" className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text)] transition-colors">
                            ← Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </div >
        </div >
    )
}

