import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faIdCard, faMars, faVenus, faTrophy, faEdit, faTags,
    faHistory, faArrowTrendUp, faTableList, faClockRotateLeft,
    faTriangleExclamation, faCircleExclamation, faBolt, faChevronDown,
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

export default memo(function StudentProfileModal({
    isOpen,
    onClose,
    selectedStudent,
    isPrivacyMode,
    maskInfo,
    calculateCompleteness,
    behaviorHistory,
    loadingHistory,
    RiskThreshold,
    canEdit,
    handleEdit,
    profileTab,
    setProfileTab,
    timelineStats,
    timelineFilter,
    setTimelineFilter,
    timelineVisible,
    setTimelineVisible,
    timelineFiltered,
    raportHistory,
    loadingRaport,
    addToast,
    onOpenTagModal,
}) {
    if (!isOpen || !selectedStudent) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Profil Siswa" size="lg" mobileVariant="bottom-sheet">
            <div className="space-y-4 pt-1">
                <p className="text-[10px] sm:text-[11px] text-[var(--color-text-muted)] font-bold opacity-70 leading-relaxed px-0.5">
                    Detail informasi akademik, statistik perilaku, histori laporan perizinan, dan rekapan raport siswa.
                </p>
                {/* Compact Slim Header */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-violet-600 to-purple-800"></div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

                    <div className="relative p-3 sm:p-4 flex items-center gap-3 sm:gap-5 text-white">
                        {/* Slim Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-xl sm:text-2xl font-black shadow-xl overflow-hidden z-10 relative">
                                {selectedStudent.photo_url && !isPrivacyMode ? (
                                    <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{isPrivacyMode ? '*' : selectedStudent.name.charAt(0)}</span>
                                )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border border-white/30 shadow-lg z-20 ${selectedStudent.status === 'aktif' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                {selectedStudent.status}
                            </div>
                        </div>

                        {/* Name & Quick Stats */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <h2 className="text-[15px] sm:text-lg font-black text-white leading-tight drop-shadow-sm max-w-[200px] sm:max-w-none">
                                    {isPrivacyMode ? maskInfo(selectedStudent.name, 4) : selectedStudent.name}
                                </h2>
                                {(() => {
                                    const completeness = calculateCompleteness(selectedStudent);
                                    return (
                                        <div className={`text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border shrink-0 ${completeness === 100 ? 'bg-emerald-400/20 text-emerald-100 border-emerald-400/30' : 'bg-white/10 text-white/90 border-white/20'}`}>
                                            {completeness}% READY
                                        </div>
                                    )
                                })()}
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-white/70 overflow-hidden">
                                    <FontAwesomeIcon icon={faIdCard} className="text-[9px] shrink-0" />
                                    <span className="text-[10px] font-bold tracking-wider truncate uppercase">{isPrivacyMode ? maskInfo(selectedStudent.registration_code || selectedStudent.code, 3) : (selectedStudent.registration_code || selectedStudent.code)}</span>
                                </div>
                                <div className="flex-1 max-w-[120px] hidden xs:block">
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-700"
                                            style={{ width: `${calculateCompleteness(selectedStudent)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions (Copy ID) */}
                        <button
                            onClick={() => {
                                if (isPrivacyMode) return addToast('Mode Privasi aktif', 'warning');
                                navigator.clipboard.writeText(selectedStudent.registration_code || selectedStudent.code);
                                addToast('ID disalin', 'success');
                            }}
                            className="hidden xs:flex h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[8px] sm:text-[9px] font-black uppercase transition-all tracking-wider items-center justify-center whitespace-nowrap"
                        >
                            SALIN ID
                        </button>
                    </div>
                </div>

                {/* ── COMPACT ALERT PILLS ── */}
                {(() => {
                    const now = new Date()
                    const alerts = []

                    if (behaviorHistory.length > 0) {
                        const lastDate = new Date(behaviorHistory[0].created_at)
                        const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
                        if (daysSince >= 14) alerts.push({ id: 'stale', color: 'amber', icon: faClockRotateLeft, text: `Tidak ada laporan ${daysSince} hari` })
                    } else if (!loadingHistory) {
                        alerts.push({ id: 'empty', color: 'amber', icon: faClockRotateLeft, text: 'Belum ada laporan' })
                    }
                    if ((selectedStudent.points ?? selectedStudent.total_points ?? 0) < RiskThreshold)
                        alerts.push({ id: 'risk', color: 'red', icon: faTriangleExclamation, text: `Poin risiko (${RiskThreshold})` })
                    if (!selectedStudent.phone)
                        alerts.push({ id: 'no_wa', color: 'blue', icon: faCircleExclamation, text: 'No. WA belum diisi', action: true })
                    const completeness = calculateCompleteness(selectedStudent)
                    if (completeness < 70)
                        alerts.push({ id: 'incomplete', color: 'violet', icon: faCircleExclamation, text: `Data ${completeness}% terisi` })

                    if (alerts.length === 0) return null

                    const colorMap = {
                        red: 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400',
                        amber: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
                        blue: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
                        violet: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
                    }

                    return (
                        <div className="flex flex-wrap gap-1.5">
                            {alerts.map(a => (
                                <span
                                    key={a.id}
                                    onClick={a.action && canEdit ? () => { onClose(); handleEdit(selectedStudent) } : undefined}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-bold ${colorMap[a.color]} ${a.action && canEdit ? 'cursor-pointer hover:brightness-110' : ''}`}
                                >
                                    <FontAwesomeIcon icon={a.icon} className="text-[8px]" />
                                    {a.text}
                                    {a.action && <span className="opacity-60 font-black ml-0.5">→</span>}
                                </span>
                            ))}
                        </div>
                    )
                })()}

                {/* ── TAB BAR ── */}
                <div className="flex gap-0.5 p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                    {[
                        { key: 'info', label: 'Info', icon: faIdCard },
                        { key: 'statistik', label: 'Statistik', icon: faArrowTrendUp },
                        {
                            key: 'laporan', label: 'Laporan', icon: faHistory,
                            badge: !loadingHistory && behaviorHistory.length > 0 ? behaviorHistory.length : null
                        },
                        {
                            key: 'raport', label: 'Raport', icon: faTableList,
                            badge: !loadingRaport && raportHistory.length > 0 ? raportHistory.length : null
                        },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setProfileTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                ${profileTab === tab.key
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={tab.icon} className="text-[9px]" />
                            {tab.label}
                            {tab.badge && (
                                <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] text-[8px] font-black leading-none">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── TAB: INFO ── */}
                {profileTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Academic Box */}
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)]">
                            <h4 className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faIdCard} className="opacity-50" /> Data Akademik
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-[var(--color-text-muted)] font-bold">Kelas</span>
                                    <span className="font-black text-[var(--color-text)]">{selectedStudent.className}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-[var(--color-text-muted)] font-bold">Gender</span>
                                    <div className="flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={selectedStudent.gender === 'L' ? faMars : faVenus} className={selectedStudent.gender === 'L' ? 'text-blue-500' : 'text-pink-500'} />
                                        <span className="font-black text-[var(--color-text)] uppercase">{selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-[var(--color-text-muted)] font-bold">NISN</span>
                                    <span className="font-mono font-black text-[var(--color-primary)]">{isPrivacyMode ? maskInfo(selectedStudent.nisn, 3) : (selectedStudent.nisn || '---')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact Box */}
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)]">
                            <h4 className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faWhatsapp} className="opacity-50" /> Kontak Wali
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center group">
                                    <span className="text-[8px] text-[var(--color-text-muted)] font-black uppercase">WhatsApp</span>
                                    {selectedStudent.phone && (
                                        <a href={isPrivacyMode ? '#' : `https://wa.me/${selectedStudent.phone.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer"
                                            className="text-emerald-500 hover:text-emerald-600 transition-colors text-[9px] font-black uppercase flex items-center gap-1">
                                            Chat <FontAwesomeIcon icon={faBolt} className="text-[7px]" />
                                        </a>
                                    )}
                                </div>
                                <p className="text-[10px] font-black text-[var(--color-text)] tracking-wider">{isPrivacyMode ? maskInfo(selectedStudent.phone, 3) : (selectedStudent.phone || '---')}</p>
                                <div className="pt-1.5 border-t border-[var(--color-border)]/30">
                                    <p className="text-[8px] text-[var(--color-text-muted)] font-bold mb-0.5">Wali: <span className="text-[var(--color-text)] font-black">{isPrivacyMode ? maskInfo(selectedStudent.guardian_name, 4) : (selectedStudent.guardian_name || '---')}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Metadata / Special Info Box */}
                        <div className="p-3 rounded-xl bg-violet-500/[0.03] border border-violet-500/10">
                            <h4 className="text-[8px] font-black text-violet-600 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faTrophy} className="opacity-50" /> Informasi Khusus
                            </h4>
                            <div className="max-h-[60px] overflow-auto pr-1 space-y-2 scrollbar-none">
                                {selectedStudent.metadata && Object.keys(selectedStudent.metadata).length > 0 ? (
                                    Object.entries(selectedStudent.metadata).map(([key, val]) => (
                                        <div key={key} className="flex flex-col">
                                            <span className="text-[7px] font-black text-violet-400 uppercase tracking-tighter">{key}</span>
                                            <span className="text-[9px] font-bold text-[var(--color-text)] line-clamp-1">{val}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold opacity-50 italic py-2">Tidak ada catatan data khusus</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: STATISTIK ── */}
                {profileTab === 'statistik' && (
                    <div className="space-y-4">
                        {/* Bar Chart — poin 4 bulan terakhir */}
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-1 flex items-center gap-2">
                                <FontAwesomeIcon icon={faArrowTrendUp} className="text-indigo-500 text-[8px]" />
                                Tren 4 Bulan Terakhir
                            </h3>
                            {loadingHistory ? (
                                <div className="flex gap-2 items-end h-[88px] px-1">
                                    {[60, 80, 45, 70].map((h, i) => (
                                        <div key={i} className="flex-1 rounded-t-lg bg-[var(--color-surface-alt)] animate-pulse" style={{ height: `${h}%` }} />
                                    ))}
                                </div>
                            ) : (() => {
                                const months = []
                                for (let i = 3; i >= 0; i--) {
                                    const d = new Date()
                                    d.setMonth(d.getMonth() - i)
                                    months.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), pos: 0, neg: 0 })
                                }
                                behaviorHistory.forEach(item => {
                                    const d = new Date(item.created_at)
                                    const bucket = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear())
                                    if (!bucket) return
                                    const pts = item.points ?? 0
                                    if (pts > 0) bucket.pos += pts
                                    else bucket.neg += Math.abs(pts)
                                })
                                const maxVal = Math.max(...months.map(m => Math.max(m.pos, m.neg)), 1)
                                return (
                                    <div className="flex gap-2 items-end h-[88px] px-1">
                                        {months.map((m, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                                                <div className="w-full flex flex-col gap-0.5 items-stretch justify-end" style={{ height: '72px' }}>
                                                    {m.pos > 0 && <div title={`+${m.pos} poin positif`} className="w-full rounded-t-[3px] bg-emerald-500/70 hover:bg-emerald-500 transition-colors cursor-help" style={{ height: `${Math.max((m.pos / maxVal) * 100, 8)}%` }} />}
                                                    {m.neg > 0 && <div title={`-${m.neg} poin negatif`} className="w-full rounded-b-[3px] bg-red-400/70 hover:bg-red-400 transition-colors cursor-help" style={{ height: `${Math.max((m.neg / maxVal) * 100, 8)}%` }} />}
                                                    {m.pos === 0 && m.neg === 0 && <div className="w-full rounded-[3px] bg-[var(--color-surface-alt)] opacity-40" style={{ height: '12%' }} />}
                                                </div>
                                                <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase">{m.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}
                            <div className="flex gap-3 px-1">
                                <span className="flex items-center gap-1 text-[7px] font-black text-[var(--color-text-muted)] opacity-60"><div className="w-2 h-2 rounded-sm bg-emerald-500/70" />Positif</span>
                                <span className="flex items-center gap-1 text-[7px] font-black text-[var(--color-text-muted)] opacity-60"><div className="w-2 h-2 rounded-sm bg-red-400/70" />Negatif</span>
                            </div>
                        </div>

                        {/* Stats tiles */}
                        {loadingHistory ? (
                            <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Total Laporan', value: behaviorHistory.length, color: 'text-[var(--color-text)]', bg: 'bg-[var(--color-surface-alt)]/60 border-[var(--color-border)]' },
                                    { label: 'Total Poin', value: `${(selectedStudent.points ?? selectedStudent.total_points ?? 0) >= 0 ? '+' : ''}${selectedStudent.points ?? selectedStudent.total_points ?? 0}`, color: (selectedStudent.points ?? selectedStudent.total_points ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500', bg: 'bg-[var(--color-surface-alt)]/60 border-[var(--color-border)]' },
                                    { label: `Positif (${timelineStats.pos}×)`, value: `+${timelineStats.totalPos}`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                                    { label: `Negatif (${timelineStats.neg}×)`, value: timelineStats.totalNeg || 0, color: 'text-red-500', bg: 'bg-red-500/5 border-red-500/15' },
                                ].map(s => (
                                    <div key={s.label} className={`${s.bg} border rounded-xl px-3 py-2.5`}>
                                        <p className={`text-sm font-black leading-none ${s.color}`}>{s.value}</p>
                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] mt-1 leading-tight">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: LAPORAN ── */}
                {profileTab === 'laporan' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faHistory} className="text-[8px]" />
                                Riwayat Laporan
                                {!loadingHistory && behaviorHistory.length > 0 && (
                                    <span className="text-[7px] font-bold opacity-50">({behaviorHistory.length} total)</span>
                                )}
                            </h3>
                            <div className="flex gap-0.5 bg-[var(--color-surface-alt)] rounded-lg p-0.5 border border-[var(--color-border)]">
                                {[{ key: 'all', label: 'Semua' }, { key: 'pos', label: '▲ Pos' }, { key: 'neg', label: '▼ Neg' }].map(tab => (
                                    <button key={tab.key} onClick={() => { setTimelineFilter(tab.key); setTimelineVisible(8) }}
                                        className={`px-2 py-0.5 rounded-md text-[8px] font-black transition-all
                            ${timelineFilter === tab.key ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 overflow-hidden">
                            {loadingHistory ? (
                                <div className="p-3 space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-2.5 items-start">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-surface-alt)] animate-pulse mt-1 shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-3/4 bg-[var(--color-surface-alt)] rounded animate-pulse" />
                                                <div className="h-2.5 w-1/2 bg-[var(--color-surface-alt)] rounded animate-pulse opacity-60" />
                                            </div>
                                            <div className="h-5 w-10 bg-[var(--color-surface-alt)] rounded-lg animate-pulse shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : timelineFiltered.length === 0 ? (
                                <div className="py-10 flex flex-col items-center justify-center opacity-30 gap-1.5">
                                    <FontAwesomeIcon icon={faHistory} className="text-base" />
                                    <p className="text-[8px] font-black uppercase">Tidak ada laporan</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-1">
                                    {timelineFiltered.slice(0, timelineVisible).map((item) => {
                                        const isPos = (item.points ?? 0) >= 0
                                        const displayDate = new Date(item.reported_at || item.created_at)
                                        const time = displayDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                        const dateLabel = displayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                        const reporter = item.teacher_name || null
                                        return (
                                            <div key={item.id} className="relative flex items-start gap-2.5 py-2 border-b border-[var(--color-border)]/40 last:border-0">
                                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isPos ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.45)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.45)]'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-[var(--color-text)] leading-tight truncate">
                                                        {(item.description || item.notes || 'Laporan').split('\n')[0].slice(0, 50)}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[7px] text-[var(--color-text-muted)] font-bold">{dateLabel} · {time}</span>
                                                        {reporter && (
                                                            <span className="text-[7px] font-black text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                                                {reporter}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg
                                    ${isPos ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                    {(item.points ?? 0) > 0 ? '+' : ''}{item.points ?? 0}
                                                </span>
                                            </div>
                                        )
                                    })}
                                    {timelineFiltered.length > timelineVisible && (
                                        <button
                                            onClick={() => setTimelineVisible(v => v + 10)}
                                            className="w-full mt-1 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-all border border-dashed border-[var(--color-border)]"
                                        >
                                            Lihat {Math.min(10, timelineFiltered.length - timelineVisible)} laporan lagi
                                            <span className="opacity-50 ml-1">({timelineFiltered.length - timelineVisible} tersisa)</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB: RAPORT BULANAN ── */}
                {profileTab === 'raport' && (() => {
                    const BULAN_STR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
                    const KRITERIA = [
                        { key: 'nilai_akhlak', label: 'Akhlak', color: '#f59e0b' },
                        { key: 'nilai_ibadah', label: 'Ibadah', color: '#6366f1' },
                        { key: 'nilai_kebersihan', label: 'Kebersihan', color: '#06b6d4' },
                        { key: 'nilai_quran', label: "Al-Qur'an", color: '#10b981' },
                        { key: 'nilai_bahasa', label: 'Bahasa', color: '#8b5cf6' },
                    ]
                    const calcAvg = (r) => {
                        const vals = KRITERIA.map(k => r[k.key]).filter(v => v !== null && v !== undefined && v !== '')
                        if (!vals.length) return null
                        return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
                    }
                    const gradeColor = (n) => {
                        const v = Number(n)
                        if (v >= 9) return '#10b981'
                        if (v >= 8) return '#3b82f6'
                        if (v >= 6) return '#6366f1'
                        if (v >= 4) return '#f59e0b'
                        return '#ef4444'
                    }
                    const gradeLabel = (n) => {
                        const v = Number(n)
                        if (v >= 9) return 'Istimewa'
                        if (v >= 8) return 'Sangat Baik'
                        if (v >= 6) return 'Baik'
                        if (v >= 4) return 'Cukup'
                        return 'Kurang'
                    }

                    return (
                        <div className="space-y-3">
                            {loadingRaport ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />
                                    ))}
                                </div>
                            ) : raportHistory.length === 0 ? (
                                <div className="py-10 flex flex-col items-center justify-center opacity-30 gap-2">
                                    <FontAwesomeIcon icon={faTableList} className="text-2xl" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">Belum ada raport bulanan</p>
                                </div>
                            ) : (
                                <>
                                    {/* ── Mini trend chart (avg per bulan) ── */}
                                    {raportHistory.length >= 2 && (() => {
                                        const sorted = [...raportHistory].reverse() // oldest first
                                        const avgs = sorted.map(r => Number(calcAvg(r) ?? 0))
                                        const maxV = Math.max(...avgs, 1)
                                        return (
                                            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                                                    <FontAwesomeIcon icon={faArrowTrendUp} className="text-emerald-500" />
                                                    Tren Rata-rata Nilai
                                                </p>
                                                <div className="flex items-end gap-1 h-14">
                                                    {sorted.map((r, i) => {
                                                        const avg = Number(calcAvg(r) ?? 0)
                                                        const pct = maxV > 0 ? Math.max((avg / maxV) * 100, 8) : 8
                                                        return (
                                                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end" title={`${BULAN_STR[r.month]} ${r.year}: ${avg}`}>
                                                                <div className="w-full rounded-t-[3px] transition-all hover:brightness-110 cursor-help"
                                                                    style={{ height: `${pct}%`, background: gradeColor(avg) + 'aa' }} />
                                                                <span className="text-[7px] font-black text-[var(--color-text-muted)]">{BULAN_STR[r.month]}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* ── Raport cards per bulan ── */}
                                    <div className="space-y-2">
                                        {raportHistory.map((r) => {
                                            const avg = calcAvg(r)
                                            const color = avg ? gradeColor(avg) : 'var(--color-text-muted)'
                                            const totalAbsen = (r.hari_sakit || 0) + (r.hari_izin || 0) + (r.hari_alpa || 0)
                                            return (
                                                <details key={r.id} className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 overflow-hidden">
                                                    <summary className="flex items-center gap-3 p-3 cursor-pointer select-none hover:bg-[var(--color-surface-alt)]/40 transition-colors list-none">
                                                        {/* Bulan badge */}
                                                        <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 font-black border"
                                                            style={{ background: color + '15', borderColor: color + '30', color }}>
                                                            <span className="text-[9px] leading-none">{BULAN_STR[r.month]}</span>
                                                            <span className="text-[8px] leading-none opacity-70">{r.year}</span>
                                                        </div>
                                                        {/* Nilai bars mini */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex gap-0.5 h-2 mb-1">
                                                                {KRITERIA.map(k => {
                                                                    const v = r[k.key]
                                                                    const pct = v !== null && v !== undefined && v !== '' ? (Number(v) / 9) * 100 : 0
                                                                    return (
                                                                        <div key={k.key} className="flex-1 rounded-full bg-[var(--color-border)] overflow-hidden" title={`${k.label}: ${v ?? '—'}`}>
                                                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: k.color }} />
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                            <p className="text-[9px] text-[var(--color-text-muted)] font-bold truncate">
                                                                {r.musyrif_name || 'Musyrif tidak dicatat'}
                                                                {totalAbsen > 0 && <span className="ml-2 text-amber-500">· {totalAbsen} hari absen</span>}
                                                            </p>
                                                        </div>
                                                        {/* Avg badge */}
                                                        <div className="shrink-0 text-right">
                                                            {avg ? (
                                                                <>
                                                                    <p className="text-sm font-black leading-none" style={{ color }}>{avg}</p>
                                                                    <p className="text-[7px] font-bold" style={{ color }}>{gradeLabel(avg)}</p>
                                                                </>
                                                            ) : (
                                                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold">—</p>
                                                            )}
                                                        </div>
                                                        <FontAwesomeIcon icon={faChevronDown} className="text-[9px] text-[var(--color-text-muted)] group-open:rotate-180 transition-transform shrink-0" />
                                                    </summary>

                                                    {/* Expanded detail */}
                                                    <div className="px-3 pb-3 pt-1 border-t border-[var(--color-border)]/50">
                                                        <div className="grid grid-cols-5 gap-2 mb-3">
                                                            {KRITERIA.map(k => {
                                                                const v = r[k.key]
                                                                const hasVal = v !== null && v !== undefined && v !== ''
                                                                return (
                                                                    <div key={k.key} className="flex flex-col items-center gap-1 p-2 rounded-lg border"
                                                                        style={{ background: hasVal ? k.color + '10' : 'transparent', borderColor: hasVal ? k.color + '30' : 'var(--color-border)' }}>
                                                                        <span className="text-base font-black leading-none" style={{ color: hasVal ? k.color : 'var(--color-text-muted)' }}>
                                                                            {hasVal ? v : '—'}
                                                                        </span>
                                                                        <span className="text-[7px] font-black text-center leading-tight" style={{ color: hasVal ? k.color : 'var(--color-text-muted)' }}>
                                                                            {k.label}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        {/* Absensi & fisik */}
                                                        <div className="grid grid-cols-4 gap-2 text-center">
                                                            {[
                                                                { label: 'Sakit', val: r.hari_sakit, color: 'text-red-400' },
                                                                { label: 'Izin', val: r.hari_izin, color: 'text-amber-400' },
                                                                { label: 'Alpa', val: r.hari_alpa, color: 'text-red-600' },
                                                                { label: 'Pulang', val: r.hari_pulang, color: 'text-blue-400' },
                                                            ].map(item => (
                                                                <div key={item.label} className="p-1.5 rounded-lg bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]">
                                                                    <p className={`text-sm font-black ${item.color}`}>{item.val ?? 0}</p>
                                                                    <p className="text-[7px] text-[var(--color-text-muted)] font-bold uppercase">{item.label}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* BB/TB & catatan */}
                                                        {(r.berat_badan || r.tinggi_badan || r.catatan) && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {r.berat_badan && <span className="text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-2 py-1 rounded-lg border border-[var(--color-border)]">⚖ {r.berat_badan} kg</span>}
                                                                {r.tinggi_badan && <span className="text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-2 py-1 rounded-lg border border-[var(--color-border)]">📏 {r.tinggi_badan} cm</span>}
                                                                {r.catatan && <span className="text-[9px] font-medium text-[var(--color-text-muted)] italic">"{r.catatan}"</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </details>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })()}

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-4 pb-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] sticky bottom-0 z-30 -mx-0.5 mt-2">
                    {canEdit && (
                        <button
                            onClick={() => {
                                onClose()
                                onOpenTagModal()
                            }}
                            className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <FontAwesomeIcon icon={faTags} className="text-[11px]" />
                            <span className="hidden xs:inline">Label</span>
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => {
                                onClose()
                                handleEdit(selectedStudent)
                            }}
                            className="h-9 px-5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
                        >
                            <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                            <span className="hidden xs:inline">Edit Data</span>
                        </button>
                    )}
                    <button
                        onClick={() => onClose()}
                        className="h-9 px-6 rounded-xl bg-[var(--color-text)] text-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-text)]/10"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </Modal>
    )
})