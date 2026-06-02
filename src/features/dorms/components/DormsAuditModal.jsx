import React from 'react'
import Modal from '@components/ui/Modal'
import RichSelect from '@components/ui/RichSelect'
import { ClipboardList, Check, Bed } from 'lucide-react'

export default function DormsAuditModal({
    isOpen,
    onClose,
    newAudit,
    setNewAudit,
    dorms,
    onSave
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Pemeriksaan Kebersihan"
            description="Input penilaian kebersihan & kerapian asrama"
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
                        form="audit-form"
                        className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Simpan Penilaian
                    </button>
                </div>
            }
        >
            <form id="audit-form" onSubmit={onSave} className="space-y-4.5">
                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Pilih Kamar</label>
                    <div className="w-full">
                        <RichSelect
                            value={newAudit.room}
                            onChange={(val) => setNewAudit(prev => ({ ...prev, room: val }))}
                            options={dorms.map(r => ({ id: r.id, name: r.id }))}
                            placeholder="Pilih Kamar"
                            icon={Bed}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kerapian (0-100)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            value={newAudit.aspects.kerapian}
                            onChange={(e) => setNewAudit(prev => ({
                                ...prev,
                                aspects: { ...prev.aspects, kerapian: Number(e.target.value) }
                            }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kebersihan (0-100)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            value={newAudit.aspects.kebersihan}
                            onChange={(e) => setNewAudit(prev => ({
                                ...prev,
                                aspects: { ...prev.aspects, kebersihan: Number(e.target.value) }
                            }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Keharuman (0-100)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            value={newAudit.aspects.keharuman}
                            onChange={(e) => setNewAudit(prev => ({
                                ...prev,
                                aspects: { ...prev.aspects, keharuman: Number(e.target.value) }
                            }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Catatan Pemeriksaan</label>
                    <textarea
                        value={newAudit.notes}
                        onChange={(e) => setNewAudit(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Tuliskan temuan atau instruksi perbaikan..."
                        rows="3"
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition resize-none"
                    />
                </div>
            </form>
        </Modal>
    )
}
