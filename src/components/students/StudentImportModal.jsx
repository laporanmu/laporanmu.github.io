import React from 'react'
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
    faTableList,
    faTags,
    faUpload,
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

export default function StudentImportModal(props) {
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
        classesList,
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
        hasImportBlockingErrors,
        importReadyRows,
    } = props

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Siswa"
            size="md"
        >
            {importStep === 2 && importPreview.length > 0 && (
                <div className="flex items-center gap-2 -mt-1 mb-4 flex-wrap">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[200px]">
                        <FontAwesomeIcon icon={faFileLines} className="text-[10px] shrink-0" />
                        {importFileName}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)]">
                        {importPreview.length} baris
                    </span>
                    {importDuplicates.length > 0 && (
                        <span className="px-2.5 py-1 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[10px] font-black text-violet-600">
                            {importDuplicates.length} duplikat
                        </span>
                    )}
                    <button
                        onClick={() => importFileInputRef.current?.click()}
                        className="ml-auto shrink-0 px-2.5 py-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 hover:text-[var(--color-text)] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[8px]" />
                        Ganti File
                    </button>
                </div>
            )}

            <div className="flex items-center justify-center gap-3 mb-5">
                {[
                    { step: 1, label: 'Upload', icon: faUpload, desc: 'Pilih File' },
                    { step: 2, label: 'Mapping', icon: faArrowRightArrowLeft, desc: 'Atur Kolom' },
                    { step: 3, label: 'Review', icon: faTableList, desc: 'Validasi' },
                ].map(s => (
                    <React.Fragment key={s.step}>
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${importStep >= s.step ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                {importStep > s.step ? <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> : s.step}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${importStep >= s.step ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{s.label}</span>
                                <span className="text-[7px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-tighter mt-0.5">{s.desc}</span>
                            </div>
                        </div>
                        {s.step < 3 && <div className={`w-6 h-0.5 rounded-full transition-all ${importStep > s.step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)] opacity-30'}`} />}
                    </React.Fragment>
                ))}
            </div>

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
                            <p className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-widest leading-none">
                                {importDragOver ? 'Lepaskan file di sini' : 'Drag & Drop atau Klik untuk Pilih File'}
                            </p>
                            <p className="text-[8px] text-[var(--color-text-muted)] font-bold mt-0.5 opacity-60">Mendukung .csv dan .xlsx</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5 opacity-80">
                                <FontAwesomeIcon icon={faTags} className="text-emerald-500/70" /> Daftar Kelas Valid
                            </span>
                            <button
                                onClick={handleDownloadTemplate}
                                className="shrink-0 h-6 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                            >
                                <FontAwesomeIcon icon={faDownload} className="text-[7px]" /> Template
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-[58px] overflow-y-auto pr-1 pb-1 custom-scrollbar">
                            {classesList.length > 0 ? classesList.map(c => (
                                <span key={c.id} className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] text-[8px] font-bold text-[var(--color-text)] shrink-0 hover:border-emerald-500/30 transition-colors">
                                    {c.name}
                                </span>
                            )) : (
                                <span className="text-[9px] text-[var(--color-text-muted)] italic">Belum ada kelas yang terdaftar.</span>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm">
                        <div className="px-4 py-2.5 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kolom yang Dikenali</span>
                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50 px-2 py-0.5 rounded-full bg-[var(--color-border)]/30">Auto-Matching Active</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
                            <div className="flex flex-col">
                                {[
                                    { label: 'Nama Lengkap', keys: 'name, nama', req: true, note: 'Diidentifikasi sebagai Nama Siswa' },
                                    { label: 'Kelas / Rombel', keys: 'class_name, kelas', req: true, note: 'Harus sesuai daftar di atas' },
                                    { label: 'Jenis Kelamin', keys: 'gender, jk', req: false, note: 'L (Laki) / P (Perempuan)' },
                                ].map((r, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-[var(--color-surface-alt)]/30 transition-colors border-b border-[var(--color-border)] last:border-b-0">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[9px] font-black text-[var(--color-text)]">{r.label}</span>
                                                {r.req && <span className="text-red-500 text-[9px] font-black">*</span>}
                                            </div>
                                            <p className="text-[7.5px] text-[var(--color-text-muted)] font-medium truncate opacity-70">{r.note}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1">
                                            {r.keys.split(', ').map(k => (
                                                <span key={k} className="px-1.5 py-0.5 rounded bg-[var(--color-primary)]/5 text-[var(--color-primary)] text-[7.5px] font-black border border-[var(--color-primary)]/10">
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col">
                                {[
                                    { label: 'No. WhatsApp', keys: 'phone, no_hp', req: false, note: '08xx atau +62xxx' },
                                    { label: 'NISN', keys: 'nisn', req: false, note: 'Opsional, cegah duplikasi' },
                                    { label: 'Nama Wali', keys: 'guardian_name', req: false, note: 'Nama orang tua / wali' },
                                ].map((r, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-[var(--color-surface-alt)]/30 transition-colors border-b border-[var(--color-border)] last:border-b-0">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[9px] font-black text-[var(--color-text)]">{r.label}</span>
                                                {r.req && <span className="text-red-500 text-[9px] font-black">*</span>}
                                            </div>
                                            <p className="text-[7.5px] text-[var(--color-text-muted)] font-medium truncate opacity-70">{r.note}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1">
                                            {r.keys.split(', ').map(k => (
                                                <span key={k} className="px-1.5 py-0.5 rounded bg-[var(--color-primary)]/5 text-[var(--color-primary)] text-[7.5px] font-black border border-[var(--color-primary)]/10">
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

                    <div className="grid grid-cols-1 gap-2.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                        {SYSTEM_COLS.map(sys => {
                            const mapped = importColumnMapping[sys.key]
                            return (
                                <div key={sys.key} className={`p-3 rounded-xl border transition-all ${mapped ? 'bg-emerald-500/4 border-emerald-500/20' : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)]'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-[var(--color-text)] flex items-center gap-1.5">
                                                {sys.label}
                                                {['name', 'class_name'].includes(sys.key) && <span className="text-red-500">*</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-60 truncate">Data sistem</span>
                                        </div>

                                        <div className="flex-1 flex items-center gap-2 group">
                                            <div className="h-px bg-[var(--color-border)] flex-1 opacity-50" />
                                            <FontAwesomeIcon icon={faArrowRight} className={`text-[9px] transition-colors ${mapped ? 'text-emerald-500' : 'text-[var(--color-text-muted)] opacity-30'}`} />
                                            <div className="h-px bg-[var(--color-border)] flex-1 opacity-50" />
                                        </div>

                                        <div className="flex flex-col min-w-0 flex-1">
                                            <select
                                                value={mapped || ''}
                                                onChange={(e) => setImportColumnMapping(v => ({ ...v, [sys.key]: e.target.value }))}
                                                className={`h-9 px-3 rounded-xl text-[10px] font-black border transition-all outline-none appearance-none cursor-pointer
                                                ${mapped
                                                        ? 'border-emerald-500/40 bg-[var(--color-surface)] text-emerald-600'
                                                        : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'}`}
                                            >
                                                <option value="">-- Lewati Kolom --</option>
                                                {importFileHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
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
                            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                                <div className="max-h-[40vh] overflow-auto scrollbar-none">
                                    <table className="w-full text-[10px]">
                                        <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10 border-b border-[var(--color-border)]">
                                            <tr className="text-left font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                <th className="px-3 py-2">Nama</th>
                                                <th className="px-3 py-2">Kelas</th>
                                                <th className="px-3 py-2">Gender</th>
                                                <th className="px-3 py-2">WA</th>
                                                <th className="px-3 py-2">NISN</th>
                                                <th className="px-3 py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {importPreview.slice(0, 300).map((r, i) => {
                                                const isError = r._hasError
                                                const isDupe = r._isDupe
                                                const isWarn = r._hasWarn
                                                return (
                                                    <tr key={i} className={`hover:bg-[var(--color-surface-alt)]/40 transition-colors ${isError ? 'bg-red-500/3' : isDupe ? 'bg-violet-500/3' : ''}`}>
                                                        <td className="px-3 py-1.5 font-bold text-[var(--color-text)]">{r.name}</td>
                                                        <td className="px-3 py-1.5 text-[var(--color-text-muted)] font-bold">{r._className}</td>
                                                        <td className="px-3 py-1.5 text-[var(--color-text-muted)] font-bold">{r.gender}</td>
                                                        <td className="px-3 py-1.5 text-[var(--color-text-muted)] font-bold">{r.phone || '-'}</td>
                                                        <td className="px-3 py-1.5 text-[var(--color-text-muted)] font-bold">{r.nisn || '-'}</td>
                                                        <td className="px-3 py-1.5">
                                                            {isError ? <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 text-[8px] font-black">ERROR</span>
                                                                : isDupe ? <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 text-[8px] font-black">DUPLIKAT</span>
                                                                    : isWarn ? <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[8px] font-black">WARN</span>
                                                                        : <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 text-[8px] font-black">OK</span>}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {importPreview.length > 300 && (
                                    <div className="px-3 py-2 text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-t border-[var(--color-border)]">
                                        Menampilkan 300 dari {importPreview.length} baris.
                                    </div>
                                )}
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

            <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-[var(--color-border)]">
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

                <div className="flex items-center gap-3">
                    {importing && (
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2">
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)]" />
                            {importProgress.done}/{importProgress.total}
                        </span>
                    )}

                    {importStep === 1 ? (
                        <button
                            onClick={() => importRawData.length > 0 ? setImportStep(2) : importFileInputRef.current?.click()}
                            className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                        >
                            {importRawData.length > 0 ? (
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
                            disabled={!importColumnMapping.name || !importColumnMapping.class_name}
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
        </Modal>
    )
}

