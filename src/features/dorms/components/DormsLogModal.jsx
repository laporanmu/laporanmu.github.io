import React from 'react'
import Modal from '@components/ui/Modal'
import RichSelect from '@components/ui/RichSelect'
import { ClipboardList, Check, Clock } from 'lucide-react'

export default function DormsLogModal({
    isOpen,
    onClose,
    newLog,
    setNewLog,
    onSave
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Jurnal Piket Musyrif"
            description="Catat kondisi asrama dan temuan masalah"
            icon={ClipboardList}
            size="md"
            footer={
                <div className="flex items-center justify-between gap-2 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="log-form"
                        className="h-10 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Simpan Jurnal
                    </button>
                </div>
            }
        >
            <form id="log-form" onSubmit={onSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Musyrif Penjaga</label>
                        <input
                            type="text"
                            required
                            value={newLog.musyrifName}
                            onChange={(e) => setNewLog(prev => ({ ...prev, musyrifName: e.target.value }))}
                            placeholder="Ustadz..."
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Shift Jaga</label>
                        <div className="w-full">
                            <RichSelect
                                value={newLog.shift}
                                onChange={(val) => setNewLog(prev => ({ ...prev, shift: val }))}
                                options={[
                                    { id: 'Malam', name: 'Shift Malam' },
                                    { id: 'Siang', name: 'Shift Siang' }
                                ]}
                                placeholder="Pilih Shift"
                                icon={Clock}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Catatan/Kondisi Umum</label>
                    <textarea
                        value={newLog.notes}
                        onChange={(e) => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Kondisi asrama malam ini..."
                        rows="3"
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition resize-none"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Temuan Masalah/Nihil</label>
                    <input
                        type="text"
                        value={newLog.issues}
                        onChange={(e) => setNewLog(prev => ({ ...prev, issues: e.target.value }))}
                        placeholder="Contoh: Lampu teras Ibrahim mati (atau Nihil)"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>
            </form>
        </Modal>
    )
}
