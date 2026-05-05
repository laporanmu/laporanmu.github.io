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

const RichSelect = ({ value, onChange, options, placeholder, icon, extraOption, small, placement = "bottom" }) => {
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
                className={`w-full flex items-center justify-between gap-2 ${small ? 'px-3 h-10' : 'pl-9 pr-3 h-10'} rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] relative group`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && !small && <FontAwesomeIcon icon={icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)] group-hover:text-[var(--color-primary)]" />}
                    <span className={selectedOption ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-60'}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute ${placement === 'top' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'} left-0 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-48 overflow-y-auto backdrop-blur-xl`}>
                    {extraOption && (
                        <button
                            type="button"
                            onClick={() => { onChange(extraOption.id); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[12px] font-semibold hover:bg-[var(--color-primary)]/5 transition-all flex items-center gap-3 border-b border-[var(--color-border)] mb-1 ${value === extraOption.id ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-amber-600'}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${value === extraOption.id ? 'bg-[var(--color-primary)]' : 'bg-amber-600'}`} />
                            {extraOption.name}
                        </button>
                    )}
                    {options.length === 0 ? (
                        <div className="px-4 py-3 text-center">
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Data Kosong</p>
                        </div>
                    ) : options.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => { onChange(opt.id); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[12px] font-semibold hover:bg-[var(--color-primary)]/5 transition-all flex items-center gap-3 ${String(value) === String(opt.id) ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text)]'}`}
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
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-[10px] opacity-50" />
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="student-form-modal"
                        disabled={submitting || !form.name.trim() || !form.class_id}
                        className="flex-[2] h-11 px-2 sm:px-6 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[var(--color-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                    >
                        {submitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={selectedStudent ? faCheckCircle : faPlus} className="text-xs opacity-80 shrink-0" />
                                <span className="truncate">{selectedStudent ? (selectedStudent.status === 'aktif' ? 'Update Data' : 'Simpan') : 'Daftarkan Siswa'}</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <form
                id="student-form-modal"
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                {/* 1. Header: Avatar & Core Info */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Avatar */}
                    <div className="relative group shrink-0 mx-auto sm:mx-0">
                        <div
                            className="w-[88px] h-[88px] rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all hover:border-[var(--color-primary)] cursor-pointer"
                            onClick={() => photoRef.current?.click()}
                        >
                            {form.photo_url ? (
                                <img src={form.photo_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                                <div className="flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <FontAwesomeIcon icon={faCamera} className="text-2xl" />
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
                            <div className="absolute inset-0 rounded-2xl bg-[var(--color-surface)]/80 flex items-center justify-center backdrop-blur-sm z-20 border border-[var(--color-border)]">
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)] text-sm" />
                            </div>
                        )}
                    </div>

                    {/* Basic Inputs */}
                    <div className="flex-1 w-full flex flex-col justify-between space-y-3 sm:space-y-0">
                        <div className="relative group">
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => {
                                    setField('name', e.target.value)
                                    handleDupCheck(e.target.value, form.class_id)
                                }}
                                placeholder="Nama Lengkap Siswa"
                                className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-60"
                                autoFocus
                            />
                            <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            {form.name && form.name.trim().length < 3 && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-bold text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded">
                                    Terlalu Pendek
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <input
                                    type="text"
                                    value={form.nisn}
                                    onChange={(e) => setField('nisn', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    onBlur={() => setNisnTouched(true)}
                                    placeholder="NISN (Opsional)"
                                    className={`w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-60 ${nisnTouched && form.nisn && form.nisn.length !== 10 ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/10' : ''}`}
                                />
                                <FontAwesomeIcon icon={faIdCard} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>

                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-10 w-[140px] shrink-0">
                                {[
                                    ['L', 'Putra', 'bg-[var(--color-primary)] text-white'],
                                    ['P', 'Putri', 'bg-rose-500 text-white']
                                ].map(([val, label, activeCls]) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setField('gender', val)}
                                        className={`flex-1 rounded-lg text-[11px] font-bold tracking-wider transition-all duration-200 ${form.gender === val
                                            ? activeCls
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Placement & Status - Flat layout */}
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[var(--color-text-muted)] ml-1">Kamar Asrama</label>
                            <RichSelect
                                value={form.kamar}
                                onChange={(val) => setField('kamar', val)}
                                options={LIST_KAMAR.map(k => ({ id: k.id, name: k.id }))}
                                placeholder="Pilih Kamar"
                                icon={faDoorOpen}
                                extraOption={{ id: '-', name: 'Lainnya / Kosong' }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[var(--color-text-muted)] ml-1">Kelas Akademik</label>
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

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[var(--color-text-muted)] ml-1">Status Keaktifan</label>
                        <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-10">
                            {[
                                { key: 'aktif', label: 'Aktif', icon: faCheckCircle, activeCls: 'bg-emerald-500 text-white' },
                                { key: 'lulus', label: 'Lulus', icon: faGraduationCap, activeCls: 'bg-blue-500 text-white' },
                                { key: 'keluar', label: 'Keluar', icon: faTriangleExclamation, activeCls: 'bg-slate-700 text-white' },
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setField('status', opt.key)}
                                    className={`flex-1 rounded-lg text-[11px] font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${form.status === opt.key
                                        ? opt.activeCls
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                >
                                    <FontAwesomeIcon icon={opt.icon} className={form.status === opt.key ? 'opacity-100' : 'opacity-50'} />
                                    <span className="truncate">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Duplicate Warning */}
                {duplicateWarning && (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 animate-in slide-in-from-top-2 flex gap-3">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-sm mt-0.5" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Potensi Duplikasi</p>
                            <div className="space-y-0.5">
                                {duplicateWarning.map(d => (
                                    <p key={d.id} className="text-xs">
                                        {d.name} <span className="opacity-50">[{d.registration_code}]</span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Expandable Sections */}
                <div className="space-y-2">
                    {/* Wali Siswa */}
                    <div className={`border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] ${showOptional ? '' : 'overflow-hidden'}`}>
                        <button
                            type="button"
                            onClick={() => setShowOptional(v => !v)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${showOptional ? 'bg-[var(--color-surface-alt)]/50' : 'hover:bg-[var(--color-surface-alt)]/30'}`}
                        >
                            <span className="text-[12px] font-semibold text-[var(--color-text)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faUsers} className="text-[var(--color-text-muted)] opacity-70" />
                                Info Wali & Kontak
                            </span>
                            <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] opacity-40 transition-transform duration-300 ${showOptional ? 'rotate-180' : ''}`} />
                        </button>

                        <div className={`grid transition-all duration-300 ease-in-out ${showOptional ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className={showOptional ? "overflow-visible" : "overflow-hidden"}>
                                <div className="p-4 pt-2 border-t border-[var(--color-border)] space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5 ml-1">WhatsApp Wali</label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, ''))}
                                                    placeholder="08xxxxxxxxxx"
                                                    className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-60"
                                                />
                                                <FontAwesomeIcon icon={faWhatsapp} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 opacity-80 text-[14px]" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5 ml-1">Hubungan</label>
                                            <RichSelect
                                                value={form.guardian_relation}
                                                onChange={(val) => setField('guardian_relation', val)}
                                                options={['Ayah', 'Ibu', 'Kakek', 'Nenek', 'Wali'].map(r => ({ id: r, name: r }))}
                                                placeholder="Pilih Hubungan"
                                                small
                                                placement="top"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5 ml-1">Nama Wali</label>
                                        <input
                                            type="text"
                                            value={form.guardian_name}
                                            onChange={(e) => setField('guardian_name', e.target.value)}
                                            placeholder="Nama Lengkap Wali"
                                            className="w-full px-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-60"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className={`border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] ${showMetadata ? '' : 'overflow-hidden'}`}>
                        <button
                            type="button"
                            onClick={() => setShowMetadata(v => !v)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${showMetadata ? 'bg-[var(--color-surface-alt)]/50' : 'hover:bg-[var(--color-surface-alt)]/30'}`}
                        >
                            <span className="text-[12px] font-semibold text-[var(--color-text)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faPen} className="text-[var(--color-text-muted)] opacity-70" />
                                Catatan Khusus
                                {metadataFields.length > 0 && (
                                    <span className="ml-2 text-[10px] font-bold bg-[var(--color-primary)] text-white px-2 rounded-full">
                                        {metadataFields.length}
                                    </span>
                                )}
                            </span>
                            <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] opacity-40 transition-transform duration-300 ${showMetadata ? 'rotate-180' : ''}`} />
                        </button>

                        <div className={`grid transition-all duration-300 ease-in-out ${showMetadata ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className={showMetadata ? "overflow-visible" : "overflow-hidden"}>
                                <div className="p-4 pt-3 border-t border-[var(--color-border)] space-y-3">
                                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mb-3">
                                        Tambahkan info custom (misal: Alergi, Riwayat Kesehatan).
                                    </p>
                                    <div className="space-y-2">
                                        {metadataFields.map((m, idx) => (
                                            <div key={idx} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-300">
                                                <input
                                                    placeholder="Label"
                                                    className="w-1/3 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                                    value={m.key}
                                                    onChange={(e) => handleUpdateMeta(idx, e.target.value, m.value)}
                                                />
                                                <input
                                                    placeholder="Keterangan..."
                                                    className="flex-1 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                                    value={m.value}
                                                    onChange={(e) => handleUpdateMeta(idx, m.key, e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMeta(idx)}
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors shrink-0"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="text-sm" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddMeta}
                                        className="w-full h-9 rounded-lg border border-dashed border-[var(--color-border)] bg-transparent hover:bg-[var(--color-surface-alt)]/50 transition-colors text-[11px] font-semibold flex items-center justify-center gap-2 mt-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                        Tambah Field
                                    </button>
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
