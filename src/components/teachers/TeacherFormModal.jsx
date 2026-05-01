import React, { useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons'

const EMPTY_FORM = { name: '', nbm: '', subject: '', gender: 'L', phone: '', email: '', status: 'active', join_date: '', address: '', notes: '', class_id: '', type: 'guru' }

const TeacherFormModal = memo(function TeacherFormModal({
    isOpen, onClose, selectedItem, classesList, subjectsList,
    onSubmit, submitting,
}) {
    const [form, setForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState('')

    // Reset / populate form setiap kali modal dibuka
    useEffect(() => {
        if (!isOpen) return
        if (selectedItem) {
            setForm({
                name: selectedItem.name || '',
                nbm: selectedItem.nbm || '',
                subject: selectedItem.subject || '',
                gender: selectedItem.gender || 'L',
                phone: selectedItem.phone || '',
                email: selectedItem.email || '',
                status: selectedItem.status || 'active',
                join_date: selectedItem.join_date || '',
                address: selectedItem.address || '',
                notes: selectedItem.notes || '',
                class_id: selectedItem.class_id || '',
                type: selectedItem.type || 'guru',
            })
        } else {
            setForm(EMPTY_FORM)
        }
        setFormError('')
    }, [isOpen, selectedItem])

    const handleSubmit = async () => {
        const name = (form.name || '').trim()
        if (!name) { setFormError('Nama lengkap wajib diisi.'); return }
        setFormError('')
        const payload = {
            name,
            nbm: (form.nbm || '').trim() || null,
            subject: (form.subject || '').trim() || null,
            gender: form.gender || null,
            phone: (form.phone || '').trim() || null,
            email: (form.email || '').trim() || null,
            status: form.status || 'active',
            join_date: form.join_date || null,
            address: (form.address || '').trim() || null,
            notes: (form.notes || '').trim() || null,
            class_id: form.class_id || null,
            type: form.type || 'guru',
        }
        const result = await onSubmit(payload)
        if (result?.error) {
            if (result.code === '23505') setFormError('NBM sudah terdaftar.')
            else setFormError(result.message || 'Gagal menyimpan data.')
        }
    }

    if (!isOpen) return null

    const node = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/5"
        >
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[8px] transition-all animate-in fade-in duration-500"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-lg bg-[var(--color-surface)] rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface-alt)]/50 to-transparent">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                    <h2 className="text-lg font-black font-heading tracking-tight text-[var(--color-text)]">
                        {selectedItem ? `Update Data ${form.type === 'karyawan' ? 'Karyawan' : 'Guru'}` : `Tambah ${form.type === 'karyawan' ? 'Karyawan' : 'Guru'} Baru`}
                    </h2>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-1">
                        {selectedItem ? 'Pembaruan data personal' : 'Input data baru'}
                    </p>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Jenis toggle — di atas semua field */}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Jenis</label>
                            <div className="flex gap-2">
                                {[{ v: 'guru', l: 'Guru', c: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' }, { v: 'karyawan', l: 'Karyawan', c: 'bg-blue-500/10 text-blue-600 border-blue-500/30' }].map(opt => (
                                    <button key={opt.v} type="button" onClick={() => setForm(p => ({ ...p, type: opt.v }))}
                                        className={`flex-1 h-10 rounded-xl border text-[12px] font-black transition-all ${form.type === opt.v ? opt.c : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                        {opt.l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Nama Lengkap <span className="text-red-500">*</span></label>
                            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap dengan gelar" className="input-field w-full h-11 font-bold text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">NBM</label>
                            <input type="text" value={form.nbm} onChange={e => setForm(p => ({ ...p, nbm: e.target.value }))} placeholder="Nomor Baku Muhammadiyah" className="input-field w-full h-11 font-mono text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Aspek Penilaian</label>
                            <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Matematika" className="input-field w-full h-11 text-sm" list="subj-suggest" />
                            <datalist id="subj-suggest">{(subjectsList || []).map(s => <option key={s} value={s} />)}</datalist>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Gender</label>
                            <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="input-field w-full h-11 text-sm">
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Status</label>
                            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input-field w-full h-11 text-sm">
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                                <option value="cuti">Cuti</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">No. HP / WA</label>
                            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx" className="input-field w-full h-11 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Email</label>
                            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@sekolah.id" className="input-field w-full h-11 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Tanggal Bergabung</label>
                            <input type="date" value={form.join_date} onChange={e => setForm(p => ({ ...p, join_date: e.target.value }))} className="input-field w-full h-11 text-sm" />
                        </div>
                        {(classesList || []).length > 0 && <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Penugasan Kelas</label>
                            <select value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} className="input-field w-full h-11 text-sm">
                                <option value="">Tidak ditugaskan</option>
                                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Alamat</label>
                            <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Alamat lengkap" className="input-field w-full h-11 text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Catatan Internal</label>
                            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan privat..." rows={2} className="input-field w-full text-sm resize-none py-2.5" />
                        </div>
                    </div>
                    {formError && <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"><FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" /><p className="text-xs font-bold text-red-600">{formError}</p></div>}
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button onClick={onClose} className="h-9 px-5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-all">Batal</button>
                        <button onClick={handleSubmit} disabled={submitting} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : selectedItem ? 'Update' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(node, document.body)
})

export default TeacherFormModal