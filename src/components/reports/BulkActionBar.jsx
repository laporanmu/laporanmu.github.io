import { memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCircleCheck, faFloppyDisk, faFileZipper, faSpinner, faXmark, faFillDrip
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { useLanguage } from '../../context/LanguageContext'

const BulkActionBar = memo(({ 
    selectedCount, onSave, onWA, onExport, onCancel, 
    isSavingAll, isExporting, onIsiMassal
}) => {
    const { dir } = useLanguage()

    if (selectedCount === 0) return null

    return createPortal(
        <div className="fixed -translate-x-1/2 z-[250] w-[95%] md:w-max max-w-[95%] animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
             style={{ 
                 left: dir === 'rtl'
                     ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))'
                     : 'calc(50vw + (var(--sidebar-width, 0px) / 2))',
                 bottom: 'var(--floating-bar-bottom, 16px)'
             }}>
            <div className="relative">
                <div className="relative glass-morphism bg-gray-900/90 dark:bg-gray-800/95 backdrop-blur-3xl border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-2 md:gap-4 text-white overflow-hidden shadow-2xl">
                    {/* Animated scanline */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

                    {/* Left: count badge + label */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-black text-sm shrink-0">
                            {selectedCount}
                        </div>
                        <div className="hidden md:block">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-none">Terpilih</p>
                            <p className="text-[10px] font-bold leading-none mt-0.5">Aksi Massal</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-white/10 shrink-0 hidden md:block" />
                    
                    {/* Center: action buttons */}
                    <div className="flex-1 flex items-center gap-1.5 py-0.5 min-w-0">
                        <button 
                            onClick={onSave}
                            disabled={isSavingAll}
                            className="flex-1 md:flex-none h-8 px-2 md:px-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest disabled:opacity-50 min-w-0"
                            title="Simpan Semua"
                        >
                            <FontAwesomeIcon icon={isSavingAll ? faSpinner : faFloppyDisk} className={isSavingAll ? 'animate-spin' : ''} />
                            <span className="hidden md:inline">Simpan Semua</span>
                        </button>

                        <button 
                            onClick={onIsiMassal}
                            className="flex-1 md:flex-none h-8 px-2 md:px-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:bg-fuchsia-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest min-w-0"
                            title="Isi Massal"
                        >
                            <FontAwesomeIcon icon={faFillDrip} />
                            <span className="hidden md:inline">Isi Massal</span>
                        </button>

                        <button 
                            onClick={onWA}
                            className="flex-1 md:flex-none h-8 px-2 md:px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest min-w-0"
                            title="WA Blast"
                        >
                            <FontAwesomeIcon icon={faWhatsapp} />
                            <span className="hidden md:inline">WA Blast</span>
                        </button>

                        <button 
                            onClick={onExport}
                            disabled={isExporting}
                            className="flex-1 md:flex-none h-8 px-2 md:px-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest disabled:opacity-50 min-w-0"
                            title="Export ZIP"
                        >
                            <FontAwesomeIcon icon={isExporting ? faSpinner : faFileZipper} className={isExporting ? 'animate-spin' : ''} />
                            <span className="hidden md:inline">Export ZIP</span>
                        </button>
                    </div>

                    <button 
                        onClick={onCancel}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all shrink-0"
                        title="Batal"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
})

export default BulkActionBar
