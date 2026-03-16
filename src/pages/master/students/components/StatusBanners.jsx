import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons'

export function StatusBanners({ isPrivacyMode, setIsPrivacyMode, canEdit }) {
    return (
        <>
            {/* Privacy Banner */}
            {isPrivacyMode && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Data sensitif disensor</div>
                    <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                </div>
            )}

            {/* Read-only Banner */}
            {!canEdit && (
                <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                    <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0 text-xs" />
                    <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit data siswa dinonaktifkan oleh administrator.</p>
                </div>
            )}
        </>
    )
}
