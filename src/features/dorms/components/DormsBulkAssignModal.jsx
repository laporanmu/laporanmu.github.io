import React from 'react'
import Modal from '@components/ui/Modal'
import { Bed, Check } from 'lucide-react'

export default function DormsBulkAssignModal({
    isOpen,
    onClose,
    selectedCount,
    dorms,
    selectedRoom,
    setSelectedRoom,
    onSave,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Plotting Kamar Massal"
            description={`Alokasikan ${selectedCount || 0} santri terpilih ke kamar baru`}
            icon={Bed}
            size="md"
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
                        onClick={onSave}
                        disabled={submitting || !selectedRoom}
                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5" />
                        )}
                        Simpan Plotting Massal
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Pilih Kamar Tujuan</label>
                    <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                        <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                            {(dorms || []).map((room) => {
                                const isSelected = selectedRoom === room.id
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => setSelectedRoom(room.id)}
                                        className={`p-3 rounded-xl border text-[11px] transition-all text-left flex items-center justify-between ${isSelected
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-black'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]/60 hover:border-[var(--color-border-hover)] font-bold'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Bed className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`} />
                                            <span>{room.id}</span>
                                            <span className="text-[9px] opacity-40 ml-1.5" dir="rtl">{room.ar}</span>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
