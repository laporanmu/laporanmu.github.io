import React, { useState, useMemo, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCheckCircle,
    faFileLines,
    faSliders,
    faSpinner,
    faTableList,
    faTriangleExclamation,
    faUsers,
    faIdCard,
    faFileExport,
    faHashtag,
    faUser,
    faVenusMars,
    faSchool,
    faStar,
    faTags,
    faFileExcel,
    faFileCsv,
    faFilePdf,
    faGear,
    faHeading,
    faArrowsLeftRight,
    faArrowsUpDown,
    faCalendarAlt,
    faHome,
    faClipboardList,
    faBed,
    faBroom,
    faWarehouse,
    faBoxOpen,
    faCheckSquare
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'

// Column definitions for each dataset
const DATASETS = {
    plotting: {
        label: 'Plotting Kamar',
        icon: faBed,
        colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        columns: [
            { key: 'name', label: 'Nama Santri', icon: faUser },
            { key: 'class', label: 'Kelas', icon: faSchool },
            { key: 'gender', label: 'Jenis Kelamin', icon: faVenusMars },
            { key: 'room', label: 'Kamar', icon: faHome },
            { key: 'building', label: 'Gedung', icon: faWarehouse },
            { key: 'status', label: 'Status Plotting', icon: faCheckSquare }
        ],
        presets: [
            { id: 'all', label: 'Preset Lengkap', cols: ['name', 'class', 'gender', 'room', 'building', 'status'] },
            { id: 'summary', label: 'Preset Ringkasan', cols: ['name', 'class', 'room'] }
        ]
    },
    cleanliness: {
        label: 'Audit Kebersihan',
        icon: faBroom,
        colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        columns: [
            { key: 'room', label: 'Kamar', icon: faHome },
            { key: 'score', label: 'Skor Rata-rata', icon: faStar },
            { key: 'rating', label: 'Predikat', icon: faSliders },
            { key: 'aspect_kerapian', label: 'Aspek Kerapian', icon: faCheckCircle },
            { key: 'aspect_kebersihan', label: 'Aspek Kebersihan', icon: faCheckCircle },
            { key: 'aspect_keharuman', label: 'Aspek Keharuman', icon: faCheckCircle },
            { key: 'date', label: 'Tanggal Audit', icon: faCalendarAlt },
            { key: 'notes', label: 'Catatan', icon: faFileLines }
        ],
        presets: [
            { id: 'all', label: 'Preset Lengkap', cols: ['room', 'score', 'rating', 'aspect_kerapian', 'aspect_kebersihan', 'aspect_keharuman', 'date', 'notes'] },
            { id: 'summary', label: 'Preset Ringkasan', cols: ['room', 'score', 'rating', 'date'] }
        ]
    },
    inventory: {
        label: 'Inventaris Kamar',
        icon: faBoxOpen,
        colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
        columns: [
            { key: 'dorm', label: 'Kamar', icon: faHome },
            { key: 'item', label: 'Nama Item', icon: faClipboardList },
            { key: 'total', label: 'Total Item', icon: faHashtag },
            { key: 'good', label: 'Kondisi Baik', icon: faCheckCircle },
            { key: 'damaged', label: 'Kondisi Rusak', icon: faTriangleExclamation },
            { key: 'notes', label: 'Catatan', icon: faFileLines },
            { key: 'last_checked', label: 'Terakhir Diperiksa', icon: faCalendarAlt }
        ],
        presets: [
            { id: 'all', label: 'Preset Lengkap', cols: ['dorm', 'item', 'total', 'good', 'damaged', 'notes', 'last_checked'] },
            { id: 'summary', label: 'Preset Ringkasan', cols: ['dorm', 'item', 'total', 'good', 'damaged'] }
        ]
    }
}

export default function DormsExportModal({
    isOpen,
    onClose,
    students = [],
    audits = [],
    inventories = [],
    dorms = [],
    selectedIds = [],
    addToast
}) {
    const [dataset, setDataset] = useState('plotting') // 'plotting' | 'cleanliness' | 'inventory'
    const [exportScope, setExportScope] = useState('all') // 'all' | 'assigned' | 'unassigned' | 'selected'
    const [exportColumns, setExportColumns] = useState([])
    const [fileName, setFileName] = useState('')
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [pdfOrientation, setPdfOrientation] = useState('landscape') // 'landscape' | 'portrait'
    const [includeHeader, setIncludeHeader] = useState(true)
    const [exporting, setExporting] = useState(false)
    const containerRef = useRef(null)

    // Set default columns and filename when opening/changing dataset
    useEffect(() => {
        if (isOpen) {
            const defCols = DATASETS[dataset].presets[0].cols
            setExportColumns(defCols)
            const prefix = dataset === 'plotting' ? 'plotting_kamar' : dataset === 'cleanliness' ? 'audit_kebersihan' : 'inventaris_kamar'
            setFileName(`${prefix}_${new Date().toISOString().slice(0, 10)}`)
        }
    }, [isOpen, dataset])

    useEffect(() => {
        if (exportScope === 'selected' && selectedIds.length === 0) {
            setExportScope('all')
        }
    }, [selectedIds, exportScope])

    // Auto-scroll modal on export start
    useEffect(() => {
        if (exporting && containerRef.current) {
            const scrollContainer = containerRef.current.parentElement
            if (scrollContainer) {
                scrollContainer.scrollTop = 0
            }
        }
    }, [exporting])

    const activePresetId = useMemo(() => {
        const sortedCols = [...exportColumns].sort().join(',')
        const active = DATASETS[dataset].presets.find(preset => {
            const presetSorted = [...preset.cols].sort().join(',')
            return sortedCols === presetSorted
        })
        return active ? active.id : null
    }, [exportColumns, dataset])

    // Count estimation based on dataset and scope
    const estimatedCount = useMemo(() => {
        if (dataset === 'plotting') {
            if (exportScope === 'assigned') return students.filter(s => s.metadata?.kamar).length
            if (exportScope === 'unassigned') return students.filter(s => !s.metadata?.kamar).length
            if (exportScope === 'selected') return selectedIds.length
            return students.length
        }
        if (dataset === 'cleanliness') return audits.length
        if (dataset === 'inventory') return inventories.length
        return 0
    }, [dataset, exportScope, students, audits, inventories, selectedIds])

    if (!isOpen) return null

    const handlePresetClick = (cols) => {
        setExportColumns(cols)
    }

    const currentDatasetDef = DATASETS[dataset]

    // Mapper function for raw data to export row
    const getExportData = () => {
        let rawList = []
        if (dataset === 'plotting') {
            rawList = students
            if (exportScope === 'assigned') rawList = students.filter(s => s.metadata?.kamar)
            else if (exportScope === 'unassigned') rawList = students.filter(s => !s.metadata?.kamar)
            else if (exportScope === 'selected') rawList = students.filter(s => selectedIds.includes(s.id))
        } else if (dataset === 'cleanliness') {
            rawList = audits
        } else if (dataset === 'inventory') {
            rawList = inventories
        }

        return rawList.map(item => {
            const row = {}
            exportColumns.forEach(key => {
                if (dataset === 'plotting') {
                    const roomName = item.metadata?.kamar || ''
                    const dormObj = roomName ? dorms.find(d => d.id === roomName) : null
                    if (key === 'name') row['Nama Santri'] = item.name
                    if (key === 'class') row['Kelas'] = item.classes?.name || '—'
                    if (key === 'gender') row['Jenis Kelamin'] = item.gender === 'putra' ? 'Putra' : item.gender === 'putri' ? 'Putri' : '—'
                    if (key === 'room') row['Kamar'] = roomName || '—'
                    if (key === 'building') row['Gedung'] = dormObj?.building || '—'
                    if (key === 'status') row['Status Plotting'] = roomName ? 'Terplot' : 'Belum Terplot'
                } else if (dataset === 'cleanliness') {
                    if (key === 'room') row['Kamar'] = item.room || '—'
                    if (key === 'score') row['Skor Rata-rata'] = item.score ?? 0
                    if (key === 'rating') row['Predikat'] = item.rating || '—'
                    if (key === 'aspect_kerapian') row['Aspek Kerapian'] = item.aspects?.kerapian ?? 0
                    if (key === 'aspect_kebersihan') row['Aspek Kebersihan'] = item.aspects?.kebersihan ?? 0
                    if (key === 'aspect_keharuman') row['Aspek Keharuman'] = item.aspects?.keharuman ?? 0
                    if (key === 'date') row['Tanggal Audit'] = item.date || '—'
                    if (key === 'notes') row['Catatan'] = item.notes || '—'
                } else if (dataset === 'inventory') {
                    if (key === 'dorm') row['Kamar'] = item.dorm_id || '—'
                    if (key === 'item') row['Nama Item'] = item.item_name || '—'
                    if (key === 'total') row['Total Item'] = item.total_quantity ?? 0
                    if (key === 'good') row['Kondisi Baik'] = item.good_condition_count ?? 0
                    if (key === 'damaged') row['Kondisi Rusak'] = item.damaged_condition_count ?? 0
                    if (key === 'notes') row['Catatan'] = item.notes || '—'
                    if (key === 'last_checked') row['Terakhir Diperiksa'] = item.last_checked_at ? new Date(item.last_checked_at).toLocaleDateString('id-ID') : '—'
                }
            })
            return row
        })
    }

    const downloadBlob = (blob, filename) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const handleExportCSV = async (filename, options = {}) => {
        setExporting(true)
        try {
            const Papa = (await import('papaparse')).default
            const rows = getExportData()
            if (!rows.length) {
                addToast('Tidak ada data asrama untuk diekspor', 'warning')
                return
            }
            const csv = Papa.unparse(rows, { header: options.includeHeader })
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            downloadBlob(blob, `${filename || 'export_asrama'}.csv`)
            addToast(`Berhasil mengekspor ${rows.length} baris data ke CSV`, 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal mengekspor data ke CSV', 'error')
        } finally {
            setExporting(false)
        }
    }

    const handleExportExcel = async (filename) => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const data = getExportData()
            if (!data.length) {
                addToast('Tidak ada data asrama untuk diekspor', 'warning')
                return
            }
            const ws = XLSX.utils.json_to_sheet(data)
            const cols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            ws['!cols'] = cols
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, currentDatasetDef.label)
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            downloadBlob(blob, `${filename || 'export_asrama'}.xlsx`)
            addToast(`Berhasil mengekspor ${data.length} baris data ke Excel`, 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal mengekspor data ke Excel', 'error')
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
            const allRows = getExportData()
            if (!allRows.length) {
                addToast('Tidak ada data asrama untuk diekspor', 'warning')
                return
            }

            const doc = new jsPDF({ orientation: options.orientation || 'landscape' })
            doc.setFontSize(13)
            doc.text(`Ekspor Data - ${currentDatasetDef.label}`, 14, 12)
            doc.setFontSize(8)
            const dateStrLabel = new Date().toLocaleDateString('id-ID')
            doc.text(`Tanggal Cetak: ${dateStrLabel}  |  Total Data: ${allRows.length} rekod`, 14, 18)

            const headers = Object.keys(allRows[0])
            const rows = allRows.map(r => headers.map(h => String(r[h] ?? '')))

            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: 22,
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 2 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            })

            const pageCount = doc.internal.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFontSize(7)
                doc.setTextColor(150)
                const dateStr = new Date().toLocaleString('id-ID')
                doc.text(`Dicetak via LaporanMu pada ${dateStr}`, 14, doc.internal.pageSize.height - 8)
                doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 8)
            }

            doc.save(`${filename || 'export_asrama'}.pdf`)
            addToast(`Berhasil mengekspor ${allRows.length} baris data ke PDF`, 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal mengekspor data ke PDF', 'error')
        } finally {
            setExporting(false)
        }
    }

    const columnButtons = currentDatasetDef.columns.map(({ key, label, icon }) => {
        const orderIdx = exportColumns.indexOf(key) + 1
        const isSelected = orderIdx > 0

        const toggleColumn = () => {
            if (isSelected) {
                setExportColumns(prev => prev.filter(k => k !== key))
            } else {
                setExportColumns(prev => [...prev, key])
            }
        }

        return (
            <button
                key={key}
                onClick={toggleColumn}
                className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border text-left transition-all
                    ${isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-sm'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                `}
            >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all 
                    ${isSelected ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]'}`}>
                    <FontAwesomeIcon icon={icon} className="text-[9px]" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`text-[9px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{label}</div>
                </div>
                {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[8px] font-black flex items-center justify-center shadow-md border border-white dark:border-[var(--color-surface)] animate-in zoom-in duration-200">
                        {orderIdx}
                    </div>
                )}
            </button>
        )
    })

    const exportOptions = {
        includeHeader,
        orientation: pdfOrientation
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ekspor Data Asrama"
            description="Pilih jenis dataset, kolom, cakupan data, dan format file untuk diunduh."
            icon={faFileExport}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="lg"
            mobileVariant="bottom-sheet"
            maxMobileHeight="92vh"
            contentClassName={exporting ? "relative !overflow-hidden" : "relative"}
            footer={
                <div className="flex items-center w-full">
                    <button
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    >
                        Tutup
                    </button>
                    <div className="flex-1" />
                </div>
            }
        >
            <div ref={containerRef}>
                {/* Premium Loading Overlay */}
                {exporting && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-surface)]/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-alt)]/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-[var(--color-border)]/60 rounded-3xl p-8 flex flex-col items-center gap-5 scale-110 animate-in zoom-in-95 duration-300">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 animate-ping opacity-75"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)]/10"></div>
                                <div
                                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] border-r-[var(--color-primary)] animate-spin"
                                    style={{ filter: 'drop-shadow(0 0 4px var(--color-primary))' }}
                                ></div>
                                <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]/60 flex items-center justify-center shadow-sm z-10">
                                    <FontAwesomeIcon icon={faFileExport} className="text-[var(--color-primary)] text-sm animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">Mengekspor</span>
                                <span className="text-[8px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                    Sedang memproses dokumen asrama
                                    <span className="inline-flex gap-0.5 items-center">
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`space-y-6 pb-2 transition-all duration-500 ${exporting ? 'blur-sm grayscale-[0.5] opacity-50 pointer-events-none' : ''}`}>
                    {/* Section 1: Select Dataset */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">1 — Pilih Dataset</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {Object.entries(DATASETS).map(([key, def]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setDataset(key)}
                                    className={`group p-3.5 rounded-2xl border-2 text-left transition-all active:scale-95 flex flex-col justify-between h-24
                                    ${dataset === key
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 transition-all 
                                        ${dataset === key ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 text-[var(--color-text-muted)]'}`}>
                                        <FontAwesomeIcon icon={def.icon} className="text-xs" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-[var(--color-text)] leading-tight">{def.label}</div>
                                        <div className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                                            {key === 'plotting' ? `${students.length} santri` : key === 'cleanliness' ? `${audits.length} audit` : `${inventories.length} item`}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section 1: Scope (Plotting only) */}
                    {dataset === 'plotting' && (
                        <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">2 — Cakupan Data</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { val: 'all', label: 'Semua Santri', desc: `${students.length} Santri`, icon: faUsers },
                                    { val: 'assigned', label: 'Sudah Terplot', desc: `${students.filter(s => s.metadata?.kamar).length} Santri`, icon: faHome },
                                    { val: 'unassigned', label: 'Belum Terplot', desc: `${students.filter(s => !s.metadata?.kamar).length} Santri`, icon: faSliders },
                                    { val: 'selected', label: 'Pilihan UI', desc: `${selectedIds.length} Santri`, icon: faCheckCircle, disabled: selectedIds.length === 0 }
                                ].map(({ val, label, desc, icon, disabled }) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => !disabled && setExportScope(val)}
                                        disabled={disabled}
                                        className={`group p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20
                                        ${exportScope === val
                                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                                        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                        `}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={icon} className={`text-[9px] ${exportScope === val ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
                                            <span className="text-[9px] font-black text-[var(--color-text)] leading-tight truncate">{label}</span>
                                        </div>
                                        <div className="text-[9px] font-bold text-[var(--color-text-muted)] leading-tight">{desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section 3: Columns */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">3 — Kolom &amp; Presets</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handlePresetClick(currentDatasetDef.columns.map(c => c.key))} className="text-[9px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest bg-[var(--color-primary)]/5 px-2 py-1 rounded-lg transition-colors">Semua Kolom</button>
                                <button type="button" onClick={() => handlePresetClick(currentDatasetDef.presets[1].cols)} className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-widest bg-rose-500/5 px-2 py-1 rounded-lg transition-colors">Reset</button>
                            </div>
                        </div>

                        {/* Presets Sub-section with label and horizontal scroll */}
                        <div className="flex flex-col gap-2 p-3 bg-[var(--color-surface-alt)]/40 rounded-2xl border border-[var(--color-border)]/50">
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
                                <FontAwesomeIcon icon={faTags} className="text-[9px]" />
                                <span>Pilih Cepat Preset</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {currentDatasetDef.presets.map(preset => {
                                    const isActive = activePresetId === preset.id
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => handlePresetClick(preset.cols)}
                                            className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0
                                                ${isActive
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'}`}
                                        >
                                            {preset.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Divider Line */}
                        <div className="relative flex items-center justify-center my-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dashed border-[var(--color-border)]/65"></div>
                            </div>
                            <div className="relative bg-[var(--color-surface)] px-3 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">
                                Pilih Kustom Kolom (Tekan untuk Mengurutkan)
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {columnButtons}
                        </div>
                    </div>

                    {/* Section 4: Filename & Advanced */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">4 — Konfigurasi Nama &amp; Opsi</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder="Masukkan nama file ekspor..."
                                    className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all placeholder:opacity-50 pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[var(--color-border)] text-[8px] font-black uppercase text-[var(--color-text-muted)]">
                                    .xlsx / .csv / .pdf
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-black
                                    ${advancedOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}
                            >
                                <FontAwesomeIcon icon={faGear} className={advancedOpen ? 'animate-spin-slow' : ''} />
                                Opsi Lanjutan
                            </button>
                        </div>

                        {advancedOpen && (
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faHeading} />
                                        Sertakan Baris Judul Kolom (Header)
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[{ v: true, l: 'Ya' }, { v: false, l: 'Tidak' }].map(opt => (
                                            <button
                                                key={String(opt.v)}
                                                type="button"
                                                onClick={() => setIncludeHeader(opt.v)}
                                                className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all ${includeHeader === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faArrowsLeftRight} />
                                        Orientasi PDF
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[
                                            { v: 'landscape', l: 'Landscape', icon: faArrowsLeftRight },
                                            { v: 'portrait', l: 'Portrait', icon: faArrowsUpDown }
                                        ].map(opt => (
                                            <button
                                                key={opt.v}
                                                type="button"
                                                onClick={() => setPdfOrientation(opt.v)}
                                                className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${pdfOrientation === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                <FontAwesomeIcon icon={opt.icon} className="text-[8px]" />
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 5: Format Grid */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">5 — Mulai Unduh File</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { label: 'CSV', icon: faFileCsv, desc: 'Universal', onClick: () => handleExportCSV(fileName, exportOptions), color: 'hover:border-slate-400 hover:bg-slate-50', iconColor: 'text-slate-500' },
                                { label: 'Excel', icon: faFileExcel, desc: '.xlsx', onClick: () => handleExportExcel(fileName), color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-500' },
                                { label: 'PDF Tabel', icon: faFilePdf, desc: 'Tabel', onClick: () => handleExportPDF(fileName, exportOptions), color: 'hover:border-rose-400 hover:bg-rose-50 text-rose-700', iconColor: 'text-rose-500' },
                            ].map(({ label, icon, desc, onClick, color, iconColor }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={onClick}
                                    disabled={exporting || exportColumns.length === 0 || estimatedCount === 0}
                                    className={`relative group h-24 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${color}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${iconColor} bg-[var(--color-surface-alt)]`}>
                                        <FontAwesomeIcon icon={icon} className="text-xl" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                                    <span className="text-[8px] font-bold opacity-60 uppercase">{desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {exportColumns.length === 0 && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 text-xs font-black uppercase tracking-tight animate-pulse">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                            Wajib memilih minimal 1 kolom untuk mengekspor data!
                        </div>
                    )}

                    {estimatedCount === 0 && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-tight">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                            Tidak ada rekod data untuk cakupan atau filter yang dipilih!
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
