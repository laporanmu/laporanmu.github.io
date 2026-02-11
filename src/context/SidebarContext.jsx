import { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext()

export function SidebarProvider({ children }) {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Load from localStorage
        const saved = localStorage.getItem('sidebar_collapsed')
        return saved ? JSON.parse(saved) : false
    })

    useEffect(() => {
        // Save to localStorage whenever it changes
        localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed))

        // Update CSS variable for sidebar width
        document.documentElement.style.setProperty(
            '--sidebar-width',
            isCollapsed ? '70px' : '240px'
        )
    }, [isCollapsed])

    const toggleSidebar = () => {
        setIsCollapsed(prev => !prev)
    }

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider')
    }
    return context
}