import React, { memo, useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faIdCard, faMars, faVenus, faTrophy, faEdit, faTags,
    faHistory, faArrowTrendUp, faArrowTrendDown, faTableList, faClockRotateLeft,
    faTriangleExclamation, faCircleExclamation, faBolt, faChevronDown,
    faXmark, faPlus, faMinus, faStar, faFire, faCrown, faAddressCard, faCopy,
    faInfoCircle, faChartLine, faFileLines, faUserTie, faShieldHalved, faGraduationCap
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { ActionBadge, DiffViewer, AuditTimeline } from '../../pages/admin/LogsPage'

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
    onOpenTagModal
}) {
    if (!isOpen || !selectedStudent) return null

    const handleSaveContact = () => {
        if (isPrivacyMode) return addToast('Mode privasi aktif', 'warning')
        if (!selectedStudent.phone) return addToast('Nomor WA kosong', 'error')

        const guardianName = selectedStudent.guardian_name || 'Ortu'
        const studentName = selectedStudent.name || 'Siswa'
        const cleanPhone = selectedStudent.phone.replace(/\D/g, '')
        const phoneNum = cleanPhone.startsWith('0') ? `+62${cleanPhone.substring(1)}` : `+${cleanPhone}`

        const vCardData = `BEGIN:VCARD\nVERSION:3.0\nFN:Wali - ${studentName} (${guardianName})\nTEL;TYPE=CELL:${phoneNum}\nEND:VCARD`

        const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Wali_${studentName.replace(/\s+/g, '_')}.vcf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        addToast('Kontak VCF berhasil diunduh', 'success')
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Profil Siswa"
            description="Detail informasi akademik, statistik perilaku, histori laporan perizinan, dan rekapan raport siswa."
            icon={faUserTie}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex gap-2.5 w-full">
                    <button
                        onClick={onOpenTagModal}
                        className="h-11 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center gap-2"
                    >
                        <FontAwesomeIcon icon={faTags} className="text-[11px] opacity-70" />
                        Label
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => handleEdit(selectedStudent)}
                            className="flex-1 h-11 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faEdit} className="text-[11px] opacity-70" />
                            Edit Data
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`${!canEdit ? 'flex-1' : 'w-24'} h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center`}
                    >
                        Tutup
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* 1. Header Banner & Identity */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-indigo-600 p-6 text-white shadow-2xl shadow-[var(--color-primary)]/20 group">
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl" />

                    <div className="relative flex flex-col md:flex-row gap-6 items-center md:items-start">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-28 h-28 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 p-1 flex items-center justify-center text-3xl font-black shadow-2xl transition-transform duration-500 group-hover:scale-105">
                                {selectedStudent.photo_url && !isPrivacyMode ? (
                                    <img src={selectedStudent.photo_url} className="w-full h-full object-cover rounded-xl" alt="" />
                                ) : (
                                    <span>{isPrivacyMode ? maskInfo(selectedStudent.name, 1) : selectedStudent.name.charAt(0)}</span>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 px-3 py-1 bg-white text-[var(--color-primary)] rounded-lg text-[10px] font-black shadow-lg shadow-black/20 border border-white/50">
                                {calculateCompleteness(selectedStudent)}% LENGKAP
                            </div>
                        </div>

                        {/* Name & ID */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                                <h2 className="text-2xl font-black tracking-tight drop-shadow-sm">
                                    {isPrivacyMode ? maskInfo(selectedStudent.name, 4) : selectedStudent.name}
                                </h2>
                                {selectedStudent.is_pinned && (
                                    <FontAwesomeIcon icon={faThumbtack} className="text-amber-300 text-sm animate-bounce" />
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px] font-bold text-white/80 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faIdCard} className="opacity-60" /> {selectedStudent.registration_code}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-white/30 hidden md:block" />
                                <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faGraduationCap} className="opacity-60" /> {selectedStudent.className}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-white/30 hidden md:block" />
                                <span className="flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={selectedStudent.gender === 'L' ? faMars : faVenus} className="opacity-60" />
                                    {selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}
                                </span>
                            </div>

                            {/* Tags Pool */}
                            {(selectedStudent.tags || []).length > 0 && (
                                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                                    {selectedStudent.tags.map(t => (
                                        <span key={t} className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-wider">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Points Scoreboard */}
                        <div className="shrink-0 flex flex-col items-center md:items-end justify-center">
                            <div className="p-4 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 text-center min-w-[100px] shadow-2xl transition-all hover:bg-white/20">
                                <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Skor Perilaku</p>
                                <p className={`text-4xl font-black ${selectedStudent.total_points >= 0 ? 'text-white' : 'text-rose-200'}`}>
                                    {selectedStudent.total_points > 0 ? '+' : ''}{selectedStudent.total_points}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Navigation Tabs */}
                <div className="flex bg-[var(--color-surface-alt)]/50 p-1.5 rounded-2xl border border-[var(--color-border)] mb-4 overflow-x-auto no-scrollbar scroll-smooth">
                    {[
                        { id: 'info', label: 'Info Detail', icon: faInfoCircle },
                        { id: 'stats', label: 'Statistik', icon: faChartLine },
                        { id: 'history', label: 'Perilaku', icon: faClockRotateLeft },
                        { id: 'audit', label: 'Audit', icon: faShieldHalved },
                        { id: 'raport', label: 'Raport', icon: faFileLines },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setProfileTab(tab.id)}
                            className={`flex-1 min-w-[90px] h-10 rounded-xl flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-wider transition-all duration-300 relative
                                ${profileTab === tab.id
                                    ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 scale-[1.02]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]/50'
                                }`}
                        >
                            <FontAwesomeIcon icon={tab.icon} className={`text-[12px] transition-transform duration-500 ${profileTab === tab.id ? 'scale-110' : 'opacity-50 group-hover:scale-110'}`} />
                            <span className="truncate">{tab.label}</span>
                            {profileTab === tab.id && (
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* 3. Tab Contents */}
                <div className="space-y-4">
                    {profileTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)]">
                                <h4 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faIdCard} className="opacity-50" /> Data Akademik
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold">Kelas</span>
                                        <span className="text-[11px] font-black text-[var(--color-text)]">{selectedStudent.className}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold">NISN</span>
                                        <span className="text-[11px] font-mono font-black text-[var(--color-primary)]">{isPrivacyMode ? maskInfo(selectedStudent.nisn, 3) : (selectedStudent.nisn || '---')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold">Status</span>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase">{selectedStudent.status || 'Aktif'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)]">
                                <h4 className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faWhatsapp} className="opacity-50" /> Kontak Wali
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-[var(--color-text)] tracking-wider">{isPrivacyMode ? maskInfo(selectedStudent.phone, 3) : (selectedStudent.phone || '---')}</span>
                                        <div className="flex gap-2">
                                            {selectedStudent.phone && (
                                                <button onClick={handleSaveContact} className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-all">
                                                    <FontAwesomeIcon icon={faAddressCard} className="text-[10px]" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold">Wali: <span className="text-[var(--color-text)] font-black">{isPrivacyMode ? maskInfo(selectedStudent.guardian_name, 4) : (selectedStudent.guardian_name || '---')}</span></p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-violet-500/[0.03] border border-violet-500/10">
                                <h4 className="text-[9px] font-black text-violet-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faTrophy} className="opacity-50" /> Info Khusus
                                </h4>
                                <div className="space-y-2 max-h-[80px] overflow-auto custom-scrollbar">
                                    {selectedStudent.metadata && Object.keys(selectedStudent.metadata).length > 0 ? (
                                        Object.entries(selectedStudent.metadata).map(([key, val]) => (
                                            <div key={key} className="flex flex-col">
                                                <span className="text-[8px] font-black text-violet-400 uppercase">{key}</span>
                                                <span className="text-[10px] font-bold text-[var(--color-text)]">{val}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold opacity-50 italic">Tidak ada catatan khusus</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {profileTab === 'stats' && (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <FontAwesomeIcon icon={faChartLine} className="text-indigo-500" />
                                    Analisis Tren Perilaku
                                </h3>

                                {loadingHistory ? (
                                    <div className="flex gap-2 items-end h-32 px-1 animate-pulse">
                                        {[60, 80, 45, 70, 50, 90].map((h, i) => <div key={i} className="flex-1 rounded-t-xl bg-[var(--color-surface-alt)]" style={{ height: `${h}%` }} />)}
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-3xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)]">
                                        {/* Simplified Chart for now, can be expanded */}
                                        <div className="flex gap-3 items-end h-32">
                                            {(() => {
                                                const months = []
                                                for (let i = 5; i >= 0; i--) {
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
                                                return months.map((m, i) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar">
                                                        <div className="w-full flex flex-col gap-0.5 items-stretch justify-end h-full">
                                                            {m.pos > 0 && <div className="w-full rounded-t-md bg-emerald-500/60 group-hover/bar:bg-emerald-500 transition-all" style={{ height: `${(m.pos / maxVal) * 100}%` }} />}
                                                            {m.neg > 0 && <div className="w-full rounded-b-md bg-rose-500/60 group-hover/bar:bg-rose-500 transition-all" style={{ height: `${(m.neg / maxVal) * 100}%` }} />}
                                                            {m.pos === 0 && m.neg === 0 && <div className="w-full h-1 bg-[var(--color-border)] rounded-full opacity-30" />}
                                                        </div>
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">{m.label}</span>
                                                    </div>
                                                ))
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Poin', value: selectedStudent.total_points, color: 'text-[var(--color-text)]', icon: faBolt },
                                    { label: 'Laporan', value: behaviorHistory.length, color: 'text-indigo-500', icon: faHistory },
                                    { label: 'Positif', value: `+${timelineStats.totalPos}`, color: 'text-emerald-500', icon: faPlus },
                                    { label: 'Negatif', value: timelineStats.totalNeg, color: 'text-rose-500', icon: faMinus },
                                ].map(s => (
                                    <div key={s.label} className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] text-center">
                                        <FontAwesomeIcon icon={s.icon} className={`${s.color} text-[10px] mb-2 opacity-60`} />
                                        <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                                        <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {profileTab === 'history' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <FontAwesomeIcon icon={faClockRotateLeft} className="text-indigo-500" />
                                    Log Aktivitas & Perilaku
                                </h3>
                                <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)]">
                                    {['all', 'pos', 'neg'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setTimelineFilter(f)}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                                                ${timelineFilter === f ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {loadingHistory ? (
                                    <div className="animate-pulse space-y-3">
                                        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[var(--color-surface-alt)] rounded-2xl" />)}
                                    </div>
                                ) : timelineFiltered.length === 0 ? (
                                    <div className="py-20 text-center opacity-30">
                                        <FontAwesomeIcon icon={faHistory} className="text-4xl mb-4" />
                                        <p className="text-[10px] font-black uppercase">Belum ada riwayat laporan</p>
                                    </div>
                                ) : (
                                    timelineFiltered.slice(0, timelineVisible).map(item => {
                                        const isPos = (item.points ?? 0) >= 0
                                        return (
                                            <div key={item.id} className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/10 border border-[var(--color-border)] flex items-start gap-4 hover:bg-[var(--color-surface-alt)]/20 transition-all">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isPos ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                                    <span className="text-sm font-black">{item.points > 0 ? '+' : ''}{item.points}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-black text-[var(--color-text)] leading-tight">{item.description || item.notes}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                                                        <span className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-wider">{item.teacher_name || 'Admin'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}

                                {timelineFiltered.length > timelineVisible && (
                                    <button
                                        onClick={() => setTimelineVisible(v => v + 10)}
                                        className="w-full py-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all"
                                    >
                                        Muat Lebih Banyak...
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {profileTab === 'audit' && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faShieldHalved} className="text-indigo-500" />
                                Jejak Audit Digital
                            </h3>
                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 p-4">
                                <AuditTimeline tableName="students" recordId={selectedStudent.id} showSearch={true} />
                            </div>
                        </div>
                    )}

                    {profileTab === 'raport' && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileLines} className="text-indigo-500" />
                                Arsip Raport Bulanan
                            </h3>

                            {loadingRaport ? (
                                <div className="animate-pulse space-y-3">
                                    {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--color-surface-alt)] rounded-2xl" />)}
                                </div>
                            ) : raportHistory.length === 0 ? (
                                <div className="py-20 text-center opacity-30">
                                    <FontAwesomeIcon icon={faTableList} className="text-4xl mb-4" />
                                    <p className="text-[10px] font-black uppercase">Belum ada rekapan raport</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {raportHistory.map(r => {
                                        const KRITERIA = [
                                            { key: 'nilai_akhlak', label: 'Akhlak', color: 'bg-amber-500' },
                                            { key: 'nilai_ibadah', label: 'Ibadah', color: 'bg-indigo-500' },
                                            { key: 'nilai_kebersihan', label: 'Kebersihan', color: 'bg-cyan-500' },
                                            { key: 'nilai_quran', label: 'Quran', color: 'bg-emerald-500' },
                                            { key: 'nilai_bahasa', label: 'Bahasa', color: 'bg-violet-500' },
                                        ]
                                        const values = KRITERIA.map(k => r[k.key]).filter(v => v !== null)
                                        const avg = values.length ? (values.reduce((a, b) => a + Number(b), 0) / values.length).toFixed(1) : '---'

                                        return (
                                            <div key={r.id} className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/30 transition-all">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex flex-col items-center justify-center font-black">
                                                            <span className="text-[8px] uppercase leading-none opacity-60">Bln</span>
                                                            <span className="text-sm leading-none">{r.month}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[12px] font-black text-[var(--color-text)]">Raport Bulanan</p>
                                                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{r.year} · Musyrif: {r.musyrif_name || '---'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-black text-[var(--color-primary)]">{avg}</p>
                                                        <p className="text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)]">Rata-rata</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {KRITERIA.map(k => (
                                                        <div key={k.key} className="flex flex-col items-center p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                            <span className="text-[12px] font-black mb-1">{r[k.key] || '---'}</span>
                                                            <span className="text-[7px] font-black uppercase text-[var(--color-text-muted)]">{k.label}</span>
                                                            <div className={`w-full h-1 mt-1.5 rounded-full ${k.color} opacity-20`} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
})