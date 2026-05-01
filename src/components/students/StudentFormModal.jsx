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
    faIdBadge,
    faTimes,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import { LIST_KAMAR } from '../../pages/reports/utils/raportConstants'

const RichSelect = ({ value, onChange, options, placeholder, icon, extraOption, small }) => {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedOption = options.find(o => String(o.id) === String(value)) || (extraOption?.id === value ? extraOption : null)

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-3 ${small ? 'px-4 py-2.5' : 'pl-10 pr-4 h-11'} rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition-all text-sm font-bold shadow-sm relative group`}
            >
                <div className="flex items-center gap-3 truncate">
                    {icon && !small && <FontAwesomeIcon icon={icon} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30 text-xs transition-colors group-hover:text-[var(--color-primary)] group-hover:opacity-100" />}
                    <span className={selectedOption ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50 font-normal'}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] opacity-30 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-60 overflow-y-auto backdrop-blur-xl">
                    {extraOption && (
                        <button
                            type="button"
                            onClick={() => { onChange(extraOption.id); setIsOpen(false); }}
                            className={`w-full text-left px-5 py-3 text-xs font-bold hover:bg-[var(--color-primary)]/5 transition-all flex items-center gap-3 border-b border-[var(--color-border)] mb-1 ${value === extraOption.id ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-amber-600'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${value === extraOption.id ? 'bg-[var(--color-primary)]' : 'bg-amber-600'}`} />
                            {extraOption.name}
                        </button>
                    )}
                    {options.length === 0 ? (
                        <div className="px-5 py-4 text-center">
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Data Kosong</p>
                        </div>
                    ) : options.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => { onChange(opt.id); setIsOpen(false); }}
                            className={`w-full text-left px-5 py-2.5 text-xs font-bold hover:bg-[var(--color-primary)]/5 transition-all flex items-center gap-3 ${String(value) === String(opt.id) ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text)]'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full transition-all ${String(value) === String(opt.id) ? 'bg-[var(--color-primary)] scale-125' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-text-muted)]'}`} />
                            {opt.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

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
            footer={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-[10px] opacity-50" />
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="student-form-modal"
                        disabled={submitting || !form.name.trim() || !form.class_id}
                        className="flex-[2] h-11 px-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8] text-white text-[11px] font-black uppercase tracking-[0.15em] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[var(--color-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                    >
                        {submitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={selectedStudent ? faCheckCircle : faPlus} className="text-xs opacity-80" />
                                <span>{selectedStudent ? (selectedStudent.status === 'aktif' ? 'Update Data' : 'Simpan Perubahan') : 'Daftarkan Siswa'}</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <form
                id="student-form-modal"
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                <div className="space-y-5">
                    {/* Baris 1: Avatar & Identitas Utama - High Density */}
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                        {/* Avatar Column - Centered on Mobile, Left on Desktop */}
                        <div className="shrink-0 flex flex-col items-center gap-3 pt-1 self-center md:self-start">
                            <div className="relative group">
                                <div
                                    className="w-24 h-24 rounded-[2rem] bg-[var(--color-surface)] border-2 border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all group-hover:border-[var(--color-primary)] group-hover:ring-8 group-hover:ring-[var(--color-primary)]/5 cursor-pointer shadow-md"
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
                                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border-2 border-[var(--color-border)] shadow-lg flex items-center justify-center text-[var(--color-primary)] hover:scale-110 active:scale-95 transition-all z-10"
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
                                    <div className="absolute inset-0 rounded-[2rem] bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-20">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-white text-lg" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fields Column */}
                        <div className="flex-1 w-full space-y-4">
                            {/* Nama Lengkap - Full Width in Column */}
                            <div className="relative">
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
                                        placeholder="Contoh : Budi Santoso"
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

                            {/* NISN & Gender - Adjusted Width for Better Readability */}
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-5 relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faIdCard} className="opacity-40" /> NISN
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.nisn}
                                            onChange={(e) => setField('nisn', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            onBlur={() => setNisnTouched(true)}
                                            placeholder="00xxxxxx"
                                            className={`w-full pl-10 pr-2 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all text-xs font-mono tracking-widest shadow-sm ${nisnTouched && form.nisn && form.nisn.length !== 10 ? 'border-amber-500 ring-2 ring-amber-500/10' : ''}`}
                                        />
                                        <FontAwesomeIcon icon={faIdCard} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30 text-xs" />
                                    </div>
                                </div>

                                <div className="col-span-7">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faVenusMars} className="opacity-40" /> Gender
                                    </label>
                                    <div className="flex p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl h-11 shadow-sm">
                                        {[
                                            ['L', 'Putra', 'bg-blue-600 shadow-blue-600/30'],
                                            ['P', 'Putri', 'bg-rose-600 shadow-rose-600/30']
                                        ].map(([val, label, activeCls]) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setField('gender', val)}
                                                className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${form.gender === val
                                                    ? `${activeCls} text-white`
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.02]'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Baris 2: Penempatan & Status (Card Padat) */}
                    <div className="p-5 rounded-3xl bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] border-dashed space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faDoorOpen} className="opacity-40" /> Kamar
                                </label>
                                <RichSelect
                                    value={form.kamar}
                                    onChange={(val) => setField('kamar', val)}
                                    options={LIST_KAMAR.map(k => ({ id: k.id, name: k.id }))}
                                    placeholder="Pilih Kamar"
                                    icon={faDoorOpen}
                                    extraOption={{ id: '-', name: 'Lainnya / Kosong' }}
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faGraduationCap} className="opacity-40" /> Kelas
                                </label>
                                <RichSelect
                                    value={form.class_id}
                                    onChange={(val) => {
                                        setField('class_id', val)
                                        handleDupCheck(form.name, val)
                                    }}
                                    options={classesList}
                                    placeholder="Pilih Kelas"
                                    icon={faGraduationCap}
                                />
                            </div>
                        </div>

                        {/* Status Keaktifan - Full Text on all devices for clarity */}
                        <div className="relative pt-1">
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                                <FontAwesomeIcon icon={faCircleInfo} className="opacity-40" /> Status Akademik
                            </label>
                            <div className="flex p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl h-12 shadow-sm">
                                {[
                                    { key: 'aktif', label: 'Aktif', icon: faCheckCircle, activeCls: 'bg-emerald-500 shadow-emerald-500/20' },
                                    { key: 'lulus', label: 'Lulus', icon: faGraduationCap, activeCls: 'bg-blue-500 shadow-blue-500/20' },
                                    { key: 'keluar', label: 'Keluar', icon: faTriangleExclamation, activeCls: 'bg-slate-700 shadow-slate-700/20' },
                                ].map((opt) => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setField('status', opt.key)}
                                        className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 px-1 ${form.status === opt.key
                                            ? `${opt.activeCls} text-white shadow-md`
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/[0.02]'}`}
                                    >
                                        <FontAwesomeIcon icon={opt.icon} className={`text-[10px] shrink-0 ${form.status === opt.key ? 'opacity-100' : 'opacity-30'}`} />
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Duplicate Warning Prompt */}
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

                    {/* Expandable Sections */}
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
                                                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold font-mono tracking-wider placeholder:text-[10px] placeholder:font-normal placeholder:opacity-40"
                                                    />
                                                    <FontAwesomeIcon icon={faWhatsapp} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 opacity-60 text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-1 opacity-60">Hubungan</label>
                                                <RichSelect
                                                    value={form.guardian_relation}
                                                    onChange={(val) => setField('guardian_relation', val)}
                                                    options={['Ayah', 'Ibu', 'Kakek', 'Nenek', 'Wali'].map(r => ({ id: r, name: r }))}
                                                    placeholder="Pilih Hubungan"
                                                    small
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-1 opacity-60">Nama Wali</label>
                                            <input
                                                type="text"
                                                value={form.guardian_name}
                                                onChange={(e) => setField('guardian_name', e.target.value)}
                                                placeholder="Nama lengkap wali"
                                                className="w-full px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold shadow-sm"
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
                </div>

            </form>
        </Modal>
    )
})

export default StudentFormModal
