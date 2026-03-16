import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSpinner, faTriangleExclamation, faTrophy
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function ClassBreakdownModal({
    isOpen,
    onClose,
    classBreakdownData,
    loadingBreakdown,
    RiskThreshold,
    classesList,
    setFilterClass
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Statistik Kelas — ${classBreakdownData?.className || ''}`}
            size="md"
        >
            {loadingBreakdown ? (
                <div className="text-center py-10 text-[var(--color-text-muted)]">
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl mb-2 block" />
                    <p className="text-sm">Memuat statistik...</p>
                </div>
            ) : classBreakdownData && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Siswa', value: classBreakdownData.total, color: 'text-[var(--color-primary)]' },
                            { label: 'Putra', value: classBreakdownData.boys, color: 'text-blue-500' },
                            { label: 'Putri', value: classBreakdownData.girls, color: 'text-pink-500' },
                            { label: 'Rata-rata Poin', value: classBreakdownData.avgPoints, color: classBreakdownData.avgPoints >= 0 ? 'text-emerald-500' : 'text-red-500' },
                        ].map(item => (
                            <div key={item.label} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-center">
                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">{item.label}</p>
                                <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">Siswa Risiko (≤ {RiskThreshold})</p>
                            <p className="text-lg font-black text-red-500">{classBreakdownData.riskCount} siswa</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
                            Top 3 Poin Tertinggi
                        </p>
                        <div className="space-y-2">
                            {classBreakdownData.topStudents.map((s, idx) => (
                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-yellow-400/20 text-yellow-600' :
                                        idx === 1 ? 'bg-gray-400/20 text-gray-500' :
                                            'bg-orange-400/20 text-orange-600'
                                        }`}>#{idx + 1}</span>
                                    <span className="flex-1 text-sm font-bold text-[var(--color-text)] truncate">{s.name}</span>
                                    <span className={`text-sm font-black ${s.total_points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{s.total_points}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => { onClose(); const cls = classesList.find(c => c.name === classBreakdownData.className); if (cls) setFilterClass(cls.id) }}
                            className="btn bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--color-primary)]/20 transition">
                            Filter Kelas Ini
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    )
}
