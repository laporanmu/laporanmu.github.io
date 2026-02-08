import { createContext, useContext, useState, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationCircle, faInfoCircle, faXmark } from '@fortawesome/free-solid-svg-icons'

const ToastContext = createContext({})

const TOAST_TYPES = {
    success: { icon: faCheckCircle, className: 'bg-emerald-500' },
    error: { icon: faExclamationCircle, className: 'bg-red-500' },
    info: { icon: faInfoCircle, className: 'bg-blue-500' },
    warning: { icon: faExclamationCircle, className: 'bg-amber-500' },
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message, type }])

        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id))
            }, 300)
        }, duration)
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 300)
    }, [])

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:max-w-xs">
                {toasts.map(toast => {
                    const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info
                    return (
                        <div
                            key={toast.id}
                            className={`${config.className} ${toast.exiting ? 'toast-exit' : 'toast-enter'} 
                text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/10`}
                        >
                            <FontAwesomeIcon icon={config.icon} className="text-base sm:text-lg" />
                            <span className="flex-1 text-[11px] sm:text-sm font-semibold">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-xs" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}
