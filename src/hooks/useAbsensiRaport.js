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
                .from('v_student_attendance')
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
                .from('v_student_attendance')
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