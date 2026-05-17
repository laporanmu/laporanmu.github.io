import { useState, useCallback, useMemo } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import { STATUS_CONFIG } from '../../components/teachers/TeacherRow'

const SYSTEM_COLS = [
    { key: 'name', label: 'Nama Lengkap' },
    { key: 'nbm', label: 'NBM' },
    { key: 'subject', label: 'Mata Pelajaran' },
    { key: 'gender', label: 'Jenis Kelamin' },
    { key: 'phone', label: 'No. WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
]

const ALL_EXPORT_COLUMNS = [
    { key: 'nama', label: 'Nama', fn: t => t.name || '' },
    { key: 'nbm', label: 'NBM', fn: t => t.nbm || '' },
    { key: 'subject', label: 'Mata Pelajaran', fn: t => t.subject || '' },
    { key: 'gender', label: 'Gender', fn: t => t.gender === 'L' ? 'Laki-laki' : t.gender === 'P' ? 'Perempuan' : '-' },
    { key: 'phone', label: 'No. HP/WA', fn: t => t.phone || '' },
    { key: 'email', label: 'Email', fn: t => t.email || '' },
    { key: 'status', label: 'Status', fn: t => STATUS_CONFIG[t.status]?.label || t.status || '' },
    { key: 'join_date', label: 'Tgl Bergabung', fn: t => t.join_date || '' },
    { key: 'address', label: 'Alamat', fn: t => t.address || '' },
]

export function useTeachersImportExport({
    teachers,
    selectedIds,
    filterStatus,
    filterGender,
    filterSubject,
    filterType,
    fetchData,
    fetchStats,
    addToast,
    setIsImportModalOpen,
    setIsExportModalOpen
}) {
    // import
    const [importStep, setImportStep] = useState(1)
    const [importFileName, setImportFileName] = useState('')
    const [importRawData, setImportRawData] = useState([])
    const [importFileHeaders, setImportFileHeaders] = useState([])
    const [importColumnMapping, setImportColumnMapping] = useState({})
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importLoading, setImportLoading] = useState(false)
    const [importValidationOpen, setImportValidationOpen] = useState(true)
    const [importDrag, setImportDrag] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importEditCell, setImportEditCell] = useState(null)
    const [importSkipDupes, setImportSkipDupes] = useState(true)

    // export
    const [exportScope, setExportScope] = useState('filtered')
    const [exportColumns, setExportColumns] = useState(['nama', 'nbm', 'subject', 'gender', 'phone', 'email', 'status', 'join_date'])
    const [exporting, setExporting] = useState(false)

    // ── import processing ─────────────────────────────────────────────────────
    const processImportFile = useCallback(async file => {
        if (!file) return
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) { addToast('Format tidak didukung. Gunakan .csv atau .xlsx', 'error'); return }
        setImportFileName(file.name)
        setImportLoading(true)
        try {
            let rows = []
            if (ext.endsWith('.csv')) rows = await new Promise(res => Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => res(r.data) }))
            else rows = await new Promise(res => { const reader = new FileReader(); reader.onload = e => { const wb = XLSX.read(e.target.result, { type: 'array' }); res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })) }; reader.readAsArrayBuffer(file) })

            if (!rows.length) { addToast('File kosong atau tidak terbaca', 'error'); return }

            const headers = Object.keys(rows[0])
            setImportRawData(rows)
            setImportFileHeaders(headers)

            // Auto-mapping
            const mapping = {}
            SYSTEM_COLS.forEach(sys => {
                const match = headers.find(h => {
                    const lowH = h.toLowerCase().trim()
                    const lowL = sys.label.toLowerCase()
                    const lowK = sys.key.toLowerCase()
                    return lowH === lowL || lowH === lowK ||
                        (sys.key === 'name' && (lowH === 'nama' || lowH === 'nama lengkap')) ||
                        (sys.key === 'phone' && (lowH === 'wa' || lowH === 'no. hp/wa')) ||
                        (sys.key === 'subject' && (lowH === 'mapel' || lowH === 'mata pelajaran')) ||
                        (sys.key === 'nbm' && (lowH === 'nbm')) ||
                        (sys.key === 'gender' && (lowH === 'jk' || lowH === 'jenis kelamin'))
                })
                if (match) mapping[sys.key] = match
            })
            setImportColumnMapping(mapping)
            setImportStep(2)
        } catch { addToast('Gagal membaca file import', 'error') }
        finally { setImportLoading(false) }
    }, [addToast])

    const buildImportPreview = useCallback(async (raw, mapping) => {
        setImportLoading(true)
        try {
            const preview = raw.map((row, i) => {
                const data = {}
                SYSTEM_COLS.forEach(sys => {
                    const fileCol = mapping[sys.key]
                    data[sys.key] = fileCol ? (row[fileCol] || '').toString().trim() : ''
                })

                // Normalization
                if (data.gender) {
                    const g = data.gender.toUpperCase()
                    data.gender = ['L', 'LAKI-LAKI', 'LAKI LAKI', 'MALE'].includes(g) ? 'L' : ['P', 'PEREMPUAN', 'FEMALE'].includes(g) ? 'P' : ''
                }
                if (data.status) {
                    const s = data.status.toLowerCase()
                    data.status = ['active', 'aktif'].includes(s) ? 'active' : ['inactive', 'nonaktif'].includes(s) ? 'inactive' : ['leave', 'cuti'].includes(s) ? 'cuti' : 'active'
                }

                return { ...data, _row: i }
            })

            // Validation
            const issues = []
            preview.forEach((row, i) => {
                const rowIssues = []
                if (!row.name) rowIssues.push('Nama tidak boleh kosong')
                if (row.nbm && preview.slice(0, i).some(p => p.nbm === row.nbm)) rowIssues.push(`NBM "${row.nbm}" duplikat di file`)

                if (rowIssues.length) {
                    issues.push({ row: i + 2, level: 'error', messages: rowIssues })
                    row._hasError = true
                }
            })

            setImportPreview(preview)
            setImportIssues(issues)
        } finally {
            setImportLoading(false)
        }
    }, [])

    const handleImportCellEdit = useCallback((rowIdx, colKey, newValue) => {
        setImportPreview(prev => {
            const next = [...prev]
            next[rowIdx] = { ...next[rowIdx], [colKey]: newValue }

            // Re-validate row
            const rowIssues = []
            if (!next[rowIdx].name) rowIssues.push('Nama tidak boleh kosong')

            next[rowIdx]._hasError = rowIssues.length > 0

            // Re-build all issues
            setImportIssues(prevIssues => {
                const newIssues = prevIssues.filter(iss => iss.row !== rowIdx + 2)
                if (rowIssues.length) {
                    newIssues.push({ row: rowIdx + 2, level: 'error', messages: rowIssues })
                }
                return newIssues.sort((a, b) => a.row - b.row)
            })

            return next
        })
    }, [])

    const handleRemoveImportRow = useCallback(idx => {
        setImportPreview(prev => prev.filter((_, i) => i !== idx))
        setImportIssues(prev => prev.filter(iss => iss.row !== idx + 2).map(iss => iss.row > idx + 2 ? { ...iss, row: iss.row - 1 } : iss))
    }, [])

    const handleBulkFix = useCallback((colKey, value) => {
        setImportPreview(prev => prev.map(r => ({ ...r, [colKey]: value, _hasError: colKey === 'name' ? !value : r._hasError })))
        if (colKey === 'name' && value) setImportIssues(prev => prev.filter(iss => !iss.messages.includes('Nama tidak boleh kosong')))
        addToast(`Berhasil merubah semua baris ke ${value}`, 'success')
    }, [addToast])

    const handleDownloadTemplate = useCallback(() => {
        const headers = ['Nama', 'NBM', 'Mata Pelajaran', 'Gender', 'No. HP/WA', 'Email', 'Status']
        const data = [
            ['Ahmad Fauzi, S.Pd', '12345678', 'Bahasa Indonesia', 'L', '081234567890', 'ahmad@sekolah.sch.id', 'active'],
            ['Siti Aminah, M.Pd', '87654321', 'Matematika', 'P', '089876543210', 'siti@sekolah.sch.id', 'active']
        ]
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import Guru')
        XLSX.writeFile(wb, 'Template Import Guru.xlsx')
    }, [])

    const importReadyRows = useMemo(() => importPreview.filter(r => !r._hasError), [importPreview])
    const hasImportBlockingErrors = useMemo(() => importIssues.some(x => x.level === 'error'), [importIssues])

    const handleCommitImport = useCallback(async () => {
        if (!importPreview.length) { addToast('Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast('Masih ada ERROR. Perbaiki file dulu.', 'error'); return }

        const validRows = importPreview.filter(r => !r._hasError)

        if (!validRows.length) { addToast('Tidak ada baris valid', 'warning'); return }
        setImporting(true)
        setImportProgress({ done: 0, total: validRows.length })
        try {
            const CHUNK = 50
            for (let i = 0; i < validRows.length; i += CHUNK) {
                const chunk = validRows.slice(i, i + CHUNK).map(r => ({
                    name: r.name,
                    nbm: r.nbm || null,
                    subject: r.subject || null,
                    gender: r.gender || null,
                    phone: r.phone || null,
                    email: r.email || null,
                    status: r.status || 'active'
                }))
                const { error } = await supabase.from('teachers').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length })
            }
            addToast(`Berhasil import ${validRows.length} guru`, 'success')
            await logAudit({ action: 'INSERT', source: 'OPERATIONAL', tableName: 'teachers', newData: { bulk_import: true, count: validRows.length, data: validRows } })
            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportFileName('')
            setImportStep(1)
            fetchData()
            fetchStats()
        } catch { addToast('Gagal import (cek constraint DB / duplikat)', 'error') }
        finally { setImporting(false) }
    }, [importPreview, hasImportBlockingErrors, fetchData, fetchStats, addToast, setIsImportModalOpen])

    // ── export data ───────────────────────────────────────────────────────────
    const getExportData = useCallback(async () => {
        let q = supabase.from('teachers').select('name,nbm,subject,gender,phone,email,status,join_date,address').is('deleted_at', null)

        if (exportScope === 'selected' && selectedIds.length > 0) {
            q = q.in('id', selectedIds)
        } else if (exportScope === 'filtered') {
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterSubject) q = q.eq('subject', filterSubject)
            if (filterType) q = q.eq('type', filterType)
        }

        q = q.order('name')
        const { data, error } = await q
        if (error) throw error

        return (data || []).map(t => {
            const row = {}
            exportColumns.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) row[col.label] = col.fn(t)
            })
            return row
        })
    }, [exportScope, selectedIds, filterStatus, filterGender, filterSubject, filterType, exportColumns])

    const handleExportCSV = useCallback(async (filename, options = {}) => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data', 'warning')

            const headers = Object.keys(rows[0])
            const csvContent = [
                ...(options.includeHeader !== false ? [headers.join(',')] : []),
                ...rows.map(r => headers.map(h => {
                    const v = String(r[h] ?? '').replace(/"/g, '""')
                    return `"${v}"`
                }).join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${filename || 'export_guru'}.csv`
            a.click()

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'teachers',
                newData: {
                    format: 'csv',
                    scope: exportScope,
                    columns: exportColumns,
                    count: rows.length
                }
            })

            addToast(`Export CSV berhasil (${rows.length} guru)`, 'success')
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export CSV', 'error') }
        finally { setExporting(false) }
    }, [getExportData, exportScope, exportColumns, addToast, setIsExportModalOpen])

    const handleExportExcel = useCallback(async (filename) => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data', 'warning')
            const ws = XLSX.utils.json_to_sheet(rows)
            ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Data Guru')
            XLSX.writeFile(wb, `${filename || 'export_guru'}.xlsx`)

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'teachers',
                newData: {
                    format: 'xlsx',
                    scope: exportScope,
                    columns: exportColumns,
                    count: rows.length
                }
            })

            addToast(`Export Excel berhasil (${rows.length} guru)`, 'success')
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export Excel', 'error') }
        finally { setExporting(false) }
    }, [getExportData, exportScope, exportColumns, addToast, setIsExportModalOpen])

    const handleExportPDF = useCallback(async (filename, options = {}) => {
        setExporting(true)
        try {
            const [{ default: jsPDF }, autoTableMod] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const autoTable = autoTableMod.default || autoTableMod
            const allRows = await getExportData()
            if (!allRows.length) return addToast('Tidak ada data untuk diekspor', 'warning')

            const doc = new jsPDF({ orientation: options.orientation || 'landscape' })
            doc.setFontSize(13)
            doc.text('Laporan Data Guru', 14, 12)
            doc.setFontSize(8)
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${allRows.length} guru  |  Scope: ${exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'}`, 14, 18)

            const headers = Object.keys(allRows[0])
            const rows = allRows.map(r => headers.map(h => String(r[h] ?? '')))

            autoTable(doc, {
                head: options.includeHeader !== false ? [headers] : [],
                body: rows,
                startY: 22,
                styles: { fontSize: 7.5 },
                headStyles: { fillColor: [79, 70, 229] },
                alternateRowStyles: { fillColor: [245, 245, 255] },
            })

            doc.save(`${filename || 'export_guru'}.pdf`)
            addToast(`Export PDF berhasil (${allRows.length} guru)`, 'success')

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'teachers',
                newData: {
                    format: 'pdf',
                    scope: exportScope,
                    columns: exportColumns,
                    count: allRows.length
                }
            })
            setIsExportModalOpen(false)
        } catch (e) {
            console.error(e)
            addToast('Gagal export PDF', 'error')
        } finally {
            setExporting(false)
        }
    }, [getExportData, exportScope, exportColumns, addToast, setIsExportModalOpen])

    return {
        importStep, setImportStep, importFileName, setImportFileName, importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders, importColumnMapping, setImportColumnMapping,
        importPreview, setImportPreview, importIssues, setImportIssues, importLoading, setImportLoading,
        importValidationOpen, setImportValidationOpen, importDrag, setImportDrag, importing, setImporting,
        importProgress, setImportProgress, importEditCell, setImportEditCell, importSkipDupes, setImportSkipDupes,
        exportScope, setExportScope, exportColumns, setExportColumns, exporting, setExporting,
        importReadyRows, hasImportBlockingErrors, SYSTEM_COLS, ALL_EXPORT_COLUMNS,
        processImportFile, buildImportPreview, handleImportCellEdit, handleRemoveImportRow,
        handleBulkFix, handleDownloadTemplate, handleCommitImport, getExportData,
        handleExportCSV, handleExportExcel, handleExportPDF
    }
}
