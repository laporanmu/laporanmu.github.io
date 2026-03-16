import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus,
    faCamera,
    faSpinner,
    faTriangleExclamation,
    faChevronDown,
    faCheckCircle,
    faTrash
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'

const StudentFormModal = memo(function StudentFormModal({
    isOpen, onClose, selectedStudent, classesList,
    onSubmit, submitting, onPhotoUpload, uploadingPhoto,
}) {
    const INIT = { name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah', status: 'aktif', tags: [] }

    const STATUS_OPTIONS = [
        { key: 'aktif', label: 'Aktif', activeCls: 'bg-emerald-500 text-white border-transparent shadow shadow-emerald-500/20', idleCls: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]' },
        { key: 'lulus', label: 'Lulus', activeCls: 'bg-blue-500 text-white border-transparent shadow shadow-blue-500/20', idleCls: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]' },
        { key: 'keluar', label: 'Keluar', activeCls: 'bg-[var(--color-text)] text-[var(--color-surface)] border-transparent shadow', idleCls: 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]' },
    ]

    const [form, setForm] = useState(INIT)
    const [metadataFields, setMetadataFields] = useState([]) // [{key, value}]
    const [nisnTouched, setNisnTouched] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState(null)
    const [showOptional, setShowOptional] = useState(false)
    const [showMetadata, setShowMetadata] = useState(false)
    const dupTimerRef = useRef(null)
    const photoRef = useRef(null)

    // Reset / populate form setiap kali modal dibuka
    useEffect(() => {
        if (!isOpen) return
        if (selectedStudent) {
            setForm({
                name: selectedStudent.name || '',
                gender: selectedStudent.gender || 'L',
                class_id: selectedStudent.class_id || '',
                phone: selectedStudent.phone || '',
                photo_url: selectedStudent.photo_url || '',
                nisn: selectedStudent.nisn || '',
                guardian_name: selectedStudent.guardian_name || '',
                guardian_relation: selectedStudent.guardian_relation || 'Ayah',
                status: selectedStudent.status || 'aktif',
                tags: selectedStudent.tags || [],
            })
            // Handle Metadata
            const meta = selectedStudent.metadata || {}
            const metaArray = Object.entries(meta).map(([k, v]) => ({ key: k, value: v }))
            setMetadataFields(metaArray)
            setShowMetadata(metaArray.length > 0)
            setShowOptional(!!(selectedStudent.nisn || selectedStudent.guardian_name || (selectedStudent.tags || []).length > 0))
        } else {
            setForm(INIT)
            setMetadataFields([])
            setShowOptional(false)
            setShowMetadata(false)
        }
        setNisnTouched(false)
        setDuplicateWarning(null)
    }, [isOpen, selectedStudent])

    const checkDuplicate = useCallback(async (name, classId) => {
        if (!name || name.trim().length < 3 || !classId) { setDuplicateWarning(null); return }
        try {
            const { data } = await supabase
                .from('students')
                .select('id, name, registration_code')
                .ilike('name', `%${name.trim()}%`)
                .eq('class_id', classId)
                .is('deleted_at', null)
                .limit(3)
            const filtered = (data || []).filter(d => !selectedStudent || d.id !== selectedStudent.id)
            setDuplicateWarning(filtered.length > 0 ? filtered : null)
        } catch { setDuplicateWarning(null) }
    }, [selectedStudent])

    const handleDupCheck = useCallback((name, classId) => {
        clearTimeout(dupTimerRef.current)
        dupTimerRef.current = setTimeout(() => checkDuplicate(name, classId), 600)
    }, [checkDuplicate])

    const setField = useCallback((key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleAddMeta = () => setMetadataFields(p => [...p, { key: '', value: '' }])
    const handleRemoveMeta = (index) => setMetadataFields(p => p.filter((_, i) => i !== index))
    const handleUpdateMeta = (index, k, v) => setMetadataFields(p => {
        const next = [...p]; next[index] = { key: k, value: v }; return next;
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const metadata = {}
        metadataFields.forEach(m => {
            if (m.key.trim()) metadata[m.key.trim()] = m.value
        })
        onSubmit({ ...form, metadata })
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            size="lg"
        >
            <form
                id="student-form-modal"
                onSubmit={handleSubmit}
                className="flex flex-col max-h-[75vh]"
            >
                {/* Sub header */}
                <div className="mb-3">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold opacity-70">
                        {selectedStudent ? 'Perbarui data siswa dengan form yang tetap ringan.' : 'Form singkat untuk registrasi siswa baru.'}
                    </p>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-5">
                    {/* Top Section: Photo + Essential Info */}
                    <div className="flex gap-6 items-start">
                        {/* Interactive Photo Upload - Smaller */}
                        <div className="shrink-0 flex flex-col items-center gap-2">
                            <div className="relative group">
                                <div
                                    className="w-20 h-20 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/5 cursor-pointer shadow-inner"
                                    onClick={() => photoRef.current?.click()}
                                >
                                    {form.photo_url ? (
                                        <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 opacity-40 group-hover:opacity-80 transition-all transform group-hover:scale-105">
                                            <FontAwesomeIcon icon={faCamera} className="text-2xl" />
                                            <span className="text-[7px] font-black uppercase tracking-widest">Foto</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file" ref={photoRef}
                                    onChange={async (e) => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            const url = await onPhotoUpload(file)
                                            if (url) setField('photo_url', url)
                                        }
                                    }}
                                    className="hidden" accept="image/*"
                                />
                                {uploadingPhoto && (
                                    <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-white text-lg" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Primary Fields Grid - Compact */}
                        <div className="flex-1 space-y-4">
                            {/* Nama Siswa */}
                            <div className="relative">
                                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Nama Lengkap Siswa</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => {
                                        setField('name', e.target.value)
                                        handleDupCheck(e.target.value, form.class_id)
                                    }}
                                    placeholder="e.g. Muhammad Al Fatih"
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold placeholder:opacity-30"
                                    autoFocus
                                />
                                {form.name && form.name.trim().length < 3 && (
                                    <div className="absolute -bottom-4 right-1 flex items-center gap-1 text-[7px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                                        <FontAwesomeIcon icon={faTriangleExclamation} /> Pendek
                                    </div>
                                )}
                            </div>

                            {/* Row 2: Gender & Class */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Gender</label>
                                    <div className="flex p-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl">
                                        {[['L', 'Putra'], ['P', 'Putri']].map(([val, label]) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setField('gender', val)}
                                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${form.gender === val
                                                    ? 'bg-white dark:bg-[var(--color-surface)] shadow text-[var(--color-primary)]'
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Kelas</label>
                                    <select
                                        value={form.class_id}
                                        onChange={(e) => { setField('class_id', e.target.value); handleDupCheck(form.name, e.target.value) }}
                                        className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold appearance-none cursor-pointer pr-8"
                                    >
                                        <option value="">Pilih</option>
                                        {classesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-[70%] -translate-y-1/2 text-[9px] opacity-30 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Status Row - Compact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">WhatsApp Wali</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, ''))}
                                    placeholder="08xxxxxxxxxx"
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold font-mono tracking-widest"
                                />
                                <FontAwesomeIcon icon={faWhatsapp} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 opacity-60 text-base" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Status</label>
                            <div className="flex flex-wrap gap-1">
                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setField('status', opt.key)}
                                        className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${form.status === opt.key ? opt.activeCls : opt.idleCls}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Duplicate Warning Prompt - Smaller */}
                    {duplicateWarning && (
                        <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 animate-in slide-in-from-top-2 duration-300 flex gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-xs" />
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest mt-0.5 mb-1 opacity-80">Potensi Duplikasi</p>
                                <div className="space-y-0.5">
                                    {duplicateWarning.map(d => (
                                        <p key={d.id} className="text-[10px] font-bold leading-tight">
                                            {d.name} <span className="opacity-50 text-[9px]">[{d.registration_code}]</span>
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Expandable Section: Additional Details - Compact */}
                    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface-alt)]/30">
                        <button
                            type="button"
                            onClick={() => setShowOptional(v => !v)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 transition-all duration-300 hover:bg-white/40 dark:hover:bg-black/10 ${showOptional ? 'bg-white/50 dark:bg-black/20' : ''}`}
                        >
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faPlus} className={showOptional ? 'text-[var(--color-primary)]' : ''} />
                                Info Wali & Akademik
                            </span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all bg-black/5 ${showOptional ? 'rotate-180 bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : ''}`}>
                                <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
                            </div>
                        </button>

                        <div className={`grid transition-all duration-300 ease-out ${showOptional ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="p-4 pt-2 border-t border-[var(--color-border)] space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-1">
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-1 opacity-60">NISN</label>
                                            <input
                                                type="text"
                                                value={form.nisn}
                                                onChange={(e) => setField('nisn', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                onBlur={() => setNisnTouched(true)}
                                                placeholder="00xxxxxxxx"
                                                className={`w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-surface focus:border-[var(--color-primary)] outline-none transition-all text-sm font-mono tracking-widest ${nisnTouched && form.nisn && form.nisn.length !== 10 ? 'border-amber-500 ring-2 ring-amber-500/10' : ''}`}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-1 opacity-60">Hubungan</label>
                                            <select
                                                value={form.guardian_relation}
                                                onChange={(e) => setField('guardian_relation', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-surface focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                                            >
                                                {['Ayah', 'Ibu', 'Kakek', 'Nenek', 'Wali'].map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-1 opacity-60">Nama Wali</label>
                                        <input
                                            type="text"
                                            value={form.guardian_name}
                                            onChange={(e) => setField('guardian_name', e.target.value)}
                                            placeholder="Nama lengkap wali"
                                            className="w-full px-4 py-2 rounded-xl border border-[var(--color-border)] bg-surface focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Section: Dynamic Metadata */}
                    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface-alt)]/30">
                        <button
                            type="button"
                            onClick={() => setShowMetadata(v => !v)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 transition-all duration-300 hover:bg-white/40 dark:hover:bg-black/10 ${showMetadata ? 'bg-white/50 dark:bg-black/20' : ''}`}
                        >
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faPlus} className={showMetadata ? 'text-[var(--color-primary)]' : ''} />
                                Profil Karakter & Info Tambahan
                            </span>
                            <div className="flex items-center gap-3">
                                {metadataFields.length > 0 && (
                                    <span className="text-[8px] font-black bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full">
                                        {metadataFields.length}
                                    </span>
                                )}
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all bg-black/5 ${showMetadata ? 'rotate-180 bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : ''}`}>
                                    <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
                                </div>
                            </div>
                        </button>

                        <div className={`grid transition-all duration-300 ease-out ${showMetadata ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="p-4 pt-3 border-t border-[var(--color-border)] space-y-3">
                                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 leading-relaxed font-medium">
                                        Tambahkan info opsional seperti alergi, hobi, catatan kesehatan, atau kebutuhan khusus.
                                    </p>

                                    <div className="space-y-2.5">
                                        {metadataFields.map((m, idx) => (
                                            <div key={idx} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-300">
                                                <div className="w-1/3 group relative">
                                                    <input
                                                        placeholder="Judul (mis: Hobi)"
                                                        className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold outline-none focus:border-[var(--color-primary)] transition-all placeholder:opacity-40"
                                                        value={m.key}
                                                        onChange={(e) => handleUpdateMeta(idx, e.target.value, m.value)}
                                                    />
                                                </div>
                                                <div className="flex-1 group relative">
                                                    <input
                                                        placeholder="Isi informasi..."
                                                        className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold outline-none focus:border-[var(--color-primary)] transition-all placeholder:opacity-40"
                                                        value={m.value}
                                                        onChange={(e) => handleUpdateMeta(idx, m.key, e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMeta(idx)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90 shrink-0"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleAddMeta}
                                        className="w-full py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-2 text-[var(--color-text)]"
                                    >
                                        <FontAwesomeIcon icon={faPlus} />
                                        Tambah Info
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Danger notes spot if needed */}
                </div>

                {/* Footer */}
                <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-all"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !form.name.trim() || !form.class_id}
                        className="h-10 px-8 rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 hover:brightness-110 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={selectedStudent ? faCheckCircle : faPlus} className="opacity-70" />
                                {selectedStudent ? 'Simpan' : 'Daftarkan'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    )
})

export default StudentFormModal
