import React, { useState } from 'react'
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
    faBarcode,
    faIdCardClip,
    faUser,
    faVenusMars,
    faBook,
    faStar,
    faCircleQuestion,
    faTags,
    faChartPie,
    faArrowDownAZ,
    faFileExcel,
    faFileCsv,
    faFilePdf,
    faChevronDown,
    faGear,
    faHeading,
    faArrowsLeftRight,
    faArrowsUpDown,
    faCalendarAlt,
    faMapMarkerAlt,
    faEnvelope
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import Modal from '../ui/Modal'

const COLUMN_DEFS = [
    { key: 'nama', label: 'Nama', icon: faUser },
    { key: 'nbm', label: 'NBM', icon: faBarcode },
    { key: 'subject', label: 'Mata Pelajaran', icon: faBook },
    { key: 'gender', label: 'Gender', icon: faVenusMars },
    { key: 'phone', label: 'Whatsapp', icon: faWhatsapp },
    { key: 'email', label: 'Email', icon: faEnvelope },
    { key: 'status', label: 'Status', icon: faCircleQuestion },
    { key: 'join_date', label: 'Tgl Bergabung', icon: faCalendarAlt },
    { key: 'address', label: 'Alamat', icon: faMapMarkerAlt },
]

const PRESETS = [
    { id: 'all', label: 'Data Lengkap', cols: ['nama', 'nbm', 'subject', 'gender', 'phone', 'email', 'status', 'join_date', 'address'] },
    { id: 'contact', label: 'Kontak', cols: ['nama', 'phone', 'email'] },
    { id: 'employment', label: 'Kepegawaian', cols: ['nama', 'nbm', 'status', 'join_date'] },
    { id: 'academic', label: 'Akademik', cols: ['nama', 'subject'] },
]

export default function TeacherExportModal({
    isOpen,
    onClose,
    teachers,
    selectedTeacherIds,
    exportScope,
    setExportScope,
    exportColumns,
    setExportColumns,
    exporting,
    handleExportCSV,
    handleExportExcel,
    handleExportPDF,
    addToast,
}) {
    const [fileName, setFileName] = useState(`Data Guru ${new Date().toISOString().slice(0, 10)}`)
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [pdfOrientation, setPdfOrientation] = useState('landscape') // 'landscape' | 'portrait'
    const [includeHeader, setIncludeHeader] = useState(true)

    if (!isOpen) return null

    const handlePresetClick = (cols) => {
        setExportColumns(cols)
        addToast?.('Preset berhasil diterapkan', 'success')
    }

    const columnButtons = COLUMN_DEFS.map(({ key, label, icon }) => {
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
            title="Export Data Guru"
            description="Cadangkan atau pindahkan data guru ke format CSV, Excel, atau PDF dengan opsi enterprise."
            icon={faFileExport}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="lg"
            mobileVariant="bottom-sheet"
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
            <div className="relative">
                {/* Overlay Loading Premium */}
                {exporting && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-surface)]/40 backdrop-blur-md rounded-2xl animate-in fade-in duration-300">
                        <div className="bg-[var(--color-surface)] shadow-2xl border border-[var(--color-border)] rounded-3xl p-8 flex flex-col items-center gap-4 scale-110 animate-in zoom-in-95 duration-300">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-[var(--color-primary)]/10 border-t-[var(--color-primary)] animate-spin"></div>
                                <FontAwesomeIcon icon={faFileExport} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--color-primary)] text-xl animate-pulse" />
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Mengolah Data</span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase mt-1">Mohon tunggu sebentar...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`space-y-6 pb-2 transition-all duration-500 ${exporting ? 'blur-sm grayscale-[0.5] opacity-50 pointer-events-none' : ''}`}>
                    {/* Section 1: Scope */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">1 — Jangkauan Data</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { val: 'filtered', label: 'Filter Aktif', desc: `${teachers.length} guru`, icon: faSliders },
                                { val: 'selected', label: 'Dipilih', desc: `${selectedTeacherIds.length} guru`, icon: faCheckCircle, disabled: selectedTeacherIds.length === 0 },
                                { val: 'all', label: 'Semua', desc: 'Tanpa filter', icon: faUsers },
                            ].map(({ val, label, desc, icon, disabled }) => (
                                <button
                                    key={val}
                                    onClick={() => !disabled && setExportScope(val)}
                                    disabled={disabled}
                                    className={`group p-3 rounded-2xl border-2 text-left transition-all
                                    ${exportScope === val
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                                    ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-all 
                                        ${exportScope === val ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10'}`}>
                                        <FontAwesomeIcon icon={icon} className="text-xs" />
                                    </div>
                                    <div className="text-xs font-black text-[var(--color-text)] mb-0.5">{label}</div>
                                    <div className="text-[9px] font-bold text-[var(--color-text-muted)] leading-tight">{desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section 2: Columns */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">2 — Kolom & Presets</p>
                            <div className="flex gap-2">
                                <button onClick={() => handlePresetClick(COLUMN_DEFS.map(c => c.key))} className="text-[9px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest bg-[var(--color-primary)]/5 px-2 py-1 rounded-lg transition-colors">Semua</button>
                                <button onClick={() => handlePresetClick(['nama', 'subject'])} className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-widest bg-rose-500/5 px-2 py-1 rounded-lg transition-colors">Reset</button>
                            </div>
                        </div>

                        {/* Presets Row */}
                        <div className="flex flex-wrap gap-2 mb-1">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetClick(preset.cols)}
                                    className="px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all active:scale-95"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {columnButtons}
                        </div>
                    </div>

                    {/* Section 3: Filename & Advanced */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">3 — Konfigurasi File</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder="Nama file export..."
                                    className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all placeholder:opacity-50 pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[var(--color-border)] text-[8px] font-black uppercase text-[var(--color-text-muted)]">
                                    .xlsx / .pdf
                                </div>
                            </div>
                            <button
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-black
                                    ${advancedOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}
                            >
                                <FontAwesomeIcon icon={faGear} className={advancedOpen ? 'animate-spin-slow' : ''} />
                                Opsi
                            </button>
                        </div>

                        {advancedOpen && (
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faHeading} />
                                        Sertakan Header
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[{ v: true, l: 'Ya' }, { v: false, l: 'Tidak' }].map(opt => (
                                            <button
                                                key={String(opt.v)}
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
                                        PDF Orientasi
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[
                                            { v: 'landscape', l: 'LS', icon: faArrowsLeftRight },
                                            { v: 'portrait', l: 'PT', icon: faArrowsUpDown }
                                        ].map(opt => (
                                            <button
                                                key={opt.v}
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

                    {/* Section 4: Format Grid */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">4 — Mulai Ekspor</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {[
                                { label: 'CSV', icon: faFileCsv, desc: 'Universal', onClick: () => handleExportCSV(fileName, exportOptions), color: 'hover:border-slate-400 hover:bg-slate-50', iconColor: 'text-slate-500' },
                                { label: 'Excel', icon: faFileExcel, desc: '.xlsx', onClick: () => handleExportExcel(fileName), color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-500' },
                                { label: 'PDF Tabel', icon: faFilePdf, desc: 'Tabel', onClick: () => handleExportPDF(fileName, exportOptions), color: 'hover:border-rose-400 hover:bg-rose-50 text-rose-700', iconColor: 'text-rose-500' },
                            ].map(({ label, icon, desc, onClick, color, iconColor }) => (
                                <button
                                    key={label}
                                    onClick={onClick}
                                    disabled={exporting || exportColumns.length === 0}
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
                            Pilih minimal satu kolom untuk melanjutkan
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
