import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight, faCheck, faDownload, faFileImport, faFileLines, faLink, faSpinner, faUpload, faXmark, faCheckCircle, faTriangleExclamation, faSchool
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

export default function ClassImportModal({
    isOpen,
    onClose,
    importTab,
    setImportTab,
    importFileName,
    setImportFileName,
    importPreview,
    setImportPreview,
    importIssues,
    setImportIssues,
    importDupes,
    setImportDupes,
    importSkip,
    setImportSkip,
    importDrag,
    setImportDrag,
    importing,
    importProgress,
    processImportFile,
    handleCommitImport,
    handleDownloadTemplate,
    importFileRef
}) {
    if (!isOpen) return null

    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    const handleModalClose = () => {
        if (importing) return
        onClose()
        setImportTab('guideline')
        setImportPreview([])
        setImportIssues([])
        setImportDupes([])
        setImportFileName('')
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleModalClose}
            title="Import Data Kelas"
            description="Daftarkan kelas secara massal menggunakan file spreadsheet Excel (.xlsx) atau CSV."
            icon={faFileImport}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={handleModalClose}
                        disabled={importing}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center justify-center disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    {importTab === 'guideline' ? (
                        <button
                            type="button"
                            onClick={() => importFileRef.current?.click()}
                            className="h-10 px-6 sm:px-8 rounded-xl bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 border border-white/10 shrink-0"
                        >
                            <FontAwesomeIcon icon={faUpload} className="text-xs opacity-80 shrink-0" />
                            <span className="truncate">Pilih File Import</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCommitImport}
                            disabled={hasImportBlockingErrors || importing || importPreview.length === 0}
                            className="h-10 px-6 sm:px-8 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                        >
                            {importing ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                    <span>Mengimport...</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-xs opacity-80 shrink-0" />
                                    <span className="truncate hidden sm:inline">Mulai Import Data</span>
                                    <span className="truncate sm:hidden">Import</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {/* Tab Switch */}
                <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                    {[
                        { id: 'guideline', label: 'Panduan & Template' },
                        { id: 'preview', label: `Review & Validasi${importPreview.length ? ` (${importPreview.length})` : ''}` }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setImportTab(t.id)}
                            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importTab === t.id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── TAB: PANDUAN ── */}
                {importTab === 'guideline' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Format info */}
                        <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faSchool} /> Format Kolom yang Didukung
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {[
                                    { col: 'Nama Kelas', req: true, desc: 'Wajib diisi (e.g. 7A, 10 MIPA 1)' },
                                    { col: 'Tingkat', req: true, desc: '7 – 12' },
                                    { col: 'Program', req: false, desc: 'Boarding / Reguler' },
                                    { col: 'Tipe Gender', req: false, desc: 'Putra / Putri' },
                                    { col: 'Wali Kelas', req: false, desc: 'Nama guru (opsional, pencocokan otomatis)' },
                                    { col: 'Tahun Ajaran', req: false, desc: 'Nama tahun ajaran (opsional)' },
                                ].map(({ col, req, desc }) => (
                                    <div key={col} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                        <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${req ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-[var(--color-border)]'}`} />
                                        <div>
                                            <p className="text-xs font-black text-[var(--color-text)]">{col}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold flex items-center gap-1.5 pt-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> = Kolom wajib diisi
                            </p>
                        </div>

                        {/* Download template */}
                        <button
                            onClick={handleDownloadTemplate}
                            className="w-full h-12 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)] transition-all shadow-sm active:scale-[0.99]"
                        >
                            <FontAwesomeIcon icon={faDownload} className="text-[var(--color-primary)]" /> Download Template Excel (.xlsx)
                        </button>

                        {/* Drag & Drop Upload */}
                        <div
                            onDragOver={e => { e.preventDefault(); setImportDrag(true) }}
                            onDragLeave={() => setImportDrag(false)}
                            onDrop={e => { e.preventDefault(); setImportDrag(false); const file = e.dataTransfer.files?.[0]; if (file) processImportFile(file) }}
                            onClick={() => importFileRef.current?.click()}
                            className={`relative cursor-pointer flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed transition-all ${importDrag ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-alt)]/50'}`}
                        >
                            <input ref={importFileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processImportFile(f); e.target.value = '' }} />
                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xl shadow-inner">
                                <FontAwesomeIcon icon={faUpload} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-[var(--color-text)]">Klik atau seret file di sini</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1 uppercase tracking-widest">CSV atau XLSX • Maks 5MB</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: PREVIEW ── */}
                {importTab === 'preview' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* File info */}
                        {importFileName && (
                            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                                <FontAwesomeIcon icon={faFileImport} className="text-[var(--color-primary)] shrink-0 text-lg" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-[var(--color-text)] truncate">{importFileName}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-0.5">{importPreview.length} baris terbaca</p>
                                </div>
                                <button onClick={() => importFileRef.current?.click()} className="shrink-0 text-[10px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-lg transition-colors">Ganti File</button>
                                <input ref={importFileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processImportFile(f); e.target.value = '' }} />
                            </div>
                        )}

                        {/* Issue summary */}
                        {importIssues.length > 0 && (
                            <div className="space-y-2">
                                {importIssues.filter(x => x.level === 'error').length > 0 && (
                                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 shadow-sm">
                                        <FontAwesomeIcon icon={faXmark} className="text-red-500 shrink-0 mt-0.5 text-sm" />
                                        <div>
                                            <p className="text-xs font-black text-red-600 uppercase tracking-widest">{importIssues.filter(x => x.level === 'error').length} Error — Wajib diperbaiki</p>
                                            <ul className="mt-1.5 space-y-1">
                                                {importIssues.filter(x => x.level === 'error').map((iss, i) => (
                                                    <li key={i} className="text-[10px] text-red-600 font-bold flex items-center gap-1.5">
                                                        <span className="w-1 h-1 rounded-full bg-red-500" />
                                                        Baris {iss.row}: {iss.messages.join(', ')}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                {importIssues.filter(x => x.level === 'warn').length > 0 && (
                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 shadow-sm">
                                        <FontAwesomeIcon icon={faCheck} className="text-amber-500 shrink-0 mt-0.5 text-sm" />
                                        <div>
                                            <p className="text-xs font-black text-amber-600 uppercase tracking-widest">{importIssues.filter(x => x.level === 'warn').length} Peringatan</p>
                                            <ul className="mt-1.5 space-y-1">
                                                {importIssues.filter(x => x.level === 'warn').map((iss, i) => (
                                                    <li key={i} className="text-[10px] text-amber-600 font-bold flex items-center gap-1.5">
                                                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                                                        Baris {iss.row}: {iss.messages.join(', ')}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                {importDupes.length > 0 && (
                                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 shadow-sm">
                                        <FontAwesomeIcon icon={faLink} className="text-blue-500 shrink-0 text-sm" />
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">{importDupes.length} Duplikat dalam file</p>
                                        </div>
                                        <label className="flex items-center gap-2.5 cursor-pointer shrink-0 bg-blue-500/5 px-3 py-1.5 rounded-xl border border-blue-500/20">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Skip duplikat</span>
                                            <div
                                                onClick={() => setImportSkip(v => !v)}
                                                className={`w-8 h-4 rounded-full transition-all flex items-center px-0.5 cursor-pointer ${importSkip ? 'bg-blue-500' : 'bg-[var(--color-border)]'}`}
                                            >
                                                <div className={`w-3 h-3 rounded-full bg-white shadow transition-all ${importSkip ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Preview table */}
                        {importPreview.length > 0 && (
                            <div className="overflow-auto max-h-[40vh] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm custom-scrollbar">
                                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                                    <thead className="sticky top-0 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] z-10">
                                        <tr>
                                            {['#', 'Nama Kelas', 'Tingkat', 'Major', 'Wali Kelas', 'Status'].map(h => (
                                                <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {importPreview.map((row, i) => {
                                            const isDupe = importDupes.includes(i)
                                            const isSkipped = isDupe && importSkip
                                            return (
                                                <tr key={i} className={`transition-colors ${isSkipped ? 'opacity-40 bg-[var(--color-surface-alt)]/20' : row._hasError ? 'bg-red-500/5' : isDupe ? 'bg-blue-500/5' : 'hover:bg-[var(--color-surface-alt)]/50'}`}>
                                                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] font-bold">{i + 2}</td>
                                                    <td className="px-4 py-2.5 font-bold text-[var(--color-text)]">{row.name || <span className="text-red-500 italic">kosong</span>}</td>
                                                    <td className="px-4 py-2.5 font-bold text-[var(--color-text)]">{row.grade || '—'}</td>
                                                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] font-medium">{row.major || '—'}</td>
                                                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] font-medium">{row._teacherRaw ? (row.homeroom_teacher_id ? row._teacherRaw : <span className="text-amber-500 font-bold">{row._teacherRaw} (?)</span>) : '—'}</td>
                                                    <td className="px-4 py-2.5">
                                                        {isSkipped ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[9px] font-black text-[var(--color-text-muted)] uppercase border border-[var(--color-border)]">Skip</span>
                                                        ) : row._hasError ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-[9px] font-black text-red-500 uppercase border border-red-500/20">Error</span>
                                                        ) : isDupe ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[9px] font-black text-blue-500 uppercase border border-blue-500/20">Duplikat</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-black text-emerald-600 uppercase border border-emerald-500/20">OK</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Progress bar saat importing */}
                        {importing && (
                            <div className="space-y-2 p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-in fade-in">
                                <div className="flex justify-between text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest">
                                    <span className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)]" /> Mengimport Data...
                                    </span>
                                    <span>{importProgress.done} / {importProgress.total}</span>
                                </div>
                                <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                                        style={{ width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Summary & CTA */}
                        {importPreview.length > 0 && !importing && (
                            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                                <p className="text-xs font-bold text-[var(--color-text-muted)]">
                                    <span className="text-[var(--color-primary)] font-black text-sm">
                                        {importPreview.filter((_, i) => {
                                            const dupeSet = new Set(importDupes)
                                            const errRows = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
                                            return !errRows.has(i) && !(importSkip && dupeSet.has(i))
                                        }).length}
                                    </span>{' '}kelas siap diimport
                                </p>
                            </div>
                        )}

                        {/* Empty state */}
                        {!importPreview.length && !importing && (
                            <div className="py-12 flex flex-col items-center gap-3 text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]/30 rounded-2xl border border-[var(--color-border)]">
                                <FontAwesomeIcon icon={faFileImport} className="text-4xl opacity-20 mb-1" />
                                <p className="text-xs font-black uppercase tracking-widest opacity-50">Belum ada file yang diupload</p>
                                <button onClick={() => setImportTab('guideline')} className="text-[10px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest mt-1">← Kembali ke Panduan</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}
