import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'

const AuthContext = createContext({})

// Demo user for testing without Supabase
const DEMO_USERS = {
    admin: { id: 'demo-admin', email: 'admin@laporanmu.id', role: 'admin', name: 'Administrator' },
    guru: { id: 'demo-guru', email: 'guru@laporanmu.id', role: 'guru', name: 'Budi Santoso' },
    pengurus: { id: 'demo-pengurus', email: 'pengurus@laporanmu.id', role: 'pengurus', name: 'Osis' },
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isDemoMode) {
            // Check localStorage for demo session
            const demoSession = localStorage.getItem('laporanmu_demo_session')
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

    async function signIn(email, password) {
        if (isDemoMode) {
            // Demo login
            const demoUser = Object.values(DEMO_USERS).find(u => u.email === email)
            if (demoUser && password === 'demo123') {
                setUser(demoUser)
                setProfile(demoUser)
                localStorage.setItem('laporanmu_demo_session', JSON.stringify(demoUser))
                return { error: null }
            }
            return { error: { message: 'Email atau password salah' } }
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }

    async function signOut() {
        if (isDemoMode) {
            setUser(null)
            setProfile(null)
            localStorage.removeItem('laporanmu_demo_session')
            return
        }
        await supabase.auth.signOut()
    }

    const value = {
        user,
        profile,
        loading,
        signIn,
        signOut,
        isDemoMode,
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
