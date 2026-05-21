import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faMars, faVenus, faEye, faPen, faTrash,
    faArrowRight, faArrowLeft, faSchool, faBookQuran, faUserPlus,
    faCheckCircle, faXmarkCircle, faClipboardCheck,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import {
    getStatusConfig, getQuranLevelConfig, getProgramLabel, formatEnrollmentDate
} from '../../utils/enrollment/enrollmentConstants'

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = memo(({ status }) => {
    const cfg = getStatusConfig(status)
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    )
})
StatusBadge.displayName = 'StatusBadge'

// ─── Desktop Table Row ────────────────────────────────────────────────────────
export const EnrollmentRow = memo(({
    enrollment, isSelected, onToggleSelect, onView, onEdit,
    onDelete, onStatusChange, canEdit = true
}) => {
    const { name, gender, registration_number, school_origin, program, status, created_at, quran_level, wave_id } = enrollment
    const quranCfg = getQuranLevelConfig(quran_level)

    return (
        <tr className={`group transition-colors duration-150 ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/50'}`}>
            {/* Checkbox */}
            <td className="w-10 pl-4 pr-1 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(enrollment.id)}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0"
                />
            </td>

            {/* Name + Reg Number */}
            <td className="py-3 px-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${gender === 'L'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'bg-rose-500/10 text-rose-500'}`}>
                        {enrollment.photo_url
                            ? <img src={enrollment.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                            : name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                        <button onClick={() => onView(enrollment)} className="text-[13px] font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors truncate block max-w-[200px] text-left">
                            {name}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-60 tracking-wider">{registration_number}</span>
                            <FontAwesomeIcon icon={gender === 'L' ? faMars : faVenus} className={`text-[8px] ${gender === 'L' ? 'text-blue-400' : 'text-pink-400'}`} />
                        </div>
                    </div>
                </div>
            </td>

            {/* Asal Sekolah */}
            <td className="py-3 px-3 hidden lg:table-cell">
                <span className="text-[12px] font-medium text-[var(--color-text)] truncate block max-w-[160px]">{school_origin || '-'}</span>
            </td>

            {/* Program */}
            <td className="py-3 px-3 hidden xl:table-cell">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-2 py-1 rounded-lg border border-[var(--color-border)]">
                    {getProgramLabel(program)}
                </span>
            </td>

            {/* Kemampuan Quran */}
            <td className="py-3 px-3 hidden xl:table-cell">
                {quranCfg ? (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${quranCfg.color}`}>
                        {quranCfg.name}
                    </span>
                ) : <span className="text-[var(--color-text-muted)] text-[11px]">-</span>}
            </td>

            {/* Status */}
            <td className="py-3 px-3">
                <StatusBadge status={status} />
            </td>

            {/* Tanggal Daftar */}
            <td className="py-3 px-3 hidden md:table-cell">
                <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{formatEnrollmentDate(created_at)}</span>
            </td>

            {/* Aksi */}
            <td className="py-3 px-3">
                <div className="flex items-center gap-1">
                    <button onClick={() => onView(enrollment)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm" title="Lihat Detail">
                        <FontAwesomeIcon icon={faEye} />
                    </button>
                    {canEdit && (
                        <>
                            <button onClick={() => onEdit(enrollment)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm" title="Edit">
                                <FontAwesomeIcon icon={faPen} />
                            </button>
                            {/* Quick status actions */}
                            {/* Backward progress actions */}
                            {status === 'verifikasi' && (
                                <button onClick={() => onStatusChange(enrollment, 'mendaftar')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Kembalikan ke Mendaftar">
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                </button>
                            )}
                            {status === 'tes' && (
                                <button onClick={() => onStatusChange(enrollment, 'verifikasi')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Kembalikan ke Verifikasi">
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                </button>
                            )}
                            {(status === 'diterima' || status === 'ditolak') && (
                                <button onClick={() => onStatusChange(enrollment, 'tes')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Kembalikan ke Tahap Tes">
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                </button>
                            )}

                            {/* Forward progress actions */}
                            {status === 'mendaftar' && (
                                <button onClick={() => onStatusChange(enrollment, 'verifikasi')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-all text-sm" title="Lanjut Verifikasi">
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </button>
                            )}
                            {status === 'verifikasi' && (
                                <button onClick={() => onStatusChange(enrollment, 'tes')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm" title="Lanjut Tes">
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </button>
                            )}
                            {status === 'tes' && (
                                <button onClick={() => onStatusChange(enrollment, 'diterima')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-all text-sm" title="Terima">
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </td>
        </tr>
    )
})
EnrollmentRow.displayName = 'EnrollmentRow'

// ─── Mobile Card View ─────────────────────────────────────────────────────────
export const EnrollmentMobileCard = memo(({
    enrollment, isSelected, onToggleSelect, onView, onEdit,
    onStatusChange, canEdit = true
}) => {
    const { name, gender, registration_number, school_origin, program, status, created_at, quran_level, hafalan_quran } = enrollment
    const quranCfg = getQuranLevelConfig(quran_level)

    return (
        <div
            className={`group glass rounded-2xl border transition-all duration-200 overflow-hidden ${isSelected
                ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.03] shadow-lg shadow-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/20 hover:shadow-md'
            }`}
        >
            {/* Header */}
            <div className="flex items-start gap-3 p-4 pb-3">
                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(enrollment.id)}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0 mt-1"
                />

                {/* Avatar */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${gender === 'L'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'bg-rose-500/10 text-rose-500'}`}>
                    {name?.charAt(0) || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <button onClick={() => onView(enrollment)} className="text-[14px] font-bold text-[var(--color-text)] truncate block w-full text-left hover:text-[var(--color-primary)] transition-colors">
                        {name}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50 tracking-wider">{registration_number}</span>
                        <FontAwesomeIcon icon={gender === 'L' ? faMars : faVenus} className={`text-[8px] ${gender === 'L' ? 'text-blue-400' : 'text-pink-400'}`} />
                    </div>
                </div>

                {/* Status Badge */}
                <StatusBadge status={status} />
            </div>

            {/* Details Grid */}
            <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-[10px]">
                    <FontAwesomeIcon icon={faSchool} className="text-[var(--color-text-muted)] opacity-40 text-[9px]" />
                    <span className="text-[var(--color-text-muted)] font-medium truncate">{school_origin || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                    <FontAwesomeIcon icon={faBookQuran} className="text-[var(--color-text-muted)] opacity-40 text-[9px]" />
                    <span className="text-[var(--color-text-muted)] font-medium">
                        {quranCfg?.name || '-'}{hafalan_quran > 0 ? ` · ${hafalan_quran} Juz` : ''}
                    </span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] font-medium">
                    <span className="opacity-50">Program:</span> <span className="font-bold text-[var(--color-text)]">{getProgramLabel(program)}</span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] font-medium">
                    <span className="opacity-50">Daftar:</span> {formatEnrollmentDate(created_at)}
                </div>
            </div>

            {/* Actions Footer */}
            {canEdit && (
                <div className="flex items-center gap-1 px-3 py-2.5 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-alt)]/20">
                    <button onClick={() => onView(enrollment)} className="flex-1 h-8 rounded-lg text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 flex items-center justify-center gap-1.5 transition-all">
                        <FontAwesomeIcon icon={faEye} className="text-[9px]" /> Detail
                    </button>
                    <div className="w-px h-4 bg-[var(--color-border)]" />
                    <button onClick={() => onEdit(enrollment)} className="flex-1 h-8 rounded-lg text-[10px] font-bold text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/5 flex items-center justify-center gap-1.5 transition-all">
                        <FontAwesomeIcon icon={faPen} className="text-[9px]" /> Edit
                    </button>
                    {/* Backward action on Mobile */}
                    {status !== 'mendaftar' && (
                        <>
                            <div className="w-px h-4 bg-[var(--color-border)]" />
                            <button
                                onClick={() => {
                                    const prev = status === 'verifikasi' ? 'mendaftar' : status === 'tes' ? 'verifikasi' : 'tes'
                                    onStatusChange(enrollment, prev)
                                }}
                                className="flex-1 h-8 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-500/5 flex items-center justify-center gap-1 transition-all"
                                title="Kembalikan Status"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="text-[8px]" /> Kembali
                            </button>
                        </>
                    )}
                    {/* Forward action on Mobile */}
                    {(status === 'mendaftar' || status === 'verifikasi' || status === 'tes') && (
                        <>
                            <div className="w-px h-4 bg-[var(--color-border)]" />
                            <button
                                onClick={() => {
                                    const next = status === 'mendaftar' ? 'verifikasi' : status === 'verifikasi' ? 'tes' : 'diterima'
                                    onStatusChange(enrollment, next)
                                }}
                                className="flex-1 h-8 rounded-lg text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10 flex items-center justify-center gap-1.5 transition-all"
                            >
                                <FontAwesomeIcon icon={faChevronRight} className="text-[8px]" />
                                {status === 'mendaftar' ? 'Verifikasi' : status === 'verifikasi' ? 'Tes' : 'Terima'}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
})
EnrollmentMobileCard.displayName = 'EnrollmentMobileCard'

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
export const EnrollmentSkeletonRow = memo(() => (
    <tr>
        <td className="w-10 pl-4 pr-1"><div className="w-5 h-5 skeleton rounded-md" /></td>
        <td className="py-3 px-3">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 skeleton rounded-xl" />
                <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-32 skeleton rounded" />
                    <div className="h-2.5 w-20 skeleton rounded" />
                </div>
            </div>
        </td>
        <td className="py-3 px-3 hidden lg:table-cell"><div className="h-3 w-28 skeleton rounded" /></td>
        <td className="py-3 px-3 hidden xl:table-cell"><div className="h-5 w-16 skeleton rounded-lg" /></td>
        <td className="py-3 px-3 hidden xl:table-cell"><div className="h-5 w-14 skeleton rounded-lg" /></td>
        <td className="py-3 px-3"><div className="h-6 w-20 skeleton rounded-lg" /></td>
        <td className="py-3 px-3 hidden md:table-cell"><div className="h-3 w-20 skeleton rounded" /></td>
        <td className="py-3 px-3"><div className="h-8 w-20 skeleton rounded-lg" /></td>
    </tr>
))
EnrollmentSkeletonRow.displayName = 'EnrollmentSkeletonRow'

// ─── Skeleton Card ────────────────────────────────────────────────────────────
export const EnrollmentSkeletonCard = memo(() => (
    <div className="glass rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-start gap-3">
            <div className="w-5 h-5 skeleton rounded-md" />
            <div className="w-11 h-11 skeleton rounded-xl" />
            <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 skeleton rounded" />
                <div className="h-2.5 w-24 skeleton rounded" />
            </div>
            <div className="h-6 w-20 skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="h-3 w-full skeleton rounded" />
            <div className="h-3 w-full skeleton rounded" />
            <div className="h-3 w-full skeleton rounded" />
            <div className="h-3 w-full skeleton rounded" />
        </div>
    </div>
))
EnrollmentSkeletonCard.displayName = 'EnrollmentSkeletonCard'
