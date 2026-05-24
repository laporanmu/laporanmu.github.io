import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLogger'
import { useToast } from '../../../context/ToastContext'
import { useSchoolSettings } from '../../../context/SchoolSettingsContext'
import { useAuth } from '../../../context/AuthContext'
import { useFlag } from '../../../context/FeatureFlagsContext'
import { BULAN, KRITERIA } from '../utils/raportConstants'
import { isComplete } from '../utils/raportHelpers'
import { loadTranslitData } from '../utils/translitData'

const ROW_HEIGHT = 188
const OVERSCAN = 5

export function useRaportCore() {
    const { addToast } = useToast()
    const { settings } = useSchoolSettings()
    const { profile } = useAuth()
    const now = useRef(new Date()).current

    const ALLOWED_ROLES = ['admin', 'guru', 'developer']
    const isAllowed = profile ? ALLOWED_ROLES.includes(profile.role?.toLowerCase()) : null

    // access.teacher_raport flag — kalau off, guru jadi read-only
    const { enabled: teacherRaportEnabled } = useFlag('access.teacher_raport')
    const canEdit = profile?.role === 'guru' ? teacherRaportEnabled : true

    // ── Page-level state
    const [classesList, setClassesList] = useState([])
    const [pageLoading, setPageLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('all') // all, boarding, regular
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [stats, setStats] = useState({ totalKelas: 0, totalSiswa: 0, totalRaport: 0, bulanIni: now.getMonth() + 1 })
    const [classProgress, setClassProgress] = useState({})
    const [showAllIncompleteBanner, setShowAllIncompleteBanner] = useState(false)

    // ── Step state (0 = daftar kelas, 1 = setup, 2 = input, 3 = preview, 4 = arsip)
    const [step, setStep] = useState(0)

    // ── Setup state
    const [selectedClassId, setSelectedClassId] = useState('')
    const [homeroomTeacherName, setHomeroomTeacherName] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [musyrif, setMusyrif] = useState('')
    const [lang, setLang] = useState('ar')

    // ── Data state
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [transliterating, setTransliterating] = useState(false)
    const [scores, setScoresRaw] = useState({})
    
    // Undo history
    const scoresHistoryRef = useRef([])
    const scoresHistoryIdxRef = useRef(-1)

    const setScores = useCallback((updater) => {
        setScoresRaw(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            const hist = scoresHistoryRef.current
            const idx = scoresHistoryIdxRef.current
            const newHist = hist.slice(0, idx + 1)
            newHist.push(JSON.parse(JSON.stringify(next)))
            if (newHist.length > 30) newHist.shift()
            Promise.resolve().then(() => {
                scoresHistoryRef.current = newHist
                scoresHistoryIdxRef.current = newHist.length - 1
            })
            return next
        })
    }, [])

    const [extras, setExtras] = useState({})
    const [saving, setSaving] = useState({})
    const [savedIds, setSavedIds] = useState(new Set())
    const [existingReportIds, setExistingReportIds] = useState({})
    const [savingAll, setSavingAll] = useState(false)
    const [copyingLastMonth, setCopyingLastMonth] = useState(false)
    const [studentSearch, setStudentSearch] = useState('')
    const [draftAvailable, setDraftAvailable] = useState(false)
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
    const [newMonthBanner, setNewMonthBanner] = useState(null)
    const [prevMonthScores, setPrevMonthScores] = useState({})
    const [studentTrend, setStudentTrend] = useState({})
    const [catatanArabMap, setCatatanArabMap] = useState({})
    const [saveAllConfirm, setSaveAllConfirm] = useState(null)

    // Bulk & preview states
    const [bulkMode, setBulkMode] = useState(false)
    const [bulkSelected, setBulkSelected] = useState(new Set())
    const selectedStudentIds = useMemo(() => Array.from(bulkSelected), [bulkSelected])
    const [previewStudentId, setPreviewStudentId] = useState(null)

    // Print rendering queues (to render hidden cards in A4 layout for html2canvas capture)
    const [printQueue, setPrintQueue] = useState([])
    const [printRenderedCount, setPrintRenderedCount] = useState(0)

    // Other settings
    const [showNoPhoneOnly, setShowNoPhoneOnly] = useState(false)
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
    const [lastSession, setLastSession] = useState(() => {
        try {
            const raw = localStorage.getItem('raport_last_session')
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    })

    // Auto-save logic triggers
    const autoSaveTimers = useRef({})
    
    // Computed values
    const selectedClass = useMemo(() => classesList.find(c => c.id === selectedClassId), [classesList, selectedClassId])
    const bulanObj = useMemo(() => BULAN.find(b => b.id === selectedMonth), [selectedMonth])
    const completedCount = useMemo(() => students.filter(s => isComplete(scores[s.id] || {})).length, [students, scores])

    // ── Pre-load/Transliterate names ──
    const transliterateToArab = useCallback(async (name) => {
        const { KATA_ARAB: KA, ASMAUL_HUSNA: AH, DIGRAPH: DG, SINGLE: SG } = await loadTranslitData()
        const latinToArab = (word) => {
            let res = '', i = 0
            while (i < word.length) {
                const two = word.slice(i, i + 2).toLowerCase()
                const di = DG.find(([k]) => k === two)
                if (di) { res += di[1]; i += 2; continue }
                res += SG[word[i].toLowerCase()] || ''
                i++
            }
            return res
        }
        const words = name.toLowerCase().trim().split(/\s+/)
        const result = []
        for (const w of words) {
            if (KA[w]) { result.push(KA[w]); continue }
            const abdulMatch = w.match(/^ab[du]u?l?[-_]?(.+)$/) || w.match(/^abdi[-_]?(.+)$/)
            if (abdulMatch) {
                const suffix = abdulMatch[1]
                if (AH[suffix]) { result.push('عبد ' + AH[suffix]); continue }
                if (suffix === 'llah' || suffix === 'lah' || suffix === 'illah') { result.push('عبد الله'); continue }
            }
            if (w === 'bin' || w === 'ibn' || w === 'ibnu') { result.push('بن'); continue }
            if (w === 'binti' || w === 'bint') { result.push('بنت'); continue }
            if (w.endsWith('uddin') || w.endsWith('udin') || w.endsWith('addin') || w.endsWith('iddin')) {
                const base = w.replace(/(uddin|udin|addin|iddin)$/, '')
                if (KA[base]) { result.push(KA[base] + ' الدين'); continue }
            }
            if (w.startsWith('nur') || w.startsWith('noor')) {
                const suffix = w.replace(/^noo?r[-_]?/, '')
                const sufArab = KA[suffix] || AH[suffix]
                if (sufArab) { result.push('نور ' + sufArab.replace(/^ال/, '')); continue }
            }
            result.push(latinToArab(w))
        }
        return result.join(' ')
    }, [])

    const transliterateNames = useCallback(async (stuList) => {
        const needsTranslit = stuList.filter(s => !s.metadata?.nama_arab)
        if (!needsTranslit.length) return stuList
        const updated = [...stuList]
        const dbUpdates = []
        for (const s of needsTranslit) {
            const namaArab = await transliterateToArab(s.name)
            const newMeta = { ...(s.metadata || {}), nama_arab: namaArab }
            dbUpdates.push(supabase.from('students').update({ metadata: newMeta }).eq('id', s.id))
            const idx = updated.findIndex(x => x.id === s.id)
            if (idx !== -1) updated[idx] = { ...updated[idx], metadata: newMeta }
        }
        await Promise.allSettled(dbUpdates)
        return updated
    }, [transliterateToArab])

    // ── Load students ──
    const loadStudents = useCallback(async (overrideClassId, overrideMonth, overrideYear, overrideLang) => {
        const classId = overrideClassId ?? selectedClassId
        const month = overrideMonth ?? selectedMonth
        const year = overrideYear ?? selectedYear
        const useLang = overrideLang ?? lang
        if (!classId) return
        setLoading(true)
        try {
            const { data: stuData, error: stuErr } = await supabase.from('students').select('id, name, registration_code, photo_url, gender, phone, metadata').eq('class_id', classId).is('deleted_at', null).order('name')
            if (stuErr) throw stuErr
            const ids = (stuData || []).map(s => s.id)
            const prevM = month === 1 ? 12 : month - 1
            const prevY = month === 1 ? year - 1 : year
            const [{ data: repData }, { data: prevRepData }] = await Promise.all([
                supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', month).eq('year', year),
                supabase.from('student_monthly_reports').select('student_id,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa').in('student_id', ids).eq('month', prevM).eq('year', prevY),
            ])
            setTimeout(() => {
                const trendMonths = []
                for (let i = 5; i >= 0; i--) {
                    let m = month - i, y = year
                    if (m <= 0) { m += 12; y -= 1 }
                    trendMonths.push({ m, y })
                }
                supabase.from('student_monthly_reports')
                    .select('student_id,month,year,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa')
                    .in('student_id', ids)
                    .or(trendMonths.map(t => `and(month.eq.${t.m},year.eq.${t.y})`).join(','))
                    .order('year').order('month')
                    .then(({ data: trendData }) => {
                        const trendMap = {}
                        for (const r of (trendData || [])) {
                            if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                            trendMap[r.student_id].push({ month: r.month, year: r.year, scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa } })
                        }
                        setStudentTrend(trendMap)
                    })
            }, 0)
            const prevScoreMap = {}
            for (const r of (prevRepData || [])) {
                prevScoreMap[r.student_id] = { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
            }
            setPrevMonthScores(prevScoreMap)
            const initScores = {}, initExtras = {}, initExisting = {}
            const initSavedIds = new Set()
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                initScores[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                initExtras[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
                if (rep) { initExisting[s.id] = rep.id; initSavedIds.add(s.id) }
            }
            let finalStudents = stuData || []
            if (useLang === 'ar') {
                const needs = finalStudents.filter(s => !s.metadata?.nama_arab)
                if (needs.length) {
                    setTransliterating(true)
                    try { finalStudents = await transliterateNames(finalStudents) }
                    finally { setTransliterating(false) }
                }
            }
            scoresHistoryRef.current = [JSON.parse(JSON.stringify(initScores))]
            scoresHistoryIdxRef.current = 0
            setShowNoPhoneOnly(false)
            setShowIncompleteOnly(false)
            setStudents(finalStudents); setScoresRaw(initScores); setExtras(initExtras); setExistingReportIds(initExisting)
            setSavedIds(initSavedIds)
            try {
                const session = { classId, month, year, useLang, className: classesList.find(c => c.id === classId)?.name || '' }
                localStorage.setItem('raport_last_session', JSON.stringify(session))
                setLastSession(session)
            } catch { }
            return true
        } catch (e) { addToast('Gagal memuat siswa: ' + e.message, 'error'); console.error('loadStudents error:', e); return false }
        finally { setLoading(false) }
    }, [selectedClassId, selectedMonth, selectedYear, lang, transliterateNames, addToast, classesList])

    // ── Load offline draft ──
    const loadDraft = useCallback(() => {
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try {
            const raw = localStorage.getItem(key)
            if (!raw) return
            const { scores: dScores, extras: dExtras, savedAt } = JSON.parse(raw)
            setScores(dScores)
            setExtras(dExtras)
            setSavedIds(prev => {
                const next = new Set(prev)
                Object.keys(dScores || {}).forEach(id => next.delete(id))
                return next
            })
            const mins = Math.round((Date.now() - savedAt) / 60000)
            addToast(`Draft dimuat (disimpan ${mins < 1 ? 'baru saja' : mins + ' menit lalu'})`, 'success')
        } catch (e) { addToast('Gagal memuat draft', 'error'); console.error('loadDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, addToast, setScores, setExtras])

    const clearDraft = useCallback(() => {
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try { localStorage.removeItem(key); setDraftAvailable(false); addToast('Draft dihapus', 'success') }
        catch (e) { console.error('clearDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, addToast])

    // ── Save single ──
    const saveStudent = useCallback(async (studentId) => {
        const sc = scores[studentId], ex = extras[studentId] ?? {}
        if (!sc) return
        setSaving(prev => ({ ...prev, [studentId]: true }))
        try {
            const payload = { student_id: studentId, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, updated_by: profile?.id ?? null, updated_by_name: profile?.name ?? null, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null }
            const existingId = existingReportIds[studentId]
            let error
            if (existingId) { ; ({ error } = await supabase.from('student_monthly_reports').update(payload).eq('id', existingId)) }
            else { const { data, error: upsErr } = await supabase.from('student_monthly_reports').upsert(payload, { onConflict: 'student_id,month,year' }).select('id').single(); error = upsErr; if (!upsErr && data) setExistingReportIds(prev => ({ ...prev, [studentId]: data.id })) }
            if (error) throw error
            setSavedIds(prev => new Set([...prev, studentId]))
            await logAudit({
                action: existingId ? 'UPDATE' : 'INSERT',
                source: 'OPERATIONAL',
                tableName: 'student_monthly_reports',
                recordId: existingId || null,
                newData: payload,
            })
        } catch (e) { addToast(`Gagal menyimpan: ${e.message}`, 'error'); console.error('saveStudent error:', e) }
        finally { setSaving(prev => ({ ...prev, [studentId]: false })) }
    }, [scores, extras, selectedMonth, selectedYear, musyrif, existingReportIds, addToast, profile])

    // ── Reset student ──
    const resetStudent = useCallback(async (studentId) => {
        if (autoSaveTimers.current[studentId]) {
            clearTimeout(autoSaveTimers.current[studentId])
            delete autoSaveTimers.current[studentId]
        }
        setScores(prev => ({ ...prev, [studentId]: { nilai_akhlak: '', nilai_ibadah: '', nilai_kebersihan: '', nilai_quran: '', nilai_bahasa: '' } }))
        setExtras(prev => ({ ...prev, [studentId]: { berat_badan: '', tinggi_badan: '', ziyadah: '', murojaah: '', hari_sakit: '', hari_izin: '', hari_alpa: '', hari_pulang: '', catatan: '' } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })

        const existingId = existingReportIds[studentId]
        if (!existingId) return
        try {
            const { error } = await supabase.from('student_monthly_reports').delete().eq('id', existingId)
            if (error) throw error
            setExistingReportIds(prev => { const n = { ...prev }; delete n[studentId]; return n })
            const studentName = students.find(s => s.id === studentId)?.name
            addToast(`Data ${studentName?.split(' ')[0] ?? ''} berhasil direset`, 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'student_monthly_reports', recordId: existingId,
                oldData: { student_id: studentId, student_name: studentName, month: selectedMonth, year: selectedYear }
            })
        } catch (e) {
            addToast(`Gagal hapus dari DB: ${e.message}`, 'error')
            console.error('resetStudent error:', e)
        }
    }, [existingReportIds, students, addToast, setScores, selectedMonth, selectedYear])

    // ── Save all ──
    const _doSaveAll = useCallback(async () => {
        setSaveAllConfirm(null)
        setSavingAll(true)
        try {
            const hasAnyData = (sc, ex) =>
                KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                ].some(v => v !== '' && v !== null && v !== undefined)

            const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
            if (!studentsToSave.length) {
                addToast('Belum ada data yang diisi untuk disimpan', 'warning')
                return
            }

            const payloads = studentsToSave.map(s => { const sc = scores[s.id] || {}, ex = extras[s.id] || {}; return { student_id: s.id, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, updated_by: profile?.id ?? null, updated_by_name: profile?.name ?? null, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null } })
            const { data: upserted, error } = await supabase
                .from('student_monthly_reports')
                .upsert(payloads, { onConflict: 'student_id,month,year' })
                .select('id, student_id')
            if (error) throw error
            if (upserted?.length) {
                setExistingReportIds(prev => {
                    const next = { ...prev }
                    for (const r of upserted) next[r.student_id] = r.id
                    return next
                })
            }
            setSavedIds(prev => {
                const next = new Set(prev)
                studentsToSave.forEach(s => next.add(s.id))
                return next
            })
            const skipped = students.length - studentsToSave.length
            addToast(
                skipped > 0
                    ? `${studentsToSave.length} raport disimpan (${skipped} santri dilewati karena belum diisi)`
                    : `${studentsToSave.length} raport berhasil disimpan`,
                'success'
            )
            try { const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`; localStorage.removeItem(key); setDraftAvailable(false) } catch { }

            logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { bulk_save_all: true, count: studentsToSave.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
            })
        } catch (e) { addToast(`Gagal menyimpan semua: ${e.message}`, 'error'); console.error('_doSaveAll error:', e) }
        finally { setSavingAll(false) }
    }, [students, scores, extras, selectedMonth, selectedYear, musyrif, selectedClassId, addToast, selectedClass])

    const saveAll = useCallback(async () => {
        const hasAnyData = (sc, ex) =>
            KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
            [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
            ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
            ].some(v => v !== '' && v !== null && v !== undefined)

        const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
        if (!studentsToSave.length) {
            addToast('Belum ada data yang diisi untuk disimpan', 'warning')
            return
        }
        const incomplete = students.filter(s => !isComplete(scores[s.id] || {}))
        if (incomplete.length > 0) {
            setSaveAllConfirm({ completedCount: completedCount, totalCount: students.length, incompleteCount: incomplete.length })
            return
        }
        await _doSaveAll()
    }, [students, scores, extras, completedCount, addToast, _doSaveAll])

    // ── Copy from last month ──
    const copyFromLastMonth = useCallback(async () => {
        if (!selectedClassId || !students.length) return
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
        setCopyingLastMonth(true)
        try {
            const ids = students.map(s => s.id)
            const { data } = await supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', prevMonth).eq('year', prevYear)
            if (!data?.length) { addToast('Tidak ada data bulan lalu', 'warning'); return }
            const toCopy = data.filter(rep => {
                const cur = scores[rep.student_id] || {}
                return KRITERIA.every(k => cur[k.key] === '' || cur[k.key] === null || cur[k.key] === undefined)
            })
            const copied = toCopy.length
            setScores(prev => { const next = { ...prev }; for (const rep of toCopy) { next[rep.student_id] = { nilai_akhlak: rep.nilai_akhlak ?? '', nilai_ibadah: rep.nilai_ibadah ?? '', nilai_kebersihan: rep.nilai_kebersihan ?? '', nilai_quran: rep.nilai_quran ?? '', nilai_bahasa: rep.nilai_bahasa ?? '' } }; return next })
            setExtras(prev => { const next = { ...prev }; for (const rep of data) { const cur = next[rep.student_id] || {}; if (!cur.berat_badan && !cur.tinggi_badan) next[rep.student_id] = { ...cur, berat_badan: rep.berat_badan ?? '', tinggi_badan: rep.tinggi_badan ?? '' } }; return next })
            const copiedIds = new Set(data.map(rep => rep.student_id))
            setSavedIds(prev => { const next = new Set(prev); for (const id of copiedIds) next.delete(id); return next })
            addToast(`Disalin dari ${BULAN.find(b => b.id === prevMonth)?.id_str} ${prevYear} — ${copied} santri`, 'success')
        } catch (e) { addToast('Gagal menyalin data bulan lalu', 'error'); console.error('copyFromLastMonth error:', e) }
        finally { setCopyingLastMonth(false) }
    }, [selectedClassId, students, selectedMonth, selectedYear, scores, addToast, setScores])

    return {
        // States & refs
        addToast, settings, profile, now, isAllowed, canEdit,
        classesList, setClassesList, pageLoading, setPageLoading,
        searchQuery, setSearchQuery, filterType, setFilterType,
        isFilterOpen, setIsFilterOpen, stats, setStats,
        classProgress, setClassProgress, showAllIncompleteBanner, setShowAllIncompleteBanner,
        step, setStep, selectedClassId, setSelectedClassId,
        homeroomTeacherName, setHomeroomTeacherName, selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear, musyrif, setMusyrif, lang, setLang,
        students, setStudents, loading, setLoading,
        transliterating, setTransliterating, scores, setScores, setScoresRaw,
        scoresHistoryRef, scoresHistoryIdxRef, extras, setExtras,
        saving, setSaving, savedIds, setSavedIds,
        existingReportIds, setExistingReportIds, savingAll, setSavingAll,
        copyingLastMonth, setCopyingLastMonth, studentSearch, setStudentSearch,
        draftAvailable, setDraftAvailable, isOnline, setIsOnline,
        newMonthBanner, setNewMonthBanner, prevMonthScores, setPrevMonthScores,
        studentTrend, setStudentTrend, catatanArabMap, setCatatanArabMap,
        saveAllConfirm, setSaveAllConfirm, showNoPhoneOnly, setShowNoPhoneOnly,
        showIncompleteOnly, setShowIncompleteOnly, lastSession, setLastSession,
        autoSaveTimers, completedCount, selectedClass, bulanObj,
        bulkMode, setBulkMode, bulkSelected, setBulkSelected, selectedStudentIds,
        previewStudentId, setPreviewStudentId, printQueue, setPrintQueue,
        printRenderedCount, setPrintRenderedCount,
        // Helper actions
        transliterateToArab, transliterateNames, loadStudents,
        loadDraft, clearDraft, saveStudent, resetStudent, saveAll, _doSaveAll, copyFromLastMonth
    }
}
