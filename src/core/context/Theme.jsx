import { createContext, useContext, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('laporanmu_theme')
        if (saved) return saved === 'dark'
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        const root = document.documentElement
        if (isDark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        localStorage.setItem('laporanmu_theme', isDark ? 'dark' : 'light')
    }, [isDark])

    const toggleTheme = () => {
        // Fallback untuk browser lawas yang belum support View Transitions (contoh: Firefox lama)
        if (!document.startViewTransition) {
            setIsDark(prev => !prev)
            return
        }

        // Browser modern: Snapshot UI dan lakukan transisi native di level GPU
        document.startViewTransition(() => {
            flushSync(() => {
                setIsDark(prev => !prev)
            })
        })
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
