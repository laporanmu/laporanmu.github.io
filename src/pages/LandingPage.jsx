import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight,
    faChartLine,
    faShieldAlt,
    faMobileAlt,
    faBell,
    faMoon,
    faSun,
    faBars,
    faTimes,
    faStar,
    faFaceSmile
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'

export default function LandingPage() {
    const { isDark, toggleTheme } = useTheme()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="min-h-screen bg-[var(--color-surface)] transition-colors duration-300 overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/10 dark:bg-accent/5 blur-[120px]" />
            </div>

            {/* Navbar */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3 group relative z-50">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                                <span className="text-white font-bold text-xl font-heading">L</span>
                            </div>
                            <span className="font-heading font-bold text-2xl text-[var(--color-text)] tracking-tight">Laporan<span className="text-[var(--color-primary)]">mu</span></span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8 bg-[var(--color-surface)]/50 dark:bg-[var(--color-surface-alt)]/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-[var(--color-border)]">
                            <a href="#fitur" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-colors">
                                Fitur
                            </a>
                            <a href="#alur" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-colors">
                                Cara Kerja
                            </a>
                            <a href="#kontak" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-colors">
                                Kontak
                            </a>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-4 z-50">
                            <button
                                onClick={toggleTheme}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all"
                                aria-label="Toggle theme"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>
                            <Link
                                to="/check"
                                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                            >
                                Cek Data Siswa
                            </Link>
                            <Link
                                to="/login"
                                className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20"
                            >
                                Login Staff
                            </Link>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center gap-3 md:hidden z-50">
                            <button
                                onClick={toggleTheme}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)]"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-[var(--color-primary)]/30"
                            >
                                <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className={`absolute right-4 left-4 top-24 bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] p-5 transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-95'}`}>
                        <div className="flex flex-col gap-2">
                            {['Fitur', 'Cara Kerja', 'Kontak'].map((item, i) => (
                                <a
                                    key={i}
                                    href={`#${item.toLowerCase().replace(' ', '')}`}
                                    className="flex items-center px-4 py-3.5 rounded-xl text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item}
                                </a>
                            ))}
                            <div className="h-px bg-[var(--color-border)] my-2 mx-2" />
                            <Link
                                to="/check"
                                className="flex items-center justify-center px-4 py-3.5 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-semibold text-sm border border-[var(--color-border)] active:scale-95 transition-all w-full"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Cek Data Siswa
                            </Link>
                            <Link
                                to="/login"
                                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all w-full mt-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login Staff
                                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 lg:pt-48 pb-20 lg:pb-32 relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[var(--color-surface)]/80 backdrop-blur-md border border-[var(--color-primary)]/20 shadow-xl shadow-[var(--color-primary)]/5 mb-10 animate-[fadeIn_1s_ease-out]">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-primary)]" />
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text)] tracking-wide">
                            Sistem Manajemen Perilaku Generasi Baru
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--color-text)] mb-8 leading-[1.1] max-w-4xl mx-auto animate-[fadeIn_1s_ease-out_0.2s_both]">
                        Kelola Perilaku Siswa
                        <br className="hidden sm:block" />
                        <span className="gradient-text"> Lebih Modern & Terukur</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-[var(--color-text-muted)] mb-12 max-w-2xl mx-auto leading-relaxed animate-[fadeIn_1s_ease-out_0.4s_both]">
                        Ciptakan lingkungan sekolah yang disiplin dengan pencatatan real-time. Guru lebih fokus mengajar, wali murid lebih tenang memantau.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto animate-[fadeIn_1s_ease-out_0.6s_both]">
                        <Link
                            to="/login"
                            className="btn btn-primary w-full sm:w-auto group text-base px-8 py-4"
                        >
                            Mulai Sekarang
                            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            to="/check"
                            className="btn btn-secondary w-full sm:w-auto text-base px-8 py-4 bg-[var(--color-surface)]/80 backdrop-blur"
                        >
                            Portal Wali Murid
                        </Link>
                    </div>
                </div>

                {/* Dashboard Preview Mockup (Decorative) */}
                <div className="w-full max-w-5xl mx-auto mt-20 px-4 sm:px-6 lg:px-8 animate-[fadeIn_1s_ease-out_0.8s_both]">
                    <div className="relative rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/40 p-2 glass shadow-2xl">
                        <div className="rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col">
                            {/* Mockup Header */}
                            <div className="h-12 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                <div className="mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md h-6 w-1/3 flex items-center justify-center">
                                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">app.laporanmu.com</span>
                                </div>
                            </div>
                            {/* Mockup Body (Simplified shapes) */}
                            <div className="p-6 grid grid-cols-12 gap-6 h-[400px]">
                                {/* Sidebar */}
                                <div className="col-span-3 hidden md:flex flex-col gap-3">
                                    <div className="h-8 w-24 bg-[var(--color-border)] rounded-md mb-4" />
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`h-10 w-full rounded-lg ${i === 1 ? 'bg-[var(--color-primary)]/10' : 'bg-[var(--color-surface-alt)]'}`} />
                                    ))}
                                </div>
                                {/* Main Content */}
                                <div className="col-span-12 md:col-span-9 flex flex-col gap-6">
                                    <div className="flex justify-between items-center">
                                        <div className="h-8 w-48 bg-[var(--color-surface-alt)] rounded-lg" />
                                        <div className="h-10 w-32 bg-[var(--color-primary)] rounded-lg opacity-80" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-28 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-4 flex flex-col gap-2">
                                                <div className="w-8 h-8 rounded-full bg-[var(--color-border)]" />
                                                <div className="h-6 w-16 bg-[var(--color-border)] rounded" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-full bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bento Grid Features Section */}
            <section id="fitur" className="py-24 relative z-10 bg-[var(--color-surface-alt)]/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] mb-4">
                            Fitur Premium <span className="text-[var(--color-primary)]">Laporanmu</span>
                        </h2>
                        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
                            Lebih dari sekadar buku catatan digital. Solusi cerdas untuk analitik perilaku siswa.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">
                        {/* Big Card - Real-time Analytics */}
                        <div className="col-span-1 md:col-span-2 md:row-span-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 hover:border-[var(--color-primary)]/50 transition-colors shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--color-primary)]/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 group-hover:from-[var(--color-primary)]/20 transition-all" />
                            <div className="relative z-10 h-full flex flex-col justify-center">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white flex items-center justify-center mb-6 shadow-lg shadow-[var(--color-primary)]/30">
                                    <FontAwesomeIcon icon={faChartLine} className="text-xl" />
                                </div>
                                <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3">Analytics Real-time & Terukur</h3>
                                <p className="text-[var(--color-text-muted)] max-w-md text-base leading-relaxed">
                                    Pantau grafik tren pelanggaran dan prestasi siswa langsung dari dashboard. Pengambilan keputusan lebih cepat dan akurat untuk penanganan siswa berbasis data (Data-driven).
                                </p>
                            </div>
                        </div>

                        {/* Tall Card - Portal Wali Murid */}
                        <div className="col-span-1 md:col-span-1 md:row-span-2 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-3xl p-8 hover:border-[var(--color-accent)]/50 transition-colors shadow-sm flex flex-col">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] flex items-center justify-center mb-6 shadow-sm">
                                <FontAwesomeIcon icon={faBell} className="text-xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3">Portal Eksklusif Wali Murid</h3>
                            <p className="text-[var(--color-text-muted)] text-base mb-8 leading-relaxed flex-grow">
                                Keterbukaan informasi sangat penting. Wali murid dapat memantau akumulasi poin dan riwayat anak secara live hanya dengan memasukkan NISN unik, tanpa perlu registrasi rumit.
                            </p>
                            <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-2xl shadow-inner mt-auto items-center flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                                    <FontAwesomeIcon icon={faMobileAlt} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Notifikasi</div>
                                    <div className="text-sm text-[var(--color-text-muted)]">Data terupdate cepat</div>
                                </div>
                            </div>
                        </div>

                        {/* Standard Card 1 */}
                        <div className="col-span-1 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-3xl p-8 hover:border-[var(--color-primary)]/50 transition-colors shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] text-[var(--color-primary)] flex items-center justify-center mb-6">
                                <FontAwesomeIcon icon={faShieldAlt} className="text-xl" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">Keamanan Privasi</h3>
                            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                                Data tersimpan aman dengan enkripsi modern dan akses Multi-Role yang memisahkan hak akses antara Admin, BK, dan Guru.
                            </p>
                        </div>

                        {/* Standard Card 2 */}
                        <div className="col-span-1 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-3xl p-8 hover:border-[var(--color-primary)]/50 transition-colors shadow-sm relative overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-6">
                                <FontAwesomeIcon icon={faFaceSmile} className="text-xl" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">UI Modern & Cepat</h3>
                            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                                Antarmuka dirancang agar tidak membingungkan. Input pelanggaran atau prestasi dalam hitungan detik.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Workflow / Cara Kerja Section */}
            <section id="alur" className="py-24 bg-[var(--color-surface)] relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 text-center lg:text-left">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] mb-6">
                                Alur Kerja Sederhana, <br />
                                <span className="text-[var(--color-primary)]">Dampak Maksimal.</span>
                            </h2>
                            <p className="text-lg text-[var(--color-text-muted)] mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                Tidak perlu pelatihan panjang. Desain intuitif Laporanmu memungkinkan sekolah langsung menggunakannya di hari pertama.
                            </p>

                            <div className="space-y-6 max-w-md mx-auto lg:mx-0">
                                {[
                                    { step: '1', title: 'Input Data Siswa & Master Poin', desc: 'Atur poin jenis pelanggaran dan prestasi sesuai buku tatib sekolah.' },
                                    { step: '2', title: 'Catat Perilaku Harian', desc: 'Guru atau BK mencatat pelanggaran via dashboard saat kejadian berlangsung.' },
                                    { step: '3', title: 'Evaluasi & Pantau', desc: 'Sistem akumulasi poin otomatis. Wali murid bisa mengecek dari rumah.' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-[var(--color-surface-alt)] transition-colors border border-transparent hover:border-[var(--color-border)] text-left">
                                        <div className="w-12 h-12 shrink-0 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-xl border border-[var(--color-primary)]/20">
                                            {item.step}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[var(--color-text)] text-lg mb-1">{item.title}</h4>
                                            <p className="text-sm text-[var(--color-text-muted)]">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
                            {/* Abstract visual representation of workflow */}
                            <div className="aspect-square rounded-[3rem] bg-gradient-to-tr from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 border border-[var(--color-border)] p-8 relative flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMTU2LCAxNjMsIDE3NSLCAwLjIpIi8+PC9zdmc+')] opacity-50" />

                                <div className="w-full space-y-4 z-10">
                                    <div className="glass p-4 rounded-2xl w-3/4 mx-auto flex items-center justify-between border-l-4 border-red-500 transform -rotate-2 hover:rotate-0 transition-transform shadow-lg cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><FontAwesomeIcon icon={faTimes} /></div>
                                            <div><div className="text-sm font-bold text-[var(--color-text)]">Terlambat Masuk</div><div className="text-xs text-[var(--color-text-muted)]">Andi - Kelas 10A</div></div>
                                        </div>
                                        <span className="font-bold font-mono text-red-500">+10 Poin</span>
                                    </div>
                                    <div className="glass p-4 rounded-2xl w-4/5 mx-auto flex items-center justify-between border-l-4 border-green-500 transform hover:-rotate-1 transition-transform shadow-lg cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center"><FontAwesomeIcon icon={faStar} /></div>
                                            <div><div className="text-sm font-bold text-[var(--color-text)]">Juara 1 Lomba</div><div className="text-xs text-[var(--color-text-muted)]">Budi - Kelas 11B</div></div>
                                        </div>
                                        <span className="font-bold font-mono text-green-500">-50 Poin</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative z-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="rounded-[3rem] bg-gradient-to-r from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[var(--color-accent)] p-10 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-5xl font-bold mb-6 font-heading">
                                Siap Transformasi Kedisiplinan Sekolah?
                            </h2>
                            <p className="text-base sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto font-medium">
                                Tinggalkan buku catatan manual. Beralih ke Laporanmu untuk pencatatan perilaku yang berintegritas dan transparan.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[var(--color-primary-dark)] font-bold text-lg hover:scale-105 transition-transform shadow-xl w-full sm:w-auto"
                                >
                                    Login Staff / Guru
                                </Link>
                                <Link
                                    to="/check"
                                    className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-white/30 hover:bg-white/10 text-white font-bold text-lg transition-colors w-full sm:w-auto"
                                >
                                    Login Wali Murid
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="kontak" className="bg-[var(--color-surface)] border-t border-[var(--color-border)] py-12 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-1 md:col-span-2">
                            <Link to="/" className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">L</span>
                                </div>
                                <span className="font-bold text-xl text-[var(--color-text)]">
                                    Laporanmu
                                </span>
                            </Link>
                            <p className="text-sm text-[var(--color-text-muted)] max-w-sm leading-relaxed">
                                Platform web cerdas untuk mengatur rekam jejak kedisiplinan dan prestasi siswa secara terintegrasi dan transparan.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-[var(--color-text)] mb-4 uppercase tracking-wider text-xs">Akses Pegawai</h4>
                            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                                <li><Link to="/login" className="hover:text-[var(--color-primary)]">Admin Sekolah</Link></li>
                                <li><Link to="/login" className="hover:text-[var(--color-primary)]">Guru Bimbingan Konseling</Link></li>
                                <li><Link to="/login" className="hover:text-[var(--color-primary)]">Wali Kelas</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-[var(--color-text)] mb-4 uppercase tracking-wider text-xs">Kontak & Info</h4>
                            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                                <li>Email: hello@laporanmu.com</li>
                                <li>WhatsApp: +62 821-xxxx-xxxx</li>
                                <li>Panduan Penggunaan</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-[var(--color-text-muted)]">
                            © 2026 Laporanmu. Coded with passion.
                        </p>
                        <div className="flex gap-4">
                            <span className="text-sm text-[var(--color-text-muted)]">Privacy Policy</span>
                            <span className="text-sm text-[var(--color-text-muted)]">Terms of Service</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
