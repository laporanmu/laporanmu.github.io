import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUsers,
    faClipboardList,
    faArrowUp,
    faArrowDown,
    faPlus,
    faArrowRight,
    faExclamationTriangle,
    faTrophy
} from '@fortawesome/free-solid-svg-icons'
import { Link } from 'react-router-dom'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/DataDisplay'
import { useAuth } from '../../context/AuthContext'

// Demo data
const STATS = [
    { icon: faUsers, label: 'Total Siswa', value: '1,234', trend: '+12 bulan ini', trendUp: true, color: 'indigo' },
    { icon: faClipboardList, label: 'Laporan Hari Ini', value: '28', trend: '+5 dari kemarin', trendUp: true, color: 'blue' },
    { icon: faExclamationTriangle, label: 'Pelanggaran', value: '156', trend: '-8% minggu ini', trendUp: false, color: 'red' },
    { icon: faTrophy, label: 'Prestasi', value: '89', trend: '+23% minggu ini', trendUp: true, color: 'green' },
]

const CHART_DATA = [
    { name: 'Sen', pelanggaran: 12, prestasi: 5 },
    { name: 'Sel', pelanggaran: 8, prestasi: 8 },
    { name: 'Rab', pelanggaran: 15, prestasi: 6 },
    { name: 'Kam', pelanggaran: 10, prestasi: 12 },
    { name: 'Jum', pelanggaran: 6, prestasi: 9 },
    { name: 'Sab', pelanggaran: 4, prestasi: 3 },
]

const PIE_DATA = [
    { name: 'Terlambat', value: 35, color: '#ef4444' },
    { name: 'Tidak Tertib', value: 25, color: '#f59e0b' },
    { name: 'Tidak PR', value: 20, color: '#6366f1' },
    { name: 'Lainnya', value: 20, color: '#8b5cf6' },
]

const RECENT_REPORTS = [
    { id: 1, student: 'Ahmad Rizki', class: 'XII IPA 1', type: 'Terlambat', points: -5, time: '08:15' },
    { id: 2, student: 'Siti Aminah', class: 'XI IPS 2', type: 'Juara Lomba', points: 20, time: '09:30' },
    { id: 3, student: 'Budi Santoso', class: 'X MIPA 3', type: 'Tidak mengerjakan PR', points: -10, time: '10:00' },
    { id: 4, student: 'Dewi Lestari', class: 'XII IPA 2', type: 'Membantu Guru', points: 5, time: '10:45' },
]

export default function DashboardPage() {
    const { profile } = useAuth()

    return (
        <DashboardLayout title="Dashboard">
            {/* Welcome */}
            <div className="mb-5">
                <h1 className="text-xl font-bold mb-1">
                    Selamat Datang, {profile?.name?.split(' ')[0] || 'User'}! 👋
                </h1>
                <p className="text-[var(--color-text-muted)] text-[11px] font-medium uppercase tracking-widest">
                    RINGKASAN AKTIVITAS PERILAKU SISWA HARI INI
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {STATS.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
                {/* Line Chart */}
                <div className="lg:col-span-2 glass rounded-[1.5rem] p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Tren Mingguan</h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                                <span className="text-[var(--color-text-muted)]">Pelanggaran</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                                <span className="text-[var(--color-text-muted)]">Prestasi</span>
                            </span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={CHART_DATA}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
                                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pelanggaran"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ fill: '#ef4444' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="prestasi"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="glass rounded-[1.5rem] p-5 flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-6">Jenis Pelanggaran</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={PIE_DATA}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {PIE_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {PIE_DATA.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest">
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color, boxShadow: `0 2px 8px ${item.color}40` }} />
                                <span className="text-[var(--color-text-muted)] truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Reports & Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Reports */}
                <div className="lg:col-span-2 glass rounded-[1.5rem] p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Laporan Terbaru</h3>
                        <Link to="/reports" className="text-[10px] font-black text-[var(--color-primary)] hover:text-[var(--color-accent)] uppercase tracking-widest transition-colors flex items-center gap-1">
                            Lihat Semua <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {RECENT_REPORTS.map((report) => (
                            <div
                                key={report.id}
                                className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl group hover:border-[var(--color-primary)]/30 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-[12px] font-black shadow-lg
                    ${report.points > 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20' : 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/20'}`}>
                                        {report.points > 0 ? <FontAwesomeIcon icon={faArrowUp} /> : <FontAwesomeIcon icon={faArrowDown} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[14px] text-[var(--color-text)] leading-tight mb-0.5">{report.student}</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">
                                            {report.class} <span className="opacity-40 mx-1">•</span> {report.type}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-[12px] font-mono tracking-tighter ${report.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {report.points > 0 ? '+' : ''}{report.points} POIN
                                    </p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-1 uppercase tracking-widest">{report.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass rounded-[1.5rem] p-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-6">Aksi Cepat</h3>
                    <div className="space-y-3">
                        <Link
                            to="/reports/new"
                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] 
                rounded-xl text-white shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-xl hover:shadow-[var(--color-primary)]/30 hover:-translate-y-0.5 transition-all"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <FontAwesomeIcon icon={faPlus} className="text-lg" />
                            </div>
                            <div>
                                <p className="font-bold text-sm font-heading leading-tight mb-0.5">Buat Laporan</p>
                                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">PELANGGARAN / PRESTASI</p>
                            </div>
                        </Link>

                        <Link
                            to="/master/students"
                            className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)]
                rounded-xl hover:border-[var(--color-primary)]/30 group transition-all"
                        >
                            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FontAwesomeIcon icon={faUsers} className="text-lg" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-[var(--color-text)] font-heading leading-tight mb-0.5">Data Siswa</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">KELOLA DATABASE SISWA</p>
                            </div>
                        </Link>

                        <Link
                            to="/reports"
                            className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)]
                rounded-xl hover:border-[var(--color-primary)]/30 group transition-all"
                        >
                            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FontAwesomeIcon icon={faClipboardList} className="text-lg" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-[var(--color-text)] font-heading leading-tight mb-0.5">Semua Laporan</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">LIHAT RIWAYAT LENGKAP</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
