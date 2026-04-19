import { useEffect, useMemo, useState, useCallback, memo, lazy, Suspense } from 'react'
import StatsCarousel from '../components/StatsCarousel'
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
    faDoorOpen,
    faClock,
    faRotate,
} from '@fortawesome/free-solid-svg-icons'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout'
import Breadcrumb from '../components/ui/Breadcrumb'
import PageHeader from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/DataDisplay'

// Modular Components
const AnalyticsRow = lazy(() => import('./dashboard/components/AnalyticsRow'))

// Lazy loaded widgets for optimal performance & code splitting
const WeeklyTrendChart = lazy(() => import('./dashboard/components/widgets/WeeklyTrendChart').then(m => ({ default: m.WeeklyTrendChart })))
const RecentReports = lazy(() => import('./dashboard/components/widgets/RecentReports').then(m => ({ default: m.RecentReports })))
const PointsConfigPie = lazy(() => import('./dashboard/components/widgets/PointsConfigPie').then(m => ({ default: m.PointsConfigPie })))
const QuickActions = lazy(() => import('./dashboard/components/widgets/QuickActions').then(m => ({ default: m.QuickActions })))
const GatePresence = lazy(() => import('./dashboard/components/widgets/GatePresence').then(m => ({ default: m.GatePresence })))
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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
    const [lastUpdated, setLastUpdated] = useState(new Date())
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [stats, setStats] = useState({
        totalStudents: 0,
        todayReports: 0,
        weekPoin: 0,
        weekAchievements: 0,
        trendStudents: '+0',
        trendReports: '+0',
        trendPoin: '0%',
        trendAchievements: '0%',
    })
    const [chartData, setChartData] = useState([]) // [{name, pelanggaran, prestasi}]
    const [pieData, setPieData] = useState([])     // [{name, value, color}]
    const [recentReports, setRecentReports] = useState([])
    const [raportProgress, setRaportProgress] = useState([])  // [{className, filled, total, pct}]
    const [riskStudents, setRiskStudents] = useState([])  // [{id, name, className, points}]
    const [classRanking, setClassRanking] = useState([])  // [{className, avg, count}]
    const [recentGate, setRecentGate] = useState([])      // [{id, name, type, time}]

    const COLORS = useMemo(() => ([
        '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#10b981', '#3b82f6'
    ]), [])

    const fetchDashboardData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true)
        else setIsRefreshing(true)

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

            if (studentCountErr) throw studentCountErr

            // 2) laporan hari ini
            const { count: todayReportCount } = await supabase
                .from('reports')
                .select('id', { count: 'exact', head: true })
                .gte('reported_at', iso(today0))
                .lt('reported_at', iso(tomorrow0))

            // 3) fetch reports 14 hari terakhir
            let reports14 = []
            const { data: reports14Data, error: reports14Err } = await supabase
                .from('reports')
                .select(`
                    id, student_id, violation_type_id, points, reported_at,
                    point_rules:violation_type_id ( id, name, is_negative )
                `)
                .gte('reported_at', iso(from14))
                .lt('reported_at', iso(tomorrow0))
                .order('reported_at', { ascending: true })

            if (!reports14Err) {
                reports14 = reports14Data || []
            }

            const rThisWeek = reports14.filter(r => new Date(r.reported_at) >= from7)
            const rPrevWeek = reports14.filter(r => new Date(r.reported_at) < from7)
            const isNeg = (r) => r.point_rules?.is_negative === true
            const vioThis = rThisWeek.filter(isNeg).length
            const achThis = rThisWeek.filter(r => !isNeg(r)).length
            const vioPrev = rPrevWeek.filter(isNeg).length
            const achPrev = rPrevWeek.filter(r => !isNeg(r)).length

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

            // 5) Pie data
            let pie = []
            if (rThisWeek.length > 0) {
                const ids = [...new Set(rThisWeek.map(r => r.violation_type_id).filter(Boolean))]
                const { data: vtData, error: vtErr } = await supabase
                    .from('point_rules')
                    .select('id, name')
                    .in('id', ids)

                if (!vtErr && vtData) {
                    const freq = new Map()
                    for (const r of rThisWeek) {
                        if (!isNeg(r)) continue
                        const nm = r.point_rules?.name || 'Lainnya'
                        freq.set(nm, (freq.get(nm) || 0) + 1)
                    }
                    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
                    const top = sorted.slice(0, 4)
                    const restSum = sorted.slice(4).reduce((acc, [, v]) => acc + v, 0)
                    const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#3b82f6']

                    pie = [
                        ...top.map(([name, value], idx) => ({ name, value, color: COLORS[idx % COLORS.length] })),
                        ...(restSum > 0 ? [{ name: 'Lainnya', value: restSum, color: COLORS[3] }] : []),
                    ]
                }
            }

            // 6) Recent reports
            const { data: recentData } = await supabase
                .from('reports')
                .select(`
                    id, points, reported_at,
                    students:student_id ( name, classes:class_id ( name ) ),
                    point_rules:violation_type_id ( name )
                `)
                .order('reported_at', { ascending: false })
                .limit(4)

            const recent = (recentData || []).map((r) => ({
                id: r.id,
                student: r.students?.name || 'Siswa',
                class: r.students?.classes?.name || '-',
                type: r.point_rules?.name || 'Laporan',
                points: r.points ?? 0,
                time: new Date(r.reported_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            }))

            setStats({
                totalStudents: studentCount || 0,
                todayReports: todayReportCount || 0,
                weekPoin: vioThis,
                weekAchievements: achThis,
                trendStudents: `${studentCount || 0} total`,
                trendReports: 'hari ini',
                trendPoin: `${formatTrend(vioThis, vioPrev)} minggu ini`,
                trendAchievements: `${formatTrend(achThis, achPrev)} minggu ini`,
            })

            setChartData(chart)
            setPieData(pie)
            setRecentReports(recent)
            setLastUpdated(new Date())

            // Sidebar & Analytics widgets
            const { data: classesData } = await supabase.from('classes').select('id, name')
            const { data: studentsByClass } = await supabase.from('students').select('id, class_id').is('deleted_at', null)
            const { data: raportThisMonth } = await supabase.from('student_monthly_reports').select('student_id').eq('month', new Date().getMonth() + 1).eq('year', new Date().getFullYear())

            if (classesData && studentsByClass) {
                const filledSet = new Set((raportThisMonth || []).map(r => r.student_id))
                setRaportProgress(classesData.map(cls => {
                    const members = studentsByClass.filter(s => s.class_id === cls.id)
                    const filled = members.filter(s => filledSet.has(s.id)).length
                    return { className: cls.name, filled, total: members.length, pct: members.length > 0 ? Math.round((filled / members.length) * 100) : 0 }
                }).filter(c => c.total > 0).sort((a, b) => b.pct - a.pct))
            }

            const { data: riskData } = await supabase.from('students').select('id, name, total_points, classes:class_id(name)').is('deleted_at', null).lt('total_points', 0).order('total_points', { ascending: true }).limit(5)
            if (riskData) setRiskStudents(riskData.map(s => ({ id: s.id, name: s.name, className: s.classes?.name || '-', points: s.total_points ?? 0 })))

            const { data: gateData } = await supabase.from('gate_logs').select('id, visitor_name, visitor_type, check_in').is('check_out', null).order('check_in', { ascending: false }).limit(3)
            if (gateData) setRecentGate(gateData.map(g => ({ id: g.id, name: g.visitor_name, type: g.visitor_type, time: new Date(g.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) })))

        } catch (e) {
            console.error('Refresh Error:', e)
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    const handleRefresh = () => {
        fetchDashboardData(true)
    }

    // adapt ke StatCard kamu
    const STATS = useMemo(() => ([
        {
            icon: faUsers,
            label: 'Total Siswa',
            value: loading ? '…' : String(stats.totalStudents),
            trend: stats.trendStudents,
            trendUp: true,
            borderColor: 'border-t-[var(--color-primary)]',
            iconBg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
        },
        {
            icon: faClipboardList,
            label: 'Laporan Hari Ini',
            value: loading ? '…' : String(stats.todayReports),
            trend: stats.trendReports,
            trendUp: true,
            borderColor: 'border-t-blue-500',
            iconBg: 'bg-blue-500/10 text-blue-500',
        },
        {
            icon: faExclamationTriangle,
            label: 'Pelanggaran',
            value: loading ? '…' : String(stats.weekPoin),
            trend: stats.trendPoin,
            trendUp: !stats.trendPoin.startsWith('+'),
            borderColor: 'border-t-red-500',
            iconBg: 'bg-red-500/10 text-red-500',
        },
        {
            icon: faTrophy,
            label: 'Prestasi',
            value: loading ? '…' : String(stats.weekAchievements),
            trend: stats.trendAchievements,
            trendUp: stats.trendAchievements.startsWith('+') || stats.weekAchievements > 0,
            borderColor: 'border-t-emerald-500',
            iconBg: 'bg-emerald-500/10 text-emerald-500',
        },
    ]), [loading, stats])

    return (
        <DashboardLayout title="Dashboard">
            <div className="p-4 md:p-6 max-w-[1800px] mx-auto">

                {/* ── PAGE HEADER ── */}
                <PageHeader
                    badge="Dashboard"
                    breadcrumbs={['Overview']}
                    title={
                        <>
                            Selamat Datang, {profile?.name?.split(' ')[0] || 'User'}!
                            <span className="text-amber-400">👋</span>
                        </>
                    }
                    subtitle={
                        <span className="flex items-center gap-2">
                            Ringkasan aktivitas perilaku siswa hari ini.
                            <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">
                                Updated: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </span>
                    }
                    actions={
                        <button 
                            onClick={handleRefresh}
                            disabled={loading || isRefreshing}
                            aria-label="Refresh Dashboard Data"
                            className={`h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all flex items-center justify-center group ${isRefreshing ? 'opacity-50' : ''}`}
                            title="Refresh Data"
                        >
                            <FontAwesomeIcon icon={faRotate} className={`text-xs ${isRefreshing ? 'fa-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        </button>
                    }
                />

                {/* ── STATS CAROUSEL ── */}
                <StatsCarousel count={STATS.length}>
                    {STATS.map((stat, idx) => (
                        <StatCard 
                            key={idx}
                            icon={stat.icon}
                            label={stat.label}
                            value={stat.value}
                            trend={stat.trend}
                            trendUp={stat.trendUp}
                            loading={loading}
                            borderColor={stat.borderColor}
                            iconBg={stat.iconBg}
                        />
                    ))}
                </StatsCarousel>

                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    {/* ── LEFT MAIN COLUMN ── */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4">
                        <Suspense fallback={<div className="flex flex-col gap-4"><div className="glass rounded-[1.5rem] p-5 h-[380px] animate-pulse bg-[var(--color-surface-alt)]" /><div className="glass rounded-[1.5rem] p-5 h-[400px] animate-pulse bg-[var(--color-surface-alt)]" /></div>}>
                            <WeeklyTrendChart chartData={chartData} loading={loading} />
                            <RecentReports recentReports={recentReports} loading={loading} />
                        </Suspense>
                    </div>

                    {/* ── RIGHT STICKY SIDEBAR ── */}
                    <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col gap-4 sticky top-6 self-start">
                        <Suspense fallback={<div className="flex flex-col gap-4"><div className="glass rounded-[1.5rem] p-5 h-[280px] animate-pulse bg-[var(--color-surface-alt)]" /><div className="glass rounded-[1.5rem] p-5 h-[240px] animate-pulse bg-[var(--color-surface-alt)]" /><div className="glass rounded-[1.5rem] p-5 h-[300px] animate-pulse bg-[var(--color-surface-alt)]" /></div>}>
                            <PointsConfigPie pieData={pieData} loading={loading} />
                            <QuickActions />
                            <GatePresence recentGate={recentGate} loading={loading} />
                        </Suspense>
                    </div>
                </div>

                {/* ── BOTTOM ROW: Analytics ── */}
                <Suspense fallback={<div className="grid lg:grid-cols-2 gap-4"><div className="glass rounded-[1.5rem] p-5 h-[200px] animate-pulse bg-[var(--color-surface-alt)]" /><div className="glass rounded-[1.5rem] p-5 h-[200px] animate-pulse bg-[var(--color-surface-alt)]" /></div>}>
                    <AnalyticsRow raportProgress={raportProgress} riskStudents={riskStudents} classRanking={classRanking} loading={loading} />
                </Suspense>
            </div>
        </DashboardLayout>
    )
}