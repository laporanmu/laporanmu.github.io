import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

/**
 * RichSelect - A premium, reusable dropdown component with auto-flip and portal support.
 * 
 * @param {any} value - Current selected value
 * @param {Function} onChange - Callback when value changes
 * @param {Array} options - List of {id, name} objects
 * @param {string} placeholder - Text when no value is selected
 * @param {object} icon - FontAwesome icon for the prefix
 * @param {object} extraOption - Optional {id, name} to show at the top (e.g. "Other/None")
 * @param {boolean} small - Use smaller padding/height
 */
const RichSelect = ({ value, onChange, options, placeholder, icon, extraOption, small }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom', maxHeight: 240 })
    const ref = useRef(null)

    const updateCoords = useCallback(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const dropdownHeight = 260 
            const margin = 16
            
            const spaceBelow = window.innerHeight - rect.bottom - margin
            const spaceAbove = rect.top - margin
            
            const shouldFlip = spaceBelow < dropdownHeight && spaceAbove > 100

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

    const toggle = () => {
        const nextState = !isOpen
        if (nextState) updateCoords()
        setIsOpen(nextState)
    }

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateCoords, true)
            window.addEventListener('resize', updateCoords)
            
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
    }, [isOpen, updateCoords])

    const selectedOption = options.find(o => String(o.id) === String(value)) || (extraOption?.id === value ? extraOption : null)

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={toggle}
                className={`w-full flex items-center justify-between gap-2 ${small ? 'px-3 h-11' : 'pl-9 pr-3 h-11'} rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] relative group`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && !small && <FontAwesomeIcon icon={icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)] group-hover:text-[var(--color-primary)]" />}
                    <span className={selectedOption ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-60'}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div 
                    className={`fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl py-1.5 overflow-y-auto animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} 
                    [scrollbar-width:thin] 
                    [&::-webkit-scrollbar]:w-1.5
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-slate-300
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-button]:hidden`}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        width: coords.width,
                        left: coords.left,
                        top: coords.placement === 'top' ? 'auto' : coords.bottom + 8,
                        bottom: coords.placement === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                        maxHeight: Math.min(240, coords.maxHeight - 20)
                    }}
                >
                    {extraOption && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(extraOption.id); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[12px] font-semibold hover:bg-[var(--color-primary)]/5 transition-all flex items-center gap-3 border-b border-[var(--color-border)] mb-1 ${value === extraOption.id ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-amber-600'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${value === extraOption.id ? 'bg-[var(--color-primary)]' : 'bg-amber-600'}`} />
                            {extraOption.name}
                        </button>
                    )}
                    {options.length === 0 ? (
                        <div className="px-4 py-3 text-center">
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Data Kosong</p>
                        </div>
                    ) : options.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(opt.id); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[12px] font-semibold hover:bg-[var(--color-primary)]/5 transition-all flex items-center gap-3 ${String(value) === String(opt.id) ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text)]'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full transition-all ${String(value) === String(opt.id) ? 'bg-[var(--color-primary)] scale-125' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-text-muted)]'}`} />
                            {opt.name}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    )
}

export default RichSelect
