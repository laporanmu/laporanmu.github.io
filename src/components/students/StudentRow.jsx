import React, { memo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faEdit,
    faMars,
    faVenus,
    faTriangleExclamation,
    faTags,
    faBoxArchive,
    faUserTie,
    faCheck,
    faIdCard,
    faClockRotateLeft,
    faArrowTrendUp,
    faArrowTrendDown,
    faCrown,
    faMedal,
    faBolt,
    faXmark,
} from '@fortawesome/free-solid-svg-icons'

const getTagColor = (tag) => {
    const colors = [
        'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'bg-purple-500/10 text-purple-500 border-purple-500/20',
        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'bg-pink-500/10 text-pink-500 border-pink-500/20',
        'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Helper to calculate data completeness percentage
const calculateCompleteness = (s) => {
    let score = 40; // Base score for Name, Gender, Class
    if (s.photo_url || s.photo) score += 20;
    if (s.phone) score += 15;
    if (s.nisn) score += 15;
    if (s.metadata && Object.keys(s.metadata).length > 0) score += 10;
    return score;
};

const StudentRow = memo(({
    student,
    selectedIds,
    lastReportMap,
    onEdit,
    onViewProfile,
    onViewQR,
    onViewPrint,
    onViewTags,
    onViewClassHistory,
    onConfirmDelete,
    onClassBreakdown,
    onPhotoZoom,
    onToggleSelect,
    onQuickPoint,
    formatRelativeDate,
    RiskThreshold,
    isPrivacyMode
}) => {
    const maskInfo = (str, visibleLen = 3) => {
        if (!str) return '---'
        if (str.length <= visibleLen) return str[0] + '*'.repeat(str.length - 1)
        return str.substring(0, visibleLen) + '***'
    }

    const isRisk = (student.total_points || 0) <= RiskThreshold
    const isSelected = selectedIds.includes(student.id)
    const p = student.total_points || 0
    const completeness = calculateCompleteness(student);
    const [showQuickAction, setShowQuickAction] = useState(false)

    const quickActions = [
        { label: 'Sangat Aktif', amount: 5, color: 'text-emerald-500' },
        { label: 'Fokus', amount: 2, color: 'text-emerald-500' },
        { label: 'Ramai', amount: -2, color: 'text-amber-500' },
        { label: 'Melanggar', amount: -5, color: 'text-red-500' },
    ]

    return (
        <tr className={`border-t border-[var(--color-border)] transition-colors ${isRisk ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-[var(--color-surface-alt)]/40'}`}>
            {/* Checkbox Column */}
            <td className="px-6 py-4">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(student.id)}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
            </td>

            {/* Student Info Column */}
            <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm overflow-hidden relative shrink-0 cursor-pointer transition-transform hover:scale-110 ${isRisk ? 'bg-red-500/10 text-red-500' : 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]'} ${isPrivacyMode ? 'blur-sm grayscale opacity-60' : ''}`}
                        onClick={() => {
                            if (isPrivacyMode) return;
                            student.photo_url && onPhotoZoom({ url: student.photo_url, name: student.name });
                        }}
                        title={student.photo_url && !isPrivacyMode ? 'Klik untuk zoom foto' : ''}
                    >
                        {student.photo_url ? (
                            <img src={student.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                        ) : (
                            <span className="relative z-10">{isPrivacyMode ? '*' : (student.name || 'S').charAt(0)}</span>
                        )}
                    </div>

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <button
                                onClick={() => onViewProfile(student)}
                                className="font-extrabold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left"
                            >
                                {isPrivacyMode ? maskInfo(student.name, 4) : student.name}
                            </button>
                            {isRisk && (
                                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-widest">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[7px]" />
                                    Risiko
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60 uppercase tracking-wider">
                                {isPrivacyMode ? maskInfo(student.registration_code || student.code, 2) : (student.registration_code || student.code)}
                            </span>
                            {/* Render small badges for tags */}
                            {(student.tags || []).map(tag => (
                                <span key={tag} className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${getTagColor(tag)}`}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </td>

            {/* Gender Column */}
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-inner ${student.gender === 'L' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-pink-500/10 text-pink-500 border border-pink-500/20'}`}>
                        <FontAwesomeIcon icon={student.gender === 'L' ? faMars : faVenus} />
                    </div>
                </div>
            </td>

            {/* Class Column */}
            <td className="px-6 py-4 text-center">
                <button
                    onClick={() => onClassBreakdown(student.class_id, student.className)}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-widest leading-none hover:bg-[var(--color-primary)]/20 transition-colors"
                >
                    {student.className}
                </button>
            </td>

            {/* Points Column */}
            <td className="px-6 py-4 text-center">
                <div className="flex flex-col items-center gap-1 group/point">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-black tracking-tight ${p < 0 ? 'text-red-500' : p > 0 ? 'text-emerald-500' : 'text-[var(--color-text)] opacity-40'}`}>
                            {p > 0 ? '+' : ''}{p}
                        </span>

                        {/* Lightning Quick Action Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowQuickAction(!showQuickAction)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${showQuickAction ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-amber-500/10 text-amber-500 opacity-0 group-hover/point:opacity-100 hover:bg-amber-500 hover:text-white'}`}
                                title="Aksi Cepat"
                            >
                                <FontAwesomeIcon icon={faBolt} className="text-[10px]" />
                            </button>

                            {/* Quick Action Popover */}
                            {showQuickAction && (
                                <>
                                    <div className="fixed inset-0 z-[70]" onClick={() => setShowQuickAction(false)} />
                                    <div className="absolute left-1/2 -translate-x-1/2 top-8 z-[80] w-36 glass-morphism bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-[var(--color-border)] p-1.5 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] p-2 mb-1 border-b border-[var(--color-border)] text-center">Quick Points</div>
                                        {quickActions.map((act, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    onQuickPoint(student, act.amount, act.label);
                                                    setShowQuickAction(false);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-between group/act"
                                            >
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] group-hover/act:text-[var(--color-text)]">
                                                    {act.label}
                                                </span>
                                                <span className={`text-[10px] font-black ${act.color}`}>
                                                    {act.amount > 0 ? `+${act.amount}` : act.amount}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Rank & Badges */}
                    <div className="flex flex-wrap justify-center gap-1">
                        {student._rank <= 3 && student._rank >= 1 && (
                            <span className={`
                                flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border
                                ${student._rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border-yellow-300/40 shadow-yellow-500/30' :
                                    student._rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-200/40 shadow-slate-400/30' :
                                        'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-300/40 shadow-orange-500/30'}
                            `}>
                                <FontAwesomeIcon icon={student._rank === 1 ? faCrown : faMedal} className="text-[8px]" />
                                #{student._rank}
                            </span>
                        )}
                        {p >= 100 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest leading-none">Excellent</span>
                        )}
                        {p < 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-[7px] font-black uppercase tracking-widest leading-none">Monitor</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Actions Column */}
            <td className="px-6 py-4 pr-6">
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => onViewProfile(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-all text-sm"
                        title="Profil"
                    >
                        <FontAwesomeIcon icon={faUserTie} />
                    </button>

                    <button
                        onClick={() => onEdit(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm"
                        title="Edit"
                    >
                        <FontAwesomeIcon icon={faEdit} />
                    </button>

                    <button
                        onClick={() => onViewPrint(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-all text-sm"
                        title="ID Card"
                    >
                        <FontAwesomeIcon icon={faIdCard} />
                    </button>

                    <button
                        onClick={() => onViewTags(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-violet-500 hover:bg-violet-500/10 transition-all text-sm"
                        title="Label"
                    >
                        <FontAwesomeIcon icon={faTags} />
                    </button>

                    <button
                        onClick={() => onViewClassHistory(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm"
                        title="Riwayat"
                    >
                        <FontAwesomeIcon icon={faClockRotateLeft} />
                    </button>

                    <button
                        onClick={() => onConfirmDelete(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"
                        title="Hapus"
                    >
                        <FontAwesomeIcon icon={faBoxArchive} />
                    </button>
                </div>
            </td>
        </tr>
    )
})

StudentRow.displayName = 'StudentRow'
export default StudentRow
