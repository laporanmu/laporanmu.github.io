import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
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
    faMapMarkerAlt,
    faPrayingHands,
    faCalendarAlt,
    faMap,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import RichSelect from '../ui/RichSelect'
import { LIST_KAMAR } from '../../pages/reports/utils/raportConstants'

const StudentFormModal = memo(function StudentFormModal({

    isOpen, onClose, selectedStudent, classesList,
    onSubmit, submitting, onPhotoUpload, uploadingPhoto,
}) {
    const INIT = {
        name: '', gender: 'L', class_id: '', phone: '', photo_url: '',
        nisn: '', nis: '', nik: '', birth_date: '', birth_place: '',
        religion: '', address: '',
        guardian_name: '', guardian_relation: 'Ayah',
        status: 'aktif', tags: [], kamar: ''
    }

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
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [expandedGuardian, setExpandedGuardian] = useState(false)
    const [avatarFile, setAvatarFile] = useState(null)
    const dupTimerRef = useRef(null)
    const photoRef = useRef(null)

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0]
        if (file) {
            setAvatarFile(file)
            const url = URL.createObjectURL(file)
            setAvatarPreview(url)
        }
    }, [])

    useEffect(() => {
        return () => {
            if (avatarPreview && avatarPreview.startsWith('blob:')) {
                URL.revokeObjectURL(avatarPreview)
            }
        }
    }, [avatarPreview])

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
                nis: selectedStudent.nis || '',
                nik: selectedStudent.nik || '',
                birth_date: selectedStudent.birth_date || '',
                birth_place: selectedStudent.birth_place || '',
                religion: selectedStudent.religion || '',
                address: selectedStudent.address || '',
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
                            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--color-border)] group-hover:border-[var(--color-primary)] transition-all overflow-hidden bg-[var(--color-surface-alt)] flex items-center justify-center relative">
                                {(avatarPreview || form.photo_url) ? (
                                    <img
                                        src={avatarPreview || form.photo_url}
                                        alt="Preview"
                                        className="w-full h-full object-cover animate-in fade-in zoom-in duration-300"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "";
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-1.5 opacity-40 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
                                        <FontAwesomeIcon icon={faCamera} className="text-xl" />
                                        <span className="text-[8px] font-bold uppercase tracking-wider">Foto</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <input
                            type="file" ref={photoRef}
                            onChange={async (e) => {
                                handleFileChange(e)
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
                    <div className="flex-1 w-full space-y-3">
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">
                                Nama Lengkap <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => {
                                        setField('name', e.target.value)
                                        handleDupCheck(e.target.value, form.class_id)
                                    }}
                                    placeholder="Masukkan nama lengkap siswa..."
                                    className={`w-full pl-9 pr-3 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 ${form.name ? 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]' : 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'}`}
                                    autoFocus
                                />
                                <FontAwesomeIcon icon={faUser} className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs transition-colors ${form.name ? 'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)]' : 'text-rose-500 opacity-70'}`} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NISN</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.nisn}
                                        onChange={(e) => setField('nisn', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        onBlur={() => setNisnTouched(true)}
                                        placeholder="Cth: 0056781234"
                                        className={`w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 ${nisnTouched && form.nisn && form.nisn.length !== 10 ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/10' : ''}`}
                                    />
                                    <FontAwesomeIcon icon={faIdCard} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NIS</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.nis}
                                        onChange={(e) => setField('nis', e.target.value.replace(/\D/g, ''))}
                                        placeholder="Cth: 2024001"
                                        className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                    />
                                    <FontAwesomeIcon icon={faIdBadge} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">
                            Jenis Kelamin <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                            {[
                                ['L', 'Putra', 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'],
                                ['P', 'Putri', 'bg-rose-500 text-white shadow-lg shadow-rose-500/20']
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
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Status</label>
                        <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                            {[
                                { key: 'aktif', label: 'Aktif', activeCls: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' },
                                { key: 'lulus', label: 'Lulus', activeCls: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' },
                                { key: 'keluar', label: 'Keluar', activeCls: 'bg-slate-700 text-white shadow-lg shadow-slate-700/20' },
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setField('status', opt.key)}
                                    className={`flex-1 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 ${form.status === opt.key
                                        ? opt.activeCls
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 1.5 Additional Identitas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative group">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NIK</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.nik}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 16)
                                    setField('nik', val)
                                }}
                                placeholder="Cth: 327101..."
                                className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                            />
                            <FontAwesomeIcon icon={faIdCard} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                        </div>
                    </div>
                    <div className="relative group">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Agama</label>
                        <RichSelect
                            value={form.religion}
                            onChange={(val) => setField('religion', val)}
                            options={['Islam', 'Kristen', 'Katolik', 'Hindu', 'Budha', 'Khonghucu'].map(r => ({ id: r, name: r }))}
                            placeholder="Pilih Agama"
                            icon={faPrayingHands}
                            small
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative group">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tempat Lahir</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.birth_place}
                                onChange={(e) => setField('birth_place', e.target.value)}
                                placeholder="Cth: Jakarta"
                                className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                            />
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                        </div>
                    </div>
                    <div className="relative group">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Lahir</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={form.birth_date}
                                onChange={(e) => setField('birth_date', e.target.value)}
                                className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)]"
                            />
                            <FontAwesomeIcon icon={faCalendarAlt} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                        </div>
                    </div>
                </div>

                <div className="relative group">
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Alamat Lengkap</label>
                    <div className="relative">
                        <textarea
                            value={form.address}
                            onChange={(e) => setField('address', e.target.value)}
                            placeholder="Masukkan alamat lengkap rumah siswa..."
                            className="w-full pl-9 pr-3 py-3 min-h-[80px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 resize-none"
                        />
                        <FontAwesomeIcon icon={faMap} className="absolute left-3.5 top-4 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                    </div>
                </div>

                {/* 2. Placement - Flat layout */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Kamar Asrama</label>
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
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">
                            Kelas Akademik <span className="text-rose-500">*</span>
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
                <div className="space-y-3">
                    {/* Guardian Info Collapsible */}
                    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface-alt)]/30">
                        <button
                            type="button"
                            onClick={() => setExpandedGuardian(!expandedGuardian)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-surface-alt)]/50 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expandedGuardian ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                    <FontAwesomeIcon icon={faUsers} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-bold text-[var(--color-text)]">Info Wali & Kontak</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">Nama Wali, No. HP, Hubungan</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {(form.guardian_name || form.phone) && !expandedGuardian && (
                                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase tracking-wider animate-in fade-in zoom-in">
                                        Terisi
                                    </div>
                                )}
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`text-[10px] text-[var(--color-text-muted)] transition-transform duration-300 ${expandedGuardian ? 'rotate-180' : ''}`}
                                />
                            </div>
                        </button>

                        <div className={`transition-all duration-300 ease-in-out ${expandedGuardian ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                            <div className="px-4 pb-4 space-y-4 pt-2 border-t border-[var(--color-border)]/50">
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Wali</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.guardian_name}
                                            onChange={(e) => setField('guardian_name', e.target.value)}
                                            placeholder="Cth: Ahmad Fauzi"
                                            className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                        />
                                        <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. HP Wali</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.phone}
                                                onChange={(e) => setField('phone', e.target.value.replace(/\D/g, ''))}
                                                placeholder="08xxxxxxxxxx"
                                                className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                            />
                                            <FontAwesomeIcon icon={faWhatsapp} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 opacity-70 text-xs" />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Hubungan</label>
                                        <RichSelect
                                            value={form.guardian_relation}
                                            onChange={(val) => setField('guardian_relation', val)}
                                            options={[
                                                { id: 'Ayah', name: 'Ayah Kandung' },
                                                { id: 'Ibu', name: 'Ibu Kandung' },
                                                { id: 'Wali', name: 'Wali / Saudara' }
                                            ]}
                                            placeholder="Pilih Hubungan"
                                            icon={faUsers}
                                            small
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
