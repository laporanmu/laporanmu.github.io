import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus,
    faEdit,
    faUsers,
    faCamera,
    faSpinner,
    faTriangleExclamation,
    faChevronDown,
    faCheckCircle,
    faTrash,
    faUser,
    faIdCard,
    faDoorOpen,
    faVenusMars,
    faGraduationCap,
    faPen,
    faCircleInfo,
    faIdBadge
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import { LIST_KAMAR } from '../../pages/reports/utils/raportConstants'

const StudentFormModal = memo(function StudentFormModal({
    isOpen, onClose, selectedStudent, classesList,
    onSubmit, submitting, onPhotoUpload, uploadingPhoto,
}) {
    const INIT = { name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah', status: 'aktif', tags: [], kamar: '' }

    const STATUS_OPTIONS = [
        { key: 'aktif', label: 'Aktif', activeCls: 'bg-emerald-500 shadow-emerald-500/20' },
        { key: 'lulus', label: 'Lulus', activeCls: 'bg-blue-500 shadow-blue-500/20' },
        { key: 'keluar', label: 'Keluar', activeCls: 'bg-slate-700 shadow-slate-700/20' },
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
                kamar: selectedStudent.metadata?.kamar || '',
            })
            // Handle Metadata
            const meta = selectedStudent.metadata || {}
            const metaArray = Object.entries(meta)
                .filter(([k]) => k !== 'kamar')
                .map(([k, v]) => ({ key: k, value: v }))
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
        const metadata = { kamar: form.kamar }
        metadataFields.forEach(m => {
            if (m.key.trim() && m.key.trim() !== 'kamar') metadata[m.key.trim()] = m.value
        })
        onSubmit({ ...form, metadata })
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            description={selectedStudent ? 'Perbarui data siswa dengan form yang tetap ringan.' : 'Form singkat untuk registrasi siswa baru.'}
            icon={selectedStudent ? faEdit : faPlus}
            iconBg={selectedStudent ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}
            iconColor={selectedStudent ? 'text-indigo-500' : 'text-emerald-600'}
            size="lg"
        >
            <form
                id="student-form-modal"
                onSubmit={handleSubmit}
                className="flex flex-col h-full max-h-[85vh] sm:max-h-[600px] overflow-hidden relative"
            >
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 custom-scrollbar pb-20 space-y-5">
                    {/* Top Section: Photo + Essential Info - Responsive */}
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                        {/* Interactive Photo Upload - Smaller */}
                        <div className="shrink-0 flex flex-col items-center gap-3">
                            <div className="relative group">
                                <div
                                    className="w-24 h-24 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all group-hover:border-[var(--color-primary)] group-hover:ring-8 group-hover:ring-[var(--color-primary)]/5 cursor-pointer shadow-md"
                                    onClick={() => photoRef.current?.click()}
                                >
                                    {form.photo_url ? (
                                        <img src={form.photo_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 opacity-30 group-hover:opacity-100 transition-all">
                                            <FontAwesomeIcon icon={faUser} className="text-3xl" />
                                            <span className="text-[6px] font-black uppercase tracking-[0.2em]">Upload</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => photoRef.current?.click()}
                                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border-2 border-[var(--color-border)] shadow-lg flex items-center justify-center text-[var(--color-primary)] hover:scale-110 active:scale-95 transition-all z-10"
                                >
                                    <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                                </button>
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
                                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-20">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-white text-lg" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 w-full flex flex-col gap-6">
                            {/* Group 1: Identitas Utama */}
                            <div className="grid grid-cols-12 gap-3 md:gap-4">
                                <div className="col-span-12 md:col-span-8 relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faUser} className="opacity-40" /> Nama Lengkap Siswa
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => {
                                                setField('name', e.target.value)
                                                handleDupCheck(e.target.value, form.class_id)
                                            }}
                                            placeholder="e.g. Muhammad Al Fatih"
                                            className="w-full pl-10 pr-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold shadow-sm"
                                            autoFocus
                                        />
                                        <FontAwesomeIcon icon={faIdBadge} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30 text-xs" />
                                    </div>
                                    {form.name && form.name.trim().length < 3 && (
                                        <div className="absolute top-0.5 right-1 flex items-center gap-1 text-[7px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                            <FontAwesomeIcon icon={faTriangleExclamation} /> Terlalu Pendek
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-12 md:col-span-4 relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faIdCard} className="opacity-40" /> NISN
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.nisn}
                                            onChange={(e) => setField('nisn', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            onBlur={() => setNisnTouched(true)}
                                            placeholder="00xxxxxxxx"
                                            className={`w-full pl-10 pr-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-mono tracking-widest shadow-sm ${nisnTouched && form.nisn && form.nisn.length !== 10 ? 'border-amber-500 ring-2 ring-amber-500/10' : ''}`}
                                        />
                                        <FontAwesomeIcon icon={faIdCard} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30 text-xs" />
                                    </div>
                                    {nisnTouched && form.nisn && form.nisn.length !== 10 && (
                                        <div className="absolute top-0.5 right-1 text-[7px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">10 Digit</div>
                                    )}
                                </div>
                            </div>

                            {/* Group 2: Penempatan & Gender */}
                            <div className="p-5 rounded-2xl bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] border-dashed grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-4 relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faDoorOpen} className="opacity-40" /> Kamar
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={form.kamar}
                                            onChange={(e) => setField('kamar', e.target.value)}
                                            className="w-full pl-10 pr-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold appearance-none cursor-pointer shadow-sm"
                                        >
                                            <option value="">— Pilih Kamar —</option>
                                            {LIST_KAMAR.map(k => <option key={k.id} value={k.id}>{k.id}</option>)}
                                            <option value="-">Lainnya / Kosong</option>
                                        </select>
                                        <FontAwesomeIcon icon={faDoorOpen} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30 text-xs" />
                                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] opacity-30 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faVenusMars} className="opacity-40" /> Gender
                                    </label>
                                    <div className="flex p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl h-11 shadow-sm">
                                        {[['L', 'Putra', 'bg-blue-600 shadow-blue-600/30'], ['P', 'Putri', 'bg-rose-600 shadow-rose-600/30']].map(([val, label, activeCls]) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setField('gender', val)}
                                                className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${form.gender === val
                                                    ? `${activeCls} text-white`
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.02]'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-4 relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faGraduationCap} className="opacity-40" /> Kelas
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={form.class_id}
                                            onChange={(e) => { setField('class_id', e.target.value); handleDupCheck(form.name, e.target.value) }}
                                            className="w-full pl-10 pr-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold appearance-none cursor-pointer shadow-sm"
                                        >
                                            <option value="">Pilih Kelas</option>
                                            {classesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <FontAwesomeIcon icon={faGraduationCap} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30 text-xs" />
                                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] opacity-30 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Group 3: Status */}
                            <div className="relative">
                                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCircleInfo} className="opacity-40" /> Status Keaktifan
                                </label>
                                <div className="flex p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl h-11 w-full md:w-3/4 shadow-sm">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setField('status', opt.key)}
                                            className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${form.status === opt.key
                                                ? `${opt.activeCls} text-white shadow-md`
                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.02]'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
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

                    {/* Expandable Sections: Refined Design */}
                    <div className="space-y-3">
                        {/* Section: Wali Siswa */}
                        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
                            <button
                                type="button"
                                onClick={() => setShowOptional(v => !v)}
                                className={`w-full flex items-center justify-between px-5 py-3 transition-all duration-300 ${showOptional ? 'bg-[var(--color-primary)]/5' : 'hover:bg-black/[0.02]'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showOptional ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                        <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text)]">Info Wali Siswa</span>
                                </div>
                                <div className={`transition-transform duration-300 ${showOptional ? 'rotate-180' : ''}`}>
                                    <FontAwesomeIcon icon={faChevronDown} className="text-[10px] opacity-30" />
                                </div>
                            </button>

                        <div className={`grid transition-all duration-300 ease-out ${showOptional ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="p-4 pt-2 border-t border-[var(--color-border)] space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-1 opacity-60">WhatsApp Wali</label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, ''))}
                                                    placeholder="08xxxxxxxxxx"
                                                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold font-mono tracking-wider placeholder:text-[10px] placeholder:font-normal placeholder:opacity-40"
                                                />
                                                <FontAwesomeIcon icon={faWhatsapp} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 opacity-60 text-sm" />
                                            </div>
                                        </div>
                                        <div>
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

                        {/* Section: Dynamic Metadata */}
                        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
                            <button
                                type="button"
                                onClick={() => setShowMetadata(v => !v)}
                                className={`w-full flex items-center justify-between px-5 py-3 transition-all duration-300 ${showMetadata ? 'bg-[var(--color-primary)]/5' : 'hover:bg-black/[0.02]'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showMetadata ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                        <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text)]">Profil Karakter & Info Tambahan</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {metadataFields.length > 0 && (
                                        <span className="text-[9px] font-black bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full shadow-sm">
                                            {metadataFields.length}
                                        </span>
                                    )}
                                    <div className={`transition-transform duration-300 ${showMetadata ? 'rotate-180' : ''}`}>
                                        <FontAwesomeIcon icon={faChevronDown} className="text-[10px] opacity-30" />
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
                </div>

                {/* Danger notes spot if needed */}
            </div>

                {/* Footer Actions (Sticky Overlay) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)] to-transparent pointer-events-none z-50">
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 pointer-events-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !form.name.trim() || !form.class_id}
                            className="h-11 px-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8] text-white text-[11px] font-black uppercase tracking-[0.15em] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[var(--color-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                        >
                            {submitting ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={selectedStudent ? faCheckCircle : faPlus} className="text-xs opacity-80" />
                                    <span>{selectedStudent ? 'Update Data' : 'Daftarkan Siswa'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    )
})

export default StudentFormModal
