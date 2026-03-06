import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faEdit, faTrash, faMars, faVenus, faBoxArchive,
    faEye, faThumbtack,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

const STATUS_CONFIG = {
    active: { label: 'Aktif', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    inactive: { label: 'Nonaktif', color: 'bg-red-500/10 text-red-600 border-red-500/20', dot: 'bg-red-500' },
    cuti: { label: 'Cuti', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500' },
}

// ─── Desktop Row ─────────────────────────────────────────────────────────────
const TeacherRow = memo(({
    teacher,
    selectedIds,
    toggleSelect,
    visibleCols,
    isPrivacyMode,
    disp,
    openProfile,
    handleEdit,
    handleTogglePin,
    handleQuickStatus,
    setTeacherToAction,
    setIsArchiveModalOpen,
    setIsDeleteModalOpen,
    quickStatusId,
    setQuickStatusId,
    quickStatusRef,
}) => {
    const isSelected = selectedIds.includes(teacher.id)

    return (
        <tr className={`border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/50 transition-colors ${isSelected ? 'bg-[var(--color-primary)]/5' : ''}`}>
            <td className="px-6 py-4 text-center">
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(teacher.id)} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-black">{teacher.name.charAt(0)}</div>
                        {teacher.is_pinned && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"><FontAwesomeIcon icon={faThumbtack} className="text-white text-[7px]" /></div>}
                    </div>
                    <div>
                        <button onClick={() => openProfile(teacher)} className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left leading-snug">{teacher.name}</button>
                        {teacher.nbm && <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{teacher.nbm}</p>}
                    </div>
                </div>
            </td>
            {visibleCols.nbm && <td className="px-6 py-4 text-xs text-[var(--color-text-muted)] font-mono">{disp(teacher.nbm)}</td>}
            {visibleCols.subject && <td className="px-6 py-4">{teacher.subject ? <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase">{teacher.subject}</span> : <span className="text-xs text-[var(--color-text-muted)]">—</span>}</td>}
            {visibleCols.gender && <td className="px-6 py-4 text-center"><span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm mx-auto ${teacher.gender === 'L' ? 'bg-blue-500/10 text-blue-500' : teacher.gender === 'P' ? 'bg-pink-500/10 text-pink-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}><FontAwesomeIcon icon={teacher.gender === 'L' ? faMars : faVenus} /></span></td>}
            {visibleCols.contact && (
                <td className="px-6 py-4 space-y-1">
                    {teacher.phone && <a href={`https://wa.me/${teacher.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-bold w-fit"><FontAwesomeIcon icon={faWhatsapp} className="text-sm" />{disp(teacher.phone)}</a>}
                    {teacher.email && <p className="text-xs text-[var(--color-text-muted)] italic truncate max-w-[180px]">{disp(teacher.email)}</p>}
                    {!teacher.phone && !teacher.email && <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                </td>
            )}
            {visibleCols.status && (
                <td className="px-6 py-4">
                    <div className="relative" ref={quickStatusId === teacher.id ? quickStatusRef : null}>
                        <button onClick={() => setQuickStatusId(quickStatusId === teacher.id ? null : teacher.id)}
                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase cursor-pointer hover:opacity-80 transition-all ${STATUS_CONFIG[teacher.status]?.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${STATUS_CONFIG[teacher.status]?.dot}`} />
                            {STATUS_CONFIG[teacher.status]?.label}
                        </button>
                        {quickStatusId === teacher.id && (
                            <div className="absolute top-8 left-0 z-30 w-36 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl overflow-hidden">
                                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== teacher.status).map(([k, v]) => (
                                    <button key={k} onClick={() => handleQuickStatus(teacher, k)} className="w-full px-3 py-2 text-left text-[10px] font-black hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${v.dot}`} /><span className={v.color.split(' ')[1]}>{v.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </td>
            )}
            {visibleCols.join && <td className="px-6 py-4 text-xs text-[var(--color-text-muted)]">{teacher.join_date ? new Date(teacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>}
            <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleTogglePin(teacher)} title={teacher.is_pinned ? 'Lepas Sematkan' : 'Sematkan'} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs ${teacher.is_pinned ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10'}`}><FontAwesomeIcon icon={faThumbtack} /></button>
                    <button onClick={() => openProfile(teacher)} title="Profil" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-xs"><FontAwesomeIcon icon={faEye} /></button>
                    <button onClick={() => handleEdit(teacher)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-xs"><FontAwesomeIcon icon={faEdit} /></button>
                    <button onClick={() => { setTeacherToAction(teacher); setIsArchiveModalOpen(true) }} title="Arsipkan" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-all text-xs"><FontAwesomeIcon icon={faBoxArchive} /></button>
                    <button onClick={() => { setTeacherToAction(teacher); setIsDeleteModalOpen(true) }} title="Hapus" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-xs"><FontAwesomeIcon icon={faTrash} /></button>
                </div>
            </td>
        </tr>
    )
})

// ─── Mobile Card ─────────────────────────────────────────────────────────────
const TeacherMobileCard = memo(({
    teacher,
    selectedIds,
    toggleSelect,
    isPrivacyMode,
    disp,
    openProfile,
    handleEdit,
    handleTogglePin,
    setTeacherToAction,
    setIsArchiveModalOpen,
}) => {
    const isSelected = selectedIds.includes(teacher.id)

    return (
        <div className={`p-4 ${isSelected ? 'bg-[var(--color-primary)]/5' : ''}`}>
            <div className="flex items-start gap-3">
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(teacher.id)} className="accent-[var(--color-primary)] w-4 h-4 mt-1 cursor-pointer shrink-0" />
                <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-sm font-black">{teacher.name.charAt(0)}</div>
                    {teacher.is_pinned && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"><FontAwesomeIcon icon={faThumbtack} className="text-white text-[7px]" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <button onClick={() => openProfile(teacher)} className="font-bold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)]">{teacher.name}</button>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {teacher.subject && <span className="px-2 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase">{teacher.subject}</span>}
                                <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${STATUS_CONFIG[teacher.status]?.color}`}>{STATUS_CONFIG[teacher.status]?.label}</span>
                            </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleTogglePin(teacher)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${teacher.is_pinned ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:text-amber-500'}`}><FontAwesomeIcon icon={faThumbtack} /></button>
                            <button onClick={() => handleEdit(teacher)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 text-xs transition-all"><FontAwesomeIcon icon={faEdit} /></button>
                            <button onClick={() => { setTeacherToAction(teacher); setIsArchiveModalOpen(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 text-xs transition-all"><FontAwesomeIcon icon={faBoxArchive} /></button>
                        </div>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-[var(--color-text-muted)]">
                        {teacher.nbm && <p className="font-mono">NBM: {disp(teacher.nbm)}</p>}
                        {teacher.phone && <a href={`https://wa.me/${teacher.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-green-600 font-bold w-fit"><FontAwesomeIcon icon={faWhatsapp} />{disp(teacher.phone)}</a>}
                        {teacher.email && <p className="italic truncate">{disp(teacher.email)}</p>}
                        {teacher.join_date && <p>Bergabung: {new Date(teacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                    </div>
                </div>
            </div>
        </div>
    )
})

export { TeacherRow, TeacherMobileCard, STATUS_CONFIG }
export default TeacherRow
