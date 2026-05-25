import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarAlt, faChevronLeft, faChevronRight, faXmark, faChevronDown } from '@fortawesome/free-solid-svg-icons'

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAYS_SHORT = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']

const RichDatePicker = memo(({
    value, // Format: YYYY-MM-DD
    onChange,
    placeholder = 'Pilih Tanggal...',
    small = false,
    disabled = false,
    className = "",
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentDate, setCurrentDate] = useState(() => {
        if (value) {
            const d = new Date(value)
            if (!isNaN(d.getTime())) return d
        }
        return new Date()
    })
    
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom', maxHeight: 360 })
    const [compactPlacement, setCompactPlacement] = useState('bottom')
    const ref = useRef(null)

    // Synchronize currentDate if value changes
    useEffect(() => {
        if (value) {
            const d = new Date(value)
            if (!isNaN(d.getTime())) {
                setCurrentDate(d)
            }
        }
    }, [value])

    const updateCoords = useCallback(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const dropdownHeight = 320
            const margin = 16
            
            const spaceBelow = window.innerHeight - rect.bottom - margin
            const spaceAbove = rect.top - margin
            
            const shouldFlip = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

            setCoords({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                placement: shouldFlip ? 'top' : 'bottom',
                maxHeight: shouldFlip ? spaceAbove : spaceBelow
            })
        }
    }, [])

    const toggle = useCallback(() => {
        const nextState = !isOpen
        if (nextState) {
            if (compact && ref.current) {
                const rect = ref.current.getBoundingClientRect()
                const dropdownH = 300
                const spaceBelow = window.innerHeight - rect.bottom - 8
                setCompactPlacement(spaceBelow < dropdownH ? 'top' : 'bottom')
            } else if (!compact) {
                updateCoords()
            }
        }
        setIsOpen(nextState)
    }, [isOpen, compact, updateCoords])

    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)

        if (!compact) {
            window.addEventListener('scroll', updateCoords, true)
            window.addEventListener('resize', updateCoords)
        }
            
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            if (!compact) {
                window.removeEventListener('scroll', updateCoords, true)
                window.removeEventListener('resize', updateCoords)
            }
        }
    }, [isOpen, updateCoords, compact])

    // Format display date
    const formattedDisplay = useMemo(() => {
        if (!value) return ''
        const d = new Date(value)
        if (isNaN(d.getTime())) return ''
        return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    }, [value])

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const handlePrevMonth = useCallback((e) => {
        e.stopPropagation()
        setCurrentDate(new Date(year, month - 1, 1))
    }, [year, month])

    const handleNextMonth = useCallback((e) => {
        e.stopPropagation()
        setCurrentDate(new Date(year, month + 1, 1))
    }, [year, month])

    const handleSelectDay = useCallback((day) => {
        const formattedMonth = String(month + 1).padStart(2, '0')
        const formattedDay = String(day).padStart(2, '0')
        onChange(`${year}-${formattedMonth}-${formattedDay}`)
        setIsOpen(false)
    }, [year, month, onChange])

    const handleToday = useCallback((e) => {
        e.stopPropagation()
        const today = new Date()
        const formattedMonth = String(today.getMonth() + 1).padStart(2, '0')
        const formattedDay = String(today.getDate()).padStart(2, '0')
        onChange(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`)
        setIsOpen(false)
    }, [onChange])

    const handleClear = useCallback((e) => {
        e.stopPropagation()
        onChange('')
        setIsOpen(false)
    }, [onChange])

    // Generate days grid
    const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])
    
    // First day of month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // We adjust it so 0 = Monday, ..., 6 = Sunday
    const firstDayIndex = useMemo(() => {
        const d = new Date(year, month, 1).getDay()
        return d === 0 ? 6 : d - 1
    }, [year, month])

    const calendarGrid = useMemo(() => {
        const cells = []
        // Empty cells before the 1st day
        for (let i = 0; i < firstDayIndex; i++) {
            cells.push(null)
        }
        // Actual days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push(i)
        }
        return cells
    }, [firstDayIndex, daysInMonth])

    const isSelected = useCallback((day) => {
        if (!value || !day) return false
        const d = new Date(value)
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    }, [value, month, year])

    const isToday = useCallback((day) => {
        if (!day) return false
        const today = new Date()
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
    }, [month, year])

    const renderCalendar = () => (
        <div className="p-3 bg-[var(--color-surface)] w-[260px] sm:w-[280px]">
            {/* Header: Month & Year Selector */}
            <div className="flex items-center justify-between mb-3.5">
                <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95"
                >
                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                </button>
                <div className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)] select-none">
                    {MONTHS[month]} {year}
                </div>
                <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95"
                >
                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                </button>
            </div>

            {/* Weekday Names */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5 select-none">
                {DAYS_SHORT.map((d, idx) => (
                    <div key={idx} className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-3">
                {calendarGrid.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} className="w-8 h-8" />
                    }
                    const selected = isSelected(day)
                    const today = isToday(day)
                    return (
                        <button
                            key={`day-${day}`}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectDay(day); }}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-[11px] font-black flex items-center justify-center transition-all active:scale-90 ${
                                selected
                                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                                    : today
                                    ? 'border border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10'
                                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] border border-transparent'
                            }`}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] select-none">
                <button
                    type="button"
                    onClick={handleClear}
                    className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-all border border-transparent hover:border-red-100"
                >
                    Hapus
                </button>
                <button
                    type="button"
                    onClick={handleToday}
                    className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 px-2 py-1.5 rounded-lg transition-all border border-transparent"
                >
                    Hari Ini
                </button>
            </div>
        </div>
    )

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={disabled ? undefined : toggle}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 ${small ? 'px-3 h-8 sm:h-9' : 'pl-9 pr-3 h-11'} rounded-lg sm:rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/50 focus:border-[var(--color-primary)] outline-none transition-all text-[11px] sm:text-[12px] font-bold relative group shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-2 truncate">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--color-text-muted)] opacity-50 group-focus:text-[var(--color-primary)] group-hover:text-[var(--color-primary)] transition-colors text-xs shrink-0" />
                    <span className={value ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-60'}>
                        {formattedDisplay || placeholder}
                    </span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] opacity-40 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>

            {isOpen && (compact ? (
                <div 
                    className="absolute z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        minWidth: '260px',
                        right: 0,
                        ...(compactPlacement === 'top'
                            ? { bottom: '100%', marginBottom: 4 }
                            : { top: '100%', marginTop: 4 }
                        ),
                    }}
                >
                    {renderCalendar()}
                </div>
            ) : (
                createPortal(
                    <div 
                        className={`fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                            width: 'max-content',
                            left: Math.max(16, Math.min(coords.left, window.innerWidth - (window.innerWidth < 640 ? 260 : 280) - 16)),
                            top: coords.placement === 'top' ? 'auto' : coords.bottom + 8,
                            bottom: coords.placement === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                        }}
                    >
                        {renderCalendar()}
                    </div>,
                    document.body
                )
            ))}
        </div>
    )
})

RichDatePicker.displayName = 'RichDatePicker'

export default RichDatePicker
