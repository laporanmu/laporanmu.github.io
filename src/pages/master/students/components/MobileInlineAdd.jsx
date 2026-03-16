import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faXmark, faCheck, faSpinner
} from '@fortawesome/free-solid-svg-icons'

export function MobileInlineAdd({
    inlineForm,
    setInlineForm,
    handleInlineSubmit,
    submittingInline,
    canEdit,
    classesList,
    setIsInlineAddOpen
}) {
    return (
        <div className="p-3 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.02] shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Quick Add</p>
                <button
                    type="button"
                    onClick={() => setIsInlineAddOpen(false)}
                    className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    aria-label="Tutup quick add"
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    handleInlineSubmit()
                }}
                className="grid grid-cols-1 gap-2.5"
            >
                <input
                    type="text"
                    value={inlineForm.name}
                    onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nama siswa..."
                    enterKeyHint="done"
                    className="input-field text-sm h-11 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full font-bold"
                />

                <div className="grid grid-cols-[1fr_112px] gap-2">
                    <select
                        value={inlineForm.class_id}
                        onChange={e => setInlineForm(p => ({ ...p, class_id: e.target.value }))}
                        className="select-field text-[11px] h-11 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] font-black outline-none focus:border-[var(--color-primary)]"
                    >
                        <option value="">Pilih kelas</option>
                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex items-center justify-end gap-1">
                        {['L', 'P'].map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                                className={`h-11 flex-1 rounded-xl text-[10px] font-black border transition-all ${inlineForm.gender === g
                                    ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/15' : 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/15')
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <input
                    type="tel"
                    inputMode="numeric"
                    value={inlineForm.phone}
                    onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="No. HP/WA (opsional)"
                    className="input-field text-[11px] h-11 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-full font-bold"
                />

                <button
                    type="submit"
                    disabled={submittingInline || !canEdit}
                    className="h-11 w-full rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {submittingInline ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                </button>
            </form>
        </div>
    )
}
