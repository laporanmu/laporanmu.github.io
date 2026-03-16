import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPrint, faTags, faGraduationCap, faBolt, faXmark
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

export function BulkActionBar({
    selectedStudentIds,
    setSelectedStudentIds,
    handleBulkWA,
    handleBulkPrint,
    setIsBulkTagModalOpen,
    setIsBulkModalOpen,
    setIsBulkPointModalOpen
}) {
    if (selectedStudentIds.length === 0) return null

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[50] w-[95%] max-w-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-3 shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 pl-3">
                    <div className="flex flex-col">
                        <span className="text-white text-xs font-black tracking-widest leading-none mb-1">{selectedStudentIds.length} TERPILIH</span>
                        <button onClick={() => setSelectedStudentIds([])} className="text-white/40 hover:text-white text-[9px] font-black uppercase tracking-tighter transition-colors text-left">Batal</button>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <button
                        onClick={handleBulkWA}
                        className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
                        <span className="hidden sm:inline">Broadcast</span>
                    </button>

                    <button
                        onClick={handleBulkPrint}
                        className="h-10 px-4 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <FontAwesomeIcon icon={faPrint} className="text-base" />
                        <span className="hidden md:inline">Cetak Kartu</span>
                    </button>

                    <button
                        onClick={() => setIsBulkTagModalOpen(true)}
                        className="h-10 px-4 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <FontAwesomeIcon icon={faTags} className="text-base" />
                        <span className="hidden md:inline">Beri Label</span>
                    </button>

                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="h-10 px-4 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <FontAwesomeIcon icon={faGraduationCap} className="text-base" />
                        <span className="hidden md:inline">Naik Kelas</span>
                    </button>

                    <button
                        onClick={() => setIsBulkPointModalOpen(true)}
                        className="h-10 px-4 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <FontAwesomeIcon icon={faBolt} className="text-base" />
                        <span className="hidden md:inline">Beri Poin</span>
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

                    <button
                        onClick={() => setSelectedStudentIds([])}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white shrink-0"
                        title="Batal Pilih"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </div>
        </div>
    )
}
