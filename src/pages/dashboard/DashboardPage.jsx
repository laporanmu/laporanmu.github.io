import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUsers,
    faClipboardList,
    faExclamationTriangle,
    faTrophy,
    faArrowUp,
    faArrowDown,
    faPlus,
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
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1">
                    Selamat Datang, {profile?.name?.split(' ')[0] || 'User'}! 👋
                </h1>
                <p className="text-[var(--color-text-muted)]">
                    Berikut ringkasan aktivitas perilaku siswa hari ini.
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
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Tren Mingguan</h3>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500" />
                                Pelanggaran
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                Prestasi
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
                <div className="card">
                    <h3 className="font-semibold mb-4">Jenis Pelanggaran</h3>
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
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {PIE_DATA.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-[var(--color-text-muted)]">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Reports & Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Reports */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Laporan Terbaru</h3>
                        <Link to="/reports" className="text-sm text-indigo-500 hover:text-indigo-600">
                            Lihat Semua →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {RECENT_REPORTS.map((report) => (
                            <div
                                key={report.id}
                                className="flex items-center justify-between p-3 bg-[var(--color-surface-alt)] rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium
                    ${report.points > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                        {report.points > 0 ? <FontAwesomeIcon icon={faArrowUp} /> : <FontAwesomeIcon icon={faArrowDown} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{report.student}</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            {report.class} • {report.type}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold text-sm ${report.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {report.points > 0 ? '+' : ''}{report.points} poin
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)]">{report.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="font-semibold mb-4">Aksi Cepat</h3>
                    <div className="space-y-3">
                        <Link
                            to="/reports/new"
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 
                rounded-xl text-white hover:opacity-90 transition-opacity"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faPlus} />
                            </div>
                            <div>
                                <p className="font-medium">Buat Laporan</p>
                                <p className="text-sm text-white/80">Input pelanggaran/prestasi</p>
                            </div>
                        </Link>

                        <Link
                            to="/master/students"
                            className="flex items-center gap-3 p-4 bg-[var(--color-surface-alt)] 
                rounded-xl hover:bg-[var(--color-border)] transition-colors"
                        >
                            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faUsers} />
                            </div>
                            <div>
                                <p className="font-medium">Data Siswa</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Kelola data siswa</p>
                            </div>
                        </Link>

                        <Link
                            to="/reports"
                            className="flex items-center gap-3 p-4 bg-[var(--color-surface-alt)] 
                rounded-xl hover:bg-[var(--color-border)] transition-colors"
                        >
                            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faClipboardList} />
                            </div>
                            <div>
                                <p className="font-medium">Semua Laporan</p>
                                <p className="text-sm text-[var(--color-text-muted)]">Lihat riwayat lengkap</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
