import React, { useState, useCallback, memo, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight, faArrowLeft, faSave, faSpinner, faCheckCircle,
    faUser, faUsers, faFileAlt, faClipboardCheck, faMars, faVenus,
    faSchool, faBookQuran, faHeart, faGraduationCap, faMapMarkerAlt,
    faCalendarAlt, faIdCard, faPhone, faCamera, faSuitcase, faCheck, faTrash
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import {
    PROGRAM_OPTIONS, QURAN_LEVELS, UNIFORM_SIZES
} from '../../utils/enrollment/enrollmentConstants'
import {
    EDUCATION_LEVELS, OCCUPATION_LIST
} from '../../utils/students/studentsConstants'

const STEPS = [
    { id: 0, label: 'Identitas', icon: faUser, desc: 'Data calon santri' },
    { id: 1, label: 'Keluarga', icon: faUsers, desc: 'Data orang tua/wali' },
    { id: 2, label: 'Tambahan', icon: faFileAlt, desc: 'Alamat, kesehatan, dokumen' },
    { id: 3, label: 'Review', icon: faClipboardCheck, desc: 'Cek & kirim pendaftaran' },
]

const INITIAL_FORM = {
    name: '', gender: 'L', birth_place: '', birth_date: '', nisn: '',
    school_origin: '', previous_pesantren: '', phone: '', photo_url: '',
    program: 'reguler', quran_level: 'belum', hafalan_quran: 0,
    father_name: '', father_occupation: '', father_education: '', father_phone: '',
    mother_name: '', mother_occupation: '', mother_education: '', mother_phone: '',
    guardian_name: '', guardian_relation: '', guardian_phone: '',
    address: '', health_notes: '', uniform_size: 'M',
    documents: {},
    wave_id: '',
}

function EnrollmentFormModal({ isOpen, onClose, onSubmit, enrollment, submitting }) {
    const [step, setStep] = useState(0)
    const [form, setForm] = useState({ ...INITIAL_FORM })
    const [touched, setTouched] = useState({})
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)
    const photoRef = useRef(null)

    // Reset or load data
    useEffect(() => {
        if (isOpen) {
            if (enrollment) {
                setForm({
                    ...INITIAL_FORM,
                    ...enrollment,
                })
            } else {
                setForm({ ...INITIAL_FORM })
            }
            setStep(0)
            setTouched({})
            setAttemptedSubmit(false)
        }
    }, [enrollment, isOpen])

    const setField = useCallback((key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }, [])

    const setFieldTouched = useCallback((key) => {
        setTouched(prev => ({ ...prev, [key]: true }))
    }, [])

    // Get validation state
    const getStatus = useCallback((field, isRequired = false) => {
        const value = form[field]
        const isTouched = touched[field] || attemptedSubmit

        if (field === 'nisn' && value && value.length !== 10) return 'warning'
        if ((field === 'phone' || field === 'father_phone' || field === 'mother_phone') && value && (value.length < 10 || !value.startsWith('08'))) return 'warning'

        if (isRequired) {
            if (isTouched && (!value || (typeof value === 'string' && !value.trim()))) return 'error'
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        } else {
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        }
        return 'normal'
    }, [form, touched, attemptedSubmit])

    const canNext = useCallback(() => {
        if (step === 0) {
            return form.name && form.name.trim().length >= 3 && form.school_origin && form.school_origin.trim().length >= 2
        }
        if (step === 1) {
            return form.father_name && form.father_name.trim().length >= 2 && form.mother_name && form.mother_name.trim().length >= 2
        }
        if (step === 2) {
            return form.address && form.address.trim().length >= 5
        }
        return true
    }, [step, form])

    const handleNext = useCallback(() => {
        if (step === 0 && (!form.name || form.name.trim().length < 3 || !form.school_origin || form.school_origin.trim().length < 2)) {
            setAttemptedSubmit(true)
            setTouched({ name: true, school_origin: true })
            return
        }
        if (step === 1 && (!form.father_name || form.father_name.trim().length < 2 || !form.mother_name || form.mother_name.trim().length < 2)) {
            setAttemptedSubmit(true)
            setTouched({ father_name: true, mother_name: true })
            return
        }
        if (step === 2 && (!form.address || form.address.trim().length < 5)) {
            setAttemptedSubmit(true)
            setTouched({ address: true })
            return
        }
        if (step < STEPS.length - 1) {
            setStep(s => s + 1)
        }
    }, [step, form])

    const handlePrev = useCallback(() => {
        if (step > 0) setStep(s => s - 1)
    }, [step])

    const handleSubmitForm = useCallback((e) => {
        if (e) e.preventDefault()
        if (!canNext()) {
            setAttemptedSubmit(true)
            return
        }
        onSubmit(form)
    }, [form, onSubmit, canNext])

    if (!isOpen) return null

    const progress = Math.round(((step + 1) / STEPS.length) * 100)
    const isEditing = !!enrollment

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit Data Pendaftaran' : 'Pendaftaran Santri Baru'}
            description={
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                        <div
                            className="h-full bg-[var(--color-primary)] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-[var(--color-primary)]">{progress}% Lengkap</span>
                </div>
            }
            icon={isEditing ? faFileAlt : faUser}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                        Langkah {step + 1} dari {STEPS.length}
                    </div>
                    <div className="flex items-center gap-2">
                        {step > 0 ? (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center justify-center gap-2"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="text-[10px] opacity-50" />
                                Kembali
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                        )}

                        {step < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 border border-white/10 shrink-0"
                            >
                                Lanjut
                                <FontAwesomeIcon icon={faArrowRight} className="text-[10px] opacity-80" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmitForm}
                                disabled={submitting}
                                className="h-10 px-6 sm:px-8 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                            >
                                {submitting ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faSave} className="text-xs opacity-80 shrink-0" />
                                        <span>{isEditing ? 'Simpan' : 'Kirim'}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <form id="enrollment-form-modal" onSubmit={handleSubmitForm} className="space-y-4">
                {/* Stepper Header */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.id}>
                                <button
                                    type="button"
                                    onClick={() => i < step && setStep(i)}
                                    disabled={i > step}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all relative ${step === i ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 scale-110' : i < step ? 'bg-emerald-500 text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}
                                >
                                    {i < step ? <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                                    <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-tighter whitespace-nowrap transition-opacity ${step === i ? 'opacity-100' : 'opacity-0'}`}>
                                        {s.label}
                                    </span>
                                </button>
                                {i < STEPS.length - 1 && <div className={`h-[2px] w-6 rounded-full ${i < step ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-30 mt-1" />
                </div>

                {/* Step contents */}
                {step === 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Avatar photo preview placeholder */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative group shrink-0 mx-auto sm:mx-0">
                                <div
                                    className={`w-[88px] h-[88px] rounded-2xl bg-[var(--color-surface-alt)] border flex items-center justify-center overflow-hidden transition-all cursor-pointer ${form.photo_url ? 'border-emerald-500/50' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}
                                    onClick={() => photoRef.current?.click()}
                                >
                                    {form.photo_url ? (
                                        <img
                                            src={form.photo_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover animate-in fade-in zoom-in duration-300"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-1.5 opacity-40 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
                                            <FontAwesomeIcon icon={faCamera} className="text-xl" />
                                            <span className="text-[8px] font-bold uppercase tracking-wider">Foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 w-full space-y-3">
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">
                                        Nama Lengkap <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setField('name', e.target.value)}
                                            onBlur={() => setFieldTouched('name')}
                                            placeholder="Nama lengkap calon santri"
                                            className={`w-full pl-9 pr-3 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                            ${getStatus('name', true) === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/5' :
                                                    getStatus('name', true) === 'success' ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/5' :
                                                        'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'}`}
                                            autoFocus
                                        />
                                        <FontAwesomeIcon icon={faUser} className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs transition-colors 
                                        ${getStatus('name', true) === 'error' ? 'text-rose-500' :
                                                getStatus('name', true) === 'success' ? 'text-emerald-500' :
                                                    'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)]'}`} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">
                                            Jenis Kelamin <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                            {[
                                                ['L', 'Laki-laki', 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'],
                                                ['P', 'Perempuan', 'bg-rose-500 text-white shadow-lg shadow-rose-500/20']
                                            ].map(([val, labelStr, activeCls]) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => setField('gender', val)}
                                                    className={`flex-1 rounded-lg text-[11px] font-bold tracking-wider transition-all duration-200 ${form.gender === val ? activeCls : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                                >
                                                    {labelStr}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">
                                            Program <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={form.program}
                                            onChange={e => setField('program', e.target.value)}
                                            className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] outline-none focus:border-[var(--color-primary)] transition-all font-bold"
                                        >
                                            {PROGRAM_OPTIONS.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2">
                            <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                            <FontAwesomeIcon icon={faSchool} className="text-[var(--color-primary)] text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Detail Personal & Akademik</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tempat Lahir</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.birth_place}
                                        onChange={e => setField('birth_place', e.target.value)}
                                        placeholder="Kota kelahiran"
                                        className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                    />
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Lahir</label>
                                <div className="relative h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all">
                                    <div className={`absolute inset-0 flex items-center pl-9 pr-3 pointer-events-none text-[13px] ${form.birth_date ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                                        {form.birth_date ? (() => {
                                            const parts = form.birth_date.split('-')
                                            if (parts.length === 3) {
                                                const [y, m, d] = parts
                                                return `${d}/${m}/${y}`
                                            }
                                            return form.birth_date
                                        })() : 'dd/mm/yyyy'}
                                    </div>
                                    <input
                                        type="date"
                                        value={form.birth_date}
                                        onChange={e => setField('birth_date', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none bg-transparent date-input-hidden z-10"
                                    />
                                    <FontAwesomeIcon icon={faCalendarAlt} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)] pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NISN</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.nisn}
                                        onChange={e => setField('nisn', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="10 digit NISN"
                                        className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                    />
                                    <FontAwesomeIcon icon={faIdCard} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">
                                    Asal Sekolah <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={form.school_origin}
                                        onChange={e => setField('school_origin', e.target.value)}
                                        onBlur={() => setFieldTouched('school_origin')}
                                        placeholder="Nama sekolah asal"
                                        className={`w-full pl-9 pr-3 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                        ${getStatus('school_origin', true) === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/5' :
                                                getStatus('school_origin', true) === 'success' ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/5' :
                                                    'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'}`}
                                    />
                                    <FontAwesomeIcon icon={faSchool} className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs transition-colors 
                                    ${getStatus('school_origin', true) === 'error' ? 'text-rose-500' :
                                            getStatus('school_origin', true) === 'success' ? 'text-emerald-500' :
                                                'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)]'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Quran Section inside Step 1 */}
                        <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faBookQuran} className="text-sm" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-[var(--color-text)]">Kemampuan Al-Quran</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)]">Tingkat bacaan dan hafalan saat ini</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Tingkat Bacaan</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {QURAN_LEVELS.map(q => (
                                            <button
                                                key={q.id}
                                                type="button"
                                                onClick={() => setField('quran_level', q.id)}
                                                className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all duration-200 ${form.quran_level === q.id ? `${q.color} border-current ring-1 ring-current/25 shadow-sm` : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                {q.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Hafalan (Juz)</label>
                                    <div className="flex items-center gap-3 h-11 px-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-alt)]/20">
                                        <input
                                            type="range"
                                            min="0"
                                            max="30"
                                            value={form.hafalan_quran}
                                            onChange={e => setField('hafalan_quran', Number(e.target.value))}
                                            className="flex-1 accent-emerald-500 h-1 rounded-lg cursor-pointer"
                                        />
                                        <span className="text-base font-black text-emerald-600 w-8 text-center tabular-nums">{form.hafalan_quran}</span>
                                    </div>
                                    <p className="text-[9px] text-[var(--color-text-muted)] mt-1">Jumlah juz yang sudah dihafal</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Ayah info */}
                        <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                                <FontAwesomeIcon icon={faUser} className="text-[var(--color-primary)] text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Data Ayah</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">
                                        Nama Lengkap Ayah <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.father_name}
                                            onChange={e => setField('father_name', e.target.value)}
                                            onBlur={() => setFieldTouched('father_name')}
                                            placeholder="Nama lengkap ayah"
                                            className={`w-full pl-9 pr-3 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                            ${getStatus('father_name', true) === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/5' :
                                                    getStatus('father_name', true) === 'success' ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/5' :
                                                        'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'}`}
                                        />
                                        <FontAwesomeIcon icon={faUser} className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs transition-colors 
                                        ${getStatus('father_name', true) === 'error' ? 'text-rose-500' :
                                                getStatus('father_name', true) === 'success' ? 'text-emerald-500' :
                                                    'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)]'}`} />
                                    </div>
                                </div>
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. HP Ayah</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={form.father_phone}
                                            onChange={e => setField('father_phone', e.target.value)}
                                            placeholder="08xxxxxxxxxx"
                                            className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                        />
                                        <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Pekerjaan Ayah</label>
                                    <select
                                        value={form.father_occupation}
                                        onChange={e => setField('father_occupation', e.target.value)}
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] outline-none focus:border-[var(--color-primary)] transition-all"
                                    >
                                        <option value="">Pilih Pekerjaan</option>
                                        {OCCUPATION_LIST.map(o => (
                                            <option key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Pendidikan Ayah</label>
                                    <select
                                        value={form.father_education}
                                        onChange={e => setField('father_education', e.target.value)}
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] outline-none focus:border-[var(--color-primary)] transition-all"
                                    >
                                        <option value="">Pilih Pendidikan</option>
                                        {EDUCATION_LEVELS.map(el => (
                                            <option key={el} value={el}>{el}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Mother info */}
                        <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                                <FontAwesomeIcon icon={faVenus} className="text-[var(--color-primary)] text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Data Ibu</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">
                                        Nama Lengkap Ibu <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.mother_name}
                                            onChange={e => setField('mother_name', e.target.value)}
                                            onBlur={() => setFieldTouched('mother_name')}
                                            placeholder="Nama lengkap ibu"
                                            className={`w-full pl-9 pr-3 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                            ${getStatus('mother_name', true) === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/5' :
                                                    getStatus('mother_name', true) === 'success' ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/5' :
                                                        'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'}`}
                                        />
                                        <FontAwesomeIcon icon={faUser} className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs transition-colors 
                                        ${getStatus('mother_name', true) === 'error' ? 'text-rose-500' :
                                                getStatus('mother_name', true) === 'success' ? 'text-emerald-500' :
                                                    'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)]'}`} />
                                    </div>
                                </div>
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. HP Ibu</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={form.mother_phone}
                                            onChange={e => setField('mother_phone', e.target.value)}
                                            placeholder="08xxxxxxxxxx"
                                            className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                        />
                                        <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Pekerjaan Ibu</label>
                                    <select
                                        value={form.mother_occupation}
                                        onChange={e => setField('mother_occupation', e.target.value)}
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] outline-none focus:border-[var(--color-primary)] transition-all"
                                    >
                                        <option value="">Pilih Pekerjaan</option>
                                        {OCCUPATION_LIST.map(o => (
                                            <option key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Pendidikan Ibu</label>
                                    <select
                                        value={form.mother_education}
                                        onChange={e => setField('mother_education', e.target.value)}
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] outline-none focus:border-[var(--color-primary)] transition-all"
                                    >
                                        <option value="">Pilih Pendidikan</option>
                                        {EDUCATION_LEVELS.map(el => (
                                            <option key={el} value={el}>{el}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Guardian (optional) */}
                        <div className="p-4 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Data Wali (Opsional)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Wali</label>
                                    <input
                                        type="text"
                                        value={form.guardian_name}
                                        onChange={e => setField('guardian_name', e.target.value)}
                                        placeholder="Nama wali"
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none text-[13px] text-[var(--color-text)] transition-all"
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Hubungan</label>
                                    <input
                                        type="text"
                                        value={form.guardian_relation}
                                        onChange={e => setField('guardian_relation', e.target.value)}
                                        placeholder="Paman / Kakek / dll"
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none text-[13px] text-[var(--color-text)] transition-all"
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. HP Wali</label>
                                    <input
                                        type="tel"
                                        value={form.guardian_phone}
                                        onChange={e => setField('guardian_phone', e.target.value)}
                                        placeholder="08xxxxxxxxxx"
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none text-[13px] text-[var(--color-text)] transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">
                                Alamat Lengkap <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <textarea
                                    value={form.address}
                                    onChange={e => setField('address', e.target.value)}
                                    onBlur={() => setFieldTouched('address')}
                                    rows={3}
                                    placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kabupaten/Kota, Provinsi, Kode Pos"
                                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 resize-none
                                    ${getStatus('address', true) === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/5' :
                                            getStatus('address', true) === 'success' ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/5' :
                                                'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'}`}
                                />
                            </div>
                        </div>

                        {/* Health & Uniform size */}
                        <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faHeart} className="text-sm" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-[var(--color-text)]">Kesehatan & Perlengkapan</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)]">Info kesehatan dan ukuran seragam</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2 relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Riwayat Kesehatan / Alergi</label>
                                    <textarea
                                        value={form.health_notes}
                                        onChange={e => setField('health_notes', e.target.value)}
                                        rows={2}
                                        placeholder="Tulis penyakit, alergi, atau kondisi khusus (kosongkan jika tidak ada)"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none text-sm text-[var(--color-text)] transition-all resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Ukuran Seragam</label>
                                    <div className="flex gap-1">
                                        {UNIFORM_SIZES.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setField('uniform_size', s)}
                                                className={`flex-1 py-2 rounded-xl border text-[12px] font-black transition-all duration-200 ${form.uniform_size === s ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/10' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative group">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Asal Pesantren Sebelumnya</label>
                                    <input
                                        type="text"
                                        value={form.previous_pesantren}
                                        onChange={e => setField('previous_pesantren', e.target.value)}
                                        placeholder="Kosongkan jika baru pertama kali"
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none text-[13px] text-[var(--color-text)] transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. HP Utama (Konfirmasi WhatsApp)</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setField('phone', e.target.value)}
                                    placeholder="08xxxxxxxxxx"
                                    className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                />
                                <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50 text-xs transition-colors group-focus-within:text-[var(--color-primary)]" />
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-4 border border-emerald-500/20 bg-emerald-500/[0.03] rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" />
                                <p className="text-[12px] font-bold text-emerald-600">Periksa kembali data pendaftaran</p>
                            </div>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Pastikan semua kolom penting sudah terisi dengan benar sebelum mengirim data pendaftaran.</p>
                        </div>

                        <div className="p-4 border border-[var(--color-border)] rounded-2xl space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]/50 pb-1.5">Identitas Calon Santri</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="opacity-50">Nama:</span> <span className="font-bold">{form.name}</span></div>
                                <div><span className="opacity-50">Gender:</span> <span className="font-bold">{form.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
                                <div><span className="opacity-50">Tempat Lahir:</span> <span className="font-bold">{form.birth_place || '-'}</span></div>
                                <div><span className="opacity-50">Tanggal Lahir:</span> <span className="font-bold">{form.birth_date || '-'}</span></div>
                                <div><span className="opacity-50">NISN:</span> <span className="font-bold">{form.nisn || '-'}</span></div>
                                <div><span className="opacity-50">Asal Sekolah:</span> <span className="font-bold">{form.school_origin}</span></div>
                                <div><span className="opacity-50">Program:</span> <span className="font-bold">{PROGRAM_OPTIONS.find(p => p.id === form.program)?.name}</span></div>
                                <div><span className="opacity-50">Hafalan Juz:</span> <span className="font-bold">{form.hafalan_quran} Juz</span></div>
                            </div>
                        </div>

                        <div className="p-4 border border-[var(--color-border)] rounded-2xl space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]/50 pb-1.5">Keluarga & Kontak</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="opacity-50">Nama Ayah:</span> <span className="font-bold">{form.father_name}</span></div>
                                <div><span className="opacity-50">Pekerjaan Ayah:</span> <span className="font-bold">{form.father_occupation || '-'}</span></div>
                                <div><span className="opacity-50">Nama Ibu:</span> <span className="font-bold">{form.mother_name}</span></div>
                                <div><span className="opacity-50">Pekerjaan Ibu:</span> <span className="font-bold">{form.mother_occupation || '-'}</span></div>
                                <div><span className="opacity-50">No. HP Utama:</span> <span className="font-bold">{form.phone || '-'}</span></div>
                            </div>
                        </div>

                        <div className="p-4 border border-[var(--color-border)] rounded-2xl space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]/50 pb-1.5">Alamat & Tambahan</p>
                            <div className="grid grid-cols-1 gap-2 text-xs">
                                <div><span className="opacity-50">Alamat:</span> <span className="font-bold">{form.address}</span></div>
                                <div><span className="opacity-50">Kesehatan:</span> <span className="font-bold">{form.health_notes || 'Tidak ada riwayat'}</span></div>
                                <div><span className="opacity-50">Ukuran Seragam:</span> <span className="font-bold">{form.uniform_size}</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </form>
            <input
                type="file" ref={photoRef}
                onChange={async (e) => {
                    const file = e.target.files[0]
                    if (file) {
                        const url = URL.createObjectURL(file)
                        setField('photo_url', url)
                    }
                }}
                className="hidden" accept="image/*"
            />
        </Modal>
    )
}

export default memo(EnrollmentFormModal)
