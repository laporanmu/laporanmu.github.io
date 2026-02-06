import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faBell, faSearch } from '@fortawesome/free-solid-svg-icons'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children, title }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="min-h-screen bg-[var(--color-surface-alt)]">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="lg:ml-[var(--sidebar-width)]">
                {/* Top Bar */}
                <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] 
          flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
                    {/* Left */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                            <FontAwesomeIcon icon={faBars} className="text-lg" />
                        </button>
                        <h2 className="text-lg font-semibold">{title || 'Dashboard'}</h2>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3">
                        {/* Search (Desktop) */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-alt)] 
              rounded-lg border border-[var(--color-border)]">
                            <FontAwesomeIcon icon={faSearch} className="text-[var(--color-text-muted)] text-sm" />
                            <input
                                type="text"
                                placeholder="Cari... (Ctrl+K)"
                                className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-[var(--color-text-muted)]"
                            />
                        </div>

                        {/* Notifications */}
                        <button className="relative p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                            <FontAwesomeIcon icon={faBell} className="text-lg" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
