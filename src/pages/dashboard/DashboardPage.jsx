import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUsers,
    faClipboardList,
    faArrowUp,
    faArrowDown,
    faPlus,
    faArrowRight,
    faExclamationTriangle,
    faTrophy,
    faHandPeace,
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
import { supabase } from '../../lib/supabase'

function startOfDay(d = new Date()) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}
function addDays(d, n) {
    const x = new Date(d)
    x.setDate(x.getDate() + n)
    return x
}
function iso(d) {
    return new Date(d).toISOString()
}

function getPoints(r) {
    // biar aman kalau nama kolom beda-beda
    return (
        r?.points ??
        r?.point ??
        r?.delta_points ??
        r?.point_change ??
        r?.score ??
        0
    )
}

function formatTrend(now, prev, unitLabel = '') {
    // contoh: "+12%" atau "-8%" / fallback
    if (prev === 0 && now === 0) return '0' + unitLabel
    if (prev === 0 && now > 0) return `+∞${unitLabel}`
    const pct = Math.round(((now - prev) / prev) * 100)
    const sign = pct > 0 ? '+' : ''
    return `${sign}${pct}%${unitLabel}`
}

export default function DashboardPage() {
    const { profile } = useAuth()

    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalStudents: 0,
        todayReports: 0,
        weekViolations: 0,
        weekAchievements: 0,
        trendStudents: '+0',
        trendReports: '+0',
        trendViolations: '0%',
        trendAchievements: '0%',
    })
    const [chartData, setChartData] = useState([]) // [{name, pelanggaran, prestasi}]
    const [pieData, setPieData] = useState([])     // [{name, value, color}]
    const [recentReports, setRecentReports] = useState([])
    const [raportProgress, setRaportProgress] = useState([])  // [{className, filled, total, pct}]
    const [riskStudents, setRiskStudents] = useState([])  // [{id, name, className, points}]
    const [classRanking, setClassRanking] = useState([])  // [{className, avg, count}]

    const COLORS = useMemo(() => ([
        '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#10b981', '#3b82f6'
    ]), [])

    useEffect(() => {
        const run = async () => {
            setLoading(true)

            // helper date
            const startOfDay = (d = new Date()) => {
                const x = new Date(d)
                x.setHours(0, 0, 0, 0)
                return x
            }
            const addDays = (d, n) => {
                const x = new Date(d)
                x.setDate(x.getDate() + n)
                return x
            }
            const iso = (d) => new Date(d).toISOString()

            const today0 = startOfDay(new Date())
            const tomorrow0 = startOfDay(addDays(today0, 1))
            const from7 = startOfDay(addDays(today0, -6))
            const from14 = startOfDay(addDays(today0, -13))

            try {
                // 1) total siswa aktif (tidak diarsip)
                const { count: studentCount, error: studentCountErr } = await supabase
                    .from('students')
                    .select('id', { count: 'exact', head: true })
                    .is('deleted_at', null)

                if (studentCountErr) {
                    console.log('studentCountErr', studentCountErr)
                    throw studentCountErr
                }

                // 2) laporan hari ini (pakai reported_at)
                const { count: todayReportCount, error: todayReportErr } = await supabase
                    .from('reports')
                    .select('id', { count: 'exact', head: true })
                    .gte('reported_at', iso(today0))
                    .lt('reported_at', iso(tomorrow0))

                if (todayReportErr) {
                    console.log('todayReportErr', todayReportErr)
                    // jangan throw biar total siswa tetap tampil
                }

                // 3) fetch reports 14 hari terakhir
                let reports14 = []
                const { data: reports14Data, error: reports14Err } = await supabase
                    .from('reports')
                    .select(`
                        id, student_id, violation_type_id, points, reported_at,
                        violation_types:violation_type_id ( id, name, is_negative )
                    `)
                    .gte('reported_at', iso(from14))
                    .lt('reported_at', iso(tomorrow0))
                    .order('reported_at', { ascending: true })

                if (reports14Err) {
                    console.log('reports14Err', reports14Err)
                } else {
                    reports14 = reports14Data || []
                }

                const rThisWeek = reports14.filter(r => new Date(r.reported_at) >= from7)
                const rPrevWeek = reports14.filter(r => new Date(r.reported_at) < from7)

                const isNeg = (r) => r.violation_types?.is_negative === true

                const vioThis = rThisWeek.filter(isNeg).length
                const achThis = rThisWeek.filter(r => !isNeg(r)).length
                const vioPrev = rPrevWeek.filter(isNeg).length
                const achPrev = rPrevWeek.filter(r => !isNeg(r)).length

                const formatTrend = (now, prev) => {
                    if (prev === 0 && now === 0) return '0%'
                    if (prev === 0 && now > 0) return '+∞%'
                    const pct = Math.round(((now - prev) / prev) * 100)
                    return `${pct > 0 ? '+' : ''}${pct}%`
                }

                // 4) Chart 7 hari
                const days = Array.from({ length: 7 }).map((_, i) => addDays(from7, i))
                const chart = days.map((d) => {
                    const d0 = startOfDay(d)
                    const d1 = startOfDay(addDays(d0, 1))
                    const dayReports = reports14.filter(r => {
                        const t = new Date(r.reported_at)
                        return t >= d0 && t < d1
                    })
                    return {
                        name: d0.toLocaleDateString('id-ID', { weekday: 'short' }),
                        pelanggaran: dayReports.filter(isNeg).length,
                        prestasi: dayReports.filter(r => !isNeg(r)).length,
                    }
                })

                // 5) Pie data (top jenis pelanggaran minggu ini)
                // Ambil violation type name untuk minggu ini (join)
                let pie = []
                if (rThisWeek.length > 0) {
                    const ids = [...new Set(rThisWeek.map(r => r.violation_type_id).filter(Boolean))]

                    const { data: vtData, error: vtErr } = await supabase
                        .from('violation_types')
                        .select('id, name')
                        .in('id', ids)

                    if (!vtErr && vtData) {
                        const nameById = new Map(vtData.map(v => [v.id, v.name]))
                        const freq = new Map()

                        for (const r of rThisWeek) {
                            if (!isNeg(r)) continue
                            const nm = r.violation_types?.name || 'Lainnya'
                            freq.set(nm, (freq.get(nm) || 0) + 1)
                        }

                        const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
                        const top = sorted.slice(0, 4)
                        const rest = sorted.slice(4)
                        const restSum = rest.reduce((acc, [, v]) => acc + v, 0)

                        // kamu bebas pakai warna statis di UI kamu (seperti sebelumnya)
                        const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#3b82f6']

                        pie = [
                            ...top.map(([name, value], idx) => ({ name, value, color: COLORS[idx % COLORS.length] })),
                            ...(restSum > 0 ? [{ name: 'Lainnya', value: restSum, color: COLORS[3] }] : []),
                        ]
                    }
                }

                // 6) Recent reports (4 terbaru) join ke students + classes
                let recent = []
                const { data: recentData, error: recentErr } = await supabase
                    .from('reports')
                    .select(`
          id,
          points,
          reported_at,
          students:student_id (
            name,
            classes:class_id ( name )
          ),
          violation_types:violation_type_id ( name )
        `)
                    .order('reported_at', { ascending: false })
                    .limit(4)

                if (!recentErr && recentData) {
                    recent = recentData.map((r) => ({
                        id: r.id,
                        student: r.students?.name || 'Siswa',
                        class: r.students?.classes?.name || '-',
                        type: r.violation_types?.name || 'Laporan',
                        points: r.points ?? 0,
                        time: new Date(r.reported_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    }))
                } else {
                    console.log('recentErr', recentErr)
                }

                setStats({
                    totalStudents: studentCount || 0,
                    todayReports: todayReportCount || 0,
                    weekViolations: vioThis,
                    weekAchievements: achThis,
                    trendStudents: `${studentCount || 0} total`,
                    trendReports: 'hari ini',
                    trendViolations: `${formatTrend(vioThis, vioPrev)} minggu ini`,
                    trendAchievements: `${formatTrend(achThis, achPrev)} minggu ini`,
                })

                setChartData(chart)
                setPieData(pie)
                setRecentReports(recent)

                // ── 7) Progress Raport Bulanan per Kelas ──────────────────────
                const nowD = new Date()
                const curMonth = nowD.getMonth() + 1
                const curYear = nowD.getFullYear()

                // Ambil semua kelas + jumlah siswa aktif per kelas
                const { data: classesData } = await supabase
                    .from('classes')
                    .select('id, name')

                const { data: studentsByClass } = await supabase
                    .from('students')
                    .select('id, class_id')
                    .is('deleted_at', null)

                // Raport bulan ini yang sudah diisi
                const { data: raportThisMonth } = await supabase
                    .from('student_monthly_reports')
                    .select('student_id, students:student_id(class_id)')
                    .eq('month', curMonth)
                    .eq('year', curYear)

                if (classesData && studentsByClass) {
                    const filledSet = new Set((raportThisMonth || []).map(r => r.student_id))
                    const progress = classesData.map(cls => {
                        const members = studentsByClass.filter(s => s.class_id === cls.id)
                        const filled = members.filter(s => filledSet.has(s.id)).length
                        const total = members.length
                        return { className: cls.name, filled, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 }
                    }).filter(c => c.total > 0).sort((a, b) => b.pct - a.pct)
                    setRaportProgress(progress)
                }

                // ── 8) Siswa Risiko (total_points paling rendah) ──────────────
                const RiskThreshold = 0
                const { data: riskData } = await supabase
                    .from('students')
                    .select('id, name, total_points, classes:class_id(name)')
                    .is('deleted_at', null)
                    .lt('total_points', RiskThreshold)
                    .order('total_points', { ascending: true })
                    .limit(5)

                if (riskData) {
                    setRiskStudents(riskData.map(s => ({
                        id: s.id,
                        name: s.name,
                        className: s.classes?.name || '-',
                        points: s.total_points ?? 0,
                    })))
                }

                // ── 9) Ranking Kelas (rata-rata poin) ─────────────────────────
                const { data: allStudentPoints } = await supabase
                    .from('students')
                    .select('class_id, total_points, classes:class_id(name)')
                    .is('deleted_at', null)

                if (allStudentPoints && classesData) {
                    const rankMap = {}
                    for (const s of allStudentPoints) {
                        const cn = s.classes?.name || 'Tanpa Kelas'
                        if (!rankMap[cn]) rankMap[cn] = { sum: 0, count: 0 }
                        rankMap[cn].sum += s.total_points ?? 0
                        rankMap[cn].count += 1
                    }
                    const ranking = Object.entries(rankMap)
                        .map(([className, { sum, count }]) => ({
                            className,
                            avg: count > 0 ? Math.round(sum / count) : 0,
                            count,
                        }))
                        .sort((a, b) => b.avg - a.avg)
                    setClassRanking(ranking)
                }
            } catch (e) {
                console.error('Dashboard fetch error:', e)
            } finally {
                setLoading(false)
            }
        }

        run()
    }, [])

    // adapt ke StatCard kamu
    const STATS = useMemo(() => ([
        {
            icon: faUsers,
            label: 'Total Siswa',
            value: loading ? '…' : String(stats.totalStudents),
            trend: stats.trendStudents,
            trendUp: true,
            color: 'indigo',
        },
        {
            icon: faClipboardList,
            label: 'Laporan Hari Ini',
            value: loading ? '…' : String(stats.todayReports),
            trend: stats.trendReports,
            trendUp: true,
            color: 'blue',
        },
        {
            icon: faExclamationTriangle,
            label: 'Pelanggaran',
            value: loading ? '…' : String(stats.weekViolations),
            trend: stats.trendViolations,
            trendUp: !stats.trendViolations.startsWith('+'), // kalau naik pelanggaran, trendUp false
            color: 'red',
        },
        {
            icon: faTrophy,
            label: 'Prestasi',
            value: loading ? '…' : String(stats.weekAchievements),
            trend: stats.trendAchievements,
            trendUp: stats.trendAchievements.startsWith('+') || stats.weekAchievements > 0,
            color: 'green',
        },
    ]), [loading, stats])

    return (
        <DashboardLayout title="Dashboard">
            {/* Welcome */}
            <div className="mb-5">
                <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight flex items-center gap-2">
                    Selamat Datang, {profile?.name?.split(' ')[0] || 'User'}!
                    <FontAwesomeIcon icon={faHandPeace} className="text-amber-400 animate-bounce" />
                </h1>
                <p className="text-[var(--color-text-muted)] text-[11px] font-medium tracking-widest">
                    Ringkasan Aktivitas Perilaku Siswa Hari Ini
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
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                            Tren Mingguan
                        </h3>
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
                            <LineChart data={chartData}>
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
                                <Line type="monotone" dataKey="pelanggaran" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                                <Line type="monotone" dataKey="prestasi" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="glass rounded-[1.5rem] p-5 flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-6">
                        Jenis Pelanggaran
                    </h3>

                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                                    style={{ backgroundColor: item.color, boxShadow: `0 2px 8px ${item.color}40` }}
                                />
                                <span className="text-[var(--color-text-muted)] truncate">{item.name}</span>
                            </div>
                        ))}
                        {!loading && pieData.length === 0 && (
                            <div className="col-span-2 text-[10px] font-bold tracking-widest text-[var(--color-text-muted)]">
                                Belum ada data pelanggaran minggu ini.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Reports & Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Reports */}
                <div className="lg:col-span-2 glass rounded-[1.5rem] p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                            Laporan Terbaru
                        </h3>
                        <Link
                            to="/raport"
                            className="text-[10px] font-black text-[var(--color-primary)] hover:text-[var(--color-accent)] uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                            Lihat Semua <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {!loading && recentReports.length === 0 ? (
                            <div className="p-4 text-xs text-[var(--color-text-muted)]">
                                Belum ada laporan terbaru.
                            </div>
                        ) : (
                            recentReports.map((report) => (
                                <div
                                    key={report.id}
                                    className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl group hover:border-[var(--color-primary)]/30 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-[12px] font-black shadow-lg
                      ${report.points > 0
                                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20'
                                                    : 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/20'
                                                }`}
                                        >
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
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass rounded-[1.5rem] p-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-6">Aksi Cepat</h3>
                    <div className="space-y-3">
                        <Link
                            to="/raport/new"
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
                            to="/raport"
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
            {/* ── BOTTOM ROW: 3 Analytics Sections ── */}
            <div className="grid lg:grid-cols-3 gap-6 mt-6">

                {/* ① Progress Raport Bulanan */}
                <div className="glass rounded-[1.5rem] p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                            Raport Bulan Ini
                        </h3>
                        <span className="text-[9px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-lg">
                            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-8 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                        </div>
                    ) : raportProgress.length === 0 ? (
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold py-4 text-center opacity-50">Belum ada data raport</p>
                    ) : (
                        <div className="space-y-2.5 flex-1">
                            {raportProgress.map((cls, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-black text-[var(--color-text)] truncate flex-1">{cls.className}</span>
                                        <span className="text-[10px] font-black shrink-0 ml-2"
                                            style={{ color: cls.pct === 100 ? '#10b981' : cls.pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                                            {cls.filled}/{cls.total}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${cls.pct}%`,
                                                background: cls.pct === 100 ? '#10b981' : cls.pct >= 50 ? '#f59e0b' : '#ef4444'
                                            }} />
                                    </div>
                                    <p className="text-[8px] text-[var(--color-text-muted)] font-bold mt-0.5 text-right">{cls.pct}%</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Ringkasan total */}
                    {!loading && raportProgress.length > 0 && (() => {
                        const totalFilled = raportProgress.reduce((a, c) => a + c.filled, 0)
                        const totalAll = raportProgress.reduce((a, c) => a + c.total, 0)
                        const overallPct = totalAll > 0 ? Math.round((totalFilled / totalAll) * 100) : 0
                        return (
                            <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Total Keseluruhan</span>
                                <span className="text-sm font-black" style={{ color: overallPct === 100 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#ef4444' }}>
                                    {overallPct}%
                                </span>
                            </div>
                        )
                    })()}
                </div>

                {/* ② Siswa Risiko */}
                <div className="glass rounded-[1.5rem] p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                            Siswa Risiko
                        </h3>
                        <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg">
                            Poin Negatif
                        </span>
                    </div>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-11 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                        </div>
                    ) : riskStudents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 opacity-40">
                            <FontAwesomeIcon icon={faHandPeace} className="text-2xl text-emerald-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Tidak ada siswa berisiko</p>
                        </div>
                    ) : (
                        <div className="space-y-2 flex-1">
                            {riskStudents.map((s, i) => (
                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-all">
                                    <div className="w-6 h-6 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center text-[9px] font-black shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black text-[var(--color-text)] truncate">{s.name}</p>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] truncate">{s.className}</p>
                                    </div>
                                    <span className="text-[11px] font-black text-red-500 shrink-0">{s.points}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link to="/master/students"
                        className="mt-4 pt-4 border-t border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:text-[var(--color-accent)] flex items-center justify-end gap-1 transition-colors">
                        Lihat Semua Siswa <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                    </Link>
                </div>

                {/* ③ Ranking Kelas */}
                <div className="glass rounded-[1.5rem] p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                            Ranking Kelas
                        </h3>
                        <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                            Rata-rata Poin
                        </span>
                    </div>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-11 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                        </div>
                    ) : classRanking.length === 0 ? (
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold py-4 text-center opacity-50">Belum ada data kelas</p>
                    ) : (
                        <div className="space-y-2 flex-1">
                            {classRanking.map((cls, i) => {
                                const MEDALS = ['🥇', '🥈', '🥉']
                                const maxAvg = classRanking[0]?.avg || 1
                                const barPct = maxAvg > 0 ? Math.max((cls.avg / maxAvg) * 100, 4) : 4
                                const barColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#c2763e' : '#6366f1'
                                return (
                                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-all">
                                        <span className="text-sm shrink-0 w-5 text-center">{MEDALS[i] || <span className="text-[9px] font-black text-[var(--color-text-muted)]">{i + 1}</span>}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-[var(--color-text)] truncate">{cls.className}</p>
                                            <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden mt-1">
                                                <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: barColor }} />
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-[11px] font-black" style={{ color: barColor }}>{cls.avg > 0 ? '+' : ''}{cls.avg}</p>
                                            <p className="text-[8px] text-[var(--color-text-muted)] font-bold">{cls.count} siswa</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}