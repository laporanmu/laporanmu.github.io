import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCheckCircle,
    faFileLines,
    faSliders,
    faSpinner,
    faTableList,
    faTriangleExclamation,
    faUsers,
    faIdCard
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

export default function StudentExportModal({
    isOpen,
    onClose,
    students,
    selectedStudentIds,
    exportScope,
    setExportScope,
    exportColumns,
    setExportColumns,
    exporting,
    handleExportCSV,
    handleExportExcel,
    handleExportPDF,
    generateStudentPDF,
    addToast,
}) {
    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export Data Siswa"
            size="lg"
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">1 — Siswa yang Diekspor</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { val: 'filtered', label: 'Filter Aktif', desc: `${students.length} siswa`, icon: faSliders },
                            { val: 'selected', label: 'Dipilih', desc: `${selectedStudentIds.length} siswa`, icon: faCheckCircle, disabled: selectedStudentIds.length === 0 },
                            { val: 'all', label: 'Semua', desc: 'Tanpa filter', icon: faUsers },
                        ].map(({ val, label, desc, icon, disabled }) => (
                            <button
                                key={val}
                                onClick={() => !disabled && setExportScope(val)}
                                disabled={disabled}
                                className={`p-3 rounded-2xl border-2 text-left transition-all
                                ${exportScope === val
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}
                                ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                <FontAwesomeIcon icon={icon} className={`text-base mb-1 ${exportScope === val ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
                                <div className="text-xs font-black text-[var(--color-text)]">{label}</div>
                                <div className="text-[10px] font-bold text-[var(--color-text-muted)]">{desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">2 — Kolom yang Disertakan</p>
                        <div className="flex gap-2">
                            <button onClick={() => setExportColumns(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])))} className="text-[9px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest">Semua</button>
                            <span className="text-[var(--color-border)]">·</span>
                            <button onClick={() => setExportColumns({ id: false, kode: false, nisn: false, nama: true, gender: false, kelas: false, poin: false, phone: false, status: false, tags: false, kelengkapan: false })} className="text-[9px] font-black text-[var(--color-text-muted)] hover:underline uppercase tracking-widest">Reset</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {[
                            { key: 'id', label: 'ID' },
                            { key: 'kode', label: 'Kode Registrasi' },
                            { key: 'nisn', label: 'NISN' },
                            { key: 'nama', label: 'Nama' },
                            { key: 'gender', label: 'Gender' },
                            { key: 'kelas', label: 'Kelas' },
                            { key: 'poin', label: 'Poin' },
                            { key: 'phone', label: 'Phone/WA' },
                            { key: 'status', label: 'Status' },
                            { key: 'tags', label: 'Label/Tag' },
                            { key: 'kelengkapan', label: 'Kelengkapan Data' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setExportColumns(prev => ({ ...prev, [key]: !prev[key] }))}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs font-bold
                                ${exportColumns[key]
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}
                                `}
                            >
                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-all ${exportColumns[key] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
                                    {exportColumns[key] && <svg width="8" height="8" viewBox="0 0 8 8" fill="white"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                                </div>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">3 — Pilih Format Export</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { label: 'CSV', icon: faFileLines, desc: 'Universal', onClick: handleExportCSV, color: 'bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]', iconColor: 'text-[var(--color-text-muted)]' },
                            { label: 'Excel', icon: faTableList, desc: '.xlsx', onClick: handleExportExcel, color: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20', iconColor: 'text-emerald-500' },
                            { label: 'PDF', icon: faFileLines, desc: 'Tabel', onClick: handleExportPDF, color: 'bg-[var(--color-primary)] hover:brightness-110 text-white border border-[var(--color-primary)]', iconColor: 'text-white' },
                            {
                                label: 'PDF Kartu', icon: faIdCard, desc: 'Dengan foto',
                                onClick: async () => {
                                    onClose?.()
                                    let targets = []
                                    if (exportScope === 'selected' && selectedStudentIds.length > 0) {
                                        targets = students.filter(s => selectedStudentIds.includes(s.id))
                                    } else if (exportScope === 'all') {
                                        targets = students
                                    } else {
                                        targets = students
                                    }
                                    if (!targets.length) return addToast?.('Tidak ada siswa untuk dicetak', 'warning')
                                    generateStudentPDF?.(targets)
                                },
                                color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20', iconColor: 'text-orange-500'
                            },
                        ].map(({ label, icon, desc, onClick, color, iconColor }) => (
                            <button
                                key={label}
                                onClick={onClick}
                                disabled={exporting || Object.values(exportColumns).every(v => !v)}
                                className={`${color} h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 font-black`}
                            >
                                <FontAwesomeIcon icon={icon} className={`text-lg ${iconColor}`} />
                                <span className="text-[10px] uppercase tracking-widest">{label}</span>
                                <span className="text-[9px] font-bold opacity-60">{desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {Object.values(exportColumns).every(v => !v) && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                            Pilih minimal satu kolom untuk export
                        </div>
                    </div>
                )}

                {exporting && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-bold">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                        Menyiapkan file export...
                    </div>
                )}
            </div>
        </Modal>
    )
}

