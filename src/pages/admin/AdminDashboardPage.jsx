import { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faDatabase, faRobot, faShieldHalved, faServer,
    faTerminal, faMicrochip, faCloud, faRotateLeft,
    faArrowUp, faArrowDown, faBolt, faTriangleExclamation,
    faCircleCheck, faDownload, faTableColumns, faCube
} from '@fortawesome/free-solid-svg-icons'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { supabase } from '../../lib/supabase'

const TOKEN_RATE = 0.0012

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        dbRows: 0,
        aiTokens: 0,
        aiCost: 0,
        tempTasks: 0,
        errorLogs: 0,
        storageUsage: '1.2 GB', // Mock for now
        latency: '0.82s'
    })

    const [dbDistribution, setDbDistribution] = useState([])
    const [aiTrend, setAiTrend] = useState([])
    const [systemLogs, setSystemLogs] = useState([])

    const fetchTechnicalStats = async () => {
        setLoading(true)
        try {
            // 1. Fetch DB Stats (sampling some main tables)
            const tables = ['students', 'reports', 'teachers', 'gate_logs', 'ai_logs', 'audit_logs']
            const counts = await Promise.all(tables.map(async (t) => {
                const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
                return { name: t, count: count || 0 }
            }))

            const totalRows = counts.reduce((acc, c) => acc + c.count, 0)
            setDbDistribution(counts.map(c => ({
                name: c.name.replace('_', ' '),
                value: c.count,
                color: c.name === 'ai_logs' ? '#6366f1' : c.name === 'reports' ? '#ef4444' : '#10b981'
            })))

            // 2. AI Intelligence (from ai_logs)
            const { data: aiLogs } = await supabase
                .from('ai_logs')
                .select('user_query, ai_response, created_at')
                .order('created_at', { ascending: false })
            
            let totalTokens = 0
            if (aiLogs) {
                totalTokens = aiLogs.reduce((acc, log) => {
                    return acc + Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4)
                }, 0)

                // Group by day for trend
                const last7Days = Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date()
                    d.setDate(d.getDate() - i)
                    d.setHours(0,0,0,0)
                    return d
                }).reverse()

                const trend = last7Days.map(date => {
                    const dayLogs = aiLogs.filter(l => new Date(l.created_at) >= date && new Date(l.created_at) < new Date(date.getTime() + 86400000))
                    return {
                        name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                        tokens: dayLogs.reduce((acc, l) => acc + Math.round((l.user_query.length + (l.ai_response?.length || 0)) / 4), 0)
                    }
                })
                setAiTrend(trend)
            }

            // 3. Error counts (from audit_logs or mock if empty)
            const { count: errCount } = await supabase
                .from('audit_logs')
                .select('*', { count: 'exact', head: true })
                .ilike('action', '%error%')

            // 4. System Logs (recent activity)
            const { data: recentAudit } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5)

            setSystemLogs(recentAudit || [])

            setStats({
                dbRows: totalRows,
                aiTokens: totalTokens,
                aiCost: (totalTokens * TOKEN_RATE).toFixed(4),
                tempTasks: 42, // Mock background tasks
                errorLogs: errCount || 0,
                storageUsage: (totalRows * 0.05).toFixed(1) + ' MB', // Estimation
                latency: '0.82s'
            })

        } catch (err) {
            console.error('Tech Stats Error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTechnicalStats()
    }, [])

    const TECH_STATS = [
        { label: 'DB Complexity', value: stats.dbRows, sub: 'Total Rows', icon: faDatabase, color: 'text-indigo-600', bg: 'bg-indigo-600/10' },
        { label: 'Neural Traffic', value: stats.aiTokens, sub: `${stats.aiTokens} Tkns`, icon: faRobot, color: 'text-violet-600', bg: 'bg-violet-600/10' },
        { label: 'Cloud Assets', value: stats.storageUsage, sub: 'Est. Size', icon: faCloud, color: 'text-sky-600', bg: 'bg-sky-600/10' },
        { label: 'System Health', value: 'Healthy', sub: `${stats.latency} Stable`, icon: faBolt, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
    ]

    return (
        <DashboardLayout title="Admin Hub">
            <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
                
                {/* ── HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['Technical Dashboard']} className="mb-1" />
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Admin Dashboard Center</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 uppercase tracking-widest animate-pulse">System Active</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Pusat kendali monitoring infrastruktur, data neural, dan integritas database.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchTechnicalStats} className="h-9 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-border)] transition-all">
                            <FontAwesomeIcon icon={faRotateLeft} className={loading ? 'animate-spin' : ''} /> Refresh Sync
                        </button>
                    </div>
                </div>

                {/* ── TECH STATS GRID ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TECH_STATS.map((s, idx) => (
                        <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-[2rem] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
                                    <FontAwesomeIcon icon={s.icon} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-0.5">{s.label}</p>
                                    <h3 className="text-xl font-black text-[var(--color-text)] leading-none">{s.value}</h3>
                                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1 opacity-70">{s.sub}</p>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full" />
                        </div>
                    ))}
                </div>

                {/* ── CHARTS SECTION ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Machine Intel Trend */}
                    <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-[13px] font-black text-[var(--color-text)]">Neural Consumption</h3>
                                <p className="text-[10px] text-[var(--color-text-muted)] opacity-70">Tren penggunaan token AI 7 hari terakhir</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-500">$ {stats.aiCost}</p>
                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Est. Weekly Cost</p>
                            </div>
                        </div>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={aiTrend}>
                                    <defs>
                                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Data Distribution */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] p-6 shadow-sm flex flex-col items-center">
                        <div className="w-full text-left mb-4">
                            <h3 className="text-[13px] font-black text-[var(--color-text)]">Database Schema</h3>
                            <p className="text-[10px] text-[var(--color-text-muted)] opacity-70">Distribusi baris data per modul</p>
                        </div>
                        <div className="h-[180px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dbDistribution} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {dbDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-black">{stats.dbRows}</span>
                                <span className="text-[8px] font-black uppercase text-[var(--color-text-muted)]">Rows</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full">
                            {dbDistribution.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] truncate capitalize">{d.name}</span>
                                    <span className="text-[10px] font-black ml-auto">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── BOTTOM ACTIONS & LOGS ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* System Logs */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[13px] font-black text-[var(--color-text)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faTerminal} className="text-indigo-500" />
                                Recent System Audit
                            </h3>
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-2 py-1 rounded-lg">Live Trace</span>
                        </div>
                        <div className="space-y-3">
                            {systemLogs.length === 0 ? (
                                <p className="text-[11px] text-[var(--color-text-muted)] text-center py-10 italic opacity-50">Tidak ada log sistem terbaru.</p>
                            ) : (
                                systemLogs.map((log, i) => (
                                    <div key={i} className="flex items-start gap-4 p-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] group hover:border-indigo-500/20 transition-all">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${log.action === 'ERROR' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                            <FontAwesomeIcon icon={log.action === 'ERROR' ? faTriangleExclamation : faMicrochip} className="text-[10px]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-tight">{log.action || 'ACTIVITY'}</p>
                                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-60 tabular-nums">{new Date(log.created_at).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-1 font-mono">{log.source || 'SYSTEM'} · {JSON.stringify(log.newData || log.oldData || '').slice(0, 50)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Technical Shortcuts */}
                    <div className="grid grid-cols-2 gap-4">
                        <TechnicalCard 
                            title="Database" 
                            desc="Integrity & Schema" 
                            icon={faDatabase} 
                            color="text-indigo-500" 
                            bg="bg-indigo-500/5" 
                            to="/admin/database"
                        />
                        <TechnicalCard 
                            title="Audit Logs" 
                            desc="User Mutations" 
                            icon={faTerminal} 
                            color="text-purple-500" 
                            bg="bg-purple-500/5" 
                            to="/admin/logs"
                        />
                        <TechnicalCard 
                            title="Neural Logs" 
                            desc="AI Monitoring" 
                            icon={faRobot} 
                            color="text-sky-500" 
                            bg="bg-sky-500/5" 
                            to="/admin/ai-insights"
                        />
                        <TechnicalCard 
                            title="Storage" 
                            desc="Asset Management" 
                            icon={faCloud} 
                            color="text-amber-500" 
                            bg="bg-amber-500/5" 
                            to="/admin/storage"
                        />
                        <TechnicalCard 
                            title="Tasks" 
                            desc="Automation Sync" 
                            icon={faServer} 
                            color="text-emerald-500" 
                            bg="bg-emerald-500/5" 
                            to="/admin/tasks"
                        />
                        <TechnicalCard 
                            title="Security" 
                            desc="Role & ACL" 
                            icon={faShieldHalved} 
                            color="text-rose-500" 
                            bg="bg-rose-500/5" 
                            to="/admin/users"
                        />
                    </div>
                </div>

            </div>
        </DashboardLayout>
    )
}

function TechnicalCard({ title, desc, icon, color, bg, to }) {
    return (
        <a href={to} className={`p-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center text-center gap-3 hover:shadow-xl hover:border-indigo-500/20 active:scale-95 transition-all group`}>
            <div className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <FontAwesomeIcon icon={icon} className="text-sm" />
            </div>
            <div>
                <p className="text-[12px] font-black text-[var(--color-text)] leading-none mb-1">{title}</p>
                <p className="text-[9px] text-[var(--color-text-muted)] font-bold opacity-60 uppercase tracking-widest leading-none">{desc}</p>
            </div>
        </a>
    )
}
