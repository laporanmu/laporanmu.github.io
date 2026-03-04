import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faExclamationCircle, faInfoCircle, faXmark, faRotateLeft } from '@fortawesome/free-solid-svg-icons'

const ToastContext = createContext({})

const TOAST_TYPES = {
    success: { icon: faCheckCircle, className: 'bg-emerald-500' },
    error: { icon: faExclamationCircle, className: 'bg-red-500' },
    info: { icon: faInfoCircle, className: 'bg-blue-500' },
    warning: { icon: faExclamationCircle, className: 'bg-amber-500' },
    undo: { icon: faCheckCircle, className: 'bg-[#3730a3]' }, // indigo — beda dari success biasa
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timerRefs = useRef({})

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 300)
    }, [])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message, type }])

        timerRefs.current[id] = setTimeout(() => {
            removeToast(id)
        }, duration)

        return id
    }, [removeToast])

    // ── Undo Toast ─────────────────────────────────────────────────────────
    // Tampilkan toast dengan tombol "Batalkan" selama `undoDuration` ms.
    // Jika user klik Batalkan sebelum timer habis → panggil onUndo().
    // Return: { id, cancel } — cancel() bisa dipakai untuk dismiss manual.
    const addUndoToast = useCallback((message, onUndo, undoDuration = 5000) => {
        const id = Date.now() + Math.random()

        setToasts(prev => [...prev, {
            id,
            message,
            type: 'undo',
            undoDuration,
            startedAt: Date.now(),
            onUndo,
        }])

        timerRefs.current[id] = setTimeout(() => {
            removeToast(id)
        }, undoDuration)

        const cancel = () => {
            clearTimeout(timerRefs.current[id])
            removeToast(id)
        }

        return { id, cancel }
    }, [removeToast])

    const handleUndo = useCallback((toast) => {
        clearTimeout(timerRefs.current[toast.id])
        removeToast(toast.id)
        toast.onUndo?.()
    }, [removeToast])

    return (
        <ToastContext.Provider value={{ addToast, addUndoToast, removeToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:max-w-sm">
                {toasts.map(toast => {
                    const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info
                    const isUndo = toast.type === 'undo'

                    return (
                        <div
                            key={toast.id}
                            className={`${config.className} ${toast.exiting ? 'toast-exit' : 'toast-enter'}
                                text-white px-3 py-2.5 sm:px-4 rounded-xl shadow-xl flex items-center gap-3 border border-white/10 relative overflow-hidden`}
                        >
                            {/* Progress bar untuk undo toast */}
                            {isUndo && (
                                <div
                                    className="absolute bottom-0 left-0 h-0.5 bg-white/40 rounded-full"
                                    style={{
                                        animation: `shrink ${toast.undoDuration}ms linear forwards`,
                                        width: '100%',
                                    }}
                                />
                            )}

                            <FontAwesomeIcon icon={config.icon} className="text-base sm:text-lg shrink-0" />
                            <span className="flex-1 text-[11px] sm:text-sm font-semibold">{toast.message}</span>

                            {/* Undo button */}
                            {isUndo && (
                                <button
                                    onClick={() => handleUndo(toast)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-[10px] font-black uppercase tracking-widest shrink-0"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                                    Batalkan
                                </button>
                            )}

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-xs" />
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* CSS untuk progress bar animation */}
            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used within ToastProvider')
    return context
}