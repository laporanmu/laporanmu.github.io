import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faIdCard, faMars, faVenus, faTrophy, faEdit, faTags,
    faHistory, faChartLine, faFileLines, faClockRotateLeft,
    faUserTie, faShieldHalved, faGraduationCap, faCopy,
    faInfoCircle, faAddressCard, faBolt, faArrowTrendUp, faArrowTrendDown, faTableList, faPlus, faMinus,
    faMapMarkerAlt, faCalendarAlt, faPrayingHands, faVenusMars, faIdBadge, faMap, faDoorOpen
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { AuditTimeline } from '../../pages/admin/LogsPage'
import { EmptyState, StatCard } from '../ui/DataDisplay'

export default memo(function StudentProfileModal({
    isOpen, onClose, selectedStudent, isPrivacyMode, maskInfo, calculateCompleteness,
    behaviorHistory = [], loadingHistory, canEdit, handleEdit, profileTab, setProfileTab,
    timelineStats, timelineFilter, setTimelineFilter, timelineVisible, setTimelineVisible,
    timelineFiltered = [], raportHistory = [], loadingRaport, addToast, onOpenTagModal
}) {
    if (!isOpen || !selectedStudent) return null

    const copyToClipboard = (text, label) => {
        if (isPrivacyMode) return addToast('Mode privasi aktif', 'warning')
        navigator.clipboard.writeText(text)
        addToast(`${label} berhasil disalin`, 'success')
    }

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
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex gap-2.5 w-full">
                    <button onClick={onOpenTagModal} className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faTags} className="opacity-70" /> Label
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => {
                                onClose();
                                handleEdit(selectedStudent);
                            }}
                            className="flex-1 h-10 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                        >
                            <FontAwesomeIcon icon={faEdit} className="opacity-70" /> Edit Data
                        </button>
                    )}
                    <button onClick={onClose} className="w-24 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center">
                        Tutup
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* 1. Compact Identity Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white shadow-xl">
                    <div className="relative flex items-center gap-5">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center text-2xl font-black overflow-hidden shadow-lg">
                                {selectedStudent.photo_url && !isPrivacyMode ? (
                                    <img src={selectedStudent.photo_url} className="w-full h-full object-cover rounded-lg" alt="" />
                                ) : (
                                    <span>{isPrivacyMode ? maskInfo(selectedStudent.name, 1) : selectedStudent.name.charAt(0)}</span>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-indigo-500 text-white rounded-md text-[8px] font-black shadow-lg border border-white/20">
                                {calculateCompleteness(selectedStudent)}%
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-black tracking-tight truncate mb-1">
                                {isPrivacyMode ? maskInfo(selectedStudent.name, 4) : selectedStudent.name}
                            </h2>
                            <div className="flex flex-wrap gap-3 items-center text-[10px] font-bold text-white/70 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faIdCard} className="text-indigo-400" /> {selectedStudent.registration_code}</span>
                                <span className="w-1 h-1 rounded-full bg-white/30" />
                                <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faGraduationCap} className="text-indigo-400" /> {selectedStudent.className}</span>
                                <span className="w-1 h-1 rounded-full bg-white/30" />
                                <span className="flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={selectedStudent.gender === 'L' ? faMars : faVenus} className="text-indigo-400" />
                                    {selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}
                                </span>
                            </div>
                        </div>

                        <div className="shrink-0 text-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">Poin</p>
                            <p className={`text-2xl font-black ${selectedStudent.total_points >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {selectedStudent.total_points > 0 ? '+' : ''}{selectedStudent.total_points}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Sleek Tabs */}
                <div className="flex bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] overflow-x-auto no-scrollbar">
                    {[
                        { id: 'info', label: 'Info', icon: faInfoCircle },
                        { id: 'stats', label: 'Stat', icon: faChartLine },
                        { id: 'log', label: 'Perilaku', icon: faClockRotateLeft },
                        { id: 'audit', label: 'Audit', icon: faShieldHalved },
                        { id: 'raport', label: 'Raport', icon: faFileLines },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setProfileTab(tab.id)}
                            className={`flex-1 min-w-[70px] h-8 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all
                                ${profileTab === tab.id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50'}`}
                        >
                            <FontAwesomeIcon icon={tab.icon} className="text-[11px]" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* 3. Dynamic Content */}
                <div>
                    {profileTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 1. Identitas Akademik & Legal */}
                            <div className="md:col-span-2 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faIdCard} className="text-xs" /> Identitas Akademik & Legal
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: 'NISN', val: selectedStudent.nisn, icon: faIdCard },
                                        { label: 'NIS', val: selectedStudent.nis, icon: faIdBadge },
                                        { label: 'NIK', val: selectedStudent.nik, icon: faIdCard },
                                        { label: 'Status', val: selectedStudent.status, icon: faShieldHalved, isStatus: true },
                                    ].map(item => (
                                        <div key={item.label} className="space-y-1">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">{item.label}</p>
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={item.icon} className="text-[10px] opacity-30" />
                                                {item.isStatus ? (
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${item.val === 'aktif' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}>
                                                        {item.val || '---'}
                                                    </span>
                                                ) : (
                                                    <p className="text-xs font-bold text-[var(--color-text)] truncate">{item.val || '---'}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Profil Pribadi */}
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faUserTie} className="text-xs" /> Profil Pribadi
                                </p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">Jenis Kelamin</p>
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faVenusMars} className="text-[10px] opacity-30" />
                                                <p className="text-xs font-bold">{selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">Agama</p>
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faPrayingHands} className="text-[10px] opacity-30" />
                                                <p className="text-xs font-bold">{selectedStudent.religion || 'Islam'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">Tempat, Tgl Lahir</p>
                                        <div className="flex items-center gap-2">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px] opacity-30" />
                                            <p className="text-xs font-bold truncate">
                                                {selectedStudent.birth_place || '---'}, {selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Informasi Wali */}
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                        <FontAwesomeIcon icon={faUserTie} className="text-xs" /> Informasi Wali
                                    </p>
                                    {selectedStudent.phone && (
                                        <button onClick={handleSaveContact} className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase tracking-tighter hover:bg-emerald-500 hover:text-white transition-all">
                                            Simpan Kontak
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">Nama Wali ({selectedStudent.guardian_relation || 'Wali'})</p>
                                        <p className="text-xs font-bold text-[var(--color-text)] truncate">{selectedStudent.guardian_name || '---'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">No. WhatsApp</p>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs font-bold text-[var(--color-text)] tracking-wider">{selectedStudent.phone || '---'}</p>
                                            {selectedStudent.phone && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => copyToClipboard(selectedStudent.phone, 'HP')} className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] hover:bg-slate-200 transition-colors">
                                                        <FontAwesomeIcon icon={faCopy} className="opacity-40" />
                                                    </button>
                                                    <a href={`https://wa.me/${selectedStudent.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] hover:brightness-110 transition-all">
                                                        <FontAwesomeIcon icon={faWhatsapp} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Domisili & Penempatan */}
                            <div className="md:col-span-2 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-xs" /> Domisili & Penempatan
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="sm:col-span-1 space-y-1">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">Kamar Asrama</p>
                                        <div className="flex items-center gap-2">
                                            <FontAwesomeIcon icon={faDoorOpen} className="text-[10px] opacity-30" />
                                            <p className="text-xs font-bold">{selectedStudent.metadata?.kamar || '---'}</p>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 space-y-1">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">Alamat Lengkap</p>
                                        <div className="flex items-start gap-2">
                                            <FontAwesomeIcon icon={faMap} className="text-[10px] opacity-30 mt-0.5" />
                                            <p className="text-xs font-bold leading-relaxed text-[var(--color-text)]">
                                                {selectedStudent.address || 'Alamat belum diinput.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Info Khusus & Catatan */}
                            <div className="md:col-span-2 p-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.02]">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[9px] font-black text-violet-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <FontAwesomeIcon icon={faTrophy} /> Info Khusus & Catatan
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-auto custom-scrollbar">
                                    {selectedStudent?.metadata && Object.entries(selectedStudent.metadata).filter(([k]) => k !== 'kamar').length > 0 ? (
                                        Object.entries(selectedStudent.metadata).filter(([k]) => k !== 'kamar').map(([key, val]) => (
                                            <div key={key} className="px-3 py-2 rounded-xl bg-white border border-violet-500/10 shadow-sm flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] font-black text-violet-400 uppercase tracking-tighter">{key}</span>
                                                    <span className="text-[10px] font-bold text-[var(--color-text)] truncate max-w-[150px]">{val}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full py-2 text-center border border-dashed border-violet-500/10 rounded-xl bg-violet-500/[0.01]">
                                            <p className="text-[10px] font-bold text-violet-400/60 italic">Tidak ada catatan khusus.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {profileTab === 'stats' && (
                        <div className="space-y-4">
                            {behaviorHistory.length > 0 ? (
                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20">
                                    <div className="flex gap-2 items-end h-32 px-1 mb-4">
                                        {(() => {
                                            const months = []
                                            for (let i = 5; i >= 0; i--) {
                                                const d = new Date(); d.setMonth(d.getMonth() - i)
                                                months.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), pos: 0, neg: 0 })
                                            }
                                            behaviorHistory.forEach(item => {
                                                const d = new Date(item.created_at)
                                                const bucket = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear())
                                                if (!bucket) return
                                                const pts = item.points ?? 0
                                                if (pts > 0) bucket.pos += pts; else bucket.neg += Math.abs(pts)
                                            })
                                            const maxVal = Math.max(...months.map(m => Math.max(m.pos, m.neg)), 1)
                                            return months.map((m, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                                    <div className="w-full flex flex-col gap-0.5 items-stretch justify-end h-full relative">
                                                        {m.pos > 0 && <div className="w-full rounded-t-sm bg-emerald-500/40 group-hover:bg-emerald-500 transition-all" style={{ height: `${(m.pos / maxVal) * 100}%` }} />}
                                                        {m.neg > 0 && <div className="w-full rounded-b-sm bg-rose-500/40 group-hover:bg-rose-500 transition-all" style={{ height: `${(m.neg / maxVal) * 100}%` }} />}
                                                        {m.pos === 0 && m.neg === 0 && <div className="w-full h-1 bg-[var(--color-border)] opacity-20" />}
                                                    </div>
                                                    <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase">{m.label}</span>
                                                </div>
                                            ))
                                        })()}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <StatCard
                                            icon={faBolt} label="Total Poin" value={selectedStudent.total_points} color={selectedStudent.total_points >= 0 ? 'emerald' : 'rose'}
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                        <StatCard
                                            icon={faHistory} label="Total Log" value={behaviorHistory.length} color="indigo"
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                        <StatCard
                                            icon={faPlus} label="Positif" value={timelineStats?.totalPos || 0} color="emerald"
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                        <StatCard
                                            icon={faMinus} label="Negatif" value={timelineStats?.totalNeg || 0} color="rose"
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    variant="dashed"
                                    icon={faChartLine}
                                    title="Grafik belum tersedia"
                                    description="Data histori perilaku diperlukan untuk memunculkan grafik tren."
                                />
                            )}
                        </div>
                    )}

                    {profileTab === 'log' && (
                        <div className="space-y-2">
                            {loadingHistory ? (
                                <div className="animate-pulse space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-[var(--color-surface-alt)] rounded-lg" />)}
                                </div>
                            ) : timelineFiltered.length === 0 ? (
                                <EmptyState
                                    variant="dashed"
                                    icon={faHistory}
                                    title="Belum ada laporan perilaku"
                                    description="Siswa ini belum memiliki catatan histori perilaku di sistem."
                                />
                            ) : (
                                <>
                                    {timelineFiltered.slice(0, timelineVisible).map(item => {
                                        const isPos = (item.points ?? 0) >= 0
                                        return (
                                            <div key={item.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 flex items-start gap-3 hover:bg-[var(--color-surface-alt)]/30 transition-all">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${isPos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                    {item.points > 0 ? '+' : ''}{item.points}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <p className="text-[11px] font-bold text-[var(--color-text)] leading-tight">{item.description || item.notes}</p>
                                                    <div className="flex items-center gap-3 mt-1.5 opacity-50 text-[8px] font-black uppercase tracking-wider">
                                                        <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                        <span className="w-1 h-1 rounded-full bg-current" />
                                                        <span>{item.teacher_name || 'Admin'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {timelineFiltered.length > timelineVisible && (
                                        <button onClick={() => setTimelineVisible(v => v + 5)} className="w-full py-2.5 rounded-xl border border-dashed border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Muat Lagi</button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {profileTab === 'audit' && (
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 p-1 max-h-[235px] overflow-auto custom-scrollbar">
                            <AuditTimeline tableName="students" recordId={selectedStudent.id} />
                        </div>
                    )}

                    {profileTab === 'raport' && (
                        <div className="space-y-2">
                            {loadingRaport ? (
                                <div className="animate-pulse space-y-2">
                                    {[1, 2].map(i => <div key={i} className="h-20 bg-[var(--color-surface-alt)] rounded-lg" />)}
                                </div>
                            ) : raportHistory.length === 0 ? (
                                <EmptyState
                                    variant="dashed"
                                    icon={faFileLines}
                                    title="Arsip raport kosong"
                                    description="Data raport bulanan untuk siswa ini belum tersedia."
                                />
                            ) : (
                                <div className="space-y-3">
                                    {raportHistory.map(r => {
                                        const values = [r.nilai_akhlak, r.nilai_ibadah, r.nilai_kebersihan, r.nilai_quran, r.nilai_bahasa].filter(v => v !== null)
                                        const avg = values.length ? (values.reduce((a, b) => a + Number(b), 0) / values.length).toFixed(1) : '---'
                                        return (
                                            <div key={r.id} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-indigo-500 text-white flex flex-col items-center justify-center font-black">
                                                            <span className="text-[7px] uppercase leading-none opacity-60">Bln</span>
                                                            <span className="text-[14px] leading-none">{r.month}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black">Raport Bulanan {r.year}</p>
                                                            <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase">{r.musyrif_name || '---'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-indigo-500">{avg}</p>
                                                        <p className="text-[7px] font-black uppercase opacity-50">Rerata</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                    {[
                                                        { l: 'Akhlak', v: r.nilai_akhlak, c: 'bg-amber-500' },
                                                        { l: 'Ibadah', v: r.nilai_ibadah, c: 'bg-indigo-500' },
                                                        { l: 'Bersih', v: r.nilai_kebersihan, c: 'bg-emerald-500' },
                                                        { l: 'Quran', v: r.nilai_quran, c: 'bg-indigo-600' },
                                                        { l: 'Bhs', v: r.nilai_bahasa, c: 'bg-violet-600' },
                                                    ].map(k => (
                                                        <div key={k.l} className="flex flex-col p-2 rounded-xl bg-white border border-[var(--color-border)] shadow-sm">
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <span className="text-[12px] font-black text-[var(--color-text)]">{k.v || '-'}</span>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${k.c}`} />
                                                            </div>
                                                            <span className="text-[7px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1.5">{k.l}</span>
                                                            <div className="w-full h-1 bg-[var(--color-border)]/50 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${k.c} opacity-80 transition-all duration-1000`}
                                                                    style={{ width: `${(Number(k.v) / 10) * 100}%` }}
                                                                />
                                                            </div>
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