import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faFileLines, faTrophy, faShieldHalved, faPenNib, faPaperPlane
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

export function BulkWAModal({
    isOpen,
    onClose,
    selectedStudentsWithPhone,
    broadcastTemplate,
    setBroadcastTemplate,
    customWaMsg,
    setCustomWaMsg,
    broadcastIndex,
    setBroadcastIndex,
    buildWAMessage,
    openWAForStudent
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Guardian Broadcast Hub"
            size="lg"
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Selector Section */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih Template Pesan</label>
                        {[
                            { id: 'summary', label: 'Laporan Akademik Lengkap', icon: faFileLines },
                            { id: 'points', label: 'Ringkasan Poin Perilaku', icon: faTrophy },
                            { id: 'security', label: 'Akses Portal (ID & PIN)', icon: faShieldHalved },
                            { id: 'custom', label: 'Pesan Kustom Sekolah', icon: faPenNib },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setBroadcastTemplate(t.id)}
                                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${broadcastTemplate === t.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${broadcastTemplate === t.id ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={t.icon} className="text-xs" />
                                </div>
                                <span className="text-[11px] font-bold leading-tight">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    {broadcastTemplate === 'custom' && (
                        <textarea
                            value={customWaMsg}
                            onChange={(e) => setCustomWaMsg(e.target.value)}
                            placeholder="Tulis pesan kustom di sini... Gunakan {nama}, {poin}, {kelas} sebagai tag otomatis."
                            className="w-full h-32 p-3 text-xs rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none"
                        />
                    )}
                </div>

                {/* Preview & Action Section */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="flex-1 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 flex items-center justify-between">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Antrean Siaran ({selectedStudentsWithPhone.length} Wali)</h5>
                            {broadcastIndex >= 0 && (
                                <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-black animate-pulse">SIARAN BERJALAN...</div>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-3 max-h-[350px] scrollbar-none">
                            {selectedStudentsWithPhone.map((s, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border transition-all ${broadcastIndex === idx ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-70'}`}>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div>
                                            <p className="text-[11px] font-black leading-none">{s.name}</p>
                                            <p className="text-[9px] text-[var(--color-text-muted)] mt-1 font-bold">Wali: {s.guardian_name || '---'} ({s.phone})</p>
                                        </div>
                                        <button
                                            onClick={() => openWAForStudent(s, buildWAMessage(s, broadcastTemplate))}
                                            className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-[10px]"
                                        >
                                            <FontAwesomeIcon icon={faWhatsapp} />
                                        </button>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-[var(--color-surface-alt)]/50 border border-black/5 text-[10px] font-medium leading-relaxed italic line-clamp-2">
                                        {buildWAMessage(s, broadcastTemplate)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                                    <span>Kemajuan Hub</span>
                                    <span>{broadcastIndex + 1} / {selectedStudentsWithPhone.length}</span>
                                </div>
                                <div className="h-1.5 w-full bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--color-primary)] transition-all duration-500"
                                        style={{ width: `${selectedStudentsWithPhone.length ? ((broadcastIndex + 1) / selectedStudentsWithPhone.length) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    selectedStudentsWithPhone.forEach((s, i) => {
                                        setTimeout(() => {
                                            setBroadcastIndex(i);
                                            openWAForStudent(s, buildWAMessage(s, broadcastTemplate));
                                        }, i * 1200);
                                    });
                                }}
                                className="h-11 px-6 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                            >
                                <FontAwesomeIcon icon={faPaperPlane} />
                                Mulai Siaran Massal
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
