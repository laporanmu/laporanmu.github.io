import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowLeft,
    faArrowRight,
    faArrowRightArrowLeft,
    faCheck,
    faChevronDown,
    faDownload,
    faFileLines,
    faSpinner,
    faFilter,
    faTags,
    faUpload,
    faFileImport,
    faCheckCircle,
    faCopy,
    faCircleExclamation,
    faTriangleExclamation,
    faPen,
    faTrash,
    faRotate,
    faBolt,
    faBook
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

export default function TeacherImportModal(props) {
    const {
        isOpen,
        onClose,
        importing,
        importStep,
        setImportStep,
        importPreview,
        importDuplicates,
        importFileName,
        importFileInputRef,
        importDragOver,
        setImportDragOver,
        processImportFile,
        subjectsList,
        handleDownloadTemplate,
        importFileHeaders,
        SYSTEM_COLS,
        importColumnMapping,
        setImportColumnMapping,
        importRawData,
        importLoading,
        setImportLoading,
        buildImportPreview,
        importIssues,
        importValidationOpen,
        setImportValidationOpen,
        importProgress,
        handleCommitImport,
        handleImportClick,
        hasImportBlockingErrors,
        importReadyRows,
        handleImportCellEdit,
        importEditCell,
        setImportEditCell,
        handleRemoveImportRow,
        importSkipDupes,
        setImportSkipDupes,
        handleBulkFix,
        STATUS_CONFIG
    } = props

    const [showSubjects, setShowSubjects] = useState(false)
    const [filterIssuesOnly, setFilterIssuesOnly] = useState(false)

    // Inline Editor Component
    const EditableCell = React.memo(({ rowIdx, colKey, value, importPreview, subjectsList, importEditCell, setImportEditCell, handleImportCellEdit, STATUS_CONFIG }) => {
        const isEditing = importEditCell?.row === rowIdx && importEditCell?.col === colKey
        const [searchTerm, setSearchTerm] = useState('')
        const cellRef = useRef(null)
        const [coords, setCoords] = useState(null)

        React.useLayoutEffect(() => {
            if (isEditing && cellRef.current) {
                const rect = cellRef.current.getBoundingClientRect()
                setCoords({
                    anchorTop: rect.top,
                    left: rect.left,
                    width: rect.width
                })
            } else {
                setCoords(null)
            }
        }, [isEditing])

        const renderDropdown = (content) => {
            if (!coords) return null

            return createPortal(
                <div
                    className="fixed z-[9999]"
                    style={{
                        bottom: (window.innerHeight - coords.anchorTop) + 8,
                        left: coords.left,
                        minWidth: Math.max(coords.width, colKey === 'subject' ? 220 : 140)
                    }}
                >
                    <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-primary)] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl border-t-[var(--color-primary)]">
                        {content}
                    </div>
                    <div className="fixed inset-0 -z-10 bg-black/0" onClick={() => setImportEditCell(null)} />
                </div>,
                document.body
            )
        }

        if (isEditing) {
            if (colKey === 'subject') {
                const filteredSubjects = subjectsList.filter(s =>
                    s.toLowerCase().includes(searchTerm.toLowerCase())
                )

                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black border border-[var(--color-primary)] shadow-sm">
                            {value || 'Pilih...'}
                        </div>
                        {renderDropdown(
                            <>
                                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent text-[10px] font-bold outline-none placeholder:font-normal placeholder:opacity-30"
                                        placeholder="Cari mata pelajaran..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') setImportEditCell(null)
                                            if (e.key === 'Enter' && filteredSubjects.length > 0) {
                                                handleImportCellEdit(rowIdx, colKey, filteredSubjects[0])
                                                setImportEditCell(null)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="max-h-[160px] overflow-auto py-1 scrollbar-none">
                                    {filteredSubjects.length > 0 ? filteredSubjects.map(s => (
                                        <button
                                            key={s}
                                            className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between group"
                                            onClick={() => {
                                                handleImportCellEdit(rowIdx, colKey, s)
                                                setImportEditCell(null)
                                            }}
                                        >
                                            <span className="truncate">{s}</span>
                                            {value === s && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-3 text-[9px] text-[var(--color-text-muted)] italic text-center">Data tidak ditemukan</div>
                                    )}
                                </div>
                                <button
                                    className="p-2 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-red-500 transition-colors border-t border-[var(--color-border)]"
                                    onClick={() => setImportEditCell(null)}
                                >
                                    Batal
                                </button>
                            </>
                        )}
                    </div>
                )
            }

            if (colKey === 'gender') {
                const options = [
                    { id: 'L', name: 'Laki-laki' },
                    { id: 'P', name: 'Perempuan' }
                ]
                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black uppercase text-center border border-[var(--color-primary)] shadow-sm">
                            {value || '-'}
                        </div>
                        {renderDropdown(
                            <div className="py-1">
                                {options.map(opt => (
                                    <button
                                        key={opt.id}
                                        className="w-full px-4 py-2.5 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between"
                                        onClick={() => {
                                            handleImportCellEdit(rowIdx, colKey, opt.id)
                                            setImportEditCell(null)
                                        }}
                                    >
                                        <span>{opt.name}</span>
                                        {value === opt.id && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            if (colKey === 'status') {
                const options = Object.entries(STATUS_CONFIG).map(([k, v]) => ({ id: k, label: v.label }))
                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black uppercase text-center border border-[var(--color-primary)] shadow-sm">
                            {STATUS_CONFIG[value]?.label || value || '-'}
                        </div>
                        {renderDropdown(
                            <div className="py-1">
                                {options.map(opt => (
                                    <button
                                        key={opt.id}
                                        className="w-full px-4 py-2.5 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between"
                                        onClick={() => {
                                            handleImportCellEdit(rowIdx, colKey, opt.id)
                                            setImportEditCell(null)
                                        }}
                                    >
                                        <span>{opt.label}</span>
                                        {value === opt.id && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            return (
                <input
                    autoFocus
                    className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-primary)] rounded-lg px-2 py-1 text-[10px] font-black outline-none shadow-lg transition-all"
                    value={value || ''}
                    onChange={(e) => handleImportCellEdit(rowIdx, colKey, e.target.value)}
                    onBlur={() => setImportEditCell(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setImportEditCell(null)}
                />
            )
        }

        const isCentered = ['gender', 'status'].includes(colKey)
        const displayValue = colKey === 'status' ? (STATUS_CONFIG[value]?.label || value || '-') : (value || '-')
        const isEmpty = !value || value === '-'

        return (
            <div
                className={`group cursor-pointer hover:bg-[var(--color-primary)]/5 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all flex items-center ${isCentered ? 'justify-center' : 'justify-between'} gap-2 min-h-[20px] ${isEmpty ? 'text-red-500/40 italic font-normal' : ''}`}
                onClick={() => setImportEditCell({ row: rowIdx, col: colKey })}
            >
                <span className={isCentered ? '' : 'truncate'}>{displayValue}</span>
                {!isCentered && <FontAwesomeIcon icon={faPen} className="text-[7px] opacity-0 group-hover:opacity-30 transition-opacity" />}
            </div>
        )
    })

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Data Guru"
            description="Unggah data guru secara masal dari file Excel atau CSV. Sistem akan memvalidasi data secara otomatis."
            icon={faFileImport}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center justify-between gap-3">
                    {importStep > 1 && (
                        <button
                            onClick={() => setImportStep(v => v - 1)}
                            disabled={importing}
                            className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-[var(--color-border)] transition-all flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Kembali
                        </button>
                    )}

                    <div className="flex items-center gap-3 ml-auto">
                        {importing && (
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)]" />
                                {importProgress.done}/{importProgress.total}
                            </span>
                        )}

                        {importStep === 1 ? (
                            <button
                                onClick={() => (importRawData.length > 0 && importFileName) ? setImportStep(2) : importFileInputRef.current?.click()}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {(importRawData.length > 0 && importFileName) ? (
                                    <>Lanjutkan <FontAwesomeIcon icon={faArrowRight} /></>
                                ) : (
                                    <>Pilih File <FontAwesomeIcon icon={faUpload} /></>
                                )}
                            </button>
                        ) : importStep === 2 ? (
                            <button
                                onClick={async () => {
                                    setImportStep(3)
                                    setImportLoading(true)
                                    await buildImportPreview(importRawData, importColumnMapping)
                                    setImportLoading(false)
                                }}
                                disabled={!importColumnMapping.name}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                Review Data <FontAwesomeIcon icon={faArrowRight} />
                            </button>
                        ) : (
                            <button
                                onClick={handleCommitImport}
                                disabled={importing || hasImportBlockingErrors || importReadyRows.length === 0}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {importing
                                    ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengimport...</>
                                    : <><FontAwesomeIcon icon={faCheck} /> Selesaikan Import</>}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            {/* Header Progress Steppers */}
            <div className="flex items-center justify-center gap-3 mb-6">
                {[
                    { step: 1, label: 'Upload', desc: 'Pilih File' },
                    { step: 2, label: 'Mapping', desc: 'Atur Kolom' },
                    { step: 3, label: 'Review', desc: 'Validasi' },
                ].map((s, idx) => (
                    <React.Fragment key={s.step}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all shadow-sm
                                ${importStep >= s.step ? 'bg-[var(--color-primary)] text-white scale-110' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] opacity-40'}`}>
                                {importStep > s.step ? <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> : s.step}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-wider leading-none ${importStep >= s.step ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{s.label}</span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-tight mt-1">{s.desc}</span>
                            </div>
                        </div>
                        {s.step < 3 && <div className={`w-6 h-0.5 rounded-full transition-all ${importStep > s.step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)] opacity-30'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* File Status Bar */}
            {importFileName && (
                <div className="flex items-center justify-between gap-4 mb-6 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 shrink-0 shadow-sm">
                            <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
                            <span className="text-[10.5px] font-black truncate max-w-[240px]">{importFileName}</span>
                        </div>
                        {importPreview.length > 0 && (
                            <div className="px-3.5 py-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black shadow-sm shrink-0">
                                {importPreview.length} baris
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm group"
                    >
                        <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[9px] group-hover:rotate-180 transition-transform duration-500" />
                        Ganti File
                    </button>
                </div>
            )}

            {importStep === 1 && (
                <div className="space-y-2.5">
                    <div
                        onDragOver={e => { e.preventDefault(); setImportDragOver(true) }}
                        onDragLeave={() => setImportDragOver(false)}
                        onDrop={async e => {
                            e.preventDefault()
                            setImportDragOver(false)
                            const file = e.dataTransfer.files?.[0]
                            if (file) await processImportFile(file)
                        }}
                        onClick={() => importFileInputRef.current?.click()}
                        className={`w-full h-14 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center gap-3 transition-all
                        ${importDragOver
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                                : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/4 hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/8'}`}
                    >
                        <FontAwesomeIcon icon={faUpload} className={`text-sm transition-all ${importDragOver ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-primary)]/60'}`} />
                        <div className="text-left">
                            <p className="text-[11px] font-black text-[var(--color-primary)] uppercase tracking-wider leading-none">
                                {importDragOver ? 'Lepaskan file di sini' : 'Drag & Drop atau Klik untuk Pilih File'}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1 opacity-60">Mendukung .csv dan .xlsx</p>
                        </div>
                    </div>

                    <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                            <button
                                onClick={() => setShowSubjects(!showSubjects)}
                                className="flex items-center gap-2 group outline-none"
                            >
                                <span className="text-[10.5px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5 opacity-80 group-hover:text-[var(--color-text)] transition-colors">
                                    <FontAwesomeIcon icon={faBook} className="text-emerald-500/70" /> Daftar Mapel Valid
                                </span>
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`text-[9px] text-[var(--color-text-muted)] transition-transform duration-300 ${showSubjects ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <button
                                onClick={handleDownloadTemplate}
                                className="shrink-0 h-7 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                            >
                                <FontAwesomeIcon icon={faDownload} className="text-[10px]" /> Template
                            </button>
                        </div>

                        <div className={`grid transition-all duration-300 ease-in-out ${showSubjects ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="px-3 pb-3 pt-0">
                                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1 pb-1 custom-scrollbar">
                                        {subjectsList.length > 0 ? subjectsList.map(s => (
                                            <span key={s} className="px-2 py-0.5 rounded-lg bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text)] shrink-0 hover:border-emerald-500/30 transition-colors">
                                                {s}
                                            </span>
                                        )) : (
                                            <span className="text-[11px] text-[var(--color-text-muted)] italic">Belum ada mata pelajaran yang terdaftar.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm">
                        <div className="px-4 py-3 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Kolom yang Dikenali</span>
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 px-2.5 py-1 rounded-full bg-[var(--color-border)]/30">Auto-Matching Active</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
                            <div className="flex flex-col">
                                {[
                                    { label: 'Nama Lengkap', keys: 'name, nama', req: true, note: 'Diidentifikasi sebagai Nama Guru' },
                                    { label: 'NBM', keys: 'nbm', req: false, note: 'Nomor Baku Muhammadiyah' },
                                    { label: 'Mata Pelajaran', keys: 'subject, mapel', req: false, note: 'Sesuai daftar di atas' },
                                ].map((r, i) => (
                                    <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-[var(--color-surface-alt)]/30 transition-colors border-b border-[var(--color-border)] last:border-b-0">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[11px] font-black text-[var(--color-text)]">{r.label}</span>
                                                {r.req && <span className="text-red-500 text-[11px] font-black">*</span>}
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium truncate opacity-70">{r.note}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1.5">
                                            {r.keys.split(', ').map(k => (
                                                <span key={k} className="px-2 py-0.5 rounded-lg bg-[var(--color-primary)]/5 text-[var(--color-primary)] text-[10px] font-black border border-[var(--color-primary)]/10">
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col">
                                {[
                                    { label: 'Jenis Kelamin', keys: 'gender, jk', req: false, note: 'L (Laki) / P (Perempuan)' },
                                    { label: 'No. WhatsApp', keys: 'phone, no_hp', req: false, note: '08xx atau +62xxx' },
                                    { label: 'Email', keys: 'email', req: false, note: 'Email institusi/pribadi' },
                                ].map((r, i) => (
                                    <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-[var(--color-surface-alt)]/30 transition-colors border-b border-[var(--color-border)] last:border-b-0">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[11px] font-black text-[var(--color-text)]">{r.label}</span>
                                                {r.req && <span className="text-red-500 text-[11px] font-black">*</span>}
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium truncate opacity-70">{r.note}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1.5">
                                            {r.keys.split(', ').map(k => (
                                                <span key={k} className="px-2 py-0.5 rounded-lg bg-[var(--color-primary)]/5 text-[var(--color-primary)] text-[10px] font-black border border-[var(--color-primary)]/10">
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {importStep === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Cocokkan Kolom File</span>
                        <span className="text-[9px] font-bold py-1 px-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                            {importFileHeaders.length} kolom ditemukan
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                        {SYSTEM_COLS.map(sys => {
                            const mapped = importColumnMapping[sys.key]
                            return (
                                <div key={sys.key} className={`p-2.5 rounded-xl border transition-all ${mapped ? 'bg-emerald-500/4 border-emerald-500/20' : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)]'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col min-w-[70px] shrink-0">
                                            <span className="text-[10px] font-black text-[var(--color-text)] flex items-center gap-1">
                                                {sys.label}
                                                {['name'].includes(sys.key) && <span className="text-red-500 text-[9px]">*</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-tight">Sistem</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 opacity-30">
                                            <FontAwesomeIcon icon={faArrowRight} className={`text-[8px] ${mapped ? 'text-emerald-500 opacity-100' : ''}`} />
                                        </div>

                                        <div className="flex-1 min-w-0 relative">
                                            <select
                                                value={mapped || ''}
                                                onChange={(e) => setImportColumnMapping(v => ({ ...v, [sys.key]: e.target.value }))}
                                                className={`w-full h-8 px-2.5 pr-6 rounded-lg text-[10px] font-bold border transition-all outline-none appearance-none cursor-pointer
                                                ${mapped
                                                        ? 'border-emerald-500/40 bg-[var(--color-surface)] text-emerald-600'
                                                        : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'}`}
                                            >
                                                <option value="">-- Lewati Kolom --</option>
                                                {importFileHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                                                <FontAwesomeIcon icon={faChevronDown} className="text-[7px]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {importStep === 3 && (
                <div className="space-y-4">
                    {importLoading ? (
                        <div className="flex items-center justify-center py-14 text-[var(--color-text-muted)] gap-2">
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                            <span className="text-xs font-bold">Memproses preview...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] shadow-sm">
                                <div className="flex items-center gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]/50">
                                    {[
                                        { label: 'Total Baris', value: importPreview.length, color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-border)]/20', icon: faFileLines },
                                        { label: 'Siap Import', value: importReadyRows.length, color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: faCheckCircle },
                                        { label: 'Ada Isu/Error', value: importPreview.filter(r => r._hasError).length, color: 'text-red-600', bg: 'bg-red-500/10', icon: faCircleExclamation },
                                    ].map((stat, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${stat.bg} ${stat.color} transition-all`} title={stat.label}>
                                            <FontAwesomeIcon icon={stat.icon} className="text-[10px] opacity-70" />
                                            <span className="text-[11px] font-black">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setImportSkipDupes(!importSkipDupes)}
                                        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all
                                            ${importSkipDupes
                                                ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-violet-500/40 hover:text-violet-600'}`}
                                    >
                                        <FontAwesomeIcon icon={faCopy} className="text-[9px]" />
                                        <span>{importSkipDupes ? 'Lewati Duplikat' : 'Ikutkan Duplikat'}</span>
                                    </button>

                                    <button
                                        onClick={() => setFilterIssuesOnly(!filterIssuesOnly)}
                                        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all
                                            ${filterIssuesOnly
                                                ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-red-500/40 hover:text-red-500'}`}
                                    >
                                        <FontAwesomeIcon icon={filterIssuesOnly ? faCheck : faFilter} className="text-[9px]" />
                                        <span>{filterIssuesOnly ? 'Hanya Isu' : 'Semua'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm">
                                <div className="max-h-[40vh] overflow-auto scrollbar-none">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[20%]">Nama</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[20%]">Mapel</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[10%]">L/P</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[18%]">Kontak</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[15%]">Status</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[10%]">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importPreview
                                                .map((r, originalIdx) => ({ ...r, originalIdx }))
                                                .filter(r => !filterIssuesOnly || (r._hasError || r._isDupe || r._hasWarn))
                                                .map((r) => {
                                                    const i = r.originalIdx
                                                    const isError = r._hasError
                                                    const isDupe = r._isDupe
                                                    const isWarn = r._hasWarn
                                                    return (
                                                        <tr key={i} className={`hover:bg-[var(--color-surface-alt)]/40 transition-colors border-b border-[var(--color-border)]/30 last:border-0 ${isError ? 'bg-red-500/3' : isDupe ? 'bg-violet-500/3' : ''}`}>
                                                            <td className="px-2 py-0.5 font-bold text-[var(--color-text)] text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="name" value={r.name}
                                                                    importPreview={importPreview} subjectsList={subjectsList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit} STATUS_CONFIG={STATUS_CONFIG}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-[var(--color-text-muted)] font-bold text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="subject" value={r.subject}
                                                                    importPreview={importPreview} subjectsList={subjectsList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit} STATUS_CONFIG={STATUS_CONFIG}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-center text-[var(--color-text-muted)] font-bold text-[10px]">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="gender" value={r.gender}
                                                                    importPreview={importPreview} subjectsList={subjectsList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit} STATUS_CONFIG={STATUS_CONFIG}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-[var(--color-text-muted)] font-bold text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="phone" value={r.phone}
                                                                    importPreview={importPreview} subjectsList={subjectsList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit} STATUS_CONFIG={STATUS_CONFIG}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-center text-[var(--color-text-muted)] font-bold text-[10px]">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="status" value={r.status}
                                                                    importPreview={importPreview} subjectsList={subjectsList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit} STATUS_CONFIG={STATUS_CONFIG}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {isError ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/15 text-red-600 animate-pulse"><FontAwesomeIcon icon={faCircleExclamation} className="text-[10px]" /></span>
                                                                        : isDupe ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/15 text-violet-600"><FontAwesomeIcon icon={faCopy} className="text-[10px]" /></span>
                                                                            : isWarn ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" /></span>
                                                                                : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/15 text-green-600"><FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /></span>}

                                                                    <button
                                                                        onClick={() => handleRemoveImportRow(i)}
                                                                        className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center group/del"
                                                                        title="Hapus Baris"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} className="text-[9px] group-hover/del:scale-110 transition-transform" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span>Menampilkan {importPreview.filter(r => !filterIssuesOnly || (r._hasError || r._isDupe || r._hasWarn)).length} dari {importPreview.length} total baris</span>
                                        <div className="w-px h-3 bg-[var(--color-border)]" />
                                        <span className="text-emerald-600 flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" />
                                            {importReadyRows.length} baris siap diimport
                                        </span>
                                    </div>
                                    {filterIssuesOnly && <span className="text-red-500 animate-pulse">Filter "Hanya Isu" Aktif</span>}
                                </div>
                            </div>

                            {importIssues.length > 0 && (
                                <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]/20">
                                    <button
                                        type="button"
                                        onClick={() => setImportValidationOpen(v => !v)}
                                        className="w-full px-3 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between hover:bg-[var(--color-border)]/30 transition-colors cursor-pointer"
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faChevronDown} className={`text-[7px] transition-transform ${importValidationOpen ? '' : '-rotate-90'}`} />
                                            Catatan Validasi
                                        </span>
                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50">{importIssues.length} isu</span>
                                    </button>
                                    {importValidationOpen && <div className="max-h-[140px] overflow-auto divide-y divide-[var(--color-border)]">
                                        {importIssues.map((issue, idx) => {
                                            const levelStyle = issue.level === 'error'
                                                ? { pill: 'bg-red-500/15 text-red-600', row: 'border-l-2 border-l-red-500 bg-red-500/3' }
                                                : issue.level === 'dupe'
                                                    ? { pill: 'bg-violet-500/15 text-violet-600', row: 'border-l-2 border-l-violet-500 bg-violet-500/3' }
                                                    : { pill: 'bg-amber-500/15 text-amber-600', row: 'border-l-2 border-l-amber-400 bg-amber-500/3' }
                                            return (
                                                <div key={idx} className={`flex items-start gap-3 px-3 py-2 ${levelStyle.row}`}>
                                                    <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black ${levelStyle.pill}`}>
                                                        {issue.level === 'dupe' ? 'DUPLIKAT' : issue.level.toUpperCase()}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[9px] font-black text-[var(--color-text-muted)] mb-0.5">Baris {issue.row}</p>
                                                        {issue.messages.map((msg, mi) => (
                                                            <p key={mi} className="text-[10px] font-bold text-[var(--color-text)] leading-snug">{msg}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    )
}
