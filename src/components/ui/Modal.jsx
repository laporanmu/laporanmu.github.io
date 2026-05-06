import { useEffect, useRef, useState, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

// Singleton portal manager
const _portalContainers = {}
function getPortalContainer(id) {
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

const Modal = memo(function Modal({
    isOpen, onClose, title, children, footer,
    size = 'md', variant = 'centered', mobileVariant = 'centered',
    noPadding = false, contentClassName = "",
    icon, iconBg, iconColor, description,
    closeOnOutsideClick = true
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const closeTimer = useRef(null)

    // Visibility management with double rAF for perfect entry transition
    useEffect(() => {
        clearTimeout(closeTimer.current)
        if (isOpen) {
            setMounted(true)
            const frame = requestAnimationFrame(() => {
                const secondFrame = requestAnimationFrame(() => setVisible(true))
                return () => cancelAnimationFrame(secondFrame)
            })
            return () => cancelAnimationFrame(frame)
        } else {
            setVisible(false)
            closeTimer.current = setTimeout(() => setMounted(false), 260)
        }
    }, [isOpen])

    // Body scroll lock with layout shift prevention
    useEffect(() => {
        if (isOpen) {
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
            document.body.style.overflow = 'hidden'
            if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`
        } else {
            const t = setTimeout(() => {
                document.body.style.overflow = ''
                document.body.style.paddingRight = '0px'
            }, 260) // Match unmount delay
            return () => clearTimeout(t)
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.paddingRight = '0px'
        }
    }, [isOpen])

    // Escape key handler
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!mounted) return null

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        xxl: 'max-w-5xl',
        xxxl: 'max-w-7xl',
        full: 'max-w-[98vw]',
    }

    const container = getPortalContainer('portal-modals-system')
    const isBottomSheet = mobileVariant === 'bottom-sheet'

    // Performance-optimized timing
    const sheetEase = 'cubic-bezier(0.2, 0.8, 0.2, 1)' // Clean native-like spring
    const duration = visible ? '300ms' : '200ms'

    const node = (
        <div
            className={`fixed inset-0 z-[9999] flex transition-all duration-300
                ${isBottomSheet ? 'items-end md:items-center justify-center md:p-6' : 'items-center justify-center p-4 md:p-6'}
                ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            style={{
                visibility: visible ? 'visible' : 'hidden',
                transitionProperty: 'opacity, visibility',
                transitionDuration: duration
            }}
            onClick={() => closeOnOutsideClick && onClose?.()}
            role="dialog"
            aria-modal="true"
        >
            {/* Optimized Backdrop */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300" />

            {/* Modal Panel */}
            <div
                className={`bg-[var(--color-surface)] shadow-2xl w-full relative overflow-hidden flex flex-col border border-[var(--color-border)]/60 z-10
                    ${sizeClasses[size]}
                    ${isBottomSheet
                        ? 'rounded-t-[2.25rem] md:rounded-[2.25rem] max-h-[94vh] md:max-h-[calc(100vh-6rem)]'
                        : 'rounded-[2.25rem] max-h-[calc(100vh-6rem)]'
                    }
                `}
                style={{
                    transform: !visible
                        ? (isBottomSheet ? 'translateY(100%)' : 'scale(0.96) translateY(10px)')
                        : 'translateY(0) scale(1)',
                    opacity: visible ? 1 : 0,
                    transition: `transform ${duration} ${sheetEase}, opacity ${duration} ease`,
                    // Critical Performance Flags
                    backfaceVisibility: 'hidden',
                    perspective: 1000,
                    contain: 'content' // Isolate layout/paint
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle for Bottom Sheet */}
                {isBottomSheet && (
                    <div className="shrink-0 w-12 h-1.5 bg-[var(--color-text-muted)] rounded-full mx-auto mt-4 mb-1 md:hidden opacity-20" />
                )}

                {/* Header */}
                <div className={`shrink-0 flex items-center justify-between px-6 md:px-8 ${isBottomSheet ? 'pt-3 pb-4' : 'py-5'} border-b border-[var(--color-border)]/50 bg-[var(--color-surface)] sticky top-0 z-10`}>
                    <div className="flex items-center gap-3.5 min-w-0">
                        {icon && (
                            <div className={`w-9 h-9 rounded-xl ${iconBg || 'bg-[var(--color-primary)]/10'} flex items-center justify-center shrink-0 ${iconColor || 'text-[var(--color-primary)]'}`}>
                                <FontAwesomeIcon icon={icon} className="text-sm" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h3 className={`font-black font-heading tracking-tight text-[var(--color-text)] leading-tight ${icon ? 'text-[15px]' : 'text-lg md:text-xl'}`}>
                                {title}
                            </h3>
                            {description && (
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] leading-relaxed mt-0.5 opacity-50">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] rounded-2xl transition-colors active:scale-90 flex items-center justify-center shrink-0"
                        aria-label="Close modal"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-lg" />
                    </button>
                </div>

                {/* Content Area */}
                <div
                    className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'px-6 md:px-8 py-6'} ${contentClassName}`}
                    style={{
                        overscrollBehavior: 'contain', // Prevent scroll chaining to background
                        WebkitOverflowScrolling: 'touch' // Smooth inertial scroll on iOS
                    }}
                >
                    {children}
                </div>

                {/* Footer Area */}
                {footer && (
                    <div className="shrink-0 px-6 md:px-8 py-5 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-alt)]/30">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )

    return createPortal(node, container)
})

export default Modal