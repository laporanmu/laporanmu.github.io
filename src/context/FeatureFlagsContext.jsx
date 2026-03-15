import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Context ──────────────────────────────────────────────────────────────────

const FeatureFlagsContext = createContext({
    flags: {},
    loading: true,
    refresh: () => { },
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FeatureFlagsProvider({ children }) {
    const [flags, setFlags] = useState({})
    const [loading, setLoading] = useState(true)

    const fetchFlags = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('key, enabled')
            if (error) throw error
            // Convert array → { 'module.absensi': true, 'nav.raport': false, ... }
            const map = {}
                ; (data || []).forEach(f => { map[f.key] = f.enabled })
            setFlags(map)
        } catch (e) {
            console.error('[FeatureFlags] Gagal load flags:', e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchFlags()

        // Realtime subscription — update flags instantly when changed in admin panel
        const channel = supabase
            .channel('feature_flags_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'feature_flags',
            }, (payload) => {
                if (payload.new?.key) {
                    setFlags(prev => ({ ...prev, [payload.new.key]: payload.new.enabled }))
                }
            })
            .subscribe()

        // Polling fallback setiap 5 detik — jalan terus sebagai backup realtime
        const pollInterval = setInterval(fetchFlags, 5000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(pollInterval)
        }
    }, [fetchFlags])

    return (
        <FeatureFlagsContext.Provider value={{ flags, loading, refresh: fetchFlags }}>
            {children}
        </FeatureFlagsContext.Provider>
    )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Semua flags sekaligus */
export function useFeatureFlags() {
    return useContext(FeatureFlagsContext)
}

/** Cek satu flag: useFlag('module.absensi') → true/false */
export function useFlag(key) {
    const { flags, loading } = useContext(FeatureFlagsContext)
    return { enabled: flags[key] ?? true, loading }
    // default true — kalau flag belum load, anggap aktif (fail open)
}