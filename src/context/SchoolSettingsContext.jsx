import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Default values (fallback jika belum ada di DB) ───────────────────────────
export const DEFAULT_SETTINGS = {
    // Identitas sekolah
    school_name_id: 'Muhammadiyah Boarding School (MBS) Tanggul',
    school_name_ar: 'معهد محمدية الإسلامي تانجول',
    school_subtitle_ar: 'المجلس التعليمي للمرحلتين الابتدائية والمتوسطة التابع للرئاسة الفرعية للجمعية المحمدية',
    school_address: 'Jl. Pemandian no. 88 RT 002 RW 003 Patemon, Tanggul, Jember 68155',
    school_domain: 'smpmuh4tanggul.sch.id',
    app_domain: 'laporanmu.vercel.app',
    logo_url: '/src/assets/mbs.png',

    // Kepala sekolah / direktur
    headmaster_title_id: 'Pengasuh\nMuhammadiyah Boarding School Tanggul',
    headmaster_name_id: 'Ir. Muhammad Ali Maksum',
    headmaster_title_ar: 'مدير المعهد\nمعهد محمدية تانجول',
    headmaster_name_ar: 'المهندس محمد علي معصوم',

    // Warna raport
    report_color_primary: '#1a5c35',
    report_color_secondary: '#c8a400',

    // WhatsApp
    wa_footer: 'MBS Tanggul · Sistem Laporanmu',
}

const SchoolSettingsContext = createContext({
    settings: DEFAULT_SETTINGS,
    loading: true,
    saveSettings: async () => null,
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SchoolSettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)

    // Fetch saat mount
    useEffect(() => {
        const load = async () => {
            try {
                const { data, error } = await supabase
                    .from('school_settings')
                    .select('*')
                    .eq('id', 1)
                    .maybeSingle()
                if (!error && data) {
                    // Auto-upgrade legacy title to new multi-line format
                    if (data.headmaster_title_id === 'Direktur MBS Tanggul') {
                        data.headmaster_title_id = 'Pengasuh\nMuhammadiyah Boarding School Tanggul'
                    }
                    if (data.headmaster_title_ar === 'مدير معهد محمدية الإسلامي تانجول') {
                        data.headmaster_title_ar = 'مدير المعهد\nمعهد محمدية تانجول'
                    }
                    // Auto-upgrade name/title if it matches old default
                    if (data.headmaster_name_id === 'KH. Muhammad Ali Maksum, Lc') {
                        data.headmaster_name_id = 'Ir. Muhammad Ali Maksum'
                        data.headmaster_name_ar = 'المهندس محمد علي معصوم'
                    }
                    setSettings(prev => ({ ...prev, ...data }))
                }
            } catch {
                // Silent fail — pakai default
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // Save ke Supabase (upsert row id=1)
    const saveSettings = useCallback(async (updates) => {
        try {
            const { error } = await supabase
                .from('school_settings')
                .upsert(
                    { id: 1, ...updates, updated_at: new Date().toISOString() },
                    { onConflict: 'id' }
                )
            if (error) return error
            setSettings(prev => ({ ...prev, ...updates }))
            return null
        } catch (e) {
            return e
        }
    }, [])

    return (
        <SchoolSettingsContext.Provider value={{ settings, loading, saveSettings }}>
            {children}
        </SchoolSettingsContext.Provider>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSchoolSettings = () => useContext(SchoolSettingsContext)