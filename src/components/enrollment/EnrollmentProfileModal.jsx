import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faXmark, faPen, faTrash, faArrowRight, faArrowLeft,
    faUser, faMars, faVenus, faSchool, faBookQuran,
    faPhone, faMapMarkerAlt, faHeart, faCheckCircle,
    faXmarkCircle, faClipboardList, faGraduationCap,
    faTShirt, faCalendarDay, faUsers, faBoxArchive
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import {
    getStatusConfig, getQuranLevelConfig, getProgramLabel,
    getTestScoreConfig, formatEnrollmentDate, PIPELINE_STEPS,
    STATUS_CONFIG
} from '../../utils/enrollment/enrollmentConstants'

function InfoRow({ icon, label, value, color = '' }) {
    if (!value && value !== 0) return null
    return (
        <div className="flex items-start gap-3 py-2 border-b border-[var(--color-border)]/30 last:border-0">
            <FontAwesomeIcon icon={icon} className={`text-[11px] mt-0.5 ${color || 'text-[var(--color-text-muted)] opacity-40'}`} />
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">{label}</p>
                <p className="text-[12px] font-medium text-[var(--color-text)] mt-0.5">{value}</p>
            </div>
        </div>
    )
}

function EnrollmentProfileModal({ isOpen, onClose, enrollment, onEdit, onDelete, onStatusChange, canEdit = true }) {
    if (!enrollment) return null

    const {
        name, gender, registration_number, birth_place, birth_date, nisn,
        school_origin, previous_pesantren, phone, program, quran_level,
        hafalan_quran, health_notes, uniform_size, status, test_score,
        father_name, mother_name, father_phone, mother_phone, father_occupation,
        mother_occupation, address, created_at, wave_id, notes
    } = enrollment

    const statusCfg = getStatusConfig(status)
    const quranCfg = getQuranLevelConfig(quran_level)
    const testCfg = getTestScoreConfig(test_score)

    // Next status based on current
    const getNextStatus = () => {
        if (status === 'mendaftar') return 'verifikasi'
        if (status === 'verifikasi') return 'tes'
        if (status === 'tes') return 'diterima'
        return null
    }
    const nextStatus = getNextStatus()

    // Previous status based on current (for rollback support)
    const getPrevStatus = () => {
        if (status === 'verifikasi') return 'mendaftar'
        if (status === 'tes') return 'verifikasi'
        if (status === 'diterima' || status === 'ditolak') return 'tes'
        return null
    }
    const prevStatus = getPrevStatus()

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detail Pendaftar"
            description="Detail rincian berkas, identitas, dan data keluarga calon santri"
            icon={faUser}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                canEdit ? (
                    <div className="flex items-center gap-2 flex-wrap w-full">
                        <button onClick={() => onEdit(enrollment)} className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2">
                            <FontAwesomeIcon icon={faPen} className="text-[9px]" /> Edit
                        </button>
                        <button onClick={() => onDelete(enrollment)} className="px-4 py-2.5 rounded-xl border border-amber-500/20 text-[11px] font-bold text-amber-600 hover:bg-amber-500/10 transition-all flex items-center gap-2" title="Arsipkan Pendaftar">
                            <FontAwesomeIcon icon={faBoxArchive} className="text-[9px]" /> Arsipkan
                        </button>

                        <div className="flex-1" />

                        {prevStatus && (
                            <button
                                onClick={() => onStatusChange(enrollment, prevStatus)}
                                className="px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[11px] font-bold text-rose-600 hover:bg-rose-500/10 transition-all flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" />
                                Kembali ke {prevStatus === 'mendaftar' ? 'Mendaftar' : prevStatus === 'verifikasi' ? 'Verifikasi' : 'Tes'}
                            </button>
                        )}
                        {status !== 'ditolak' && status !== 'diterima' && (
                            <button
                                onClick={() => onStatusChange(enrollment, 'ditolak')}
                                className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-[11px] font-bold text-rose-600 hover:bg-rose-500/10 transition-all flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faXmarkCircle} className="text-[9px]" /> Tolak
                            </button>
                        )}
                        {nextStatus && (
                            <button
                                onClick={() => onStatusChange(enrollment, nextStatus)}
                                className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-wider shadow-md shadow-[var(--color-primary)]/20 hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                                {nextStatus === 'verifikasi' ? 'Verifikasi' : nextStatus === 'tes' ? 'Lanjut Tes' : 'Terima'}
                            </button>
                        )}
                    </div>
                ) : null
            }
        >
            <div className="px-1">

                {/* Header Card */}
                <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-5 mb-5 relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start gap-4 relative z-10">
                        {/* Avatar */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${gender === 'L'
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'bg-rose-500/10 text-rose-500'}`}>
                            {name?.charAt(0) || '?'}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-[var(--color-text)] leading-tight truncate">{name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] tracking-wider">{registration_number}</span>
                                <FontAwesomeIcon icon={gender === 'L' ? faMars : faVenus} className={`text-[9px] ${gender === 'L' ? 'text-blue-400' : 'text-pink-400'}`} />
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusCfg.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                    {statusCfg.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Progress */}
                    <div className="flex items-center gap-1 mt-4 pt-4 border-t border-[var(--color-border)]/50">
                        {PIPELINE_STEPS.map((ps, i) => {
                            const currentStep = STATUS_CONFIG[status]?.step || 0
                            const isActive = ps.key === status
                            const isDone = STATUS_CONFIG[ps.key]?.step < currentStep
                            const isRejected = status === 'ditolak'

                            return (
                                <div key={ps.key} className="flex items-center flex-1">
                                    <div className={`flex-1 flex flex-col items-center gap-1 transition-all ${isRejected ? 'opacity-30' : ''}`}>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${isActive
                                            ? `${STATUS_CONFIG[ps.key]?.dot} text-white shadow-sm`
                                            : isDone
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                            {isDone ? <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" /> : i + 1}
                                        </div>
                                        <span className={`text-[8px] font-bold uppercase tracking-wider ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>
                                            {ps.label}
                                        </span>
                                    </div>
                                    {i < PIPELINE_STEPS.length - 1 && (
                                        <div className={`h-px flex-1 mx-1 ${isDone ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Rejected badge */}
                    {status === 'ditolak' && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <FontAwesomeIcon icon={faXmarkCircle} className="text-rose-500 text-sm" />
                            <span className="text-[11px] font-bold text-rose-600">Pendaftar ditolak</span>
                        </div>
                    )}
                </div>

                {/* Content Sections */}
                <div className="space-y-4">

                    {/* Identitas */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <FontAwesomeIcon icon={faUser} className="text-indigo-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Identitas</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <InfoRow icon={faCalendarDay} label="Tempat, Tanggal Lahir" value={`${birth_place || '-'}, ${birth_date || '-'}`} />
                        <InfoRow icon={faGraduationCap} label="NISN" value={nisn} />
                        <InfoRow icon={faSchool} label="Asal Sekolah" value={school_origin} />
                        {previous_pesantren && <InfoRow icon={faSchool} label="Asal Pesantren" value={previous_pesantren} color="text-emerald-500" />}
                        <InfoRow icon={faClipboardList} label="Program" value={getProgramLabel(program)} color="text-indigo-500" />
                    </div>

                    {/* Al-Quran */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                            <FontAwesomeIcon icon={faBookQuran} className="text-emerald-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Kemampuan Al-Quran</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Bacaan</p>
                                {quranCfg ? (
                                    <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-[11px] font-bold ${quranCfg.color}`}>
                                        {quranCfg.name}
                                    </span>
                                ) : <span className="text-[12px] text-[var(--color-text-muted)]">-</span>}
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Hafalan</p>
                                <p className="text-xl font-black text-emerald-600 mt-0.5">{hafalan_quran || 0} <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Juz</span></p>
                            </div>
                            {testCfg && (
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Hasil Tes</p>
                                    <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-[11px] font-bold ${testCfg.color}`}>
                                        {testCfg.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Keluarga */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-purple-500 rounded-full" />
                            <FontAwesomeIcon icon={faUsers} className="text-purple-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Data Keluarga</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <InfoRow icon={faUser} label="Ayah" value={`${father_name || '-'}${father_occupation ? ` · ${father_occupation}` : ''}`} />
                        {father_phone && <InfoRow icon={faPhone} label="HP Ayah" value={father_phone} color="text-emerald-500" />}
                        <InfoRow icon={faUser} label="Ibu" value={`${mother_name || '-'}${mother_occupation ? ` · ${mother_occupation}` : ''}`} />
                        {mother_phone && <InfoRow icon={faPhone} label="HP Ibu" value={mother_phone} color="text-emerald-500" />}
                    </div>

                    {/* Tambahan */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-amber-500 rounded-full" />
                            <FontAwesomeIcon icon={faClipboardList} className="text-amber-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Info Tambahan</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <InfoRow icon={faMapMarkerAlt} label="Alamat" value={address} color="text-indigo-500" />
                        <InfoRow icon={faPhone} label="HP Utama" value={phone} color="text-emerald-500" />
                        {health_notes && <InfoRow icon={faHeart} label="Riwayat Kesehatan" value={health_notes} color="text-rose-500" />}
                        <InfoRow icon={faTShirt} label="Ukuran Seragam" value={uniform_size} />
                        <InfoRow icon={faCalendarDay} label="Tanggal Daftar" value={formatEnrollmentDate(created_at)} />
                    </div>

                    {/* Notes */}
                    {notes && (
                        <div className="bg-[var(--color-surface)] border border-amber-500/20 bg-amber-500/[0.03] shadow-sm rounded-2xl p-4">
                            <div className="flex items-center gap-2.5 pt-1 mb-3">
                                <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                <FontAwesomeIcon icon={faClipboardList} className="text-amber-500 text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Catatan Internal</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-amber-500/20 to-transparent opacity-40" />
                            </div>
                            <p className="text-[12px] text-[var(--color-text)]">{notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}

export default memo(EnrollmentProfileModal)
