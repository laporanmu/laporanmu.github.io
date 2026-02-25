import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faBell, faAnglesLeft, faAnglesRight, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useSidebar } from '../../context/SidebarContext'

export default function DashboardLayout({ children, title }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()
    const { profile } = useAuth()
    const { isDark, toggleTheme } = useTheme()
    const { isCollapsed, toggleSidebar } = useSidebar()

    const derivedTitle = title || (() => {
        if (location.pathname === '/dashboard') return 'Dashboard'
        const path = location.pathname.replace('/master/', '').replace('/', ' ')
        return path.charAt(0).toUpperCase() + path.slice(1)
    })()

    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return (
        <div className="min-h-screen bg-[var(--color-surface)] flex transition-colors">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-[var(--sidebar-width)] transition-all duration-300 relative">
                {/* Ambient Glows */}
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[var(--color-primary)]/5 rounded-full blur-[120px]" />
                </div>

                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)] transition-colors">
                    <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between">
                        {/* Left */}
                        <div className="flex items-center gap-3">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                                aria-label="Buka menu"
                            >
                                <FontAwesomeIcon icon={faBars} className="text-base" />
                            </button>

                            {/* Desktop Sidebar Toggle - NEW! */}
                            <button
                                onClick={toggleSidebar}
                                className="hidden lg:flex p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all group border border-transparent hover:border-[var(--color-border)]"
                                aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                                title={isCollapsed ? 'Perbesar Sidebar' : 'Perkecil Sidebar'}
                            >
                                <FontAwesomeIcon
                                    icon={isCollapsed ? faAnglesRight : faAnglesLeft}
                                    className="text-base group-hover:scale-110 transition-transform"
                                />
                            </button>

                            {/* Page Title */}
                            <div className="hidden sm:block">
                                <h2 className="text-lg font-bold font-heading text-[var(--color-text)] leading-none mb-1">
                                    {derivedTitle}
                                </h2>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">
                                    {today}
                                </p>
                            </div>
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Notifications */}
                            <button
                                className="relative p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all border border-transparent hover:border-[var(--color-border)]"
                                aria-label="Notifikasi"
                            >
                                <FontAwesomeIcon icon={faBell} className="text-base" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--color-surface)]" />
                            </button>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all border border-transparent hover:border-[var(--color-border)]"
                                aria-label="Ganti tema"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-base" />
                            </button>

                            {/* User Profile */}
                            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-[var(--color-border)]">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-[var(--color-primary)]/20">
                                    {profile?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold font-heading text-[var(--color-text)] truncate max-w-[140px] leading-tight mb-0.5">
                                        {profile?.name || 'User'}
                                    </span>
                                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-widest">
                                        {profile?.role || 'Staff'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 px-4 lg:px-6 py-6 lg:py-8 relative z-10 w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}