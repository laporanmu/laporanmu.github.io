import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCheck, faSpinner, faXmark
} from '@fortawesome/free-solid-svg-icons'

export function InlineAddRow({
    inlineForm,
    setInlineForm,
    handleInlineSubmit,
    submittingInline,
    canEdit,
    classesList,
    setIsInlineAddOpen
}) {
    return (
        <tr className="border-t-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.01] transition-all duration-300">
            {/* Column 1: Selection (Empty for add) */}
            <td className="px-6 py-3 text-center">
                <div className="w-4 h-4 rounded border border-[var(--color-border)] opacity-20 mx-auto" />
            </td>

            {/* Column 2: Name */}
            <td className="px-6 py-3">
                <input
                    type="text"
                    value={inlineForm.name}
                    onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleInlineSubmit()}
                    placeholder="Nama siswa baru..."
                    autoFocus
                    className="input-field text-sm h-9 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full max-w-[240px] font-bold"
                />
            </td>

            {/* Column 3: Gender */}
            <td className="px-6 py-3 text-center">
                <div className="flex gap-1 justify-center">
                    {['L', 'P'].map(g => (
                        <button key={g} type="button" onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black border transition-all ${inlineForm.gender === g ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20') : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                        >{g}</button>
                    ))}
                </div>
            </td>

            {/* Column 4: Class */}
            <td className="px-6 py-3 text-center">
                <select
                    value={inlineForm.class_id}
                    onChange={e => setInlineForm(p => ({ ...p, class_id: e.target.value }))}
                    className="select-field text-xs h-9 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] font-bold min-w-[140px] outline-none focus:border-[var(--color-primary)]"
                >
                    <option value="">Pilih kelas</option>
                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </td>

            {/* Column 5: Phone (Mapped to Point column during add) */}
            <td className="px-6 py-3 text-center">
                <input
                    type="text"
                    value={inlineForm.phone}
                    onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="08xxx (WA)"
                    className="input-field text-xs h-9 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-28 text-center font-bold"
                />
            </td>

            {/* Column 6: Actions */}
            <td className="px-6 py-3 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                    <button onClick={handleInlineSubmit} disabled={submittingInline || !canEdit}
                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center gap-2">
                        {submittingInline ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                    </button>
                    <button onClick={() => setIsInlineAddOpen(false)}
                        className="h-9 w-9 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </td>
        </tr>
    )
}
