import React from 'react'
import Modal from '@components/ui/Modal'
import RichSelect from '@components/ui/RichSelect'
import { Download } from 'lucide-react'

export default function DormsExportModal({
    isOpen,
    onClose,
    exportScope,
    setExportScope,
    exportFormat,
    setExportFormat,
    exportPreviewCount,
    onExecute
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ekspor Data Plotting"
            description="Pilih cakupan data dan format file untuk diekspor"
            icon={Download}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="sm"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={onExecute}
                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Unduh File
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Scope Data */}
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Scope Data</label>
                    <RichSelect
                        usePortal={true}
                        value={exportScope}
                        onChange={setExportScope}
                        options={[
                            { id: 'all', name: 'Semua Santri' },
                            { id: 'assigned', name: 'Sudah Terplot' },
                            { id: 'unassigned', name: 'Belum Terplot' }
                        ]}
                    />
                </div>

                {/* Format File */}
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Format File</label>
                    <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)]">
                        {[{ id: 'csv', name: 'CSV (Comma Separated)' }].map(fmt => (
                            <button
                                key={fmt.id}
                                onClick={() => setExportFormat(fmt.id)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center ${exportFormat === fmt.id ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                {fmt.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview Count */}
                <div className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Estimasi Jumlah Data:</span>
                    <span className="text-[11px] font-black text-[var(--color-primary)]">
                        {exportPreviewCount} Santri
                    </span>
                </div>
            </div>
        </Modal>
    )
}
