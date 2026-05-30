import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import { useLanguage } from '../../context/LanguageContext'

export const SYSTEM_COLS = [
    { key: 'student_name', labelKey: 'colStudent', synonyms: ['nama', 'student', 'siswa', 'student_name', 'nama siswa', 'name', 'nama lengkap'] },
    { key: 'class_name', labelKey: 'colClass', synonyms: ['kelas', 'class', 'class_name', 'rombongan belajar', 'rombel', 'nama kelas'] },
    { key: 'rule_name', labelKey: 'colRule', synonyms: ['rule_name', 'violation', 'jenis', 'perilaku', 'jenis perilaku', 'jenis pelanggaran', 'pelanggaran', 'prestasi', 'rule'] },
    { key: 'points', labelKey: 'colPoints', synonyms: ['poin', 'points', 'nilai poin', 'nilai', 'point'] },
    { key: 'notes', labelKey: 'colNotes', synonyms: ['catatan', 'notes', 'keterangan', 'detail', 'deskripsi'] },
    { key: 'date', labelKey: 'colDate', synonyms: ['tanggal', 'date', 'reported_at', 'waktu'] }
]

export function useBehaviorImportExport({
    reports,
    students,
    violationTypes,
    classesList,
    fetchReports,
    fetchStats,
    addToast,
    closeModal,
    importFileInputRef,
    filterType,
    filterClass,
    debouncedSearch,
    sortBy,
    selectedIds,
    profile
}) {
    const { t, language, tNum } = useLanguage()

    // ---- STATE ----
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    // Export states
    const [exportScope, setExportScope] = useState('filtered') // 'filtered' | 'selected' | 'all'
    const [exportColumns, setExportColumns] = useState(['date', 'student', 'class', 'type', 'points', 'notes', 'teacher'])
    const [exporting, setExporting] = useState(false)

    // Import states
    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importStep, setImportStep] = useState(1) // 1: Upload, 2: Mapping, 3: Review
    const [importRawData, setImportRawData] = useState([])
    const [importFileHeaders, setImportFileHeaders] = useState([])
    const [importColumnMapping, setImportColumnMapping] = useState({})
    const [importDragOver, setImportDragOver] = useState(false)
    const [importValidationOpen, setImportValidationOpen] = useState(false)
    const [importLoading, setImportLoading] = useState(false)
    const [importEditCell, setImportEditCell] = useState(null)

    // ---- COMPUTED ----
    const importReadyRows = useMemo(() => {
        if (!importPreview.length) return []
        const errorSet = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        return importPreview.filter((_, i) => !errorSet.has(i))
    }, [importPreview, importIssues])

    const hasImportBlockingErrors = useMemo(() => {
        return importIssues.some(x => x.level === 'error')
    }, [importIssues])

    // ---- EXPORT LOGIC ----
    const ALL_EXPORT_COLUMNS = [
        { key: 'date', label: t('behavior.colDate'), fn: r => r.reported_at ? new Date(r.reported_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
        { key: 'student', label: t('behavior.colStudent'), fn: r => r.students?.name || '-' },
        { key: 'class', label: t('behavior.colClass'), fn: r => r.students?.classes?.name || '-' },
        { key: 'type', label: t('behavior.colRule'), fn: r => r.point_rules?.name || '-' },
        { key: 'points', label: t('behavior.colPoints'), fn: r => r.points ?? 0 },
        { key: 'notes', label: t('behavior.colNotes'), fn: r => r.notes || '-' },
        { key: 'teacher', label: t('behavior.colTeacher'), fn: r => r.teacher_name || '-' }
    ]

    const getExportData = async () => {
        let q = supabase
            .from('reports')
            .select('*, students(name, class_id, classes(name)), point_rules(name)')
            .order('reported_at', { ascending: false })

        if (exportScope === 'selected') {
            q = q.in('id', selectedIds)
        }

        const { data, error } = await q
        if (error) throw error

        let filtered = data || []

        // If 'filtered' scope, apply in-memory filters (consistent with BehaviorPage's fetch)
        if (exportScope === 'filtered') {
            if (filterType === 'positive') filtered = filtered.filter(r => r.points > 0)
            if (filterType === 'negative') filtered = filtered.filter(r => r.points < 0)
            if (filterClass) {
                filtered = filtered.filter(r => r.students?.classes?.name === filterClass)
            }
            if (debouncedSearch) {
                const s = debouncedSearch.toLowerCase()
                filtered = filtered.filter(r =>
                    (r.students?.name || '').toLowerCase().includes(s) ||
                    (r.point_rules?.name || '').toLowerCase().includes(s)
                )
            }
        }

        // Map based on the requested exportColumns order
        return filtered.map(r => {
            const row = {}
            exportColumns.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) {
                    row[col.label] = col.fn(r)
                }
            })
            return row
        })
    }

    const handleExportCSV = async (filename, options = {}) => {
        setExporting(true)
        try {
            const Papa = (await import('papaparse')).default
            const rows = await getExportData()
            if (!rows.length) return addToast(t('behavior.toastNoDataExport'), 'warning')
            const csv = Papa.unparse(rows)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            downloadBlob(blob, `${filename || 'export_perilaku'}.csv`)
            addToast(t('behavior.toastExportSuccessCSV').replace('{count}', tNum(rows.length)), 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'reports',
                newData: { format: 'CSV', count: rows.length, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast(t('behavior.toastExportFailedCSV'), 'error')
        } finally {
            setExporting(false)
        }
    }

    const handleExportExcel = async (filename) => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const data = await getExportData()
            if (!data.length) return addToast(t('behavior.toastNoDataExport'), 'warning')
            const ws = XLSX.utils.json_to_sheet(data)
            const cols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            ws['!cols'] = cols
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, t('behavior.importRefDesc'))
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            downloadBlob(blob, `${filename || 'export_perilaku'}.xlsx`)
            addToast(t('behavior.toastExportSuccessExcel').replace('{count}', tNum(data.length)), 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'reports',
                newData: { format: 'XLSX', count: data.length, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast(t('behavior.toastExportFailedExcel'), 'error')
        } finally {
            setExporting(false)
        }
    }

    const handleExportPDF = async (filename, options = {}) => {
        setExporting(true)
        try {
            const [{ default: jsPDF }, autoTableMod] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const autoTable = autoTableMod.default || autoTableMod
            const allRows = await getExportData()
            if (!allRows.length) return addToast(t('behavior.toastNoDataExport'), 'warning')

            const doc = new jsPDF({ orientation: options.orientation || 'landscape' })
            doc.setFontSize(13)
            doc.text(t('behavior.pdfTitle'), 14, 12)
            doc.setFontSize(8)
            const dateStrLabel = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID')
            const scopeLabel = exportScope === 'filtered' ? t('behavior.pdfScopeFiltered') : exportScope === 'selected' ? t('behavior.pdfScopeSelected') : t('behavior.pdfScopeAll')
            doc.text(`${t('behavior.pdfDate')}: ${dateStrLabel}  |  ${t('behavior.pdfTotal')}: ${tNum(allRows.length)} ${t('behavior.reports')}  |  ${t('behavior.pdfScope')}: ${scopeLabel}`, 14, 18)

            const headers = Object.keys(allRows[0])
            const rows = allRows.map(r => headers.map(h => String(r[h] ?? '')))

            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: 22,
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 2 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    [t('behavior.colPoints')]: { halign: 'center' },
                    [t('behavior.colDate')]: { halign: 'center' },
                    [t('behavior.colClass')]: { halign: 'center' }
                }
            })

            const pageCount = doc.internal.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFontSize(7)
                doc.setTextColor(150)
                const dateStr = new Date().toLocaleString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })
                doc.text(t('behavior.pdfPrintedBy').replace('{date}', dateStr), 14, doc.internal.pageSize.height - 8)
                doc.text(t('behavior.pdfPageOf').replace('{current}', tNum(i)).replace('{total}', tNum(pageCount)), doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 8)
            }

            doc.save(`${filename || 'export_perilaku'}.pdf`)
            addToast(t('behavior.toastExportSuccessPDF').replace('{count}', tNum(allRows.length)), 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'reports',
                newData: { format: 'PDF', count: allRows.length, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast(t('behavior.toastExportFailedPDF'), 'error')
        } finally {
            setExporting(false)
        }
    }

    const downloadBlob = (blob, filename) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
    }

    // ---- HELPERS & IMPORT PROCESS ----
    const sanitizeText = (s) => String(s ?? '').replace(/[<>]/g, '').trim()
    const pick = (obj, keys) => {
        for (const k of keys) {
            const v = obj?.[k]
            if (v !== undefined && v !== null && String(v).trim() !== '') return v
        }
        return ''
    }

    const parseCSVFile = async (file) => {
        const Papa = (await import('papaparse')).default
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data || []),
                error: (err) => reject(err)
            })
        })
    }

    const parseExcelFile = async (file) => {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array', cellDates: true })
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
        return json
    }

    const buildImportPreview = async (rows, mapping) => {
        const preview = rows.map((r) => {
            const getVal = (row, sysKey) => {
                if (mapping && mapping[sysKey]) return sanitizeText(row[mapping[sysKey]])
                const colDef = SYSTEM_COLS.find(c => c.key === sysKey)
                return sanitizeText(pick(row, colDef ? colDef.synonyms : [sysKey]))
            }

            const studentName = getVal(r, 'student_name')
            const className = getVal(r, 'class_name')
            const ruleName = getVal(r, 'rule_name')
            const pointsRaw = getVal(r, 'points')
            const notes = getVal(r, 'notes')
            const dateRaw = getVal(r, 'date')

            // Look up student matching studentName + className
            const matchedStudent = students.find(s => {
                const nameMatches = s.name.toLowerCase() === studentName.toLowerCase()
                if (!nameMatches) return false
                if (className) {
                    return (s.class_name || '').toLowerCase() === className.toLowerCase()
                }
                return true
            })

            // Look up point rule matching ruleName
            const matchedRule = violationTypes.find(v => v.name.toLowerCase() === ruleName.toLowerCase())

            // Default points or fallback to Excel custom points
            let points = pointsRaw !== '' ? Number(pointsRaw) : (matchedRule?.points ?? 0)
            if (isNaN(points)) points = matchedRule?.points ?? 0

            // Formatted date (fallback to today if invalid)
            let date = dateRaw ? new Date(dateRaw) : new Date()
            if (isNaN(date.getTime())) date = new Date()

            return {
                student_id: matchedStudent?.id || '',
                violation_type_id: matchedRule?.id || '',
                points,
                notes: notes || matchedRule?.name || '',
                date: date.toISOString().slice(0, 10),
                _studentName: matchedStudent?.name || studentName || '',
                _violationName: matchedRule?.name || ruleName || '',
                _className: className || matchedStudent?.class_name || '',
                _hasError: false
            }
        })

        setImportPreview(preview)
        validateImportPreview(preview)
    }

    const validateImportPreview = (preview) => {
        const issues = []

        const validated = preview.map((r, idx) => {
            const rowIssues = []

            if (!r.student_id) {
                rowIssues.push({ level: 'error', type: 'student', message: t('behavior.importErrStudentNotFound').replace('{name}', r._studentName) })
            }
            if (!r.violation_type_id) {
                rowIssues.push({ level: 'error', type: 'rule', message: t('behavior.importErrRuleNotFound').replace('{name}', r._violationName) })
            }

            if (rowIssues.length) {
                issues.push({
                    row: idx + 2,
                    level: 'error',
                    types: rowIssues.map(x => x.type),
                    messages: rowIssues.map(x => x.message)
                })
            }

            return {
                ...r,
                _hasError: rowIssues.length > 0
            }
        })

        setImportPreview(validated)
        setImportIssues(issues)
        setImportValidationOpen(issues.length > 0)
    }

    const processImportFile = async (file) => {
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
            addToast(t('behavior.toastImportUnsupportedFormat'), 'error')
            return
        }
        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])
        setImportLoading(true)
        try {
            const isXlsx = ext.endsWith('.xlsx') || (file.type || '').includes('sheet')
            const rows = isXlsx ? await parseExcelFile(file) : await parseCSVFile(file)
            if (!rows.length) { addToast(t('behavior.toastImportEmptyFile'), 'error'); return }

            setImportRawData(rows)
            const headers = Object.keys(rows[0])
            setImportFileHeaders(headers)

            // Columns Auto-matching
            const mapping = {}
            const norm = (str) => (str || '').toLowerCase().replace(/[\s\xA0\n\r]+/g, ' ').trim()
            SYSTEM_COLS.forEach(sys => {
                const match = headers.find(h => {
                    const normH = norm(h)
                    const cleanH = norm(h.split(/[\(\[\{（\n\r]/)[0])
                    const normL = norm(t(`behavior.${sys.labelKey}`))
                    const normK = norm(sys.key)
                    if (normH === normL || normH === normK || cleanH === normL || cleanH === normK) return true
                    if (sys.synonyms && sys.synonyms.some(syn => {
                        const s = norm(syn)
                        return normH === s || cleanH === s || cleanH.replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')
                    })) return true
                    return false
                })
                if (match) mapping[sys.key] = match
            })

            setImportColumnMapping(mapping)
            setImportStep(2)
        } catch (err) {
            console.error(err)
            addToast(t('behavior.toastImportFailedRead'), 'error')
        } finally {
            setImportLoading(false)
        }
    }

    const handleBulkFix = (sysKey, value) => {
        const newPrev = importPreview.map(r => {
            const updated = { ...r, [sysKey]: value }
            if (sysKey === 'student_id') {
                const student = students.find(s => s.id === value)
                updated._studentName = student?.name || ''
                updated._className = student?.class_name || ''
            } else if (sysKey === 'violation_type_id') {
                const rule = violationTypes.find(v => v.id === value)
                updated._violationName = rule?.name || ''
                if (r.points === 0 || !r.points) updated.points = rule?.points ?? 0
            }
            return updated
        })
        setImportPreview(newPrev)
        validateImportPreview(newPrev)
        addToast(t('behavior.toastImportBulkUpdateSuccess').replace('{count}', tNum(newPrev.length)), 'success')
    }

    const handleImportCellEdit = (index, key, value) => {
        const newPrev = [...importPreview]
        const updatedRow = { ...newPrev[index], [key]: value }

        if (key === 'student_id') {
            const student = students.find(s => s.id === value)
            updatedRow._studentName = student?.name || ''
            updatedRow._className = student?.class_name || ''
        } else if (key === 'violation_type_id') {
            const rule = violationTypes.find(v => v.id === value)
            updatedRow._violationName = rule?.name || ''
            updatedRow.points = rule?.points ?? 0
        }

        newPrev[index] = updatedRow
        setImportPreview(newPrev)
        validateImportPreview(newPrev)
    }

    const handleRemoveImportRow = (idx) => {
        const next = importPreview.filter((_, i) => i !== idx)
        setImportPreview(next)
        validateImportPreview(next)
        addToast(t('behavior.toastImportRowDeleted'), 'success')
    }

    const handleImportClick = () => {
        if (!isImportModalOpen) {
            setImportStep(1)
            setImportFileName('')
            setImportRawData([])
            setImportPreview([])
            setImportIssues([])
            setImportColumnMapping({})
            setImportLoading(false)
            setIsImportModalOpen(true)
        } else {
            importFileInputRef.current?.click()
        }
    }

    const handleDownloadTemplate = async () => {
        const templateData = [
            {
                [t('behavior.colStudent')]: t('behavior.tplStudent1'),
                [t('behavior.colClass')]: t('behavior.tplClass1'),
                [t('behavior.colRule')]: t('behavior.tplRule1'),
                [t('behavior.colPoints')]: -5,
                [t('behavior.colNotes')]: t('behavior.tplNotes1'),
                [t('behavior.colDate')]: '2026-05-29'
            },
            {
                [t('behavior.colStudent')]: t('behavior.tplStudent2'),
                [t('behavior.colClass')]: t('behavior.tplClass2'),
                [t('behavior.colRule')]: t('behavior.tplRule2'),
                [t('behavior.colPoints')]: 10,
                [t('behavior.colNotes')]: t('behavior.tplNotes2'),
                [t('behavior.colDate')]: '2026-05-29'
            }
        ]
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [
            { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 10 },
            { wch: 25 }, { wch: 15 }
        ]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, t('behavior.importTitle'))
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        downloadBlob(blob, `${t('behavior.importDownloadTemplate')}.xlsx`)
    }

    const handleCommitImport = async () => {
        if (!importPreview.length) {
            addToast(t('behavior.toastImportNoData'), 'error')
            return
        }
        if (hasImportBlockingErrors) {
            addToast(t('behavior.toastImportFixErrors'), 'error')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })

        const CHUNK = 50
        try {
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK).map(r => ({
                    student_id: r.student_id,
                    violation_type_id: r.violation_type_id,
                    points: r.points,
                    notes: r.notes,
                    reported_at: new Date(r.date).toISOString(),
                    teacher_name: profile?.name || 'Sistem'
                }))
                const { error } = await supabase.from('reports').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            addToast(t('behavior.toastImportSuccess').replace('{count}', tNum(importReadyRows.length)), 'success')
            await logAudit({
                action: 'INSERT',
                source: 'OPERATIONAL',
                tableName: 'reports',
                newData: {
                    bulk_import: true,
                    count: importReadyRows.length
                }
            })

            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportFileName('')
            setImportStep(1)
            await fetchReports()
            fetchStats()
        } catch (err) {
            console.error(err)
            addToast(t('behavior.toastImportFailed'), 'error')
        } finally {
            setImporting(false)
        }
    }

    return {
        isImportModalOpen, setIsImportModalOpen,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportColumns, setExportColumns,
        importFileName, setImportFileName,
        importPreview, setImportPreview,
        importIssues, setImportIssues,
        importing, setImporting,
        importProgress, setImportProgress,
        importStep, setImportStep,
        importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping,
        importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen,
        importLoading, setImportLoading,
        importEditCell, setImportEditCell,
        importReadyRows,
        hasImportBlockingErrors,
        SYSTEM_COLS,
        ALL_EXPORT_COLUMNS,

        processImportFile,
        handleImportClick,
        handleCommitImport,
        handleBulkFix,
        handleDownloadTemplate,
        handleExportCSV,
        handleExportExcel,
        handleExportPDF,
        buildImportPreview,
        handleImportCellEdit,
        handleRemoveImportRow
    }
}
