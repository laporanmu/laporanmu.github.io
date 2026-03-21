import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function StudentInlineAddRow({
    classesList,
    onSubmit,
    onCancel,
    submitting,
    initialClassId,
    canEdit
}) {
    const nameInputRef = useRef(null)
    const [localForm, setLocalForm] = useState({
        name: '',
        gender: 'L',
        class_id: initialClassId || '',
        phone: ''
    })

    useEffect(() => {
        // Only focus once when mounted
        if (nameInputRef.current) {
            nameInputRef.current.focus()
        }
    }, [])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
        }
    }

    const handleSubmit = async () => {
        if (!localForm.name || !localForm.class_id || !canEdit) return
        await onSubmit(localForm)
        // Reset name & phone, but keep class & gender for next quick add
        setLocalForm(prev => ({ ...prev, name: '', phone: '' }))
    }

    return (
        <tr className="border-t-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.01] transition-all duration-300">
            {/* Column 1: Selection (Empty for add) */}
            <td className="px-6 py-3 text-center">
                <div className="w-4 h-4 rounded border border-[var(--color-border)] opacity-20 mx-auto" />
            </td>

            {/* Column 2: Name */}
            <td className="px-6 py-3">
                <input
                    ref={nameInputRef}
                    type="text"
                    value={localForm.name}
                    onChange={e => setLocalForm(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    placeholder="Nama siswa baru..."
                    className="input-field text-sm h-9 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full max-w-[240px] font-bold"
                />
            </td>

            {/* Column 3: Gender */}
            <td className="px-6 py-3 text-center">
                <div className="flex gap-1 justify-center">
                    {['L', 'P'].map(g => (
                        <button key={g} type="button" onClick={() => setLocalForm(p => ({ ...p, gender: g }))}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black border transition-all ${localForm.gender === g ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20') : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                        >{g}</button>
                    ))}
                </div>
            </td>

            {/* Column 4: Class */}
            <td className="px-6 py-3 text-center">
                <select
                    value={localForm.class_id}
                    onChange={e => setLocalForm(p => ({ ...p, class_id: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="select-field text-xs h-9 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] font-bold min-w-[140px] outline-none focus:border-[var(--color-primary)]"
                >
                    <option value="">Pilih kelas</option>
                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </td>

            {/* Column 5: Phone */}
            <td className="px-6 py-3 text-center">
                <input
                    type="text"
                    value={localForm.phone}
                    onChange={e => setLocalForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                    onKeyDown={handleKeyDown}
                    placeholder="08xxx (WA)"
                    className="input-field text-xs h-9 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-28 text-center font-bold"
                />
            </td>

            {/* Column 6: Actions */}
            <td className="px-6 py-3 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                    <button onClick={handleSubmit} disabled={submitting || !canEdit || !localForm.name || !localForm.class_id}
                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center gap-2">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                    </button>
                    <button onClick={onCancel}
                        className="h-9 w-9 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </td>
        </tr>
    )
}
