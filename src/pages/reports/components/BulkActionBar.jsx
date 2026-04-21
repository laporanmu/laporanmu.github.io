import { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCircleCheck, faFloppyDisk, faFileZipper, faSpinner, faXmark
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

const BulkActionBar = memo(({ 
    selectedCount, onSaveAll, onWaBlast, onExportZip, onClearSelection, 
    isSavingAll, isExporting, waStatus 
}) => {
    if (selectedCount === 0) return null

    // Determine position based on screen width (using tailwind-like logic via inline styles or class)
    // The user wants 16px for desktop, 80px for android.
    // We'll use a CSS variable or a media query in the main CSS, 
    // but for now, let's use a responsive class if available or inline style.
    
    return (
        <div className="fixed left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out animate-in slide-in-from-bottom-10"
             style={{ 
                 bottom: 'var(--floating-bar-bottom, 16px)', 
                 width: 'min(95%, 600px)' 
             }}>
            <div className="bg-[var(--color-surface)] border border-[var(--color-primary)]/30 shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-2xl p-3 flex items-center gap-4 backdrop-blur-md bg-opacity-90">
                <div className="flex flex-col shrink-0 px-2 border-r border-[var(--color-border)]">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-text-muted)]">Terpilih</span>
                    <span className="text-xl font-black text-[var(--color-primary)] leading-none">{selectedCount}</span>
                </div>
                
                <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <button 
                        onClick={onSaveAll}
                        disabled={isSavingAll}
                        className="h-10 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-black flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                    >
                        <FontAwesomeIcon icon={isSavingAll ? faSpinner : faFloppyDisk} className={isSavingAll ? 'animate-spin' : ''} />
                        Simpan Semua
                    </button>

                    <button 
                        onClick={onWaBlast}
                        className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all shrink-0"
                    >
                        <FontAwesomeIcon icon={faWhatsapp} />
                        WA Blast
                    </button>

                    <button 
                        onClick={onExportZip}
                        disabled={isExporting}
                        className="h-10 px-4 rounded-xl bg-indigo-500 text-white text-xs font-black flex items-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                    >
                        <FontAwesomeIcon icon={isExporting ? faSpinner : faFileZipper} className={isExporting ? 'animate-spin' : ''} />
                        Export ZIP
                    </button>
                </div>

                <button 
                    onClick={onClearSelection}
                    className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>
        </div>
    )
})

export default BulkActionBar
