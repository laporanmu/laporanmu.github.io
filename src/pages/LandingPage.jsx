import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight,
    faChartLine,
    faShieldAlt,
    faMobileAlt,
    faUsers,
    faClipboardCheck,
    faBell,
    faMoon,
    faSun,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'

const FEATURES = [
    {
        icon: faClipboardCheck,
        title: 'Pencatatan Mudah',
        description: 'Input laporan perilaku siswa dalam hitungan detik dengan form yang intuitif.',
    },
    {
        icon: faChartLine,
        title: 'Analytics Real-time',
        description: 'Pantau tren perilaku siswa dengan grafik dan statistik yang mudah dipahami.',
    },
    {
        icon: faShieldAlt,
        title: 'Keamanan Terjamin',
        description: 'Data siswa tersimpan aman dengan enkripsi dan akses berbasis role.',
    },
    {
        icon: faMobileAlt,
        title: 'Akses di Mana Saja',
        description: 'Gunakan dari perangkat apapun - laptop, tablet, atau smartphone.',
    },
    {
        icon: faUsers,
        title: 'Multi-Role',
        description: 'Admin, Guru, dan Pengurus OSIS bisa kolaborasi dengan peran masing-masing.',
    },
    {
        icon: faBell,
        title: 'Portal Wali Murid',
        description: 'Orang tua bisa cek data anak dengan kode unik tanpa perlu login.',
    },
]

export default function LandingPage() {
    const { isDark, toggleTheme } = useTheme()

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-surface)]/80 backdrop-blur-lg 
        border-b border-[var(--color-border)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 
                flex items-center justify-center">
                                <span className="text-white font-bold text-lg">L</span>
                            </div>
                            <span className="font-bold text-xl gradient-text">Laporanmu</span>
                        </Link>

                        {/* Right Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>
                            <Link to="/check" className="btn btn-secondary text-sm hidden sm:inline-flex">
                                Cek Data Siswa
                            </Link>
                            <Link to="/login" className="btn btn-primary text-sm">
                                Login Staff
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
                </div>

                <div className="max-w-7xl mx-auto relative">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 
              border border-indigo-500/30 rounded-full text-sm text-indigo-600 dark:text-indigo-400 mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Sistem Manajemen Perilaku Siswa #1
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                            Kelola <span className="gradient-text">Perilaku Siswa</span><br />
                            dengan Mudah & Modern
                        </h1>

                        <p className="text-lg text-[var(--color-text-muted)] mb-8 max-w-2xl mx-auto">
                            Platform digital terlengkap untuk mencatat, memantau, dan mengelola
                            data perilaku siswa. Bantu guru fokus mendidik, bukan sibuk administrasi.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/login" className="btn btn-primary px-8 py-3">
                                Mulai Sekarang
                                <FontAwesomeIcon icon={faArrowRight} />
                            </Link>
                            <Link to="/check" className="btn btn-secondary px-8 py-3">
                                Saya Wali Murid
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
                            <div>
                                <p className="text-3xl font-bold gradient-text">500+</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Sekolah</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold gradient-text">50K+</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Siswa</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold gradient-text">99%</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Kepuasan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 bg-[var(--color-surface-alt)]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Fitur <span className="gradient-text">Lengkap</span> untuk Sekolah Modern
                        </h2>
                        <p className="text-[var(--color-text-muted)] max-w-2xl mx-auto">
                            Semua yang Anda butuhkan untuk mengelola perilaku siswa dalam satu platform terintegrasi.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, idx) => (
                            <div key={idx} className="card group hover:border-indigo-500/50 transition-all duration-300">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                  flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={feature.icon} className="text-lg" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                                <p className="text-[var(--color-text-muted)] text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 sm:p-12">
                        {/* Decorative */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                        <div className="relative text-center">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                                Siap Memulai?
                            </h2>
                            <p className="text-white/80 mb-8 max-w-lg mx-auto">
                                Bergabung dengan ratusan sekolah yang sudah menggunakan Laporanmu
                                untuk mengelola perilaku siswa dengan lebih efektif.
                            </p>
                            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-white 
                text-indigo-600 font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-xl">
                                Login Sekarang
                                <FontAwesomeIcon icon={faArrowRight} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-[var(--color-border)]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 
              flex items-center justify-center">
                            <span className="text-white font-bold text-sm">L</span>
                        </div>
                        <span className="font-semibold">Laporanmu</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        © 2024 Laporanmu. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
