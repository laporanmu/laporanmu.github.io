import { useState, useEffect } from 'react'
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
    faBars,
    faTimes,
    faCheckCircle,
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">L</span>
                            </div>
                            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">Laporanmu</span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#fitur" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-sm transition-colors">
                                Fitur
                            </a>
                            <a href="#alur" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-sm transition-colors">
                                Cara Kerja
                            </a>
                            <a href="#kontak" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-sm transition-colors">
                                Kontak
                            </a>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300 transition-colors"
                                aria-label="Toggle theme"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>
                            <Link
                                to="/check"
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-all"
                            >
                                Cek Data Siswa
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-400/40 hover:shadow-indigo-500/60 hover:-translate-y-0.5 transition-all"
                            >
                                Login Staff
                            </Link>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center gap-2 md:hidden">
                            <button
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300 transition-all active:scale-95"
                                aria-label="Toggle theme"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all w-11 h-11 flex items-center justify-center"
                                aria-label="Toggle navigation"
                            >
                                <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className={`absolute right-4 top-20 w-64 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-10'}`}>
                        <div className="flex flex-col gap-1">
                            <a
                                href="#fitur"
                                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Fitur Utama
                            </a>
                            <a
                                href="#alur"
                                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Cara Kerja
                            </a>
                            <a
                                href="#kontak"
                                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Kontak Kami
                            </a>
                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-2 mx-4" />

                            <div className="flex flex-col gap-2 mt-1">
                                <Link
                                    to="/check"
                                    className="flex items-center justify-center px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm border border-gray-200 dark:border-gray-700 active:scale-95 transition-all"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Cek Data Siswa
                                </Link>
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Login Staff
                                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-28 lg:pt-40 pb-16 lg:pb-24 relative overflow-hidden">
                {/* Background orbs */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-[520px] h-[520px] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs sm:text-sm font-semibold mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                            </span>
                            Sistem Manajemen Perilaku Siswa
                        </div>

                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
                            Kelola Perilaku Siswa
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mt-1">
                                Secara Terukur & Transparan
                            </span>
                        </h1>

                        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                            Laporanmu membantu sekolah mencatat, memantau, dan menganalisis perilaku siswa dengan mudah.
                            Guru tetap fokus mendidik, wali murid mendapat informasi yang jelas dan real-time.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                            <Link
                                to="/login"
                                className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm sm:text-base shadow-xl shadow-gray-900/10 dark:shadow-white/10 hover:-translate-y-0.5 hover:shadow-2xl transition-all"
                            >
                                Mulai Sekarang
                                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/check"
                                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 text-gray-800 dark:text-gray-100 font-semibold text-sm sm:text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                            >
                                Saya Wali Murid
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="fitur" className="py-20 bg-gray-50 dark:bg-gray-900/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                            Fitur Utama Laporanmu
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Semua yang Anda butuhkan untuk mengelola perilaku siswa, dari pencatatan hingga pelaporan ke wali murid.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {FEATURES.map((feature, idx) => (
                            <div
                                key={idx}
                                className="relative flex flex-col h-full rounded-3xl bg-white dark:bg-gray-900 shadow-[0_12px_40px_rgba(15,23,42,0.06)] border border-indigo-50 dark:border-gray-800 px-6 py-6 sm:px-7 sm:py-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
                            >
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center mb-4 shadow-sm">
                                    <FontAwesomeIcon icon={feature.icon} className="text-base sm:text-lg" />
                                </div>
                                <h3 className="font-semibold text-base sm:text-lg mb-1.5 text-gray-900 dark:text-white">
                                    {feature.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works Section */}
            <section id="alur" className="py-20 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                            Alur Kerja yang Sederhana
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Dirancang untuk memudahkan guru, BK, dan wali murid berkolaborasi dalam membina perilaku siswa.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                Untuk Guru & BK
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                                Catat setiap pelanggaran maupun prestasi siswa hanya dalam beberapa klik.
                            </p>
                            <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-200">
                                <li className="flex items-start gap-2.5">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-indigo-500 mt-0.5 shrink-0" />
                                    <span>Form laporan cepat dengan pilihan jenis pelanggaran/prestasi.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-indigo-500 mt-0.5 shrink-0" />
                                    <span>Data langsung tersimpan dan terakumulasi menjadi poin siswa.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-indigo-500 mt-0.5 shrink-0" />
                                    <span>Ringkasan harian dan mingguan di dashboard.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                Untuk Wali Murid
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                                Pantau perkembangan perilaku anak tanpa harus login akun kompleks.
                            </p>
                            <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-200">
                                <li className="flex items-start gap-2.5">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-purple-500 mt-0.5 shrink-0" />
                                    <span>Akses data dengan kode unik siswa.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-purple-500 mt-0.5 shrink-0" />
                                    <span>Riwayat pelanggaran & prestasi yang rapi dan mudah dipahami.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-purple-500 mt-0.5 shrink-0" />
                                    <span>Membantu komunikasi yang lebih baik antara rumah dan sekolah.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 sm:p-12 text-center text-white shadow-xl">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                            Siap Memulai dengan Laporanmu?
                        </h2>
                        <p className="text-sm sm:text-base text-indigo-100 mb-8 max-w-xl mx-auto">
                            Bergabung dengan ratusan sekolah yang sudah lebih mudah mengelola perilaku siswa dan berkomunikasi dengan wali murid.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-white text-indigo-600 font-semibold text-sm sm:text-base hover:bg-gray-100 transition-colors"
                            >
                                Login Staff
                                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/check"
                                className="inline-flex items-center justify-center px-8 py-3 rounded-xl border border-indigo-200/70 text-white text-sm sm:text-base hover:bg-indigo-700/70 transition-colors"
                            >
                                Cek Data Siswa
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="kontak" className="bg-gray-50 dark:bg-gray-900/70 border-t border-gray-200 dark:border-gray-800 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center">
                                    <span className="text-white dark:text-gray-900 font-bold text-sm">L</span>
                                </div>
                                <span className="font-semibold text-lg text-gray-900 dark:text-white">
                                    Laporanmu
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                                Platform sederhana untuk membantu sekolah mengelola perilaku siswa secara profesional dan transparan.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                                Kontak
                            </h4>
                            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <li>Email: support@laporanmu.app</li>
                                <li>Telepon: +62 812-0000-0000</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                                Informasi
                            </h4>
                            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <li>Manajemen perilaku siswa</li>
                                <li>Portal wali murid</li>
                                <li>Analitik & laporan sekolah</li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-800 pt-6 text-center">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                            © 2026 Laporanmu. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
