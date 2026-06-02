import { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext()

export function SidebarProvider({ children }) {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed')
        // default: true (icon-only rail)
        return saved ? JSON.parse(saved) : true
    })

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed))
        document.documentElement.style.setProperty(
            '--sidebar-width',
            isCollapsed ? '72px' : '240px'
        )
    }, [isCollapsed])

    const toggleSidebar = () => setIsCollapsed((prev) => !prev)

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    return useContext(SidebarContext)
}