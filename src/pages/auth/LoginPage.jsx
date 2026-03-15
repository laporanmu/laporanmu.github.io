import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faArrowRight, faSpinner, faEye, faEyeSlash, faSun, faMoon, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [capsLockOn, setCapsLockOn] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { signIn, isDemoMode } = useAuth()
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const sessionReason = searchParams.get('reason')
    const emailInputRef = useRef(null)

    const MAX_ATTEMPTS = 5;
    const COOLDOWN_DURATION = 60 * 1000; // 60 seconds

    const [loginAttempts, setLoginAttempts] = useState(() => {
        const stored = localStorage.getItem('loginAttempts');
        return stored ? parseInt(stored) : 0;
    });

    const [lockoutUntil, setLockoutUntil] = useState(() => {
        const stored = localStorage.getItem('lockoutUntil');
        return stored ? parseInt(stored) : null;
    });

    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    useEffect(() => {
        if (!lockoutUntil) return;

        const checkCooldown = () => {
            const now = Date.now();
            if (now >= lockoutUntil) {
                setLockoutUntil(null);
                setLoginAttempts(0);
                localStorage.removeItem('lockoutUntil');
                localStorage.removeItem('loginAttempts');
                setCooldownRemaining(0);
                setErrorMessage('');
            } else {
                setCooldownRemaining(Math.ceil((lockoutUntil - now) / 1000));
            }
        };

        checkCooldown();
        const interval = setInterval(checkCooldown, 1000);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    useEffect(() => {
        if (!lockoutUntil) {
            emailInputRef.current?.focus()
        }
    }, [lockoutUntil])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (cooldownRemaining > 0) {
            setErrorMessage(`Terlalu banyak percobaan. Silakan coba lagi dalam ${cooldownRemaining} detik.`)
            return
        }

        if (!email || !password) {
            setErrorMessage('Silakan isi email dan password')
            return
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setErrorMessage('Format email tidak valid')
            return
        }

        setLoading(true)
        const { error } = await signIn(email, password, rememberMe)
        setLoading(false)

        if (error) {
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            localStorage.setItem('loginAttempts', newAttempts.toString());

            if (newAttempts >= MAX_ATTEMPTS) {
                const lockoutTime = Date.now() + COOLDOWN_DURATION;
                setLockoutUntil(lockoutTime);
                localStorage.setItem('lockoutUntil', lockoutTime.toString());
                setErrorMessage(`Terlalu banyak percobaan gagal. Silakan coba lagi dalam 60 detik.`);
                addToast('Akses ditangguhkan sementara demi keamanan.', 'error');
            } else {
                const remaining = MAX_ATTEMPTS - newAttempts;
                const msg = error.message || 'Login gagal, periksa kembali email dan password.';
                setErrorMessage(`${msg} (Sisa percobaan: ${remaining})`);
            }
            return
        }

        // Reset on success
        setLoginAttempts(0);
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lockoutUntil');

        setErrorMessage('')
        addToast('Login berhasil! Selamat datang.', 'success')
        navigate('/dashboard')
    }

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
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Masuk ke Akun Anda</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">Portal khusus staff & guru sekolah</p>
                </div>

                {/* Demo Mode */}
                {isDemoMode && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl text-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                            <p className="font-black text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-widest">🎮 Mode Demo</p>
                            <span className="text-[9px] font-bold text-amber-500/70 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">password: demo123</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                            {[
                                { role: 'Developer', email: 'dev@laporanmu.id', desc: 'Akses penuh semua fitur', color: 'hover:border-rose-400/50   hover:bg-rose-500/5   hover:text-rose-600' },
                                { role: 'Admin', email: 'admin@laporanmu.id', desc: 'Kelola data & user', color: 'hover:border-purple-400/50 hover:bg-purple-500/5 hover:text-purple-600' },
                                { role: 'Guru', email: 'guru@laporanmu.id', desc: 'Laporan & presensi', color: 'hover:border-indigo-400/50 hover:bg-indigo-500/5 hover:text-indigo-600' },
                                { role: 'Satpam', email: 'satpam@laporanmu.id', desc: 'Portal keluar masuk', color: 'hover:border-blue-400/50   hover:bg-blue-500/5   hover:text-blue-600' },
                                { role: 'Viewer', email: 'viewer@laporanmu.id', desc: 'Hanya dashboard (read-only)', color: 'hover:border-gray-400/50   hover:bg-gray-500/5   hover:text-gray-500' },
                            ].map(u => (
                                <button
                                    key={u.role}
                                    type="button"
                                    onClick={() => { setEmail(u.email); setPassword('demo123') }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-transparent bg-amber-100/50 dark:bg-amber-900/20 transition-all group ${u.color}`}>
                                    <div className="flex items-center gap-2 text-left">
                                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 group-hover:text-inherit transition-colors w-16">{u.role}</span>
                                        <span className="text-[9px] text-amber-600/60 dark:text-amber-400/60 font-medium">{u.desc}</span>
                                    </div>
                                    <code className="text-[9px] font-mono text-amber-600/70 dark:text-amber-400/70 shrink-0">{u.email}</code>
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-amber-500/60 text-center font-medium">Klik baris untuk isi otomatis</p>
                    </div>
                )}

                {/* Session Expired Banner */}
                {sessionReason === 'session_expired' && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                        </div>
                        <div>
                            <p className="text-[13px] font-black text-amber-700">Sesi telah berakhir</p>
                            <p className="text-[11px] text-amber-600/80 mt-0.5 leading-relaxed">
                                Sesi kamu dicabut oleh administrator. Silakan login kembali.
                            </p>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                <div className="glass rounded-[2rem] p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">Email</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faEnvelope} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@laporan.mu"
                                    ref={emailInputRef}
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">Password</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-12 py-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-sm" />
                                </button>
                            </div>
                            {capsLockOn && (
                                <p className="text-xs text-amber-500 font-medium pl-1 mt-1 animate-pulse flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" /> Caps Lock aktif
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pl-1 select-none">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-surface)] bg-[var(--color-surface)] transition-all cursor-pointer"
                            />
                            <label htmlFor="rememberMe" className="text-sm text-[var(--color-text)] font-medium cursor-pointer">
                                Ingat saya
                            </label>
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
                            disabled={loading || cooldownRemaining > 0}
                            className={`btn btn-primary w-full py-3.5 mt-2 shadow-lg shadow-[var(--color-primary)]/20 ${(loading || cooldownRemaining > 0) ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <><FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> Memproses...</>
                            ) : cooldownRemaining > 0 ? (
                                <>Coba lagi dalam {cooldownRemaining}s</>
                            ) : (
                                <>Masuk <FontAwesomeIcon icon={faArrowRight} className="text-sm ml-1" /></>
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