import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faArrowRight, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn, isDemoMode } = useAuth()
    const { addToast } = useToast()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            addToast('Silakan isi email dan password', 'warning')
            return
        }

        setLoading(true)
        const { error } = await signIn(email, password)
        setLoading(false)

        if (error) {
            addToast(error.message, 'error')
        } else {
            addToast('Login berhasil! Selamat datang.', 'success')
            navigate('/dashboard')
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 
        p-12 flex-col justify-between relative overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4" />

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">L</span>
                        </div>
                        <span className="text-white text-2xl font-bold">Laporanmu</span>
                    </Link>
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                        Kelola Perilaku Siswa<br />dengan Mudah & Modern
                    </h1>
                    <p className="text-white/80 text-lg max-w-md">
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
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[var(--color-surface)]">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <Link to="/" className="inline-flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                flex items-center justify-center">
                                <span className="text-white font-bold text-lg">L</span>
                            </div>
                            <span className="text-xl font-bold gradient-text">Laporanmu</span>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">Selamat Datang Kembali 👋</h2>
                        <p className="text-[var(--color-text-muted)]">
                            Masuk ke akun Anda untuk melanjutkan
                        </p>
                    </div>

                    {/* Demo Mode Info */}
                    {isDemoMode && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                                🎮 Mode Demo - Gunakan akun berikut:
                            </p>
                            <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                                <p><strong>Admin:</strong> admin@laporanmu.id</p>
                                <p><strong>Guru:</strong> guru@laporanmu.id</p>
                                <p><strong>Pengurus:</strong> pengurus@laporanmu.id</p>
                                <p className="mt-2"><strong>Password:</strong> demo123</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <div className="relative">
                                <FontAwesomeIcon
                                    icon={faEnvelope}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@sekolah.id"
                                    className="input pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <div className="relative">
                                <FontAwesomeIcon
                                    icon={faLock}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input pl-10"
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
                                    Masuk
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[var(--color-text-muted)] text-sm">
                            Wali murid?{' '}
                            <Link to="/check" className="text-indigo-500 hover:text-indigo-600 font-medium">
                                Cek data anak di sini
                            </Link>
                        </p>
                    </div>

                    <div className="mt-4 text-center">
                        <Link to="/" className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text)]">
                            ← Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
