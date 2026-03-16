import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTable, faCircleExclamation, faSpinner, faLink
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function GSheetsImportModal({
    isOpen,
    onClose,
    gSheetsUrl,
    setGSheetsUrl,
    fetchingGSheets,
    handleFetchGSheets
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import dari Google Sheets"
            size="md"
        >
            <div className="space-y-4">
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
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">L</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium font-mono text-emerald-600">0812...</td>
                                    <td className="px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">10A Boarding Putra</td>
                                </tr>
                                <tr className="border-[var(--color-border)]">
                                    <td className="border-r border-[var(--color-border)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] text-center bg-[var(--color-surface-alt)]">2</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">Siti Aminah</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">P</td>
                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium font-mono text-emerald-600">0857...</td>
                                    <td className="px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">10B Boarding Putri</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-bold flex gap-3 items-start">
                    <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 shrink-0" />
                    <p>Pastikan akses Google Sheets telah diubah menjadi <b>Anyone with the link</b> (Siapa saja yang memiliki tautan dapat melihat).</p>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">URL Google Sheets</label>
                    <input
                        type="url"
                        value={gSheetsUrl}
                        onChange={e => setGSheetsUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="input-field text-sm py-2.5 w-full rounded-xl border-[var(--color-border)] bg-transparent"
                    />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Header kolom: <b>name/nama</b>, <b>gender/jk</b>, <b>phone</b>, <b>class_name/kelas</b></p>
                <div className="flex gap-3 mt-2">
                    <button onClick={onClose} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-xs font-bold rounded-xl text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors">Batal</button>
                    <button onClick={handleFetchGSheets} disabled={fetchingGSheets}
                        className="btn bg-emerald-500 hover:bg-emerald-600 text-white flex-1 h-11 text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                        {fetchingGSheets ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faLink} />}
                        Ambil Data
                    </button>
                </div>
            </div>
        </Modal>
    )
}
