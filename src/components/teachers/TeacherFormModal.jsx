import React, { useState, useEffect, memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faSpinner, faTriangleExclamation, faXmark, faUser, faIdCard, 
    faBook, faPhone, faEnvelope, faCalendarAlt, faMapMarkerAlt, 
    faInfoCircle, faIdBadge, faSchool, faDoorOpen, faGraduationCap,
    faCheckCircle, faMars, faVenus, faTimes, faSave
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import RichSelect from '../ui/RichSelect'

const EMPTY_FORM = { name: '', nbm: '', subject: '', gender: 'L', phone: '', email: '', status: 'active', join_date: '', address: '', notes: '', class_id: '', type: 'guru' }

const TeacherFormModal = memo(function TeacherFormModal({
    isOpen, onClose, selectedItem, classesList, subjectsList,
    onSubmit, submitting,
}) {
    const [form, setForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState('')
    const [touched, setTouched] = useState({})

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
        setTouched({})
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

    const setField = (field, value) => {
        setForm(p => ({ ...p, [field]: value }))
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedItem ? `Update Data ${form.type === 'karyawan' ? 'Karyawan' : 'Guru'}` : `Tambah ${form.type === 'karyawan' ? 'Karyawan' : 'Guru'} Baru`}
            subtitle={selectedItem ? 'Pembaruan data personal' : 'Input data baru'}
            maxWidth="max-w-2xl"
            footer={
                <div className="flex justify-between items-center w-full">
                    <button onClick={onClose} className="h-11 px-4 sm:px-6 rounded-xl bg-transparent border border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faTimes} />
                        <span>Batal</span>
                    </button>
                    <button onClick={handleSubmit} disabled={submitting} className="h-11 px-6 sm:px-8 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faSave} /><span>{selectedItem ? 'Update' : 'Simpan'}</span></>}
                    </button>
                </div>
            }
        >
            <div className="space-y-6 py-2">
                
                {/* ── Jenis Toggle ── */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Jenis</label>
                    <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-12">
                        {[
                            { key: 'guru', label: 'Guru', activeCls: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' },
                            { key: 'karyawan', label: 'Karyawan', activeCls: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' },
                        ].map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => setField('type', opt.key)}
                                className={`flex-1 rounded-lg text-[11px] font-bold tracking-wider transition-all duration-200 ${form.type === opt.key ? opt.activeCls : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Identitas & Akademik ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                        <FontAwesomeIcon icon={faIdBadge} className="text-indigo-500 text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Informasi Utama</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Lengkap <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <input
                                    type="text" value={form.name} onChange={e => setField('name', e.target.value)}
                                    placeholder="Nama lengkap dengan gelar..."
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                />
                                <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NBM</label>
                            <div className="relative">
                                <input
                                    type="text" value={form.nbm} onChange={e => setField('nbm', e.target.value)}
                                    placeholder="Nomor Baku Muhammadiyah"
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                />
                                <FontAwesomeIcon icon={faIdCard} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Aspek Penilaian</label>
                            <div className="relative">
                                <input
                                    type="text" value={form.subject} onChange={e => setField('subject', e.target.value)} list="subj-suggest"
                                    placeholder="e.g. Matematika"
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                />
                                <datalist id="subj-suggest">{(subjectsList || []).map(s => <option key={s} value={s} />)}</datalist>
                                <FontAwesomeIcon icon={faBook} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Detail Personal ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                        <FontAwesomeIcon icon={faSchool} className="text-emerald-500 text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Detail Personal</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Jenis Kelamin</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {[
                                    { key: 'L', label: 'Laki-laki', activeCls: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' },
                                    { key: 'P', label: 'Perempuan', activeCls: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' },
                                ].map((opt) => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setField('gender', opt.key)}
                                        className={`flex-1 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 ${form.gender === opt.key ? opt.activeCls : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Status</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {[
                                    { key: 'active', label: 'Aktif', activeCls: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' },
                                    { key: 'inactive', label: 'Nonaktif', activeCls: 'bg-slate-700 text-white shadow-lg shadow-slate-700/20' },
                                    { key: 'cuti', label: 'Cuti', activeCls: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' },
                                ].map((opt) => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setField('status', opt.key)}
                                        className={`flex-1 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 ${form.status === opt.key ? opt.activeCls : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. HP / WA</label>
                            <div className="relative">
                                <input
                                    type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                                    placeholder="Cth: 081234567890"
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                />
                                <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Email</label>
                            <div className="relative">
                                <input
                                    type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                                    placeholder="Cth: nama@email.com"
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                />
                                <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Bergabung</label>
                            <div className="relative">
                                <input
                                    type="date" value={form.join_date} onChange={e => setField('join_date', e.target.value)}
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)]"
                                />
                                <FontAwesomeIcon icon={faCalendarAlt} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                        {(classesList || []).length > 0 && <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Penugasan Kelas</label>
                            <RichSelect
                                value={form.class_id}
                                onChange={val => setField('class_id', val)}
                                options={classesList.map(c => ({ id: c.id, name: c.name }))}
                                extraOption={{ id: '', name: 'Tidak ditugaskan' }}
                                placeholder="Tidak ditugaskan"
                                icon={faGraduationCap}
                                searchable
                            />
                        </div>}

                        <div className="sm:col-span-2 relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Alamat Lengkap</label>
                            <div className="relative">
                                <input
                                    type="text" value={form.address} onChange={e => setField('address', e.target.value)}
                                    placeholder="Nama jalan, kecamatan, kota..."
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                />
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                        
                        <div className="sm:col-span-2 relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Catatan Internal</label>
                            <div className="relative">
                                <textarea
                                    value={form.notes} onChange={e => setField('notes', e.target.value)}
                                    placeholder="Catatan khusus, rekam jejak..." rows={2}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 resize-none min-h-[70px]"
                                />
                                <FontAwesomeIcon icon={faInfoCircle} className="absolute left-3.5 top-3.5 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                    </div>
                </div>

                {formError && <div className="flex items-center gap-3 p-3 mt-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in"><FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" /><p className="text-xs font-bold text-red-600">{formError}</p></div>}
            </div>
        </Modal>
    )
})

export default TeacherFormModal