import React from 'react'
import Modal from '@shared/components/Modal'
import { Search, X, Check, Bed, User } from 'lucide-react'

export default function DormsAssignModal({
    isOpen,
    onClose,
    assignStep,
    isHeaderAssign,
    studentToAssign,
    filteredAssignStudents,
    assignSearchQuery,
    setAssignSearchQuery,
    dorms,
    selectedTargetRoom,
    setSelectedTargetRoom,
    setStudentToAssign,
    setAssignStep,
    onSave,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={assignStep === 1 ? "Pilih Santri untuk Kamar" : "Atur Plotting Kamar"}
            description={assignStep === 1 ? "Cari dan pilih santri yang akan ditempatkan di kamar" : "Tentukan penempatan kamar santri terpilih"}
            icon={Bed}
            size="md"
            footer={
                <div className="flex items-center w-full gap-3">
                    {assignStep === 1 ? (
                        <button
                            onClick={onClose}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                        >
                            Batal
                        </button>
                    ) : (
                        <>
                            {isHeaderAssign ? (
                                <button
                                    onClick={() => setAssignStep(1)}
                                    className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                                >
                                    Kembali
                                </button>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                                >
                                    Batal
                                </button>
                            )}
                            <div className="flex-1" />
                            <button
                                onClick={onSave}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                {submitting ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                Simpan Plotting
                            </button>
                        </>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {assignStep === 1 ? (
                    <>
                        <div className="relative group mb-3">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                                <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="text"
                                value={assignSearchQuery}
                                onChange={(e) => setAssignSearchQuery(e.target.value)}
                                placeholder="Cari nama santri..."
                                className="w-full h-10 pl-9 pr-8 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-all rounded-xl font-bold"
                            />
                            {assignSearchQuery && (
                                <button
                                    onClick={() => setAssignSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                            <div className="grid grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredAssignStudents.length === 0 ? (
                                    <p className="text-[11px] text-[var(--color-text-muted)] text-center py-6 font-bold">
                                        Tidak ada santri ditemukan
                                    </p>
                                ) : (
                                    filteredAssignStudents.map(student => {
                                        const room = student.metadata?.kamar
                                        return (
                                            <button
                                                key={student.id}
                                                onClick={() => {
                                                    setStudentToAssign(student)
                                                    setSelectedTargetRoom(room || '')
                                                    setAssignStep(2)
                                                }}
                                                className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/60 hover:border-[var(--color-border-hover)] transition-all text-left flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="text-[11.5px] font-black text-[var(--color-text)]">{student.name}</p>
                                                    <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider mt-0.5">
                                                        {student.classes?.name || 'Kelas —'}
                                                    </p>
                                                </div>
                                                <div>
                                                    {room ? (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                                            {room}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-dashed border-amber-500/20">
                                                            Belum Diplot
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3.5 rounded-2xl bg-[var(--color-primary)]/[0.03] border border-[var(--color-primary)]/10 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                <User className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <p className="text-[12px] font-black text-[var(--color-text)]">{studentToAssign?.name}</p>
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                                    {studentToAssign?.classes?.name || 'Kelas —'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Pilih Kamar Tujuan</label>
                            <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                                <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                    <button
                                        onClick={() => setSelectedTargetRoom('')}
                                        className={`p-3 rounded-xl border text-[11px] font-black transition-all text-left flex items-center justify-between ${!selectedTargetRoom
                                            ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm'
                                            : 'border-dashed border-amber-500/30 bg-amber-500/5 text-amber-600/70 hover:bg-amber-500/10 hover:border-amber-500/50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <X className="w-3.5 h-3.5 shrink-0" />
                                            Batalkan Plotting (Kosongkan)
                                        </span>
                                        {!selectedTargetRoom && <Check className="w-3.5 h-3.5 stroke-[3px] text-amber-600" />}
                                    </button>

                                    {dorms.map(room => {
                                        const isSelected = selectedTargetRoom === room.id
                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => setSelectedTargetRoom(room.id)}
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
                    </>
                )}
            </div>
        </Modal>
    )
}
