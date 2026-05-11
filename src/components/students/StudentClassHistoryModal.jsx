import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faClockRotateLeft, 
    faSpinner, 
    faArrowRightArrowLeft, 
    faArrowRight 
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import { EmptyState } from '../ui/DataDisplay'
import { formatRelativeDate } from '../../utils/students/studentsConstants'

export default function StudentClassHistoryModal({
    isOpen,
    onClose,
    selectedStudent,
    loading,
    history = []
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Riwayat Kelas — ${selectedStudent?.name || ''}`}
            description="Lacak setiap perubahan dan perpindahan kelas siswa."
            icon={faClockRotateLeft}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <button
                    onClick={onClose}
                    className="w-full h-11 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-[var(--color-primary)]/25 border border-white/10"
                >
                    Selesai & Tutup
                </button>
            }
        >
            <div className="space-y-6">
                {/* Context Header */}
                <div className="p-4 bg-violet-500/5 rounded-2xl border border-violet-500/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faClockRotateLeft} className="text-violet-500 text-sm" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-violet-600 uppercase tracking-wider leading-none">Tracking perpindahan kelas</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 font-medium leading-relaxed">Tercatat setiap kali siswa berpindah kelas di sistem.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xl opacity-20 mb-3 block mx-auto" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Memuat Data Riwayat...</span>
                    </div>
                ) : history.length === 0 ? (
                    <EmptyState 
                        variant="dashed"
                        color="slate"
                        icon={faArrowRightArrowLeft}
                        title="Belum ada riwayat"
                        description="Siswa ini belum pernah berpindah kelas sejak pertama kali terdaftar di sistem."
                    />
                ) : (
                    <div className="space-y-2.5 max-h-[400px] overflow-auto pr-1 custom-scrollbar">
                        {history.map((h, idx) => (
                            <div 
                                key={h.id || idx} 
                                className="group flex items-center gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500 flex items-center justify-center shrink-0 transition-colors border border-slate-100 group-hover:border-violet-100">
                                    <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-xs" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-[11px] font-black text-slate-400">{h.from_class?.name || '???'}</span>
                                        <FontAwesomeIcon icon={faArrowRight} className="text-[8px] text-slate-300" />
                                        <span className="text-[11px] font-black text-slate-800">{h.to_class?.name || '???'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-bold text-slate-400">{formatRelativeDate(h.changed_at)}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span className="text-[9px] font-medium text-slate-400 truncate">{h.note || 'Tanpa catatan'}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[9px] font-black text-slate-800">
                                        {new Date(h.changed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div className="text-[8px] font-bold text-slate-400 mt-0.5">
                                        {new Date(h.changed_at).getFullYear()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    )
}
