import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleExclamation, faLink, faSpinner, faTable } from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

export default function StudentGSheetsModal({
    isOpen,
    onClose,
    gSheetsUrl,
    setGSheetsUrl,
    fetchingGSheets,
    handleFetchGSheets
}) {
    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import dari Google Sheets"
            size="md"
        >
            <div className="space-y-5">
                {/* Panduan Mini Sheets */}
                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-inner">
                    <div className="bg-emerald-500/10 px-3 py-2 flex items-center justify-between border-b border-[var(--color-border)]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Contoh Format Kolom
                        </span>
                        <FontAwesomeIcon icon={faTable} className="text-emerald-500/50 text-xs" />
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[300px]">
                            <thead>
                                <tr className="bg-[var(--color-surface-alt)]">
                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-[10px] font-bold text-[var(--color-text-muted)] w-8 text-center bg-[var(--color-surface-alt)]/50"></th>
                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-center">
                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">A</p>
                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(name)</p>
                                    </th>
                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-center">
                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">B</p>
                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(gender)</p>
                                    </th>
                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-center">
                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">C</p>
                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(phone)</p>
                                    </th>
                                    <th className="border-b border-[var(--color-border)] px-2 py-1.5 text-center">
                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">D</p>
                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(class_name)</p>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-[var(--color-border)]">
                                    <td className="border-r border-[var(--color-border)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] text-center bg-[var(--color-surface-alt)]">1</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">Budi Santoso</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium text-center">L</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium font-mono text-emerald-600">0812...</td>
                                    <td className="px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">10A Boarding Putra</td>
                                </tr>
                                <tr className="border-[var(--color-border)]">
                                    <td className="border-r border-[var(--color-border)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] text-center bg-[var(--color-surface-alt)]">2</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">Siti Aminah</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium text-center">P</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium font-mono text-emerald-600">0857...</td>
                                    <td className="px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">10B Boarding Putri</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-bold flex gap-3 items-start shadow-sm">
                    <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 shrink-0" />
                    <p className="leading-snug text-[11px]">Pastikan akses Google Sheets telah diubah menjadi <b className="text-emerald-800 dark:text-emerald-300">Anyone with the link</b> (Siapa saja yang memiliki tautan dapat melihat).</p>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block ml-1">URL Google Sheets</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FontAwesomeIcon icon={faLink} className="text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)] group-focus-within:opacity-100 transition-colors" />
                        </div>
                        <input
                            type="url"
                            value={gSheetsUrl}
                            onChange={e => setGSheetsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                            className="input-field text-sm w-full pl-9 pr-4 py-2.5 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] shadow-none focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
                        />
                    </div>
                    <p className="text-[9px] text-[var(--color-text-muted)] pl-1">Minimal terdapat header kolom di baris pertama: <b>name/nama</b>, <b>gender/jk</b>, <b>phone</b>, <b>class_name/kelas</b></p>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
                    <button 
                        onClick={onClose} 
                        className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] font-black text-[11px] uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors border border-[var(--color-border)]"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleFetchGSheets} 
                        disabled={fetchingGSheets || !gSheetsUrl.includes('docs.google.com/')}
                        className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 hover:brightness-110 text-white text-[11px] uppercase tracking-widest font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
                    >
                        {fetchingGSheets ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengambil...</> : <><FontAwesomeIcon icon={faLink} /> Ambil Data Sheets</>}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
