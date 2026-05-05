import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

// Singleton portal manager to prevent 'removeChild' errors in concurrent mode or Android/Chrome Translate
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

export default function Modal({
    isOpen, onClose, title, children, footer,
    size = 'md', variant = 'centered', mobileVariant = 'centered',
    noPadding = false, contentClassName = "",
    icon, iconBg, iconColor, description,
    closeOnOutsideClick = true
}) {
    useEffect(() => {
        if (isOpen) {
            // Prevent layout shift by calculating scrollbar width
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
            document.body.style.overflow = 'hidden'
            document.body.style.paddingRight = `${scrollBarWidth}px`
        } else {
            document.body.style.overflow = ''
            document.body.style.paddingRight = '0px'
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.paddingRight = '0px'
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

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

    const node = (
        <div
            className={`fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-md transition-all duration-500
                ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
                ${isBottomSheet ? 'flex items-end md:items-center justify-center md:p-6' : 'flex items-center justify-center p-4 md:p-6'}
            `}
            onClick={() => closeOnOutsideClick && onClose?.()}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-[var(--color-surface)] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] w-full relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform overflow-hidden flex flex-col border border-white/10
                    ${sizeClasses[size]}
                    ${isBottomSheet
                        ? 'rounded-t-[2.5rem] md:rounded-[2.5rem] max-h-[92vh] md:max-h-[calc(100vh-6rem)] translate-y-0 animate-in slide-in-from-bottom-8 md:slide-in-from-top-4'
                        : 'rounded-[2.5rem] max-h-[calc(100vh-6rem)] translate-y-0 animate-in zoom-in-95'
                    }
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle for Bottom Sheet */}
                {isBottomSheet && (
                    <div className="shrink-0 w-12 h-1.5 bg-[var(--color-text-muted)] rounded-full mx-auto mt-4 mb-1 md:hidden opacity-20" />
                )}

                {/* Header */}
                <div className={`shrink-0 flex items-center justify-between mb-0 px-8 ${isBottomSheet ? 'pt-4 pb-4' : 'py-6'} border-b border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-xl sticky top-0 z-10`}>
                    <div className="flex items-center gap-4 min-w-0">
                        {icon && (
                            <div className={`w-10 h-10 rounded-2xl ${iconBg || 'bg-[var(--color-primary)]/10'} flex items-center justify-center shrink-0 shadow-sm border border-white/5 ${iconColor || 'text-[var(--color-primary)]'}`}>
                                <FontAwesomeIcon icon={icon} className="text-base opacity-90" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h3 className={`font-black font-heading tracking-tight text-[var(--color-text)] leading-tight ${icon ? 'text-base' : 'text-lg md:text-xl'}`}>
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
                        className="w-10 h-10 text-[var(--color-text-muted)] hover:text-[var(--color-text)]
              hover:bg-[var(--color-surface-alt)] rounded-2xl transition-all active:scale-90 flex items-center justify-center shrink-0 border border-transparent hover:border-[var(--color-border)]"
                        aria-label="Close modal"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-lg" />
                    </button>
                </div>

                {/* Content */}
                <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'p-8'} ${contentClassName} scroll-smooth`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="shrink-0 p-8 pt-5 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-alt)]/20 backdrop-blur-md">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )

    return createPortal(node, container)
}