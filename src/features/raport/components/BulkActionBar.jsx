import { memo } from 'react'
import { createPortal } from 'react-dom'
import {
    Save, FolderArchive, Loader2, X, Paintbrush
} from 'lucide-react'

const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} style={props.style} width={props.width || "1em"} height={props.height || "1em"}>
        <path d="M12.012 1c-6.067 0-11 4.934-11 11a10.957 10.957 0 001.605 5.679L1 23l5.52-1.748A10.949 10.949 0 0012.012 23c6.067 0 11-4.933 11-11s-4.933-11-11-11zm5.12 15.65c-.218.614-1.077 1.15-1.636 1.218-.557.068-1.229.098-3.003-.618-2.28-.92-3.738-3.23-3.852-3.38-.114-.15-.92-1.227-.92-2.355 0-1.127.59-1.682.802-1.912.213-.23.46-.287.613-.287.154 0 .307.003.44.01.14.007.327-.052.51.393.187.456.64 1.56.697 1.674.057.115.095.249.019.402-.077.153-.153.249-.306.42-.154.173-.326.288-.135.614.19.326.85 1.397 1.82 2.261.97.864 1.787 1.132 2.094 1.266.307.135.48.115.652-.076.173-.192.748-.864.947-1.161.2-.298.4-.249.671-.15.27.097 1.722.812 2.018.96.297.147.494.22.567.346.073.125.073.722-.145 1.336z"/>
    </svg>
)
import { useLanguage } from '@context'

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
                            {isSavingAll ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden md:inline">Simpan Semua</span>
                        </button>

                        <button 
                            onClick={onIsiMassal}
                            className="flex-1 md:flex-none h-8 px-2 md:px-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:bg-fuchsia-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest min-w-0"
                            title="Isi Massal"
                        >
                            <Paintbrush className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Isi Massal</span>
                        </button>

                        <button 
                            onClick={onWA}
                            className="flex-1 md:flex-none h-8 px-2 md:px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest min-w-0"
                            title="WA Blast"
                        >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">WA Blast</span>
                        </button>

                        <button 
                            onClick={onExport}
                            disabled={isExporting}
                            className="flex-1 md:flex-none h-8 px-2 md:px-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest disabled:opacity-50 min-w-0"
                            title="Export ZIP"
                        >
                            {isExporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <FolderArchive className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden md:inline">Export ZIP</span>
                        </button>
                    </div>

                    <button 
                        onClick={onCancel}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all shrink-0"
                        title="Batal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
})

export default BulkActionBar
