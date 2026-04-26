import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useSessionGuard } from '../../hooks/useSessionGuard'
import BottomNav from "./BottomNav"
import TopNav from './TopNav'

export default function DashboardLayout({ children, title }) {
    useSessionGuard(15000)

    return (
        <div className="min-h-screen bg-[var(--color-app-bg)] transition-colors" translate="no">
            {/* Mobile */}
            <BottomNav />

            {/* Desktop header */}
            <TopNav title={"Laporanmu"} />

            {/* Optional: ambient glows (boleh keep, tapi jangan absolute di dalam shell) */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-[var(--color-primary)]/5 rounded-full blur-[120px]" />
                <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] bg-[var(--color-accent)]/5 rounded-full blur-[120px]" />
            </div>

            {/* Page Content */}
            {/* Page Content */}
            <main className="relative z-10 mx-auto w-full max-w-[1800px] px-3 sm:px-4 lg:px-6 py-6 lg:py-8 pb-24 lg:pb-8">
                {/* Konten lebih lebar untuk mendukung monitor besar & kepadatan data tinggi */}
                <div className="mx-auto w-full max-w-none">
                    {children}
                </div>
            </main>
        </div>
    )
}