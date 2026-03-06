import React, { memo, useState, useRef, useEffect } from 'react'
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
    faPencil,
    faPlus,
    faMinus,
    faThumbtack,
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
    ]
    let hash = 0
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
}

const calculateCompleteness = (s) => {
    let score = 40
    if (s.photo_url || s.photo) score += 20
    if (s.phone) score += 15
    if (s.nisn) score += 15
    if (s.metadata && Object.keys(s.metadata).length > 0) score += 10
    return score
}

// ─── Inline Edit: Name ───────────────────────────────────────────────────────
const InlineEditName = ({ value, onSave, onCancel }) => {
    const [val, setVal] = useState(value)
    const inputRef = useRef(null)
    useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])
    return (
        <div className="flex items-center gap-1.5">
            <input
                ref={inputRef}
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') onSave(val.trim())
                    if (e.key === 'Escape') onCancel()
                }}
                className="input-field h-7 px-2 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-extrabold w-36 focus:border-[var(--color-primary)] outline-none"
            />
            <button onClick={() => onSave(val.trim())} className="w-7 h-7 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] hover:brightness-110 transition-all shadow-sm">
                <FontAwesomeIcon icon={faCheck} />
            </button>
            <button onClick={onCancel} className="w-7 h-7 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center justify-center text-[10px] hover:bg-[var(--color-border)] transition-all">
                <FontAwesomeIcon icon={faXmark} />
            </button>
        </div>
    )
}

// ─── Inline Edit: Gender ─────────────────────────────────────────────────────
const InlineEditGender = ({ value, onSave, onCancel }) => (
    <div className="flex items-center gap-1.5">
        {['L', 'P'].map(g => (
            <button
                key={g}
                onClick={() => onSave(g)}
                className={`w-8 h-8 rounded-lg text-xs font-black border-2 transition-all
                    ${value === g
                        ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500' : 'bg-pink-500 text-white border-pink-500')
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] bg-[var(--color-surface)]'
                    }`}
            >
                <FontAwesomeIcon icon={g === 'L' ? faMars : faVenus} />
            </button>
        ))}
        <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-all text-[10px]">
            <FontAwesomeIcon icon={faXmark} />
        </button>
    </div>
)

// ─── Inline Edit: Kelas ──────────────────────────────────────────────────────
const InlineEditKelas = ({ value, classesList, onSave, onCancel }) => {
    const [val, setVal] = useState(value)
    return (
        <div className="flex items-center gap-1">
            <select
                value={val}
                onChange={e => setVal(e.target.value)}
                autoFocus
                className="select-field h-8 px-2 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black outline-none focus:border-[var(--color-primary)] w-32"
            >
                <option value="">Pilih kelas</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => onSave(val)} disabled={!val} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] hover:brightness-110 disabled:opacity-40 transition-all">
                <FontAwesomeIcon icon={faCheck} />
            </button>
            <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] transition-all text-[10px]">
                <FontAwesomeIcon icon={faXmark} />
            </button>
        </div>
    )
}

