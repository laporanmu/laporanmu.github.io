import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'

const AuthContext = createContext({})

// ─── Role Hierarchy: developer > admin > guru = satpam > viewer ───────────────
const DEMO_USERS = {
    developer: { id: 'demo-dev', email: 'dev@laporanmu.id', role: 'developer', name: 'Developer' },
    admin: { id: 'demo-admin', email: 'admin@laporanmu.id', role: 'admin', name: 'Administrator' },
    guru: { id: 'demo-guru', email: 'guru@laporanmu.id', role: 'guru', name: 'Budi Santoso' },
    satpam: { id: 'demo-satpam', email: 'satpam@laporanmu.id', role: 'satpam', name: 'Penjaga Gerbang' },
    viewer: { id: 'demo-viewer', email: 'viewer@laporanmu.id', role: 'viewer', name: 'Demo Viewer' },
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isDemoMode) {
            // Check localStorage or sessionStorage for demo session
            const demoSession = localStorage.getItem('laporanmu_demo_session') || sessionStorage.getItem('laporanmu_demo_session')
            if (demoSession) {
                const parsed = JSON.parse(demoSession)
                setUser(parsed)
                setProfile(parsed)
            }
            setLoading(false)
            return
        }

        // Real Supabase auth
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setLoading(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    async function fetchProfile(userId) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        setProfile(data)
        setLoading(false)
    }

    /** Patch profile state langsung tanpa fetch ulang — untuk update instan di UI (navbar, dll) */
    function updateProfile(patch) {
        setProfile(prev => prev ? { ...prev, ...patch } : prev)
    }

    /** Fetch ulang profile dari Supabase — untuk hard sync setelah perubahan */
    async function refreshProfile() {
        if (!user?.id || isDemoMode) return
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        if (data) setProfile(data)
    }

    async function signIn(email, password, rememberMe = false) {
        if (isDemoMode) {
            // Demo login
            const demoUser = Object.values(DEMO_USERS).find(u => u.email === email)
            if (demoUser && password === 'demo123') {
                setUser(demoUser)
                setProfile(demoUser)
                const storage = rememberMe ? localStorage : sessionStorage
                storage.setItem('laporanmu_demo_session', JSON.stringify(demoUser))
                return { error: null }
            }
            return { error: { message: 'Email atau password salah' } }
        }

        // For real Supabase auth, session persistence is configured at client level,
        // but passing rememberMe here is a good placeholder if we want to implement 
        // custom token storage logic later.
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }

    async function signOut() {
        if (isDemoMode) {
            setUser(null)
            setProfile(null)
            localStorage.removeItem('laporanmu_demo_session')
            sessionStorage.removeItem('laporanmu_demo_session')
            return
        }
        await supabase.auth.signOut()
    }

    // ─── Role Helpers ─────────────────────────────────────────────────────────
    // Hierarchy order: developer(4) > admin(3) > guru=satpam(2) > viewer(1)
    const ROLE_LEVEL = { developer: 4, admin: 3, guru: 2, satpam: 2, viewer: 1 }

    /** Check if current user has one of the given roles */
    const hasRole = (...roles) => roles.includes(profile?.role?.toLowerCase())

    /** Check if current user's level is >= the given role's level */
    const isAtLeast = (minRole) => {
        const userLevel = ROLE_LEVEL[profile?.role?.toLowerCase()] ?? 0
        const minLevel = ROLE_LEVEL[minRole?.toLowerCase()] ?? 99
        return userLevel >= minLevel
    }

    const value = {
        user,
        profile,
        loading,
        signIn,
        signOut,
        isDemoMode,

        // Profile helpers
        updateProfile,
        refreshProfile,

        // Permission helpers
        hasRole,
        isAtLeast,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}