import { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faRotateRight, faHouse } from '@fortawesome/free-solid-svg-icons'

// ─── GlobalErrorBoundary ──────────────────────────────────────────────────────
// Taruh di App.jsx / main.jsx sebagai wrapper paling luar.
// Menangkap semua error yang tidak ter-catch oleh boundary yang lebih dalam.
//
// Usage:
//   <GlobalErrorBoundary>
//     <App />
//   </GlobalErrorBoundary>
//
// Props:
//   - onError(error, info)  → optional callback, misal: kirim ke Sentry
//   - fallback              → optional custom fallback node

class GlobalErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { error: null, errorInfo: null }
        this.handleReset = this.handleReset.bind(this)
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo })
        // Optional: kirim ke logging service
        if (typeof this.props.onError === 'function') {
            this.props.onError(error, errorInfo)
        }
        if (import.meta.env.DEV) {
            console.error('[GlobalErrorBoundary]', error, errorInfo)
        }
    }

    handleReset() {
        this.setState({ error: null, errorInfo: null })
    }

    render() {
        const { error, errorInfo } = this.state
        const { fallback, children } = this.props

        if (!error) return children

        // Custom fallback
        if (fallback) return fallback

        const isDev = import.meta.env.DEV

        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6
                            bg-[var(--color-surface)]">

                {/* Icon */}
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center
                                ring-1 ring-red-500/20">
                    <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        className="text-red-500 text-3xl"
                    />
                </div>

                {/* Text */}
                <div className="text-center max-w-sm">
                    <p className="text-base font-black text-[var(--color-text)] mb-2">
                        Terjadi kesalahan
                    </p>
                    <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">
                        {error?.message || 'Sesuatu yang tidak terduga terjadi.'}
                    </p>
                </div>

                {/* Dev stack trace */}
                {isDev && errorInfo?.componentStack && (
                    <details className="w-full max-w-xl">
                        <summary className="text-[11px] text-[var(--color-text-muted)] cursor-pointer
                                            hover:text-[var(--color-text)] transition-colors select-none">
                            Stack trace
                        </summary>
                        <pre className="mt-2 p-3 rounded-xl bg-[var(--color-surface-alt)] border
                                        border-[var(--color-border)] text-[10px] text-red-400
                                        overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap">
                            {errorInfo.componentStack}
                        </pre>
                    </details>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={this.handleReset}
                        className="h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white
                                   text-[12px] font-black uppercase tracking-widest hover:opacity-90
                                   transition-all flex items-center gap-2 shadow-lg
                                   shadow-[var(--color-primary)]/20">
                        <FontAwesomeIcon icon={faRotateRight} />
                        Coba Lagi
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)]
                                   text-[var(--color-text-muted)] text-[12px] font-black
                                   uppercase tracking-widest hover:text-[var(--color-text)]
                                   transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faHouse} />
                        Beranda
                    </button>
                </div>
            </div>
        )
    }
}

export default GlobalErrorBoundary