// ─── Inline Edit: Poin ───────────────────────────────────────────────────────
const InlineEditPoin = ({ value, onSave, onCancel }) => {
    const [val, setVal] = useState(value)
    const inputRef = useRef(null)
    useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])
    const parsed = parseInt(val) || 0
    return (
        <div className="flex items-center gap-1">
            <input
                ref={inputRef}
                type="number"
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') onSave(parsed)
                    if (e.key === 'Escape') onCancel()
                }}
                placeholder="Poin"
                className="input-field h-7 w-16 px-2 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-center outline-none focus:border-[var(--color-primary)] shadow-sm"
            />
            {val !== '' && (
                <button onClick={() => onSave(parsed)} className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] hover:brightness-110 transition-all shadow-sm">
                    <FontAwesomeIcon icon={faCheck} />
                </button>
            )}
            <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] transition-all text-[10px]">
                <FontAwesomeIcon icon={faXmark} />
            </button>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────
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
    onInlineUpdate,   // ← prop baru: (studentId, field, value) => Promise
    onTogglePin,      // ← prop baru: (student) => void
    formatRelativeDate,
    RiskThreshold,
    isPrivacyMode,
    visibleColumns = {},
    classesList = [],
}) => {
    const vc = { gender: true, kelas: true, poin: true, aksi: true, ...visibleColumns }

    const maskInfo = (str, visibleLen = 3) => {
        if (!str) return '---'
        if (str.length <= visibleLen) return str[0] + '*'.repeat(str.length - 1)
        return str.substring(0, visibleLen) + '***'
    }

    const isRisk = (student.total_points || 0) <= RiskThreshold
    const isSelected = selectedIds.includes(student.id)
    const p = student.total_points || 0
    const completeness = calculateCompleteness(student)
    const [showQuickAction, setShowQuickAction] = useState(false)

    // ── Inline edit state ──────────────────────────────────────────────────
    const [editingField, setEditingField] = useState(null) // 'name' | 'gender' | 'kelas' | 'poin'
    const [savingField, setSavingField] = useState(null)

    const handleInlineSave = async (field, value) => {
        setSavingField(field)
        await onInlineUpdate(student.id, field, value, student)
        setSavingField(null)
        setEditingField(null)
    }

    const cancelEdit = () => setEditingField(null)

    const quickActions = [
        { label: 'Sangat Aktif', amount: 5, color: 'text-emerald-500' },
        { label: 'Fokus', amount: 2, color: 'text-emerald-500' },
        { label: 'Ramai', amount: -2, color: 'text-amber-500' },
        { label: 'Melanggar', amount: -5, color: 'text-red-500' },
    ]

    return (
        <tr className={`border-t border-[var(--color-border)] transition-colors group/row
            ${isRisk ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-[var(--color-surface-alt)]/40'}
            ${editingField ? 'bg-[var(--color-primary)]/[0.02]' : ''}
            ${student.is_pinned ? 'bg-amber-500/[0.04] border-l-2 border-l-amber-400' : ''}
        `}>

            {/* Checkbox + Pin */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(student.id)}
                        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <button
                        onClick={() => onTogglePin(student)}
                        title={student.is_pinned ? 'Unpin siswa' : 'Pin ke atas'}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all
                            ${student.is_pinned
                                ? 'text-amber-500 opacity-100'
                                : 'text-[var(--color-text-muted)] opacity-0 group-hover/row:opacity-100 hover:text-amber-500'
                            }`}
                    >
                        <FontAwesomeIcon
                            icon={faThumbtack}
                            className={`text-[9px] transition-transform ${student.is_pinned ? 'rotate-0' : 'rotate-45'}`}
                        />
                    </button>
                </div>
            </td>

            {/* ── Siswa (Nama) ─────────────────────────────────────────── */}
            <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                    {/* Avatar + rank badge overlay */}
                    <div className="relative shrink-0">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm overflow-hidden relative cursor-pointer transition-transform hover:scale-110
                                ${isRisk ? 'bg-red-500/10 text-red-500' : 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]'}
                                ${isPrivacyMode ? 'blur-sm grayscale opacity-60' : ''}`}
                            onClick={() => { if (isPrivacyMode) return; student.photo_url && onPhotoZoom({ url: student.photo_url, name: student.name }) }}
                            title={student.photo_url && !isPrivacyMode ? 'Klik untuk zoom foto' : ''}
                        >
                            {student.photo_url
                                ? <img src={student.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                                : <span className="relative z-10">{isPrivacyMode ? '*' : (student.name || 'S').charAt(0)}</span>
                            }
                        </div>
                        {/* Rank badge — pojok kiri bawah avatar */}
                        {student._rank <= 3 && student._rank >= 1 && (
                            <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-[var(--color-surface)] z-20
                                ${student._rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                                    : student._rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500'
                                        : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}
                            >
                                <FontAwesomeIcon
                                    icon={student._rank === 1 ? faCrown : faMedal}
                                    className="text-white text-[8px]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Name + badges area */}
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 group/name">
                            {editingField === 'name' ? (
                                <InlineEditName
                                    value={student.name}
                                    onSave={val => handleInlineSave('name', val)}
                                    onCancel={cancelEdit}
                                />
                            ) : (
                                <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                                    <button
                                        onClick={() => onViewProfile(student)}
                                        className="font-extrabold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left truncate"
                                    >
                                        {isPrivacyMode ? maskInfo(student.name, 4) : student.name}
                                    </button>
                                    {!isPrivacyMode && (
                                        <button
                                            onClick={() => setEditingField('name')}
                                            className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all opacity-0 group-hover/name:opacity-100"
                                            title="Edit nama"
                                        >
                                            <FontAwesomeIcon icon={faPencil} className="text-[9px]" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status + Identification line */}
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            {/* Badges prioritize visibility */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {isRisk ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-widest animate-pulse">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[7px]" />
                                        Risiko
                                    </span>
                                ) : p < 0 ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-widest">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[7px]" />
                                        Monitor
                                    </span>
                                ) : p >= 100 ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest">
                                        <FontAwesomeIcon icon={faCrown} className="text-[7px]" />
                                        Excellent
                                    </span>
                                ) : null}
                            </div>

                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60 uppercase tracking-wider truncate">
                                {isPrivacyMode ? maskInfo(student.registration_code || student.code, 2) : (student.registration_code || student.code)}
                            </span>

                            <div className="flex flex-wrap items-center gap-1">
                                {(student.tags || []).map(tag => (
                                    <span key={tag} className={`text-[8px] font-black px-1.2 py-0.3 rounded-md border uppercase tracking-wider whitespace-nowrap ${getTagColor(tag)}`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </td>

            {/* ── Gender ───────────────────────────────────────────────── */}
            {vc.gender && (
                <td className="px-6 py-4 text-center">
                    {editingField === 'gender' ? (
                        <InlineEditGender
                            value={student.gender}
                            onSave={val => handleInlineSave('gender', val)}
                            onCancel={cancelEdit}
                        />
                    ) : (
                        <div className="flex items-center justify-center group/gender">
                            <div className="relative">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-inner transition-all
                                    ${student.gender === 'L' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-pink-500/10 text-pink-500 border border-pink-500/20'}`}>
                                    <FontAwesomeIcon icon={student.gender === 'L' ? faMars : faVenus} />
                                </div>
                                <button
                                    onClick={() => setEditingField('gender')}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all opacity-0 group-hover/gender:opacity-100 shadow-sm"
                                    title="Edit gender"
                                >
                                    <FontAwesomeIcon icon={faPencil} className="text-[7px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </td>
            )}

            {/* ── Kelas ────────────────────────────────────────────────── */}
            {vc.kelas && (
                <td className="px-6 py-4 text-center">
                    {editingField === 'kelas' ? (
                        <InlineEditKelas
                            value={student.class_id}
                            classesList={classesList}
                            onSave={val => handleInlineSave('kelas', val)}
                            onCancel={cancelEdit}
                        />
                    ) : (
                        <div className="flex items-center justify-center group/kelas">
                            <div className="relative">
                                <button
                                    onClick={() => onClassBreakdown(student.class_id, student.className)}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-widest leading-none hover:bg-[var(--color-primary)]/20 transition-colors"
                                >
                                    {student.className}
                                </button>
                                <button
                                    onClick={() => setEditingField('kelas')}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all opacity-0 group-hover/kelas:opacity-100 shadow-sm"
                                    title="Edit kelas"
                                >
                                    <FontAwesomeIcon icon={faPencil} className="text-[7px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </td>
            )}

            {/* ── Poin ─────────────────────────────────────────────────── */}
            {vc.poin && (
                <td className="px-6 py-4 text-center">
                    {editingField === 'poin' ? (
                        <InlineEditPoin
                            value={p}
                            onSave={delta => handleInlineSave('poin', delta)}
                            onCancel={cancelEdit}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1 group/point">
                            <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-black tracking-tight ${p < 0 ? 'text-red-500' : p > 0 ? 'text-emerald-500' : 'text-[var(--color-text)] opacity-40'}`}>
                                    {p > 0 ? '+' : ''}{p}
                                </span>

                                {/* Inline edit poin — pensil */}
                                <button
                                    onClick={() => setEditingField('poin')}
                                    className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all opacity-0 group-hover/point:opacity-100"
                                    title="Edit poin"
                                >
                                    <FontAwesomeIcon icon={faPencil} className="text-[9px]" />
                                </button>

                                {/* Quick Action bolt */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowQuickAction(!showQuickAction)}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all
                                            ${showQuickAction ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-amber-500/10 text-amber-500 opacity-0 group-hover/point:opacity-100 hover:bg-amber-500 hover:text-white'}`}
                                        title="Aksi Cepat"
                                    >
                                        <FontAwesomeIcon icon={faBolt} className="text-[10px]" />
                                    </button>
                                    {showQuickAction && (
                                        <>
                                            <div className="fixed inset-0 z-[70]" onClick={() => setShowQuickAction(false)} />
                                            <div className="absolute left-1/2 -translate-x-1/2 top-8 z-[80] w-36 glass-morphism bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-[var(--color-border)] p-1.5 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] p-2 mb-1 border-b border-[var(--color-border)] text-center">Quick Points</div>
                                                {quickActions.map((act, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => { onQuickPoint(student, act.amount, act.label); setShowQuickAction(false) }}
                                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-between group/act"
                                                    >
                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] group-hover/act:text-[var(--color-text)]">{act.label}</span>
                                                        <span className={`text-[10px] font-black ${act.color}`}>{act.amount > 0 ? `+${act.amount}` : act.amount}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </td>
            )}

            {/* ── Aksi ─────────────────────────────────────────────────── */}
            {vc.aksi && (
                <td className="px-6 py-4 w-48">
                    <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onViewProfile(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-all text-sm" title="Profil">
                            <FontAwesomeIcon icon={faUserTie} />
                        </button>
                        <button onClick={() => onEdit(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm" title="Edit">
                            <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button onClick={() => onViewPrint(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-all text-sm" title="ID Card">
                            <FontAwesomeIcon icon={faIdCard} />
                        </button>
                        <button onClick={() => onViewTags(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-violet-500 hover:bg-violet-500/10 transition-all text-sm" title="Label">
                            <FontAwesomeIcon icon={faTags} />
                        </button>
                        <button onClick={() => onViewClassHistory(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm" title="Riwayat">
                            <FontAwesomeIcon icon={faClockRotateLeft} />
                        </button>
                        <button onClick={() => onConfirmDelete(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Hapus">
                            <FontAwesomeIcon icon={faBoxArchive} />
                        </button>
                    </div>
                </td>
            )}

            {/* Spacer — sejajar dengan th grid icon */}
            <td className="w-10 px-3" />

        </tr>
    )
})

StudentRow.displayName = 'StudentRow'
export default StudentRow