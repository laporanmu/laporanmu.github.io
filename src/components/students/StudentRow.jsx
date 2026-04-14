import React, { memo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    faChevronDown,
    faCheckDouble,
    faStar,
    faFire,
    faPaperPlane,
    faShieldHalved
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import useLongPress from '../../hooks/useLongPress'
import { getTagColor, calculateCompleteness } from '../../utils/students/studentsConstants'

// Singleton portal manager to prevent 'removeChild' errors in concurrent mode or Android/Chrome Translate
const _portalContainers = {}
function getPortalContainer(id) {
    if (typeof document === 'undefined') return null
    if (!_portalContainers[id]) {
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
        }
        _portalContainers[id] = el
    }
    return _portalContainers[id]
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

const Sparkline = ({ data = [], width = 30, height = 12 }) => {
    if (!data || data.length < 2) return null
    
    // Calculate bounds
    const max = Math.max(...data, 2)
    const min = Math.min(...data, -2)
    const range = max - min || 1
    
    // Generate points string
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    const latest = data[data.length - 1]
    const color = latest > 0 ? '#10b981' : latest < 0 ? '#ef4444' : '#9ca3af'

    return (
        <svg width={width} height={height} className="overflow-visible ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className={latest > 0 ? 'text-emerald-500' : latest < 0 ? 'text-red-500' : 'text-gray-400'}
            />
            <circle 
                cx={width} 
                cy={height - ((latest - min) / range) * height} 
                r="1.5" 
                fill="currentColor"
                className={latest > 0 ? 'text-emerald-500 animate-pulse' : latest < 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}
            />
        </svg>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────
const StudentRow = memo(({
    student,
    isSelected = false,
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
    onInlineUpdate,
    onTogglePin,
    formatRelativeDate,
    RiskThreshold,
    isPrivacyMode,
    visibleColumns = {},
    classesList = [],
    buildWAMessage,
    openWAForStudent,
    waTemplate
}) => {
    const vc = { gender: true, kelas: true, poin: true, aksi: true, ...visibleColumns }
    const [lastAction, setLastAction] = useState(null) // { amount, reason, timestamp }
    const lastActionTimerRef = useRef(null)

    const handleQuickPointInternal = (student, amount, reason) => {
        onQuickPoint(student, amount, reason)
        setLastAction({ amount, reason, timestamp: Date.now() })
        if (lastActionTimerRef.current) clearTimeout(lastActionTimerRef.current)
        lastActionTimerRef.current = setTimeout(() => setLastAction(null), 8000)
    }

    const maskInfo = (str, visibleLen = 3) => {
        if (!str) return '---'
        if (str.length <= visibleLen) return str[0] + '*'.repeat(str.length - 1)
        return str.substring(0, visibleLen) + '***'
    }

    const isRisk = (student.total_points || 0) <= RiskThreshold
    const p = student.total_points || 0
    const [showQuickAction, setShowQuickAction] = useState(false)
    const [showQuickViewPopover, setShowQuickViewPopover] = useState(false)
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
    const [boltRect, setBoltRect] = useState(null)
    const boltRef = useRef(null)
    const nameRef = useRef(null)

    const handleMouseEnter = () => {
        if (!nameRef.current) return
        const rect = nameRef.current.getBoundingClientRect()
        setPopoverPos({
            top: rect.top - 8, // viewport-relative
            left: rect.left    // viewport-relative
        })
        setShowQuickViewPopover(true)
    }

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

    // Sticky positioning for portaled dropdown
    useEffect(() => {
        if (!showQuickAction || !boltRef.current) return
        const updateRect = () => {
            setBoltRect(boltRef.current.getBoundingClientRect())
        }
        window.addEventListener('scroll', updateRect, true)
        window.addEventListener('resize', updateRect)
        return () => {
            window.removeEventListener('scroll', updateRect, true)
            window.removeEventListener('resize', updateRect)
        }
    }, [showQuickAction])

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
                        {student._rank <= 3 && student._rank >= 1 && (student.total_points > 0) && (
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
                        <div className="flex items-center gap-2 mb-1 group/name relative">
                            {editingField === 'name' ? (
                                <InlineEditName
                                    value={student.name}
                                    onSave={val => handleInlineSave('name', val)}
                                    onCancel={cancelEdit}
                                />
                            ) : (
                                <div className="flex items-center gap-1.5 min-w-0 max-w-full relative">
                                    <div
                                        ref={nameRef}
                                        className="relative flex items-center gap-1.5"
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={() => setShowQuickViewPopover(false)}
                                    >
                                        <button
                                            onClick={() => onViewProfile(student)}
                                            className="font-extrabold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left truncate"
                                        >
                                            {isPrivacyMode ? maskInfo(student.name, 4) : student.name}
                                        </button>

                                        {/* Premium Quick View Popover - PORTALED to avoid clipping */}
                                        {showQuickViewPopover && !isPrivacyMode && createPortal(
                                            <div
                                                className="fixed z-[9999] w-64 p-4 rounded-2xl glass shadow-2xl border border-[var(--color-primary)]/20 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none"
                                                style={{
                                                    top: popoverPos.top,
                                                    left: popoverPos.left,
                                                    transform: 'translateY(-100%)' // Pindah ke atas anchor
                                                }}
                                            >
                                                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--color-border)]">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isRisk ? 'bg-red-500/10 text-red-500' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                                                        {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover rounded-xl" /> : (student.name || 'S').charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-[var(--color-text)] truncate">{student.name}</p>
                                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{student.registration_code || student.code || 'NO ID'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-2 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Status Poin</p>
                                                        <p className={`text-xs font-black ${p >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{p} Poin</p>
                                                    </div>
                                                    <div className="p-2 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Profil</p>
                                                        <p className="text-xs font-black text-[var(--color-primary)]">{calculateCompleteness(student)}%</p>
                                                    </div>
                                                </div>
                                                {student.phone && (
                                                    <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-[var(--color-text-muted)]">
                                                        <FontAwesomeIcon icon={faIdCard} className="opacity-50" />
                                                        <span>WA: {student.phone}</span>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-[var(--color-surface)] border-r border-b border-[var(--color-primary)]/20 rotate-45"></div>
                                            </div>,
                                            getPortalContainer('portal-quick-view')
                                        )}
                                    </div>

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
                                ) : p >= 200 ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-orange-500/10 text-orange-600 border border-orange-500/20 uppercase tracking-widest">
                                        <FontAwesomeIcon icon={faFire} className="text-[7px]" />
                                        Legendary
                                    </span>
                                ) : p >= 100 ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest">
                                        <FontAwesomeIcon icon={faCrown} className="text-[7px]" />
                                        Excellent
                                    </span>
                                ) : p >= 50 ? (
                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-widest">
                                        <FontAwesomeIcon icon={faStar} className="text-[7px]" />
                                        Star
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
                                <Sparkline data={student.trendHistory} />

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
                                        ref={boltRef}
                                        onClick={() => {
                                            if (!showQuickAction) {
                                                const rect = boltRef.current?.getBoundingClientRect()
                                                setBoltRect(rect)
                                            }
                                            setShowQuickAction(!showQuickAction)
                                        }}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all
                                                ${showQuickAction ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-amber-500/10 text-amber-500 opacity-0 group-hover/point:opacity-100 hover:bg-amber-500 hover:text-white'}`}
                                        title="Aksi Cepat"
                                    >
                                        <FontAwesomeIcon icon={faBolt} className="text-[10px]" />
                                    </button>
                                    {showQuickAction && boltRect && createPortal(
                                        <>
                                            <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setShowQuickAction(false)} />
                                            <div
                                                className="fixed z-[9991] w-40 glass-morphism bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-[var(--color-border)] p-1.5 animate-in fade-in zoom-in-95 duration-200"
                                                style={{
                                                    top: boltRect.top + boltRect.height + 8,
                                                    left: boltRect.left + (boltRect.width / 2) - 80
                                                }}
                                            >
                                                <div className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] p-2 mb-1 border-b border-[var(--color-border)] text-center">Quick Points</div>
                                                {quickActions.map((act, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => { handleQuickPointInternal(student, act.amount, act.label); setShowQuickAction(false) }}
                                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-between group/act"
                                                    >
                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] group-hover/act:text-[var(--color-text)]">{act.label}</span>
                                                        <span className={`text-[10px] font-black ${act.color}`}>{act.amount > 0 ? `+${act.amount}` : act.amount}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>,
                                        getPortalContainer('portal-quick-action')
                                    )}
                                </div>
                            </div>

                            {/* WhatsApp Post-Action Button */}
                            {lastAction && student.phone && (
                                <div className="absolute left-[-180px] top-1/2 -translate-y-1/2 animate-in slide-in-from-right-4 fade-in duration-500 z-[60]">
                                    <button
                                        onClick={() => {
                                            const msg = buildWAMessage?.(student, 'points') || `Laporan untuk ${student.name}: Poin ${lastAction.amount > 0 ? '+' : ''}${lastAction.amount} (${lastAction.reason})`
                                            openWAForStudent?.(student, msg)
                                            setLastAction(null)
                                        }}
                                        className="h-8 px-3 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                                    >
                                        <FontAwesomeIcon icon={faWhatsapp} className="text-xs" />
                                        Laporkan ke WA
                                    </button>
                                </div>
                            )}
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
                        {onEdit && (
                            <button onClick={() => onEdit(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm" title="Edit">
                                <FontAwesomeIcon icon={faEdit} />
                            </button>
                        )}
                        <button onClick={() => onViewPrint(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-all text-sm" title="ID Card">
                            <FontAwesomeIcon icon={faIdCard} />
                        </button>
                        <button onClick={() => onViewTags(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-violet-500 hover:bg-violet-500/10 transition-all text-sm" title="Label">
                            <FontAwesomeIcon icon={faTags} />
                        </button>
                        <button onClick={() => onViewClassHistory(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm" title="Riwayat Perilaku">
                            <FontAwesomeIcon icon={faClockRotateLeft} />
                        </button>
                        <button onClick={() => onViewProfile(student, 'audit')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 transition-all text-sm" title="Audit Forensik">
                            <FontAwesomeIcon icon={faShieldHalved} />
                        </button>
                        {onConfirmDelete && (
                            <button onClick={() => onConfirmDelete(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Hapus">
                                <FontAwesomeIcon icon={faBoxArchive} />
                            </button>
                        )}
                    </div>
                </td>
            )}

            {/* Spacer — sejajar dengan th grid icon */}
            <td className="w-10 px-3" />

        </tr>
    )
})

StudentRow.displayName = 'StudentRow'

// ─── Mobile Card ─────────────────────────────────────────────────────────────
const StudentMobileCard = memo(({
    student,
    isSelected = false,
    onToggleSelect,
    hasSelection = false,
    onViewProfile,
    onEdit,
    onConfirmDelete,
    onTogglePin,
    onQuickPoint,
    isPrivacyMode,
    RiskThreshold,
    buildWAMessage,
    openWAForStudent,
    waTemplate
}) => {
    const isRisk = (student.total_points || 0) <= RiskThreshold
    const p = student.total_points || 0
    const [showQuickAction, setShowQuickAction] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    const [lastAction, setLastAction] = useState(null)
    const lastActionTimerRef = useRef(null)

    const [boltRect, setBoltRect] = useState(null)
    const boltRef = useRef(null)

    const handleQuickPointInternal = (student, amount, reason) => {
        onQuickPoint(student, amount, reason)
        setLastAction({ amount, reason, timestamp: Date.now() })
        if (lastActionTimerRef.current) clearTimeout(lastActionTimerRef.current)
        lastActionTimerRef.current = setTimeout(() => setLastAction(null), 8000)
    }

    // Sticky positioning for portaled dropdown (Mobile)
    useEffect(() => {
        if (!showQuickAction || !boltRef.current) return
        const updateRect = () => {
            setBoltRect(boltRef.current.getBoundingClientRect())
        }
        window.addEventListener('scroll', updateRect, true)
        window.addEventListener('resize', updateRect)
        return () => {
            window.removeEventListener('scroll', updateRect, true)
            window.removeEventListener('resize', updateRect)
        }
    }, [showQuickAction])

    const longPressProps = useLongPress(() => {
        onToggleSelect(student.id)
    }, { 
        delay: 600, 
        onClick: () => {
            if (hasSelection) {
                onToggleSelect(student.id)
            } else {
                onViewProfile(student)
            }
        } 
    })

    const stopPropagation = (e) => e.stopPropagation();
    const handleActionAreaClick = (e) => {
        e.stopPropagation();
    };

    const quickActions = [
        { label: 'Sangat Aktif', amount: 5, color: 'text-emerald-500', icon: faPlus },
        { label: 'Fokus', amount: 2, color: 'text-emerald-500', icon: faBolt },
        { label: 'Ramai', amount: -2, color: 'text-amber-500', icon: faMinus },
        { label: 'Melanggar', amount: -5, color: 'text-red-500', icon: faTriangleExclamation },
    ]

    const maskInfo = (str, visibleLen = 3) => {
        if (!str) return '---'
        if (str.length <= visibleLen) return str[0] + '*'.repeat(str.length - 1)
        return str.substring(0, visibleLen) + '***'
    }

    return (
        <div
            {...longPressProps}
            className={`group relative p-2 rounded-[2.2rem] border transition-all duration-300 ease-out select-none
                ${showQuickAction ? 'z-[100]' : 'z-auto'}
                ${isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.03] shadow-lg shadow-[var(--color-primary)]/10 pb-2.5 translate-y-[-2px]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] shadow-md shadow-black/[0.02]'}
                ${student.is_pinned ? 'border-amber-400/40' : ''}
                ${isPressed ? 'scale-[0.985] shadow-inner brightness-[0.98]' : 'scale-100'}
                ${hasSelection ? 'cursor-pointer' : ''}
            `}
        >
            {/* Minimalist Bottom Progress Bar (Clipped by card boundary) */}
            <div className="absolute inset-0 z-0 overflow-hidden rounded-[2.2rem] pointer-events-none">
                <div className="absolute bottom-0 left-0 right-0 h-1 px-[2px]">
                    <div className="w-full h-full bg-[var(--color-border)]/10">
                        <div
                            className={`h-full transition-all duration-1000 ${calculateCompleteness(student) >= 80 ? 'bg-emerald-500/60' : calculateCompleteness(student) >= 50 ? 'bg-amber-500/60' : 'bg-red-400/60'}`}
                            style={{ width: `${calculateCompleteness(student)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* PIN INDICATOR (Visual Only) */}
            {student.is_pinned && (
                <div className="absolute top-3 right-5 flex items-center gap-1">
                    <div className="text-[8px] font-black text-amber-500 uppercase tracking-widest opacity-60">Pinned</div>
                    <FontAwesomeIcon icon={faThumbtack} className="text-[10px] text-amber-500" />
                </div>
            )}

            <div className="p-3">
                {/* IDENTITY AREA */}
                <div className="flex items-center gap-4">
                    {/* AVATAR SECTION */}
                    <div className="relative pointer-events-none">
                        <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner border-2 transition-all
                                ${isSelected ? 'border-[var(--color-primary)] scale-110' : 'border-white dark:border-gray-800'}
                                ${isRisk ? 'bg-red-500/10 text-red-500' : 'bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)]/90 to-[var(--color-accent)] text-white'}
                                ${isPrivacyMode ? 'blur-md grayscale opacity-60' : ''}`}
                        >
                            {student.photo_url
                                ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                : <span>{isPrivacyMode ? '*' : (student.name || 'S').charAt(0)}</span>
                            }

                            {/* Selection Checkmark Overlay */}
                            {isSelected && (
                                <div className="absolute inset-0 bg-[var(--color-primary)]/40 flex items-center justify-center animate-in zoom-in-50 duration-200">
                                    <FontAwesomeIcon icon={faCheck} className="text-white text-2xl" />
                                </div>
                            )}
                        </div>

                        {/* Status Dot */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-lg
                            ${p < 0 ? 'bg-amber-500' : p > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <FontAwesomeIcon
                                icon={p < 0 ? faArrowTrendDown : p > 0 ? faArrowTrendUp : faBolt}
                                className="text-white text-[8px]"
                            />
                        </div>
                    </div>

                    {/* NAME & IDENTITY */}
                    <div className="flex-1 min-w-0 pr-4 pointer-events-none">
                        <div className="flex flex-col">
                            <h3 className="font-extrabold text-[17px] text-[var(--color-text)] leading-tight tracking-tight mb-0.5 truncate">
                                {isPrivacyMode ? maskInfo(student.name, 4) : student.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-[var(--color-text-muted)] opacity-40 uppercase tracking-[0.1em]">
                                    {isPrivacyMode ? maskInfo(student.registration_code || student.code, 2) : (student.registration_code || student.code)}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] opacity-20" />
                                <span className={`text-[10px] font-bold ${student.gender === 'L' ? 'text-blue-500/60' : 'text-pink-500/60'}`}>
                                    {student.gender === 'L' ? 'Putra' : 'Putri'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INFO PILLS - Single Row with Dynamic Indicator */}
                <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[var(--color-surface-alt)]/80 border border-[var(--color-border)]/40 min-w-0">
                            <FontAwesomeIcon icon={faUserTie} className="text-[9px] text-[var(--color-text-muted)] shrink-0" />
                            <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-tight truncate">
                                {student.className}
                            </span>
                        </div>

                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border font-black text-[10px] transition-all shrink-0
                            ${p < 0 ? 'bg-red-500/10 border-red-500/10 text-red-600' : p > 0 ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-600' : 'bg-[var(--color-surface-alt)]/80 border-[var(--color-border)]/40 text-[var(--color-text-muted)]'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${p < 0 ? 'bg-red-500' : p > 0 ? 'bg-emerald-500' : 'bg-gray-400 opacity-40'}`} />
                            {p > 0 ? '+' : ''}{p} Poin
                            <Sparkline data={student.trendHistory} />
                        </div>
                    </div>

                    {/* WA Shortcut Button */}
                    <div className="flex items-center shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (!student.phone) return
                                const phone = student.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')
                                window.open(`https://wa.me/${phone}`, '_blank')
                            }}
                            disabled={!student.phone}
                            title={student.phone ? `Hubungi WA: ${student.phone}` : 'Belum ada nomor WA'}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all
                                ${student.phone
                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 active:scale-90'
                                    : 'border-[var(--color-border)]/40 bg-[var(--color-surface-alt)]/80 text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'}`}
                        >
                            <FontAwesomeIcon icon={faWhatsapp} className="text-[12px]" />
                        </button>
                    </div>
                </div>

                {/* Additional Tags (Second row if needed) */}
                {((student.tags || []).length > 0 || p >= 50) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {p >= 200 ? (
                            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-600 uppercase tracking-wider">Legendary</span>
                        ) : p >= 100 ? (
                            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 uppercase tracking-wider">Perfect</span>
                        ) : p >= 50 ? (
                            <span className="text-[8px] font-black px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 uppercase tracking-wider">Star</span>
                        ) : null}

                        {(student.tags || []).slice(0, 3).map(tag => (
                            <span key={tag} className={`text-[8px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${getTagColor(tag)}`}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* ACTION FOOTER - Isolated from Card Clicks */}
                <div
                    onClick={handleActionAreaClick}
                    className="mt-4 bg-[var(--color-surface-alt)] rounded-[2.2rem] p-1.5 flex items-center justify-between border border-[var(--color-border)] shadow-sm relative z-10"
                >
                    {/* Profil */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewProfile(student) }}
                        className="flex flex-col items-center justify-center gap-1 w-11 py-2 rounded-2xl text-[var(--color-text-muted)] hover:text-emerald-500 hover:bg-[var(--color-surface)] active:scale-95 transition-all"
                    >
                        <FontAwesomeIcon icon={faIdCard} className="text-[13px]" />
                        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Profil</span>
                    </button>

                    {/* Edit */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(student) }}
                        className="flex flex-col items-center justify-center gap-1 w-11 py-2 rounded-2xl text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-[var(--color-surface)] active:scale-95 transition-all"
                    >
                        <FontAwesomeIcon icon={faEdit} className="text-[13px]" />
                        <span className="text-[8px] font-black uppercase tracking-widest leading-none">Edit</span>
                    </button>

                    {/* Pin */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePin(student) }}
                        className={`flex flex-col items-center justify-center gap-1 w-11 py-2 rounded-2xl transition-all active:scale-95
                            ${student.is_pinned ? 'text-amber-500 bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'}`}
                    >
                        <FontAwesomeIcon icon={faThumbtack} className={`text-[11px] ${student.is_pinned ? 'rotate-0' : 'rotate-45'}`} />
                        <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                            {student.is_pinned ? 'Unpin' : 'Pin'}
                        </span>
                    </button>

                    {/* Poin Cepat */}
                    <div className="relative isolate">
                        <button
                            ref={boltRef}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!showQuickAction) {
                                    const rect = boltRef.current?.getBoundingClientRect()
                                    setBoltRect(rect)
                                }
                                setShowQuickAction(!showQuickAction)
                            }}
                            className={`flex flex-col items-center justify-center gap-1 w-11 py-2 rounded-2xl transition-all active:scale-95 border
                                ${showQuickAction
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-lg'
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white'}`}
                        >
                            <FontAwesomeIcon icon={faBolt} className="text-[13px]" />
                            <span className="text-[8px] font-black uppercase tracking-widest leading-none">Poin</span>
                        </button>

                        {showQuickAction && boltRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990] bg-black/10 backdrop-blur-[1px]" onClick={(e) => { e.stopPropagation(); setShowQuickAction(false) }} />
                                <div
                                    onClick={e => e.stopPropagation()}
                                    className="fixed z-[9991] w-52 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200 p-2.5 text-[var(--color-text)]"
                                    style={{
                                        top: boltRect.top - 8,
                                        left: Math.min(window.innerWidth - 215, Math.max(10, boltRect.right - 208)),
                                        transform: 'translateY(-100%)'
                                    }}
                                >
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] p-2 mb-1.5 border-b border-[var(--color-border)] text-center flex items-center justify-center gap-2">
                                        <FontAwesomeIcon icon={faBolt} className="text-[8px]" />
                                        Input Poin Cepat
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {quickActions.map((act, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { handleQuickPointInternal(student, act.amount, act.label); setShowQuickAction(false) }}
                                                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] transition-all border border-[var(--color-border)] active:scale-95"
                                            >
                                                <FontAwesomeIcon icon={act.icon} className={`text-[10px] ${act.color}`} />
                                                <span className="text-[8px] font-black uppercase tracking-widest leading-none mt-0.5">{act.label.split(' ')[0]}</span>
                                                <span className={`text-[10px] font-black ${act.color}`}>{act.amount > 0 ? `+${act.amount}` : act.amount}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => { handleQuickPointInternal(student, 0, 'custom'); setShowQuickAction(false) }}
                                        className="w-full mt-2 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all active:scale-[0.98]"
                                    >
                                        Input Kustom
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-quick-action')
                        )}
                    </div>

                    {/* Arsip */}
                    {onConfirmDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onConfirmDelete(student) }}
                            className="flex flex-col items-center justify-center gap-1 w-11 py-2 rounded-2xl text-red-400/50 hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"
                        >
                            <FontAwesomeIcon icon={faBoxArchive} className="text-[13px]" />
                            <span className="text-[8px] font-black uppercase tracking-widest leading-none">Arsip</span>
                        </button>
                    )}
                </div>

                {/* Mobile WA Post-Action Overlay - Rounded to match card */}
                {lastAction && student.phone && (
                    <div className="absolute inset-0 bg-emerald-500 z-[90] animate-in slide-in-from-right-full duration-500 rounded-[2.2rem] flex flex-col items-center justify-center text-white shadow-2xl overflow-hidden">
                        <button
                            onClick={() => {
                                const msg = buildWAMessage?.(student, 'points') || `Laporan untuk ${student.name}: Poin ${lastAction.amount > 0 ? '+' : ''}${lastAction.amount} (${lastAction.reason})`
                                openWAForStudent?.(student, msg)
                                setLastAction(null)
                            }}
                            className="w-full h-full flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform"
                        >
                            <FontAwesomeIcon icon={faWhatsapp} className="text-xl" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Kirim WA</span>
                        </button>
                        <button
                            onClick={() => setLastAction(null)}
                            className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[12px] active:scale-95 transition-all"
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
})

StudentMobileCard.displayName = 'StudentMobileCard'

export const StudentSkeletonRow = () => (
    <tr className="animate-pulse border-b border-[var(--color-border)]/50">
        <td className="py-4 px-4 w-12 text-center">
            <div className="w-5 h-5 bg-[var(--color-surface-alt)] rounded-lg mx-auto" />
        </td>
        <td className="py-4 px-1 w-12 truncate">
            <div className="w-9 h-9 rounded-full bg-[var(--color-surface-alt)] mx-auto" />
        </td>
        <td className="py-4 px-1 w-16 text-center">
            <div className="w-10 h-4 bg-[var(--color-surface-alt)] rounded-md mx-auto" />
        </td>
        <td className="py-4 px-4 min-w-[300px]">
            <div className="flex flex-col gap-1.5">
                <div className="w-48 h-4 bg-[var(--color-surface-alt)] rounded-md" />
                <div className="w-32 h-3 bg-[var(--color-surface-alt)]/60 rounded-md" />
            </div>
        </td>
        <td className="py-4 px-4 text-center">
            <div className="w-8 h-4 bg-[var(--color-surface-alt)] rounded-md mx-auto" />
        </td>
        <td className="py-4 px-4 text-center">
            <div className="w-12 h-4 bg-[var(--color-surface-alt)] rounded-md mx-auto" />
        </td>
        <td className="py-4 px-4 text-center">
            <div className="w-12 h-6 bg-[var(--color-surface-alt)] rounded-lg mx-auto" />
        </td>
        <td className="py-4 px-4">
            <div className="flex gap-2 justify-center">
                <div className="w-8 h-8 bg-[var(--color-surface-alt)] rounded-xl" />
                <div className="w-8 h-8 bg-[var(--color-surface-alt)] rounded-xl" />
            </div>
        </td>
    </tr>
)

export const StudentSkeletonCard = () => (
    <div className="animate-pulse rounded-[2.2rem] border border-[var(--color-border)]/50 p-2 bg-[var(--color-surface)] shadow-md shadow-black/[0.02] flex flex-col gap-1">
        <div className="p-3">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)]" />
                <div className="flex-1 space-y-2.5">
                    <div className="w-3/4 h-5 bg-[var(--color-surface-alt)] rounded-lg" />
                    <div className="w-1/2 h-3 bg-[var(--color-surface-alt)]/60 rounded-md" />
                </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-24 h-8 bg-[var(--color-surface-alt)]/80 rounded-2xl border border-[var(--color-border)]/40" />
                    <div className="w-16 h-8 bg-[var(--color-surface-alt)]/80 rounded-2xl border border-[var(--color-border)]/40" />
                </div>
                <div className="w-8 h-8 bg-[var(--color-surface-alt)]/80 rounded-xl border border-[var(--color-border)]/40" />
            </div>
            
            <div className="mt-4 h-11 bg-[var(--color-surface-alt)] rounded-[2.2rem] border border-[var(--color-border)] shadow-sm" />
        </div>
    </div>
)

export { StudentRow, StudentMobileCard }
export default StudentRow