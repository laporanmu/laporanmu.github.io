/**
 * useAbsensiRaport.js
 *
 * Hook untuk auto-fill field absensi di form student_monthly_reports
 * dari data attendance_weekly yang sudah diakumulasi via v_attendance_monthly.
 *
 * ─── CARA PAKAI di form raport ────────────────────────────────────────────────
 *
 *   import { useAbsensiRaport } from '../hooks/useAbsensiRaport'
 *
 *   // Di dalam komponen form raport:
 *   const { rekap, loading: loadingRekap } = useAbsensiRaport(studentId, year, month)
 *
 *   useEffect(() => {
 *     if (rekap) {
 *       setForm(prev => ({
 *         ...prev,
 *         hari_sakit:  rekap.total_sakit,
 *         hari_izin:   rekap.total_izin,
 *         hari_alpa:   rekap.total_alpa,
 *         hari_pulang: rekap.total_pulang,
 *       }))
 *     }
 *   }, [rekap])
 *
 *   // Tampilkan indikator di form:
 *   {loadingRekap && <span>Memuat data absensi...</span>}
 *   {rekap && <span className="text-xs text-emerald-500">✓ Diisi otomatis dari Absensi Bulanan</span>}
 *   {!loadingRekap && !rekap && <span className="text-xs text-amber-500">Belum ada rekap absensi bulan ini</span>}
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Ambil rekap absensi bulanan untuk 1 siswa.
 *
 * @param {string|null} studentId  - students.id
 * @param {number}      year       - contoh: 2025
 * @param {number}      month      - 1–12
 *
 * @returns {{ rekap: object|null, loading: boolean }}
 *   rekap = { total_hadir, total_sakit, total_izin, total_alpa, total_pulang }
 */
export function useAbsensiRaport(studentId, year, month) {
    const [rekap, setRekap] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!studentId || !year || !month) { setRekap(null); return }
        let cancelled = false

        async function fetch() {
            setLoading(true)
            const { data, error } = await supabase
                .from('v_attendance_monthly')
                .select('total_hadir, total_sakit, total_izin, total_alpa, total_pulang')
                .eq('student_id', studentId)
                .eq('year', year)
                .eq('month', month)
                .maybeSingle()

            if (!cancelled) {
                setRekap(error ? null : data)
                setLoading(false)
            }
        }

        fetch()
        return () => { cancelled = true }
    }, [studentId, year, month])

    return { rekap, loading }
}

/**
 * Batch version: ambil rekap semua siswa dalam 1 kelas sekaligus.
 * Cocok untuk halaman daftar raport per kelas.
 *
 * @returns {{ rekapMap: Object.<string, object>, loading: boolean }}
 *   rekapMap = { [student_id]: { total_sakit, total_izin, total_alpa, total_pulang } }
 */
export function useAbsensiRaportBatch(classId, year, month) {
    const [rekapMap, setRekapMap] = useState({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!classId || !year || !month) { setRekapMap({}); return }
        let cancelled = false

        async function fetch() {
            setLoading(true)
            const { data, error } = await supabase
                .from('v_attendance_monthly')
                .select('student_id, total_hadir, total_sakit, total_izin, total_alpa, total_pulang')
                .eq('class_id', classId)
                .eq('year', year)
                .eq('month', month)

            if (!cancelled) {
                if (!error && data) {
                    const map = {}
                    for (const r of data) map[r.student_id] = r
                    setRekapMap(map)
                }
                setLoading(false)
            }
        }

        fetch()
        return () => { cancelled = true }
    }, [classId, year, month])

    return { rekapMap, loading }
}