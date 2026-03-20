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

export default function Modal({ isOpen, onClose, title, children, size = 'md', variant = 'centered', mobileVariant = 'centered' }) {
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
        full: 'max-w-[95vw]',
    }

    const container = getPortalContainer('portal-modals-system')

    // Determine classes based on variant and screen size
    const isBottomSheet = mobileVariant === 'bottom-sheet'
    
    const node = (
        <div 
            className={`fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm transition-all duration-300
                ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
                ${isBottomSheet ? 'flex items-end md:items-center justify-center' : 'flex items-start justify-center overflow-y-auto p-4 md:p-8'}
            `} 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true"
        >
            <div
                className={`bg-[var(--color-surface)] shadow-2xl w-full relative transition-all duration-500 transform
                    ${sizeClasses[size]}
                    ${isBottomSheet 
                        ? 'rounded-t-[2.5rem] md:rounded-2xl h-[90vh] md:h-auto md:my-auto translate-y-0 animate-in slide-in-from-bottom-full md:slide-in-from-top-4 flex flex-col' 
                        : 'rounded-2xl p-6 my-auto translate-y-0 animate-in zoom-in-95'
                    }
                `}
                style={isBottomSheet ? { paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' } : {}}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle for Bottom Sheet */}
                {isBottomSheet && (
                    <div className="shrink-0 w-12 h-1.5 bg-[var(--color-border)] rounded-full mx-auto mt-4 mb-4 md:hidden opacity-30" />
                )}

                <div className={`flex items-center justify-between mb-4 ${isBottomSheet ? 'px-6 pt-2' : ''}`}>
                    <h3 className="text-lg font-black font-heading tracking-tight text-[var(--color-text)]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]
              hover:bg-[var(--color-surface-alt)] rounded-xl transition-all active:scale-90"
                        aria-label="Close modal"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className={`flex-1 min-h-0 ${isBottomSheet ? 'overflow-y-auto px-6 pr-4' : ''}`}>
                    {children}
                </div>
            </div>
        </div>
    )

    return createPortal(node, container)
}