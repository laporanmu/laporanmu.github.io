import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faSearch, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons'

/**
 * RichSelect - A premium, reusable dropdown component with auto-flip, portal, and search support.
 */
const RichSelect = ({ 
    value, 
    onChange, 
    options = [], 
    placeholder = 'Pilih...', 
    icon, 
    extraOption, 
    small, 
    status = 'normal',
    searchable = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom', maxHeight: 240 })
    const ref = useRef(null)
    const searchInputRef = useRef(null)

    const statusClasses = {
        error: 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/5 dark:bg-rose-500/5',
        success: 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50/5 dark:bg-emerald-500/5',
        normal: 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
    }

    const iconStatusClasses = {
        error: 'text-rose-500 opacity-80',
        success: 'text-emerald-500 opacity-80',
        normal: 'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)] group-hover:text-[var(--color-primary)]'
    }

    const updateCoords = useCallback(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const dropdownHeight = searchable ? 320 : 260 
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
    }, [searchable])

    const toggle = () => {
        const nextState = !isOpen
        if (nextState) {
            updateCoords()
            setSearch('')
        }
        setIsOpen(nextState)
    }

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateCoords, true)
            window.addEventListener('resize', updateCoords)
            if (searchable && searchInputRef.current) {
                setTimeout(() => searchInputRef.current?.focus(), 100)
            }
            
            const handleClickOutside = (e) => {
                if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
            }
            document.addEventListener('mousedown', handleClickOutside)
            
            return () => {
                window.removeEventListener('scroll', updateCoords, true)
                window.removeEventListener('resize', updateCoords)
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }
    }, [isOpen, updateCoords, searchable])

    const filteredOptions = useMemo(() => {
        if (!search) return options
        const s = search.toLowerCase()
        return options.filter(o => o.name?.toLowerCase().includes(s) || o.id?.toString().toLowerCase().includes(s))
    }, [options, search])

    const selectedOption = options.find(o => String(o.id) === String(value)) || (extraOption?.id === value ? extraOption : null)

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={toggle}
                className={`w-full flex items-center justify-between gap-2 ${small ? 'px-3 h-8 sm:h-9' : 'pl-9 pr-3 h-11'} rounded-lg sm:rounded-xl border ${statusClasses[status]} bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/50 focus:ring-1 outline-none transition-all text-[11px] sm:text-[12px] font-bold relative group shadow-sm`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && !small && <FontAwesomeIcon icon={icon} className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs transition-colors ${iconStatusClasses[status]}`} />}
                    <span className={selectedOption ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-60'}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>

            {isOpen && createPortal(
                <div 
                    className={`fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        width: 'max-content',
                        minWidth: coords.width,
                        maxWidth: Math.max(300, coords.width),
                        left: coords.left,
                        top: coords.placement === 'top' ? 'auto' : coords.bottom + 8,
                        bottom: coords.placement === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                    }}
                >
                    {/* Search Bar */}
                    {searchable && (
                        <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                            <div className="relative">
                                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] opacity-40" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari..."
                                    className="w-full h-8 pl-8 pr-8 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all font-bold"
                                />
                                {search && (
                                    <button 
                                        onClick={() => setSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div 
                        className="py-1.5 overflow-y-auto custom-scrollbar"
                        style={{ maxHeight: Math.min(searchable ? 280 : 240, coords.maxHeight - 80) }}
                    >
                        {extraOption && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onChange(extraOption.id); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-[11px] font-bold hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-between group whitespace-nowrap ${value === extraOption.id ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-amber-600'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${value === extraOption.id ? 'bg-[var(--color-primary)]' : 'bg-amber-600'}`} />
                                    {extraOption.name}
                                </div>
                                {value === extraOption.id && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                            </button>
                        )}
                        
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-6 text-center">
                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-40">Tidak ditemukan</p>
                            </div>
                        ) : filteredOptions.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onChange(opt.id); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-[11px] font-bold hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-between group whitespace-nowrap ${String(value) === String(opt.id) ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text)]'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${String(value) === String(opt.id) ? 'bg-[var(--color-primary)] scale-125 shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.4)]' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-text-muted)]'}`} />
                                    {opt.name}
                                </div>
                                {String(value) === String(opt.id) && <FontAwesomeIcon icon={faCheck} className="text-[10px] animate-in zoom-in-50 duration-300" />}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default RichSelect
