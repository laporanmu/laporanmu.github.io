import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faBell, faAnglesLeft, faAnglesRight } from '@fortawesome/free-solid-svg-icons'
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-[var(--sidebar-width)] transition-all duration-300">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                    <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between">
                        {/* Left */}
                        <div className="flex items-center gap-3">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                                aria-label="Buka menu"
                            >
                                <FontAwesomeIcon icon={faBars} className="text-base" />
                            </button>

                            {/* Desktop Sidebar Toggle - NEW! */}
                            <button
                                onClick={toggleSidebar}
                                className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-all group"
                                aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                                title={isCollapsed ? 'Perbesar Sidebar' : 'Perkecil Sidebar'}
                            >
                                <FontAwesomeIcon
                                    icon={isCollapsed ? faAnglesRight : faAnglesLeft}
                                    className="text-base group-hover:scale-110 transition-transform"
                                />
                            </button>

                            {/* Page Title */}
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none">
                                    {derivedTitle}
                                </h2>
                                <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                    {today}
                                </p>
                            </div>
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Notifications */}
                            <button
                                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                                aria-label="Notifikasi"
                            >
                                <FontAwesomeIcon icon={faBell} className="text-base" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900" />
                            </button>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors"
                                aria-label="Ganti tema"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-base" />
                            </button>

                            {/* User Profile */}
                            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-gray-800">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                                    {profile?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[140px] leading-tight">
                                        {profile?.name || 'User'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize font-bold tracking-tight">
                                        {profile?.role || 'Staff'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 px-4 lg:px-6 py-4">
                    {children}
                </main>
            </div>
        </div>
    )
}