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
    icon, iconBg, iconColor, description
}) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
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

    // Determine classes based on variant and screen size
    const isBottomSheet = mobileVariant === 'bottom-sheet'

    const node = (
        <div
            className={`fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm transition-all duration-300
                ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
                ${isBottomSheet ? 'flex items-end md:items-center justify-center md:p-8' : 'flex items-center justify-center p-4 md:p-8'}
            `}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-[var(--color-surface)] shadow-2xl w-full relative transition-all duration-500 transform overflow-hidden flex flex-col
                    ${sizeClasses[size]}
                    ${isBottomSheet
                        ? 'rounded-t-[2rem] md:rounded-[2rem] max-h-[92vh] md:max-h-[calc(100vh-4rem)] translate-y-0 animate-in slide-in-from-bottom-4 md:slide-in-from-top-4'
                        : 'rounded-[2rem] max-h-[calc(100vh-4rem)] translate-y-0 animate-in zoom-in-95'
                    }
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle for Bottom Sheet */}
                {isBottomSheet && (
                    <div className="shrink-0 w-12 h-1.5 bg-[var(--color-border)] rounded-full mx-auto mt-4 mb-2 md:hidden opacity-30" />
                )}

                {/* Header (Sticky by flex shrink-0) */}
                <div className={`shrink-0 flex items-center justify-between mb-0 px-6 ${isBottomSheet ? 'pt-2' : 'pt-5 pb-4'} border-b border-[var(--color-border)]`}>
                    <div className="flex items-center gap-3 min-w-0">
                        {icon && (
                            <div className={`w-9 h-9 rounded-xl ${iconBg || 'bg-[var(--color-primary)]/10'} flex items-center justify-center shrink-0 opacity-80 ${iconColor || 'text-[var(--color-primary)]'}`}>
                                <FontAwesomeIcon icon={icon} className="text-base" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h3 className={`font-black font-heading tracking-tight text-[var(--color-text)] leading-tight ${icon ? 'text-[13px]' : 'text-lg'}`}>
                                {title}
                            </h3>
                            {description && (
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 text-[var(--color-text-muted)] hover:text-[var(--color-text)]
              hover:bg-[var(--color-surface-alt)] rounded-xl transition-all active:scale-90 flex items-center justify-center shrink-0"
                        aria-label="Close modal"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {/* Content (Scrollable by flex-1 min-h-0 overflow-y-auto) */}
                <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'p-6'} ${contentClassName}`}>
                    {children}
                </div>

                {/* Footer (Sticky by flex shrink-0) */}
                {footer && (
                    <div className="shrink-0 p-6 pt-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )

    return createPortal(node, container)
}