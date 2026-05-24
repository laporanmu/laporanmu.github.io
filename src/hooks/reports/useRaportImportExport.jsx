import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import { BULAN, KRITERIA, STORAGE_BUCKET, GRADE, calcAvg } from '../../utils/reports/raportConstants'
import { buildWaLines, escapeCsvCell } from '../../utils/reports/raportHelpers'

// Helper withTimeout agar html2canvas tidak hang selamanya
const withTimeout = (promise, ms, label = 'Operasi') =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout setelah ${ms / 1000}s`)), ms)),
    ])

export function useRaportImportExport(core, { printContainerRef, silentPrintRef }) {
    const {
        addToast,
        selectedClass,
        selectedMonth,
        selectedYear,
        musyrif,
        students,
        scores,
        extras,
        setPreviewStudentId,
        setPrintQueue,
        setPrintRenderedCount,
        selectedStudentIds,
        bulanObj,
        settings
    } = core

    // ── Local states ──
    const [raportLinks, setRaportLinks] = useState({}) // cache PDF links to avoid double uploading
    const [sendingWA, setSendingWA] = useState({}) // studentId -> 'generating' | 'uploading' | 'done' | null
    const [waBlastConfirm, setWaBlastConfirm] = useState(null)
    const [waBlast, setWaBlast] = useState(null) // { queue, idx, done, failed, active }
    const [zipBlast, setZipBlast] = useState(null) // { queue, idx, done, failed, total, active }
    const [exporting, setExporting] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    // Abort controllers
    const waBlastAbortRef = useRef(false)
    const zipAbortRef = useRef(false)

    // ── Fonnte API helper ──
    const fonnteToken = import.meta.env.VITE_FONNTE_TOKEN || ''

    // Kirim pesan teks via Fonnte
    const sendFonnteMessage = useCallback(async (target, message) => {
        if (!fonnteToken) return false
        try {
            const params = new URLSearchParams()
            params.append('target', target)
            params.append('message', message)
            const res = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: { 'Authorization': fonnteToken },
                body: params
            })
            const data = await res.json()
            return data.status === true
        } catch (err) {
            console.error('[Fonnte] Error sending text:', err)
            return false
        }
    }, [fonnteToken])

    // Kirim file PDF via Fonnte menggunakan URL publik Supabase
    // Wajib menggunakan FormData agar Fonnte dapat memproses URL file dengan benar
    const sendFonnteFile = useCallback(async (target, pdfUrl, filename) => {
        if (!fonnteToken || !pdfUrl) return false
        try {
            const formData = new FormData()
            formData.append('target', target)
            formData.append('url', pdfUrl)
            formData.append('message', filename || 'Raport PDF')
            formData.append('filename', filename || 'raport.pdf')
            const res = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: { 'Authorization': fonnteToken },
                body: formData
            })
            const data = await res.json()
            console.log('[Fonnte] File send response:', data)
            return data.status === true
        } catch (err) {
            console.error('[Fonnte] Error sending file:', err)
            return false
        }
    }, [fonnteToken])

    // ── WhatsApp message builder (returns raw text) ──
    const buildWaMessage = useCallback((student, pdfUrl = null) => {
        const lines = buildWaLines({
            student,
            sc: scores[student.id] || {},
            extras: extras[student.id],
            bulanObj,
            selectedYear,
            selectedClass,
            musyrif,
            pdfUrl,
            waFooter: settings.wa_footer,
        })
        return lines.join('\n')
    }, [scores, extras, bulanObj, selectedYear, selectedClass, musyrif, settings])

    // ── Send text only ──
    const sendWATextOnly = useCallback(async (student) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
        const message = buildWaMessage(student)

        // Try Fonnte first
        const sent = await sendFonnteMessage(phone, message)
        if (sent) {
            addToast(`✅ WA terkirim ke wali ${student.name.split(' ')[0]}`, 'success')
        } else {
            // Fallback to wa.me
            const tab = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
            if (!tab) addToast('Popup diblokir.', 'warning')
            else addToast(`📲 WA dibuka untuk ${student.name.split(' ')[0]}`, 'info')
        }
    }, [buildWaMessage, sendFonnteMessage, addToast])

    // ── Generate PDF Blob ──
    const generatePDFBlob = useCallback(async (student, contextOverride = {}) => {
        await Promise.all([
            new Promise((res, rej) => { if (window.html2canvas) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
            new Promise((res, rej) => { if (window.jspdf?.jsPDF || window.jsPDF) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
        ])
        const activeBulanObj = contextOverride.bulanObj ?? bulanObj
        const activeYear = contextOverride.year ?? selectedYear
        const bulanStr = activeBulanObj?.id_str || String(contextOverride.month ?? selectedMonth)
        const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        const filename = `${safeName}_${bulanStr}_${activeYear}.pdf`

        let cardEl = document.querySelector(`.raport-card[data-student-id="${student.id}"]`)
        if (!cardEl) {
            if (silentPrintRef) silentPrintRef.current = true // jangan buka tab print
            setPrintRenderedCount(0); setPrintQueue([student.id])
            await new Promise(resolve => {
                let t = 0
                const timer = setInterval(() => {
                    const card = printContainerRef.current?.querySelector(`.raport-card[data-student-id="${student.id}"]`)
                    if (card) { cardEl = card; clearInterval(timer); resolve() }
                    if (++t > 50) { clearInterval(timer); resolve() }
                }, 100)
            })
            setPrintQueue([]); setPrintRenderedCount(0)
            if (silentPrintRef) silentPrintRef.current = false // reset flag
        }
        if (!cardEl) throw new Error('Gagal render raport card')
        const rootStyles = getComputedStyle(document.documentElement)
        const cssVars = ['--color-border', '--color-surface', '--color-surface-alt', '--color-text', '--color-text-muted'].map(v => `${v}: ${rootStyles.getPropertyValue(v).trim() || '#ccc'};`).join(' ')
        const A4W = 794, A4H = 1123, wrapper = document.createElement('div')
        wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4W}px;height:${A4H}px;background:white;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;font-family:'Times New Roman',serif;`
        wrapper.innerHTML = `<style>:root{${cssVars}}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important}img{mix-blend-mode:multiply}.raport-card{width:${A4W}px!important;min-width:${A4W}px!important;height:${A4H}px!important;overflow:hidden!important;background:white!important;margin:0!important}</style>${cardEl.outerHTML}`
        document.body.appendChild(wrapper)
        await new Promise(r => setTimeout(r, 700))
        try {
            const canvas = await withTimeout(
                window.html2canvas(wrapper, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: A4W, height: A4H, scrollX: 0, scrollY: 0, logging: false }),
                15000,
                'Render PDF'
            )
            const jsPDF = window.jspdf?.jsPDF || window.jsPDF
            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
            const blob = pdf.output('blob')
            if (!blob || blob.size < 5000) throw new Error('PDF terlalu kecil')
            return { blob, filename }
        } finally {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
        }
    }, [bulanObj, selectedMonth, selectedYear, printContainerRef, setPrintQueue, setPrintRenderedCount])

    // ── Upload to Supabase ──
    const uploadToSupabase = useCallback(async (blob, filename) => {
        const path = `${selectedYear}/${bulanObj?.id_str || selectedMonth}/${filename}`
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: 'application/pdf', upsert: true })
        if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`)
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
        return data.publicUrl
    }, [selectedYear, bulanObj, selectedMonth])

    // ── Generate and send WA ──
    const generateAndSendWA = useCallback(async (student) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')

        // Jika PDF sudah di-cache, kirim langsung dengan URL di body teks
        if (raportLinks[student.id]) {
            const cachedUrl = raportLinks[student.id]
            // URL selalu disertakan dalam teks agar berfungsi di semua paket Fonnte
            const message = buildWaMessage(student, cachedUrl)
            const textSent = await sendFonnteMessage(phone, message)
            // Best-effort: coba kirim sebagai file attachment juga (butuh paket Super+)
            sendFonnteFile(phone, cachedUrl, decodeURIComponent(cachedUrl.split('/').pop())).catch(() => {})
            if (textSent) { addToast(`WA terkirim ke wali ${student.name.split(' ')[0]}`, 'success') }
            else {
                const tab = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                if (!tab) addToast('Popup diblokir browser.', 'warning')
            }
            return
        }

        setPreviewStudentId(student.id); await new Promise(r => setTimeout(r, 300))
        setSendingWA(prev => ({ ...prev, [student.id]: 'generating' }))
        try {
            const { blob, filename } = await generatePDFBlob(student)
            setSendingWA(prev => ({ ...prev, [student.id]: 'uploading' }))
            const url = await uploadToSupabase(blob, filename)
            setRaportLinks(prev => ({ ...prev, [student.id]: url }))
            setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))

            // URL selalu disertakan dalam teks agar berfungsi di semua paket Fonnte
            const message = buildWaMessage(student, url)
            const textSent = await sendFonnteMessage(phone, message)
            // Best-effort: coba kirim sebagai file attachment juga (butuh paket Super+)
            sendFonnteFile(phone, url, filename).catch(() => {})
            if (textSent) {
                addToast(`WA terkirim ke wali ${student.name.split(' ')[0]}`, 'success')
            } else {
                // Fallback to wa.me
                const tab = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                if (!tab) addToast('Popup diblokir browser.', 'warning')
                else addToast(`WA dibuka untuk ${student.name.split(' ')[0]}`, 'info')
            }

            logAudit({
                action: 'SEND_WA', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                recordId: student.id,
                newData: { student_name: student.name, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear, url }
            })
        } catch (err) { addToast(`Gagal: ${err.message}`, 'error'); setSendingWA(prev => ({ ...prev, [student.id]: null })); console.error('generateAndSendWA error:', err) }
    }, [raportLinks, buildWaMessage, sendFonnteMessage, sendFonnteFile, generatePDFBlob, uploadToSupabase, addToast, selectedClass, selectedMonth, selectedYear, setPreviewStudentId])

    // ── Run WA Blast (Fonnte-powered, no browser tabs) ──
    const runWaBlast = useCallback(async (queue) => {
        setWaBlastConfirm(null)
        waBlastAbortRef.current = false
        setWaBlast({ queue, idx: 0, done: 0, failed: 0, active: true })
        let done = 0, failed = 0
        for (let i = 0; i < queue.length; i++) {
            if (waBlastAbortRef.current) {
                addToast(`WA Blast dibatalkan — ${done} terkirim, ${queue.length - done - failed} dibatalkan`, 'warning')
                setWaBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
                return
            }
            const student = queue[i]
            setWaBlast(prev => prev ? { ...prev, idx: i, active: true } : null)
            try {
                if (!student.phone) { failed++; continue }
                const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
                let url = raportLinks[student.id]
                if (!url) {
                    setPreviewStudentId(student.id)
                    await new Promise(r => setTimeout(r, 400))
                    const { blob, filename } = await generatePDFBlob(student)
                    url = await uploadToSupabase(blob, filename)
                    setRaportLinks(prev => ({ ...prev, [student.id]: url }))
                    setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))
                }
                const pdfFilename = decodeURIComponent(url.split('/').pop())
                // URL selalu disertakan dalam teks agar berfungsi di semua paket Fonnte
                const message = buildWaMessage(student, url)
                const textSent = await sendFonnteMessage(phone, message)
                // Best-effort: coba kirim sebagai file attachment juga (butuh paket Super+)
                sendFonnteFile(phone, url, pdfFilename).catch(() => {})
                if (textSent) {
                    done++
                } else {
                    // Fallback: open wa.me tab
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                    done++
                }
                // Delay between messages to avoid rate limiting
                await new Promise(r => setTimeout(r, 600))
            } catch (e) { failed++; console.error('WA Blast item error:', e) }
            setWaBlast(prev => prev ? { ...prev, done, failed } : null)
        }
        setWaBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
        addToast(`WA Blast selesai: ${done} terkirim, ${failed} gagal`, done > 0 ? 'success' : 'error')

        logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
            newData: { format: 'WA_BLAST', count: done, failed_count: failed, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
        })
    }, [raportLinks, generatePDFBlob, uploadToSupabase, buildWaMessage, sendFonnteMessage, sendFonnteFile, addToast, selectedClass, selectedMonth, selectedYear, setPreviewStudentId])

    // ── Run ZIP Blast ──
    const runZipBlast = useCallback(async (stuList, archEntry) => {
        if (!window.JSZip) {
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
                s.onload = res; s.onerror = rej
                document.head.appendChild(s)
            })
        }
        zipAbortRef.current = false
        setZipBlast({ queue: stuList, idx: 0, done: 0, failed: 0, total: stuList.length, active: true })
        const zip = new window.JSZip()
        let done = 0, failed = 0
        const bulanStr = archEntry ? (BULAN.find(b => b.id === archEntry.month)?.id_str || '') : (BULAN.find(b => b.id === selectedMonth)?.id_str || '')
        const yearStr = archEntry ? archEntry.year : selectedYear
        for (let i = 0; i < stuList.length; i++) {
            if (zipAbortRef.current) {
                break
            }
            const student = stuList[i]
            setZipBlast(prev => prev ? { ...prev, idx: i } : null)
            try {
                setPreviewStudentId(student.id)
                await new Promise(r => setTimeout(r, 350))
                if (zipAbortRef.current) break
                const archCtx = archEntry ? { bulanObj: BULAN.find(b => b.id === archEntry.month), year: archEntry.year, month: archEntry.month } : {}
                const { blob, filename } = await generatePDFBlob(student, archCtx)
                if (zipAbortRef.current) break
                zip.file(filename, blob)
                done++
            } catch (e) { failed++; console.error('ZIP item error:', e) }
            setZipBlast(prev => prev ? { ...prev, done, failed } : null)
        }

        if (zipAbortRef.current) {
            setZipBlast(null)
            return
        }

        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Raport_${archEntry?.class_name || selectedClass?.name || 'Kelas'}_${bulanStr}_${yearStr}.zip`
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 5000)
            setZipBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
            addToast(`ZIP berhasil: ${done} raport diunduh`, 'success')

            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { format: 'ZIP_ARCHIVE', count: done, failed_count: failed, class_name: archEntry?.class_name || selectedClass?.name, month: archEntry ? archEntry.month : selectedMonth, year: archEntry ? archEntry.year : selectedYear }
            })
        } catch (e) { addToast('Gagal membuat ZIP: ' + e.message, 'error'); setZipBlast(null) }
    }, [generatePDFBlob, selectedMonth, selectedYear, selectedClass, addToast, setPreviewStudentId])

    // ── Get selected or active students ──
    const getSelectedOrActiveStudents = useCallback((scope) => {
        if (scope === 'selected') {
            return students.filter(s => selectedStudentIds.includes(s.id))
        }
        return students
    }, [students, selectedStudentIds])

    // ── Handle Export ZIP ──
    const handleExportZipModal = useCallback((scope) => {
        const targetStudents = getSelectedOrActiveStudents(scope)
        if (!targetStudents.length) {
            addToast('Tidak ada data untuk diexport', 'warning')
            return
        }
        runZipBlast(targetStudents, null)
    }, [getSelectedOrActiveStudents, runZipBlast, addToast])

    // ── Handle Print All ──
    const handlePrintAllModal = useCallback((scope) => {
        const targetStudents = getSelectedOrActiveStudents(scope)
        if (!targetStudents.length) {
            addToast('Tidak ada data untuk dicetak', 'warning')
            return
        }
        setPrintRenderedCount(0)
        setPrintQueue(targetStudents.map(s => s.id))
    }, [getSelectedOrActiveStudents, setPrintQueue, setPrintRenderedCount, addToast])

    // ── Handle Export CSV ──
    const handleExportCSVModal = useCallback((scope, options) => {
        setExporting(true)
        try {
            const targetStudents = getSelectedOrActiveStudents(scope)
            if (!targetStudents.length) {
                addToast('Tidak ada data untuk diexport', 'warning')
                return
            }

            const headerMap = {
                nama: 'Nama',
                nilai_akhlak: 'Akhlak',
                nilai_ibadah: 'Ibadah',
                nilai_kebersihan: 'Kebersihan',
                nilai_quran: "Al-Qur'an",
                nilai_bahasa: 'Bahasa',
                avg: 'Rata-rata',
                predikat: 'Predikat',
                berat_badan: 'BB(kg)',
                tinggi_badan: 'TB(cm)',
                ziyadah: 'Ziyadah',
                murojaah: "Muroja'ah",
                hari_sakit: 'Sakit',
                hari_izin: 'Izin',
                hari_alpa: 'Alpa',
                hari_pulang: 'Pulang',
                catatan: 'Catatan'
            }

            const activeColumns = options.columns || []
            const headers = options.includeHeader !== false ? ['No', ...activeColumns.map(col => headerMap[col] || col)] : []

            const rows = targetStudents.map((s, i) => {
                const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                const avg = calcAvg(sc)
                const predikat = avg ? GRADE(Number(avg)).id : ''

                const rowData = [i + 1]
                activeColumns.forEach(col => {
                    if (col === 'nama') rowData.push(s.name)
                    else if (col === 'nilai_akhlak') rowData.push(sc.nilai_akhlak ?? '')
                    else if (col === 'nilai_ibadah') rowData.push(sc.nilai_ibadah ?? '')
                    else if (col === 'nilai_kebersihan') rowData.push(sc.nilai_kebersihan ?? '')
                    else if (col === 'nilai_quran') rowData.push(sc.nilai_quran ?? '')
                    else if (col === 'nilai_bahasa') rowData.push(sc.nilai_bahasa ?? '')
                    else if (col === 'avg') rowData.push(avg ?? '')
                    else if (col === 'predikat') rowData.push(predikat)
                    else if (col === 'berat_badan') rowData.push(ex.berat_badan ?? '')
                    else if (col === 'tinggi_badan') rowData.push(ex.tinggi_badan ?? '')
                    else if (col === 'ziyadah') rowData.push(ex.ziyadah ?? '')
                    else if (col === 'murojaah') rowData.push(ex.murojaah ?? '')
                    else if (col === 'hari_sakit') rowData.push(ex.hari_sakit ?? '')
                    else if (col === 'hari_izin') rowData.push(ex.hari_izin ?? '')
                    else if (col === 'hari_alpa') rowData.push(ex.hari_alpa ?? '')
                    else if (col === 'hari_pulang') rowData.push(ex.hari_pulang ?? '')
                    else if (col === 'catatan') rowData.push(ex.catatan ?? '')
                })
                return rowData
            })

            const allRows = options.includeHeader !== false ? [headers, ...rows] : rows
            const csv = allRows.map(r => r.map(escapeCsvCell).join(',')).join('\n')
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${options.fileName || 'export'}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            addToast(`CSV berhasil diexport (${targetStudents.length} santri)`, 'success')
            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { format: 'CSV', count: targetStudents.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear, scope }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export CSV: ' + e.message, 'error')
        } finally {
            setExporting(false)
        }
    }, [students, scores, extras, selectedClass, selectedMonth, selectedYear, addToast, selectedStudentIds, getSelectedOrActiveStudents])

    // ── Handle Export Excel ──
    const handleExportExcelModal = useCallback(async (scope, options) => {
        setExporting(true)
        try {
            const targetStudents = getSelectedOrActiveStudents(scope)
            if (!targetStudents.length) {
                addToast('Tidak ada data untuk diexport', 'warning')
                return
            }

            if (!window.XLSX) {
                await new Promise((res, rej) => {
                    const s = document.createElement('script')
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
                    s.onload = res; s.onerror = () => rej(new Error('Gagal memuat library XLSX'))
                    document.head.appendChild(s)
                })
            }

            const headerMap = {
                nama: 'Nama',
                nilai_akhlak: 'Akhlak',
                nilai_ibadah: 'Ibadah',
                nilai_kebersihan: 'Kebersihan',
                nilai_quran: "Al-Qur'an",
                nilai_bahasa: 'Bahasa',
                avg: 'Rata-rata',
                predikat: 'Predikat',
                berat_badan: 'BB(kg)',
                tinggi_badan: 'TB(cm)',
                ziyadah: 'Ziyadah',
                murojaah: "Muroja'ah",
                hari_sakit: 'Sakit',
                hari_izin: 'Izin',
                hari_alpa: 'Alpa',
                hari_pulang: 'Pulang',
                catatan: 'Catatan'
            }

            const activeColumns = options.columns || []
            const headers = options.includeHeader !== false ? ['No', ...activeColumns.map(col => headerMap[col] || col)] : []

            const rows = targetStudents.map((s, i) => {
                const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                const avg = calcAvg(sc)
                const predikat = avg ? GRADE(Number(avg)).id : ''

                const rowData = [i + 1]
                activeColumns.forEach(col => {
                    if (col === 'nama') rowData.push(s.name)
                    else if (col === 'nilai_akhlak') rowData.push(sc.nilai_akhlak !== '' && sc.nilai_akhlak !== undefined ? Number(sc.nilai_akhlak) : '')
                    else if (col === 'nilai_ibadah') rowData.push(sc.nilai_ibadah !== '' && sc.nilai_ibadah !== undefined ? Number(sc.nilai_ibadah) : '')
                    else if (col === 'nilai_kebersihan') rowData.push(sc.nilai_kebersihan !== '' && sc.nilai_kebersihan !== undefined ? Number(sc.nilai_kebersihan) : '')
                    else if (col === 'nilai_quran') rowData.push(sc.nilai_quran !== '' && sc.nilai_quran !== undefined ? Number(sc.nilai_quran) : '')
                    else if (col === 'nilai_bahasa') rowData.push(sc.nilai_bahasa !== '' && sc.nilai_bahasa !== undefined ? Number(sc.nilai_bahasa) : '')
                    else if (col === 'avg') rowData.push(avg ? Number(avg) : '')
                    else if (col === 'predikat') rowData.push(predikat)
                    else if (col === 'berat_badan') rowData.push(ex.berat_badan !== '' && ex.berat_badan !== undefined ? Number(ex.berat_badan) : '')
                    else if (col === 'tinggi_badan') rowData.push(ex.tinggi_badan !== '' && ex.tinggi_badan !== undefined ? Number(ex.tinggi_badan) : '')
                    else if (col === 'ziyadah') rowData.push(ex.ziyadah ?? '')
                    else if (col === 'murojaah') rowData.push(ex.murojaah ?? '')
                    else if (col === 'hari_sakit') rowData.push(ex.hari_sakit !== '' && ex.hari_sakit !== undefined ? Number(ex.hari_sakit) : '')
                    else if (col === 'hari_izin') rowData.push(ex.hari_izin !== '' && ex.hari_izin !== undefined ? Number(ex.hari_izin) : '')
                    else if (col === 'hari_alpa') rowData.push(ex.hari_alpa !== '' && ex.hari_alpa !== undefined ? Number(ex.hari_alpa) : '')
                    else if (col === 'hari_pulang') rowData.push(ex.hari_pulang !== '' && ex.hari_pulang !== undefined ? Number(ex.hari_pulang) : '')
                    else if (col === 'catatan') rowData.push(ex.catatan ?? '')
                })
                return rowData
            })

            const XLSX = window.XLSX
            const allRows = options.includeHeader !== false ? [headers, ...rows] : rows
            const ws = XLSX.utils.aoa_to_sheet(allRows)
            ws['!cols'] = [{ wch: 4 }, ...activeColumns.map(col => ({ wch: col === 'nama' || col === 'catatan' ? 28 : 12 }))]

            const wb = XLSX.utils.book_new()
            const sheetName = `${bulanObj?.id_str || ''} ${selectedYear}`.trim().slice(0, 31)
            XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Raport')
            XLSX.writeFile(wb, `${options.fileName || 'export'}.xlsx`)

            addToast(`XLSX berhasil diexport (${targetStudents.length} santri)`, 'success')
            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { format: 'XLSX', count: targetStudents.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear, scope }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export XLSX: ' + e.message, 'error')
        } finally {
            setExporting(false)
        }
    }, [students, scores, extras, selectedClass, bulanObj, selectedYear, addToast, selectedMonth, selectedStudentIds, getSelectedOrActiveStudents])

    // ── Handle Export All Classes ──
    const handleExportAllClassesModal = useCallback(async (customFileName) => {
        setExporting(true)
        try {
            if (!window.XLSX) {
                await new Promise((res, rej) => {
                    const s = document.createElement('script')
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
                    s.onload = res; s.onerror = () => rej(new Error('Gagal memuat library XLSX'))
                    document.head.appendChild(s)
                })
            }

            const { data: allCls, error: clsErr } = await supabase.from('classes').select('id, name')
            if (clsErr) throw clsErr

            const { data: allStu, error: stuErr } = await supabase.from('students').select('id, name, class_id').is('deleted_at', null).order('name')
            if (stuErr) throw stuErr

            const { data: allRep, error: repErr } = await supabase.from('student_monthly_reports').select('*').eq('month', selectedMonth).eq('year', selectedYear)
            if (repErr) throw repErr

            const XLSX = window.XLSX
            const wb = XLSX.utils.book_new()
            const headers = ['No', 'Nama', 'Akhlak', 'Ibadah', 'Kebersihan', "Al-Qur'an", 'Bahasa', 'Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan']

            let sheetAdded = 0

            for (const cls of allCls) {
                const classStudents = allStu.filter(s => s.class_id === cls.id)
                if (classStudents.length === 0) continue

                const rows = classStudents.map((s, i) => {
                    const rep = allRep.find(r => r.student_id === s.id) || {}
                    const sc = { nilai_akhlak: rep.nilai_akhlak, nilai_ibadah: rep.nilai_ibadah, nilai_kebersihan: rep.nilai_kebersihan, nilai_quran: rep.nilai_quran, nilai_bahasa: rep.nilai_bahasa }
                    const avg = calcAvg(sc)
                    const predikat = avg ? GRADE(Number(avg)).id : ''

                    return [
                        i + 1, s.name,
                        rep.nilai_akhlak !== null && rep.nilai_akhlak !== undefined ? Number(rep.nilai_akhlak) : '',
                        rep.nilai_ibadah !== null && rep.nilai_ibadah !== undefined ? Number(rep.nilai_ibadah) : '',
                        rep.nilai_kebersihan !== null && rep.nilai_kebersihan !== undefined ? Number(rep.nilai_kebersihan) : '',
                        rep.nilai_quran !== null && rep.nilai_quran !== undefined ? Number(rep.nilai_quran) : '',
                        rep.nilai_bahasa !== null && rep.nilai_bahasa !== undefined ? Number(rep.nilai_bahasa) : '',
                        avg ? Number(avg) : '', predikat,
                        rep.berat_badan !== null && rep.berat_badan !== undefined ? Number(rep.berat_badan) : '',
                        rep.tinggi_badan !== null && rep.tinggi_badan !== undefined ? Number(rep.tinggi_badan) : '',
                        rep.ziyadah ?? '', rep.murojaah ?? '',
                        rep.hari_sakit !== null && rep.hari_sakit !== undefined ? Number(rep.hari_sakit) : '',
                        rep.hari_izin !== null && rep.hari_izin !== undefined ? Number(rep.hari_izin) : '',
                        rep.hari_alpa !== null && rep.hari_alpa !== undefined ? Number(rep.hari_alpa) : '',
                        rep.hari_pulang !== null && rep.hari_pulang !== undefined ? Number(rep.hari_pulang) : '',
                        rep.catatan || '',
                    ]
                })

                const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
                ws['!cols'] = [
                    { wch: 4 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
                    { wch: 10 }, { wch: 12 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 12 },
                    { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 30 }
                ]

                const sheetName = (cls.name || 'Kelas').replace(/[\\/?*\[\]]/g, '').substring(0, 31)
                XLSX.utils.book_append_sheet(wb, ws, sheetName)
                sheetAdded++
            }

            if (sheetAdded === 0) {
                addToast('Tidak ada data siswa untuk diexport', 'warning')
                return
            }

            const finalFileName = customFileName || `Raport_Semua_Kelas_${bulanObj?.id_str || ''}_${selectedYear}`
            XLSX.writeFile(wb, `${finalFileName}.xlsx`)

            addToast(`Semua kelas berhasil diexport (${sheetAdded} sheet)`, 'success')
            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { format: 'XLSX_ALL_CLASSES', month: selectedMonth, year: selectedYear }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export semua kelas: ' + e.message, 'error')
        } finally {
            setExporting(false)
        }
    }, [selectedMonth, selectedYear, bulanObj, addToast])

    return {
        raportLinks, setRaportLinks, sendingWA, setSendingWA,
        waBlastConfirm, setWaBlastConfirm, waBlast, setWaBlast,
        zipBlast, setZipBlast, exporting, setExporting,
        isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportOpen: setIsExportModalOpen,
        waBlastAbortRef, zipAbortRef,
        buildWaMessage, sendWATextOnly, generatePDFBlob, uploadToSupabase,
        generateAndSendWA, runWaBlast, runZipBlast,
        handleExportCSV: handleExportCSVModal, handleExportExcel: handleExportExcelModal, handleExportAllClasses: handleExportAllClassesModal,
        handleExportZip: handleExportZipModal, handlePrintAll: handlePrintAllModal
    }
}