import {
    AreaChart,
    Area,
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
import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight,
    faArrowUp,
    faArrowDown,
    faPlus,
    faUsers,
    faClipboardList,
    faDoorOpen,
    faClock,
    faClipboardCheck
} from '@fortawesome/free-solid-svg-icons'

export const WeeklyTrendChart = memo(function WeeklyTrendChart({ chartData, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 flex flex-col h-full relative z-10 hover:shadow-2xl hover:shadow-[var(--color-primary)]/5 transition-shadow duration-500 min-h-[380px]">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Tren Mingguan</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">7 hari terakhir</p>
                </div>
                {!loading && (
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[var(--color-text-muted)]">Pelanggaran</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[var(--color-text-muted)]">Prestasi</span>
                        </span>
                    </div>
                )}
            </div>

            <div className="h-[280px] w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col gap-4">
                        <div className="flex-1 w-full bg-[var(--color-surface-alt)] animate-pulse rounded-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        </div>
                        <div className="flex justify-between px-2">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="w-6 h-2 bg-[var(--color-surface-alt)] animate-pulse rounded" />)}
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorAchievements" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 11 }} cursor={{ fill: 'var(--color-surface-alt)' }} />
                            <Area type="monotone" dataKey="pelanggaran" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorViolations)" />
                            <Area type="monotone" dataKey="prestasi" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAchievements)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
})

export const RecentReports = memo(function RecentReports({ recentReports, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 relative z-10 hover:shadow-2xl hover:shadow-[var(--color-primary)]/5 transition-shadow duration-500 flex flex-col h-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Laporan Terbaru</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Aktivitas perilaku terkini</p>
                </div>
                <Link to="/raport" className="h-7 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-all">
                    Lihat Semua <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                </Link>
            </div>
            <div className="space-y-2 flex-1">
                {loading ? (
                    [1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)
                ) : recentReports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center opacity-70 hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-3xl mb-4 shadow-lg shadow-black/5">
                            <FontAwesomeIcon icon={faClipboardCheck} />
                        </div>
                        <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Belum Ada Laporan</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] max-w-xs px-4 leading-relaxed">Semua tenang dan aman. Belum ada aktivitas perilaku baru yang tercatat.</p>
                    </div>
                ) : (
                    recentReports.map((report) => (
                        <div key={report.id} className="flex items-center gap-3 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)]/30 transition-all hover:scale-[1.01]">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0 ${report.points > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                                <FontAwesomeIcon icon={report.points > 0 ? faArrowUp : faArrowDown} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black text-[var(--color-text)] truncate">{report.student}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{report.class} · {report.type}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`text-[12px] font-black ${report.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {report.points > 0 ? '+' : ''}{report.points}
                                </p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold">{report.time}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
})

export const PointsConfigPie = memo(function PointsConfigPie({ pieData, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/10 transition-shadow duration-500">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
            <div className="mb-5 flex justify-between items-start relative z-10">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Konfigurasi Poin</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Minggu ini</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faClipboardList} className="text-[10px]" />
                </div>
            </div>

            {loading ? (
                <div className="h-40 flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-[var(--color-border)] border-t-indigo-500 rounded-full animate-spin" />
                </div>
            ) : pieData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/10">
                        <FontAwesomeIcon icon={faClipboardList} />
                    </div>
                    <div className="text-center">
                        <p className="text-[12px] font-black text-[var(--color-text)]">Belum Ada Data</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Tidak ada konfigurasi poin</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="h-40 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="var(--color-surface)" strokeWidth={2}>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 relative z-10">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-[var(--color-text-muted)] truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
})

export const QuickActions = memo(function QuickActions() {
    return (
        <div className="glass rounded-[1.5rem] p-5 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] relative overflow-hidden group hover:shadow-2xl hover:shadow-[var(--color-primary)]/10 transition-all duration-500">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-primary)]/10 transition-colors" />
            <div className="mb-5 relative z-10">
                <p className="text-[13px] font-black text-[var(--color-text)]">Aksi Cepat</p>
                <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Navigasi halaman utama</p>
            </div>
            <div className="space-y-2.5 relative z-10">
                <Link to="/behavior" className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--color-primary)] hover:brightness-110 active:scale-[0.98] text-white transition-all shadow-lg shadow-[var(--color-primary)]/20">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faPlus} className="text-sm" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black leading-tight">Input Perilaku</p>
                        <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-0.5">Poin & Prestasi</p>
                    </div>
                </Link>
                <Link to="/master/students" className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:shadow-lg group/btn transition-all">
                    <div className="w-9 h-9 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faUsers} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">Data Siswa</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest opacity-60 mt-0.5">Database Pusat</p>
                    </div>
                </Link>
                <Link to="/raport" className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:shadow-lg group/btn transition-all">
                    <div className="w-9 h-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faClipboardList} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">Raport Bulanan</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest opacity-60 mt-0.5">Progress Pengisian</p>
                    </div>
                </Link>
            </div>
        </div>
    )
})

export const GatePresence = memo(function GatePresence({ recentGate, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 relative overflow-hidden bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
            <div className="mb-4 flex justify-between items-center relative z-10">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Gate Presence</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Aktivitas gerbang aktif</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 relative">
                    <FontAwesomeIcon icon={faDoorOpen} className="text-[10px]" />
                    {!loading && recentGate.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    )}
                </div>
            </div>
            <div className="space-y-2.5 relative z-10">
                {loading ? (
                    [1, 2].map(i => <div key={i} className="h-10 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)
                ) : recentGate.length === 0 ? (
                    <div className="py-5 text-center border-2 border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/50">
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] opacity-60">Semua di dalam sekolah</p>
                    </div>
                ) : (
                    recentGate.map(g => (
                        <div key={g.id} className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-emerald-500/30 transition-all">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-[var(--color-text)] truncate">{g.name}</p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter opacity-60 mt-0.5">{g.type}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-right px-2 shrink-0">
                                <FontAwesomeIcon icon={faClock} className="text-[8px] text-[var(--color-text-muted)] opacity-40" />
                                <span className="text-[10px] font-black tabular-nums text-[var(--color-text-muted)]">{g.time}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <Link to="/gate" className="mt-4 relative z-10 w-full flex items-center justify-center p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all uppercase tracking-widest gap-2">
                Monitor Gerbang <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
            </Link>
        </div>
    )
})
