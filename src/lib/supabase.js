import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isDemoMode = !supabaseUrl || !supabaseAnonKey

if (isDemoMode) {
    console.warn('[Laporanmu] Supabase env tidak ditemukan — berjalan dalam Demo Mode.')
    console.info('[Laporanmu] Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY untuk koneksi real.')
}

// Kalau demo mode, buat proxy object yang throw error yang jelas
// Daripada "Cannot read properties of null"
const demoGuard = new Proxy({}, {
    get(_, prop) {
        throw new Error(
            `[Demo Mode] Supabase tidak tersedia. Akses property "${String(prop)}" diblokir.\n` +
            `Pastikan komponen ini mengecek isDemoMode sebelum memanggil supabase.`
        )
    }
})

export const supabase = isDemoMode
    ? demoGuard
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        }
    })