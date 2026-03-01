import React from 'react'
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus,
    faSearch,
    faEdit,
    faTrash,
    faMars,
    faVenus,
    faDownload,
    faUpload,
    faUsers,
    faTrophy,
    faSpinner,
    faHistory,
    faQrcode,
    faIdCardAlt,
    faArrowTrendUp,
    faArrowTrendDown,
    faCheckCircle,
    faGraduationCap,
    faCamera,
    faChevronLeft,
    faChevronRight,
    faAnglesLeft,
    faAnglesRight,
    faTriangleExclamation,
    faPrint,
    faFilter,
    faXmark,
    faSliders,
    faTableList,
    faSchool,
    faBullhorn,
    faArchive,
    faBoxArchive,
    faRotateLeft,
    faUserTie,
    faCrown,
    faMedal,
    faLink,
    faClockRotateLeft,
    faArrowRightArrowLeft,
    faCheck,
    faChevronDown,
    faFileLines,
    faImage,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import mbsLogo from '../../assets/mbs.png'

// Library untuk Export dan Import 
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

const SortOptions = [
    { value: 'name_asc', label: 'Nama A–Z' },
    { value: 'name_desc', label: 'Nama Z–A' },
    { value: 'class_asc', label: 'Kelas A–Z' },
    { value: 'points_desc', label: 'Poin tertinggi' },
    { value: 'points_asc', label: 'Poin terendah' },
]

const RiskThreshold = -30
const AvailableTags = ['Beasiswa', 'Berprestasi']

// =========================================
// StudentFormModal — komponen TERPISAH agar
// state form tidak trigger re-render parent
// =========================================
const StudentFormModal = memo(function StudentFormModal({
    isOpen, onClose, selectedStudent, classesList,
    onSubmit, submitting, onPhotoUpload, uploadingPhoto,
}) {
    const INIT = { name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah', status: 'aktif', tags: [] }

    const [form, setForm] = useState(INIT)
    const [nisnTouched, setNisnTouched] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState(null)
    const [showOptional, setShowOptional] = useState(false)
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
            setShowOptional(!!(selectedStudent.nisn || selectedStudent.guardian_name || (selectedStudent.tags || []).length > 0))
        } else {
            setForm(INIT)
            setShowOptional(false)
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

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(form)
    }

    if (!isOpen) return null

    const isValidPhone = (p) => !p || /^(08|628)\d{8,11}$/.test(p.replace(/\s/g, ''))

    const node = (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/5"
        >
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[8px] transition-all animate-in fade-in duration-500"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-lg bg-[var(--color-surface)] rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Header Section - Compact */}
                <div className="relative px-6 pt-6 pb-4 border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface-alt)]/50 to-transparent">
                    <div className="flex items-center justify-between mb-0.5">
                        <h2 className="font-black text-xl text-[var(--color-text)] tracking-tight">
                            {selectedStudent ? 'Edit Profil' : 'Registrasi Baru'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 group"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-lg group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-60">
                        {selectedStudent ? 'Pembaruan data personal' : 'Input data siswa baru unit'}
                    </p>
                </div>

                {/* Form Body - Compact */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-none">
                    {/* Top Section: Photo + Essential Info */}
                    <div className="flex gap-6 items-start">
                        {/* Interactive Photo Upload - Smaller */}
                        <div className="shrink-0 flex flex-col items-center gap-2">
                            <div className="relative group">
                                <div
                                    className="w-20 h-20 rounded-2xl bg-[var(--color-surface-alt)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/5 cursor-pointer shadow-inner"
                                    onClick={() => photoRef.current?.click()}
                                >
                                    {form.photo_url ? (
                                        <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 opacity-30 group-hover:opacity-70 transition-all transform group-hover:scale-105">
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
                    <div className="grid grid-cols-2 gap-4">
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
                                {[['aktif', 'emerald'], ['lulus', 'blue'], ['keluar', 'gray']].map(([s, color]) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setField('status', s)}
                                        className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${form.status === s
                                            ? `bg-${color}-500 text-white border-transparent shadow shadow-${color}-500/20`
                                            : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                    >
                                        {s}
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
                                <FontAwesomeIcon icon={faBoxArchive} className={showOptional ? 'text-[var(--color-primary)]' : ''} />
                                Info Opsional & Wali
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

                    {/* Navigation Actions - Shorter */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-10 px-8 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-indigo-700 text-white shadow-lg shadow-[var(--color-primary)]/30 hover:brightness-110 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? (
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                            ) : (
                                <FontAwesomeIcon icon={selectedStudent ? faCheckCircle : faPlus} className="opacity-60" />
                            )}
                            {selectedStudent ? 'SIMPAN' : 'DAFTARKAN'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(node, document.body)
})

// =========================================
// FITUR: BARIS SISWA (Optimized & Memoized)
// =========================================
const StudentRow = memo(({
    student,
    selectedIds,
    lastReportMap,
    onEdit,
    onViewProfile,
    onViewQR,
    onViewPrint,
    onViewTags,
    onViewClassHistory,
    onConfirmDelete,
    onClassBreakdown,
    onPhotoZoom,
    onToggleSelect,
    formatRelativeDate,
    RiskThreshold
}) => {
    const isRisk = student.points <= RiskThreshold
    const lastReport = lastReportMap[student.id]
    const isSelected = selectedIds.includes(student.id)

    return (
        <tr className={`border-t border-[var(--color-border)] transition-colors ${isRisk ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-[var(--color-surface-alt)]/40'}`}>
            <td className="px-6 py-4">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(student.id)}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
            </td>

            <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm overflow-hidden relative shrink-0 cursor-pointer transition-transform hover:scale-110 ${isRisk ? 'bg-red-500/10 text-red-500' : 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]'}`}
                        onClick={() => student.photo_url && onPhotoZoom({ url: student.photo_url, name: student.name })}
                        title={student.photo_url ? 'Klik untuk zoom foto' : ''}
                    >
                        <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-150 -translate-y-1/2 opacity-50"></div>
                        {student.photo_url ? (
                            <img src={student.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                        ) : (
                            <span className="relative z-10">{(student.name || 'S').charAt(0)}</span>
                        )}
                    </div>

                    <div className="pt-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <button
                                onClick={() => onViewProfile(student)}
                                className="font-bold text-sm leading-tight text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left px-0.5 rounded-sm truncate"
                            >
                                {student.name}
                            </button>
                            {isRisk && (
                                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-widest">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[7px]" />
                                    Risiko
                                </span>
                            )}
                            {student.status && student.status !== 'aktif' && (
                                <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${student.status === 'lulus' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                    student.status === 'pindah' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                        'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                    }`}>
                                    {student.status}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)] italic opacity-80 leading-none">
                                {student.code}
                            </span>
                            {student.nisn && (
                                <span className="text-[9px] text-[var(--color-text-muted)] opacity-60 leading-none">NISN: {student.nisn}</span>
                            )}
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-inner ${student.gender === 'L' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-pink-500/10 text-pink-500 border border-pink-500/20'}`}>
                        <FontAwesomeIcon icon={student.gender === 'L' ? faMars : faVenus} />
                    </div>
                </div>
            </td>

            <td className="px-6 py-4 text-center">
                <button
                    onClick={() => onClassBreakdown(student.class_id, student.className)}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-widest leading-none hover:bg-[var(--color-primary)]/20 transition-colors"
                >
                    {student.className}
                </button>
            </td>

            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    {/* Render Badge Ranking dengan Medali Premium */}
                    {student._rank <= 3 && student._rank >= 1 && (
                        <div className="relative group/rank cursor-help shrink-0">
                            <span className={`
                                flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm border
                                ${student._rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border-yellow-300/40 shadow-yellow-500/30' :
                                    student._rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-200/40 shadow-slate-400/30' :
                                        'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-300/40 shadow-orange-500/30'}
                            `}>
                                <FontAwesomeIcon icon={student._rank === 1 ? faCrown : faMedal} className="text-[11px]" />
                                #{student._rank}
                            </span>
                            {/* Tooltip Premium */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-950/95 backdrop-blur-xl text-white text-[9px] rounded-xl opacity-0 group-hover/rank:opacity-100 transition-all scale-90 group-hover/rank:scale-100 whitespace-nowrap z-50 pointer-events-none font-black shadow-2xl border border-white/10 uppercase tracking-widest translate-y-2 group-hover/rank:translate-y-0 shadow-black/50">
                                Juara {student._rank} di {student.className}
                            </div>
                        </div>
                    )}

                    <span className={`text-sm font-black min-w-[20px] ${student.points > 0 ? 'text-[var(--color-success)]' : student.points < 0 ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>
                        {student.points}
                    </span>

                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-inner ${student.trend === 'up' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20' : student.trend === 'down' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'}`}>
                        <FontAwesomeIcon icon={student.trend === 'up' ? faArrowTrendUp : student.trend === 'down' ? faArrowTrendDown : faArrowTrendUp} className={`text-[9px] ${student.trend === 'neutral' ? 'opacity-0' : ''}`} />
                    </div>
                </div>
            </td>

            <td className="px-4 py-4 pr-5">
                {/* Action Buttons Group - LIGHT & FAST */}
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={() => onViewProfile(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 transition-all text-sm"
                        title="Profil"
                    >
                        <FontAwesomeIcon icon={faUserTie} />
                    </button>

                    <button
                        onClick={() => onEdit(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm"
                        title="Edit"
                    >
                        <FontAwesomeIcon icon={faEdit} />
                    </button>

                    <button
                        onClick={() => onViewPrint(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-all text-sm"
                        title="ID Card & Akses"
                    >
                        <FontAwesomeIcon icon={faIdCardAlt} />
                    </button>

                    <button
                        onClick={() => onViewTags(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-violet-500 hover:bg-violet-500/10 transition-all text-sm"
                        title="Label"
                    >
                        <FontAwesomeIcon icon={faFilter} />
                    </button>

                    <button
                        onClick={() => onViewClassHistory(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm"
                        title="Riwayat"
                    >
                        <FontAwesomeIcon icon={faClockRotateLeft} />
                    </button>

                    <button
                        onClick={() => onConfirmDelete(student)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"
                        title="Arsipkan"
                    >
                        <FontAwesomeIcon icon={faBoxArchive} />
                    </button>
                </div>
            </td>
        </tr>
    )
});


export default function StudentsPage() {
    const [students, setStudents] = useState([])
    const [classesList, setClassesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [sortBy, setSortBy] = useState('name_asc')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [studentToDelete, setStudentToDelete] = useState(null)
    // formData dikelola di StudentFormModal (terpisah) agar tidak trigger re-render parent saat mengetik
    // Di parent hanya perlu formData untuk handleSubmit dan handleEdit (pass via ref)
    const [submitting, setSubmitting] = useState(false)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
    const [newlyCreatedStudent, setNewlyCreatedStudent] = useState(null)
    const [behaviorHistory, setBehaviorHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [selectedStudentIds, setSelectedStudentIds] = useState([])
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
    const [isBulkWAModalOpen, setIsBulkWAModalOpen] = useState(false)
    const [bulkClassId, setBulkClassId] = useState('')
    const [globalStats, setGlobalStats] = useState({ total: 0, boys: 0, girls: 0, avgPoints: 0, worstClass: null })
    const [totalRows, setTotalRows] = useState(0)
    const [lastReportMap, setLastReportMap] = useState({})
    const [pendingArchive, setPendingArchive] = useState(null)
    // formData ref: diisi oleh StudentFormModal via onFormChange agar handleSubmit bisa akses
    const formDataRef = useRef({ name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah' })

    // =========================================
    // Advanced Import and Export System
    // =========================================
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [exporting, setExporting] = useState(false)

    // Rentang Poin Filter
    const [filterPointMode, setFilterPointMode] = useState('')
    const [filterPointMin, setFilterPointMin] = useState('')
    const [filterPointMax, setFilterPointMax] = useState('')
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)

    // NEW: Soft Delete / Arsip
    const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
    const [archivedStudents, setArchivedStudents] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    const [archivePage, setArchivePage] = useState(1)
    const archivePageSize = 10

    // NEW: Riwayat Kelas
    const [isClassHistoryModalOpen, setIsClassHistoryModalOpen] = useState(false)
    const [classHistory, setClassHistory] = useState([])
    const [loadingClassHistory, setLoadingClassHistory] = useState(false)

    // NEW: Quick Inline Add
    const [isInlineAddOpen, setIsInlineAddOpen] = useState(false)
    const [inlineForm, setInlineForm] = useState({ name: '', gender: 'L', class_id: '', phone: '' })
    const [submittingInline, setSubmittingInline] = useState(false)

    // NEW: Photo Storage upload progress
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // NEW: Class Breakdown Modal (Fitur 1)
    const [isClassBreakdownOpen, setIsClassBreakdownOpen] = useState(false)
    const [classBreakdownData, setClassBreakdownData] = useState(null)
    const [loadingBreakdown, setLoadingBreakdown] = useState(false)

    // NEW: Batch Reset Poin (Fitur 2)
    const [isResetPointsModalOpen, setIsResetPointsModalOpen] = useState(false)
    const [resetPointsClassId, setResetPointsClassId] = useState('')
    const [resettingPoints, setResettingPoints] = useState(false)

    // NEW: Student Status (Fitur 4)
    const [filterStatus, setFilterStatus] = useState('')

    // NEW: Reset PIN (Fitur 5)
    const [resettingPin, setResettingPin] = useState(false)

    // PDF Card Capture
    const cardCaptureRef = useRef(null)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)

    // Duplicate Detection state ada di StudentFormModal

    // NEW: Student Tags / Labels (Fitur 7)
    const [isTagModalOpen, setIsTagModalOpen] = useState(false)
    const [studentForTags, setStudentForTags] = useState(null)
    const [filterTag, setFilterTag] = useState('')

    // NEW: Multi-Filter Kelas (Fitur 8)
    const [filterClasses, setFilterClasses] = useState([]) // array of class ids

    // NEW: Audit Trail (Fitur 10)
    const [isAuditLogOpen, setIsAuditLogOpen] = useState(false)
    const [auditStudentId, setAuditStudentId] = useState(null)
    const [auditLogs, setAuditLogs] = useState([])
    const [loadingAudit, setLoadingAudit] = useState(false)

    // NEW: Template WA Customizable (Fitur 11)
    const [waTemplate, setWaTemplate] = useState(`Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu wali dari ananda {nama}.\nKami sampaikan informasi terkini dari sistem *Laporanmu* — MBS Tanggul.\n\n*Data Akademik Ananda:*\n• Kelas : {kelas}\n• ID Reg : {kode}\n• Poin Perilaku : {poin} poin\n\n*Akses Portal Orang Tua:*\nPortal  : ${window.location.origin}/check\nPIN     : {pin}\n\nGunakan ID Reg & PIN untuk memantau perkembangan putera/puteri Bapak/Ibu secara real-time.\n\nWassalamu'alaikum Wr. Wb.\n_MBS Tanggul · Sistem Laporanmu_`)

    // NEW: Import Google Sheets (Fitur 12)
    const [gSheetsUrl, setGSheetsUrl] = useState('')
    const [fetchingGSheets, setFetchingGSheets] = useState(false)
    const [isGSheetsModalOpen, setIsGSheetsModalOpen] = useState(false)

    // NEW: Dropdown menu header
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuRef = useRef(null)
    useEffect(() => {
        const handler = (e) => { if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setIsHeaderMenuOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // showOptionalFields dikelola di StudentFormModal

    // NEW: Photo Hover Zoom (Fitur 13)
    const [photoZoom, setPhotoZoom] = useState(null) // { url, name, x, y }

    // FIX: ref import dan ref foto dipisah (sebelumnya bentrok)
    const importFileInputRef = useRef(null)
    const photoInputRef = useRef(null)
    const searchInputRef = useRef(null)

    const { addToast } = useToast()

    // =========================================
    // Pagination + Filter + Sort
    // =========================================
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [jumpPage, setJumpPage] = useState('')

    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    useEffect(() => {
        try {
            const saved = localStorage.getItem('students_filters')
            if (saved) {
                const f = JSON.parse(saved)
                if (f.filterGender) setFilterGender(f.filterGender)
                if (f.filterStatus) setFilterStatus(f.filterStatus)
                if (f.filterTag) setFilterTag(f.filterTag)
                if (f.sortBy) setSortBy(f.sortBy)
                if (f.pageSize) setPageSize(f.pageSize)
            }
        } catch { /* ignore */ }
    }, [])

    // FIX #15: Simpan filter ke localStorage setiap kali berubah
    useEffect(() => {
        try {
            localStorage.setItem('students_filters', JSON.stringify({
                filterGender, filterStatus, filterTag, sortBy, pageSize,
            }))
        } catch { /* ignore */ }
    }, [filterGender, filterStatus, filterTag, sortBy, pageSize])

    // =========================================
    // Load Data
    // =========================================
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch classes list for the form
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')
            if (classesError) throw classesError
            setClassesList(classesData || [])

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            const sortMap = {
                name_asc: { col: 'name', asc: true },
                name_desc: { col: 'name', asc: false },
                class_asc: { col: 'class_id', asc: true },
                points_desc: { col: 'total_points', asc: false },
                points_asc: { col: 'total_points', asc: true },
            }
            const orderCfg = sortMap[sortBy] || sortMap.name_asc

            let q = supabase
                .from('students')
                .select(`*, classes (id, name)`, { count: 'exact' })
                .order(orderCfg.col, { ascending: orderCfg.asc })
                .range(from, to)
                .is('deleted_at', null)

            // Filtering logic
            if (filterClasses.length === 1) q = q.eq('class_id', filterClasses[0])
            else if (filterClasses.length > 1) q = q.in('class_id', filterClasses)
            else if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterTag) q = q.contains('tags', [filterTag])
            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%`)
            }
            if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
            else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
            else if (filterPointMode === 'custom') {
                if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
                if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
            }

            const { data: studentsData, error: studentsError, count } = await q
            if (studentsError) throw studentsError

            setTotalRows(count ?? 0)

            // OPTIMIZATION: Fetch ALL points for ranking across pages
            const { data: allPointsData } = await supabase
                .from('students')
                .select('id, class_id, total_points')
                .is('deleted_at', null)
                .order('total_points', { ascending: false })

            // Create rank map per class
            const globalRankMap = {}
            if (allPointsData) {
                const classBuckets = {}
                allPointsData.forEach(s => {
                    if (!classBuckets[s.class_id]) classBuckets[s.class_id] = []
                    classBuckets[s.class_id].push(s)
                })
                Object.values(classBuckets).forEach(arr => {
                    let currentRank = 0
                    let lastPoints = -999999 // fallback
                    let skip = 0

                    arr.forEach((s) => {
                        const pts = s.total_points ?? 0
                        // Fitur Ranking hanya berlaku untuk poin positif (> 0)
                        if (pts > 0) {
                            skip++
                            if (pts !== lastPoints) {
                                currentRank = skip
                                lastPoints = pts
                            }
                            globalRankMap[s.id] = currentRank
                        } else {
                            globalRankMap[s.id] = '-'
                        }
                    })
                })
            }

            // Fetch last reports with points for meaningful trend
            const ids = (studentsData || []).map(s => s.id)
            const trendMap = {}
            if (ids.length > 0) {
                const { data: reportsData } = await supabase
                    .from('reports')
                    .select('student_id, created_at, points')
                    .in('student_id', ids)
                    .order('created_at', { ascending: false })

                const map = {}
                    ; (reportsData || []).forEach(r => {
                        if (!map[r.student_id]) {
                            map[r.student_id] = r.created_at
                            // Trend reflects the nature of the latest report
                            trendMap[r.student_id] = r.points > 0 ? 'up' : r.points < 0 ? 'down' : 'neutral'
                        }
                    })
                setLastReportMap(map)
            } else {
                setLastReportMap({})
            }

            const transformed = (studentsData || []).map(s => {
                const pts = s.total_points ?? 0
                return {
                    ...s,
                    className: s.classes?.name || '-',
                    code: s.registration_code,
                    points: pts,
                    trend: trendMap[s.id] || 'neutral',
                    _rank: globalRankMap[s.id] || '-'
                }
            })

            setStudents(transformed)
        } catch (err) {
            console.error('Fetch error:', err)
            addToast('Gagal memuat data dari database', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, sortBy, filterGender, filterStatus, filterTag, debouncedSearch, filterClasses, filterClass, filterPointMode, filterPointMin, filterPointMax, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data: statsData } = await supabase
                .from('students')
                .select('id, gender, total_points, class_id, classes(name)')
                .is('deleted_at', null)
            if (!statsData) return
            const total = statsData.length
            const boys = statsData.filter(s => s.gender === 'L').length
            const girls = statsData.filter(s => s.gender === 'P').length
            const avgPoints = total > 0
                ? Math.round(statsData.reduce((acc, s) => acc + (s.total_points || 0), 0) / total)
                : 0
            const classBuckets = {}
            statsData.forEach(s => {
                const cn = s.classes?.name || 'Tanpa Kelas'
                if (!classBuckets[cn]) classBuckets[cn] = []
                classBuckets[cn].push(s.total_points || 0)
            })
            let worstClass = null, worstAvg = 0
            Object.entries(classBuckets).forEach(([name, pts]) => {
                const avg = pts.reduce((a, b) => a + b, 0) / pts.length
                if (avg < worstAvg) { worstAvg = avg; worstClass = { name, avg: Math.round(avg), count: pts.length } }
            })
            setGlobalStats({ total, boys, girls, avgPoints, worstClass })
        } catch (err) {
            console.error('fetchStats error:', err)
        }
    }, [])

    const fetchBehaviorHistory = useCallback(async (studentId) => {
        setLoadingHistory(true)
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('fetchBehaviorHistory error:', error)
                setBehaviorHistory([])
            } else {
                setBehaviorHistory(data || [])
            }
        } catch (err) {
            console.error('fetchBehaviorHistory catch:', err)
            setBehaviorHistory([])
        } finally {
            setLoadingHistory(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, filterClass, filterClasses, filterGender, filterStatus, filterTag, sortBy, debouncedSearch, filterPointMode, filterPointMin, filterPointMax])

    // FIX #5: Realtime — auto-refresh jika ada siswa ditambah/diubah/dihapus
    useEffect(() => {
        const channel = supabase
            .channel('students-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'students'
            }, () => {
                fetchData()
                fetchStats()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    // clamp page
    useEffect(() => {
        if (page > totalPages && totalPages > 0) setPage(totalPages)
        if (page < 1) setPage(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages])

    useEffect(() => {
        const handleKey = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)

            // Escape: clear search
            if (e.key === 'Escape' && searchQuery) {
                setSearchQuery('')
                return
            }
            // Ctrl+K atau Cmd+K: fokus ke search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
                return
            }
            // N: buka form tambah siswa (hanya kalau tidak sedang ngetik)
            if (e.key === 'n' && !isTyping && !isModalOpen) {
                handleAdd()
                return
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [searchQuery, isModalOpen])

    const getPageItems = (current, total) => {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

        const items = new Set([1, total, current, current - 1, current + 1])
        const cleaned = [...items]
            .filter(n => n >= 1 && n <= total)
            .sort((a, b) => a - b)

        const result = []
        for (let i = 0; i < cleaned.length; i++) {
            const n = cleaned[i]
            const prev = cleaned[i - 1]
            if (i > 0 && n - prev > 1) result.push('...')
            result.push(n)
        }
        return result
    }

    // =========================================
    // BASIC CRUD
    // =========================================
    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }

    const handleAdd = useCallback(() => {
        setSelectedStudent(null)
        formDataRef.current = { name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah', status: 'aktif', tags: [] }
        setIsModalOpen(true)
    }, [])

    const handleEdit = useCallback((student) => {
        setSelectedStudent(student)
        formDataRef.current = {
            name: student.name,
            gender: student.gender || 'L',
            class_id: student.class_id || '',
            phone: student.phone || '',
            photo_url: student.photo_url || '',
            nisn: student.nisn || '',
            guardian_name: student.guardian_name || '',
            guardian_relation: student.guardian_relation || 'Ayah',
            status: student.status || 'aktif',
            tags: student.tags || [],
        }
        setIsModalOpen(true)
    }, [])

    const confirmDelete = (student) => {
        setStudentToDelete(student)
        setIsDeleteModalOpen(true)
    }

    const executeDelete = useCallback(async () => {
        if (!studentToDelete) return
        setIsDeleteModalOpen(false)
        const student = studentToDelete
        setStudentToDelete(null)

        // Sembunyikan dari UI dulu (optimistic)
        setStudents(prev => prev.filter(s => s.id !== student.id))

        const timerId = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('students')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', student.id)
                if (error) throw error
                fetchData()
                fetchStats()
            } catch {
                addToast('Gagal mengarsipkan siswa', 'error')
                fetchData() // restore
            } finally {
                setPendingArchive(null)
            }
        }, 4000)

        setPendingArchive({ student, timerId })

        addToast(
            `${student.name} diarsipkan. Klik Undo untuk batalkan.`,
            'warning',
            {
                duration: 4000,
                action: {
                    label: 'Undo',
                    onClick: () => {
                        clearTimeout(timerId)
                        setPendingArchive(null)
                        fetchData()
                        addToast(`${student.name} dibatalkan`, 'success')
                    }
                }
            }
        )
    }, [studentToDelete, fetchData, fetchStats, addToast])

    const handleSubmit = useCallback(async (formData) => {
        if (!formData.name || formData.name.trim().length < 3 || !formData.class_id) {
            addToast('Nama (min 3 karakter) dan kelas wajib diisi', 'warning')
            return
        }

        setSubmitting(true)
        const newStudentData = {
            registration_code: generateCode(),
            pin: String(Math.floor(1000 + Math.random() * 9000)),
            total_points: 0,
            name: formData.name,
            gender: formData.gender,
            class_id: formData.class_id,
            phone: formData.phone,
            photo_url: formData.photo_url,
            nisn: formData.nisn || null,
            guardian_name: formData.guardian_name || null,
            guardian_relation: formData.guardian_relation || null,
            status: formData.status || 'aktif',
            tags: formData.tags || [],
        }

        try {
            if (selectedStudent) {
                const updatePayload = {
                    name: formData.name,
                    gender: formData.gender,
                    class_id: formData.class_id,
                    phone: formData.phone,
                    photo_url: formData.photo_url,
                    nisn: formData.nisn || null,
                    guardian_name: formData.guardian_name || null,
                    guardian_relation: formData.guardian_relation || null,
                    status: formData.status || 'aktif',
                    tags: formData.tags || [],
                }
                const { error } = await supabase
                    .from('students')
                    .update(updatePayload)
                    .eq('id', selectedStudent.id)
                if (error) throw error

                if (formData.class_id !== selectedStudent.class_id) {
                    await supabase.from('student_class_history').insert([{
                        student_id: selectedStudent.id,
                        from_class_id: selectedStudent.class_id,
                        to_class_id: formData.class_id,
                        changed_at: new Date().toISOString(),
                        note: 'Diubah manual'
                    }]).catch(() => { })
                }
                addToast('Data siswa berhasil diperbarui', 'success')
            } else {
                const { error } = await supabase.from('students').insert([newStudentData])
                const studentToView = {
                    ...newStudentData,
                    code: newStudentData.registration_code,
                    className: classesList.find(c => c.id === newStudentData.class_id)?.name || '-'
                }
                setNewlyCreatedStudent(studentToView)
                setSelectedStudent(studentToView)
                setIsPrintModalOpen(true)
                addToast('Siswa berhasil didaftarkan', 'success')
            }
            setIsModalOpen(false)
            fetchData()
            fetchStats()
        } catch (err) {
            console.error('Submit error:', err)
            addToast('Gagal menyimpan data', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [selectedStudent, fetchData, fetchStats, addToast, generateCode])



    // =========================================
    // BULK ACTIONS
    // =========================================
    const toggleSelectAll = () => {
        if (selectedStudentIds.length === students.length) {
            setSelectedStudentIds([])
        } else {
            setSelectedStudentIds(students.map(s => s.id))
        }
    }

    const toggleSelectStudent = (id) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleBulkPromote = async () => {
        if (!bulkClassId) {
            addToast('Pilih kelas tujuan terlebih dahulu', 'warning')
            return
        }
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('students')
                .update({ class_id: bulkClassId })
                .in('id', selectedStudentIds)
            if (error) throw error
            setIsBulkModalOpen(false)
            setSelectedStudentIds([])
            fetchData()
            fetchStats()
            addToast(`Berhasil memindahkan ${selectedStudentIds.length} siswa`, 'success')
        } catch {
            addToast('Gagal memproses kenaikan kelas massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleBulkDelete = async () => {
        if (!selectedStudentIds.length) return
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('students')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', selectedStudentIds)
            if (error) throw error
            setIsBulkDeleteModalOpen(false)
            setSelectedStudentIds([])
            fetchData()
            fetchStats()
            addToast(`${selectedStudentIds.length} siswa berhasil diarsipkan`, 'success')
        } catch {
            addToast('Gagal mengarsipkan siswa terpilih', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // NEW: Fetch archived students
    const fetchArchivedStudents = async () => {
        setLoadingArchived(true)
        try {
            const { data, error } = await supabase
                .from('students')
                .select(`*, classes(name)`)
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false })
            if (error) throw error
            setArchivedStudents((data || []).map(s => ({ ...s, className: s.classes?.name || '-' })))
        } catch {
            addToast('Gagal memuat arsip', 'error')
        } finally {
            setLoadingArchived(false)
        }
    }

    // NEW: Restore student from archive
    const handleRestoreStudent = async (student) => {
        try {
            const { error } = await supabase
                .from('students')
                .update({ deleted_at: null })
                .eq('id', student.id)
            if (error) throw error
            addToast(`${student.name} berhasil dipulihkan`, 'success')
            fetchArchivedStudents()
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal memulihkan siswa', 'error')
        }
    }

    // NEW: Hard delete from archive
    const handlePermanentDelete = async (student) => {
        if (!window.confirm(`Hapus permanen "${student.name}"? Tidak bisa dibatalkan.`)) return
        try {
            const { error } = await supabase.from('students').delete().eq('id', student.id)
            if (error) throw error
            addToast(`${student.name} dihapus permanen`, 'success')
            fetchArchivedStudents()
        } catch {
            addToast('Gagal hapus permanen', 'error')
        }
    }

    // NEW: Fetch class history for a student
    const fetchClassHistory = async (studentId) => {
        setLoadingClassHistory(true)
        try {
            const { data, error } = await supabase
                .from('student_class_history')
                .select(`*, from_class:from_class_id(name), to_class:to_class_id(name)`)
                .eq('student_id', studentId)
                .order('changed_at', { ascending: false })
            if (error) throw error
            setClassHistory(data || [])
        } catch {
            setClassHistory([])
        } finally {
            setLoadingClassHistory(false)
        }
    }

    const handleViewClassHistory = (student) => {
        setSelectedStudent(student)
        fetchClassHistory(student.id)
        setIsClassHistoryModalOpen(true)
    }

    // NEW: Fitur 1 - Class Breakdown
    const handleClassBreakdown = async (classId, className) => {
        setLoadingBreakdown(true)
        setIsClassBreakdownOpen(true)
        try {
            const { data } = await supabase
                .from('students')
                .select('id, name, gender, total_points, tags')
                .eq('class_id', classId)
                .is('deleted_at', null)
            if (data) {
                const boys = data.filter(s => s.gender === 'L').length
                const girls = data.filter(s => s.gender === 'P').length
                const avgPoints = data.length > 0
                    ? Math.round(data.reduce((a, s) => a + (s.total_points || 0), 0) / data.length)
                    : 0
                const riskCount = data.filter(s => (s.total_points || 0) <= RiskThreshold).length
                const sorted = [...data].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                const topStudents = sorted.slice(0, 3)
                setClassBreakdownData({ className, total: data.length, boys, girls, avgPoints, riskCount, topStudents, allStudents: sorted })
            }
        } catch { } finally {
            setLoadingBreakdown(false)
        }
    }

    // NEW: Fitur 2 - Batch Reset Poin
    const handleBatchResetPoints = async () => {
        setResettingPoints(true)
        try {
            let q = supabase.from('students').update({ total_points: 0 }).is('deleted_at', null)
            if (resetPointsClassId) q = q.eq('class_id', resetPointsClassId)
            const { error } = await q
            if (error) throw error
            addToast(resetPointsClassId ? 'Poin kelas berhasil direset' : 'Semua poin berhasil direset', 'success')
            setIsResetPointsModalOpen(false)
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal reset poin', 'error')
        } finally {
            setResettingPoints(false)
        }
    }

    // NEW: Fitur 5 - Reset PIN
    const handleResetPin = async (student) => {
        if (!window.confirm(`Generate PIN baru untuk ${student.name}?`)) return
        setResettingPin(true)
        try {
            const newPin = String(Math.floor(1000 + Math.random() * 9000))
            const { error } = await supabase.from('students').update({ pin: newPin }).eq('id', student.id)
            if (error) throw error
            addToast(`PIN baru: ${newPin} — berhasil diperbarui`, 'success')
            // Auto kirim WA jika ada nomor
            if (student.phone) {
                const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
                const msg = `PIN baru Laporanmu untuk ${student.name}: *${newPin}*. Kode: ${student.code}`
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
            }
            fetchData()
            fetchStats()
            if (selectedStudent?.id === student.id) setSelectedStudent({ ...selectedStudent, pin: newPin })
        } catch {
            addToast('Gagal reset PIN', 'error')
        } finally {
            setResettingPin(false)
        }
    }

    // NEW: Fitur 6 - Duplicate Detection
    const checkDuplicate = async (name, classId) => {
        if (!name || name.trim().length < 3 || !classId) { setDuplicateWarning(null); return }
        setCheckingDuplicate(true)
        try {
            const { data } = await supabase
                .from('students')
                .select('id, name, registration_code')
                .ilike('name', `%${name.trim()}%`)
                .eq('class_id', classId)
                .is('deleted_at', null)
                .neq('id', selectedStudent?.id || 0)
                .limit(3)
            setDuplicateWarning(data?.length ? data : null)
        } catch { } finally {
            setCheckingDuplicate(false)
        }
    }

    // NEW: Fitur 7 - Tag management
    const handleToggleTag = async (student, tag) => {
        const currentTags = student.tags || []
        const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag]
        try {
            const { error } = await supabase.from('students').update({ tags: newTags }).eq('id', student.id)
            if (error) throw error
            setStudentForTags({ ...student, tags: newTags })
            fetchData()
            fetchStats()
            addToast('Tag berhasil diperbarui', 'success')
        } catch {
            addToast('Gagal update tag', 'error')
        }
    }

    // NEW: Fitur 9 - Export hasil filter aktif
    const fetchFilteredForExport = async () => {
        let q = supabase.from('students').select(`*, classes (name)`).is('deleted_at', null).order('name')
        if (filterClasses.length > 0) q = q.in('class_id', filterClasses)
        else if (filterClass) q = q.eq('class_id', filterClass)
        if (filterGender) q = q.eq('gender', filterGender)
        if (filterStatus) q = q.eq('status', filterStatus)
        if (filterTag) q = q.contains('tags', [filterTag])
        if (debouncedSearch) {
            const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
            q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%`)
        }
        if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
        else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
        else if (filterPointMode === 'custom') {
            if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
            if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
        }
        const { data, error } = await q
        if (error) throw error
        return (data || []).map(s => ({
            ID: s.id, Kode: s.registration_code || '', Nama: s.name || '',
            Gender: s.gender || '', Kelas: s.classes?.name || '',
            Poin: s.total_points ?? 0, Phone: s.phone || '', Status: s.status || 'aktif',
            Tags: (s.tags || []).join(', ')
        }))
    }

    // NEW: Fitur 10 - Audit Log
    const fetchAuditLog = async (studentId) => {
        setLoadingAudit(true)
        try {
            const { data } = await supabase
                .from('student_audit_log')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })
                .limit(50)
            setAuditLogs(data || [])
        } catch (err) {
            console.error('fetchAuditLog catch (table mungkin belum ada):', err)
            setAuditLogs([])
        } finally {
            setLoadingAudit(false)
        }
    }

    // NEW: Fitur 12 - Import Google Sheets
    const handleFetchGSheets = async () => {
        if (!gSheetsUrl.trim()) { addToast('Masukkan URL Google Sheets terlebih dahulu', 'warning'); return }
        setFetchingGSheets(true)
        try {
            // Extract spreadsheet ID
            const match = gSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
            if (!match) throw new Error('URL tidak valid')
            const sheetId = match[1]
            // Fetch as CSV (requires public sheet)
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
            const res = await fetch(csvUrl)
            if (!res.ok) throw new Error('Gagal fetch sheet — pastikan sheet bersifat publik')
            const text = await res.text()
            const rows = await parseCSVFile(new Blob([text], { type: 'text/csv' }))
            if (!rows.length) throw new Error('Sheet kosong')
            buildImportPreview(rows)
            setIsGSheetsModalOpen(false)
            setIsImportModalOpen(true)
            addToast(`${rows.length} baris berhasil dibaca dari Google Sheets`, 'success')
        } catch (err) {
            addToast(err.message || 'Gagal mengambil data dari Google Sheets', 'error')
        } finally {
            setFetchingGSheets(false)
        }
    }

    // NEW: Upload foto ke Supabase Storage — return URL agar bisa dipakai oleh StudentFormModal
    const handlePhotoUpload = async (file) => {
        if (!file) return null
        setUploadingPhoto(true)
        try {
            const ext = file.name.split('.').pop()
            const fileName = `student_${Date.now()}.${ext}`
            const { error: uploadError } = await supabase.storage
                .from('student-photo')
                .upload(fileName, file, { upsert: true })
            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('student-photo')
                .getPublicUrl(fileName)
            addToast('Foto berhasil diupload', 'success')
            return urlData.publicUrl
        } catch (err) {
            console.error('Upload error:', err)
            // Fallback ke base64 jika storage belum dikonfigurasi
            return await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
                addToast('Storage belum aktif, foto disimpan lokal sementara', 'warning')
            })
        } finally {
            setUploadingPhoto(false)
        }
    }

    // NEW: Quick Inline Add
    const handleInlineSubmit = async () => {
        if (!inlineForm.name.trim() || !inlineForm.class_id) {
            addToast('Nama dan kelas wajib diisi', 'warning')
            return
        }
        setSubmittingInline(true)
        try {
            const { error } = await supabase.from('students').insert([{
                name: inlineForm.name.trim(),
                gender: inlineForm.gender,
                class_id: inlineForm.class_id,
                phone: inlineForm.phone || null,
                registration_code: generateCode(),
                pin: String(Math.floor(1000 + Math.random() * 9000)),
                total_points: 0,
            }])
            if (error) throw error
            addToast(`${inlineForm.name} berhasil ditambahkan`, 'success')
            setInlineForm({ name: '', gender: 'L', class_id: inlineForm.class_id, phone: '' })
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal menambahkan siswa', 'error')
        } finally {
            setSubmittingInline(false)
        }
    }
    const handleViewProfile = (student) => {
        setSelectedStudent(student)
        fetchBehaviorHistory(student.id)
        setIsProfileModalOpen(true)
    }

    const handleViewQR = (student) => {
        setSelectedStudent(student)
        setIsPrintModalOpen(true)
    }

    const handleViewPrint = (student) => {
        setSelectedStudent(student)
        setIsPrintModalOpen(true)
    }

    // NEW: Bulk WA — kirim notifikasi ke semua wali terpilih
    const handleBulkWA = () => {
        const targets = students.filter(s => selectedStudentIds.includes(s.id) && s.phone)
        if (!targets.length) {
            addToast('Tidak ada siswa terpilih yang memiliki nomor WA', 'warning')
            return
        }
        setIsBulkWAModalOpen(true)
    }

    const buildWAMessage = (student, template) => {
        return template
            .replace(/{nama}/g, student.name)
            .replace(/{kelas}/g, student.className || student.class || '-')
            .replace(/{poin}/g, String(student.points ?? student.total_points ?? 0))
            .replace(/{kode}/g, student.code || student.registration_code || '-')
            .replace(/{pin}/g, student.pin || '-')
    }

    const openWAForStudent = (student, msg) => {
        const phone = (student.phone || '').replace(/\D/g, '').replace(/^0/, '62')
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        window.open(url, '_blank')
    }

    const handleBulkPrint = () => {
        const targets = students.filter(s => selectedStudentIds.includes(s.id))
        if (!targets.length) { addToast('Pilih siswa terlebih dahulu', 'warning'); return }
        generateStudentPDF(targets)
    }

    const handlePrintSingle = (student) => {
        if (!student) return
        generateStudentPDF([student], cardCaptureRef)
    }

    // ======================================================
    // Cetak Thermal 58mm — COMPACT, tanpa foto, hanya QR
    // ======================================================
    const handlePrintThermal = async (student) => {
        if (!student) return;
        setGeneratingPdf(true);
        addToast('Menyiapkan struk thermal...', 'info');
        try {
            const qrValue = `${window.location.origin}/check?code=${student.code}&pin=${student.pin}`;
            const qrContainer = document.createElement('div');
            qrContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
            document.body.appendChild(qrContainer);
            const qrRoot = createRoot(qrContainer);
            await new Promise(resolve => {
                qrRoot.render(React.createElement(QRCodeCanvas, { value: qrValue, size: 220, level: 'H' }));
                setTimeout(resolve, 200);
            });
            const qrCanvas = qrContainer.querySelector('canvas');
            const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;
            qrRoot.unmount();
            document.body.removeChild(qrContainer);

            const dateStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
            const thermalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>KARTU_${student.name.toUpperCase().replace(/\s+/g, '_')}</title>
<style>
  @page { size: 58mm auto; margin: 2mm 2mm 4mm 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 54mm; font-family: 'Courier New', monospace; font-size: 7.5pt; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hdr { text-align: center; padding: 1.5mm 0; }
  .hdr .t { font-size: 10pt; font-weight: 900; letter-spacing: 0.4mm; }
  .hdr .s { font-size: 6pt; opacity: 0.6; margin-top: 0.5mm; }
  .div { border: none; border-top: 1px dashed #333; margin: 2mm 0; }
  .name { font-size: 9pt; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.3mm; word-break: break-word; padding: 1mm 0 0.3mm; }
  .kls { font-size: 7pt; text-align: center; text-transform: uppercase; opacity: 0.7; }
  .qr { text-align: center; padding: 2mm 0 1mm; }
  .qr img { width: 48mm; height: 48mm; display: block; margin: 0 auto; }
  .cap { font-size: 6pt; text-align: center; opacity: 0.5; margin-top: 1mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.5mm 0.5mm; font-size: 7.5pt; vertical-align: top; }
  td.l { font-weight: bold; white-space: nowrap; width: 14mm; }
  td.s { width: 3mm; text-align: center; }
  .ftr { font-size: 5.5pt; text-align: center; opacity: 0.5; padding-top: 1mm; line-height: 1.6; }
</style></head><body>
  <div class="hdr"><div class="t">KARTU PELAJAR</div><div class="s">MBS TANGGUL &bull; LAPORANMU &bull; T.A. 2026/2027</div></div>
  <hr class="div">
  <div class="name">${student.name}</div>
  <div class="kls">${student.className || '-'}</div>
  <hr class="div">
  <div class="qr">
    ${qrDataUrl ? `<img src="${qrDataUrl}" />` : '<p style="opacity:0.4;font-size:6pt;">QR tidak tersedia</p>'}
    <div class="cap">Scan untuk akses portal orang tua</div>
  </div>
  <hr class="div">
  <table>
    <tr><td class="l">ID Reg</td><td class="s">:</td><td><b>${student.code || '-'}</b></td></tr>
    <tr><td class="l">PIN</td><td class="s">:</td><td><b>${student.pin || '-'}</b></td></tr>
    <tr><td class="l">NISN</td><td class="s">:</td><td>${student.nisn || '-'}</td></tr>
    <tr><td class="l">No. WA</td><td class="s">:</td><td>${student.phone || '-'}</td></tr>
  </table>
  <hr class="div">
  <div class="ftr">Diterbitkan: ${dateStr}<br>Laporanmu &bull; MBS Tanggul</div>
</body></html>`;

            const printWin = window.open('', '_blank', 'width=280,height=600,toolbar=0,menubar=0,scrollbars=1');
            if (!printWin) { addToast('Pop-up diblokir. Izinkan pop-up browser untuk fitur ini.', 'warning'); return; }
            printWin.document.open();
            printWin.document.write(thermalHtml);
            printWin.document.close();
            printWin.onload = () => setTimeout(() => { printWin.focus(); printWin.print(); }, 400);
            setTimeout(() => { if (printWin && !printWin.closed) { printWin.focus(); printWin.print(); } }, 900);
            addToast('Struk siap dicetak!', 'success');
        } catch (e) {
            console.error('Thermal print error:', e);
            addToast('Gagal menyiapkan cetak thermal', 'error');
        } finally { setGeneratingPdf(false); }
    }

    // ======================================================
    // Simpan kartu sebagai PNG (html2canvas offscreen)
    // ======================================================
    const handleSavePNG = async (student) => {
        if (!student) return;
        setGeneratingPdf(true);
        addToast('Menyiapkan gambar kartu...', 'info');
        try {
            let photoDataUrl = null;
            if (student.photo_url) photoDataUrl = await getBase64Image(student.photo_url);

            const qrValue = `${window.location.origin}/check?code=${student.code}&pin=${student.pin}`;
            const qrContainer = document.createElement('div');
            qrContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
            document.body.appendChild(qrContainer);
            const qrRoot = createRoot(qrContainer);
            await new Promise(resolve => {
                qrRoot.render(React.createElement(QRCodeCanvas, { value: qrValue, size: 200, level: 'H' }));
                setTimeout(resolve, 200);
            });
            const qrCanvas = qrContainer.querySelector('canvas');
            const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;
            qrRoot.unmount();
            document.body.removeChild(qrContainer);

            // Build offscreen kartu (sama seperti PDF tapi ukuran lebih besar)
            const offscreen = document.createElement('div');
            offscreen.style.cssText = 'position:fixed;top:-9999px;left:-9999px;display:flex;flex-direction:row;gap:10px;align-items:center;padding:8px;background:transparent;';
            const isFemale = student.gender === 'P' || (student.className || '').toLowerCase().includes('putri');
            const grad = isFemale ? 'linear-gradient(135deg,#b43c8c 0%,#7c1a5e 100%)' : 'linear-gradient(135deg,#4f46e5 0%,#3730a3 100%)';
            const frontCard = document.createElement('div');
            frontCard.style.cssText = `width:340px;height:213px;background:${grad};border-radius:18px;position:relative;overflow:hidden;box-shadow:0 20px 40px rgba(79,70,229,0.35);flex-shrink:0;font-family:system-ui,-apple-system,sans-serif;`;
            frontCard.innerHTML = `
              <div style="position:absolute;top:-40px;right:-40px;width:176px;height:176px;background:rgba(255,255,255,0.06);border-radius:50%;filter:blur(20px);"></div>
              <div style="position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:6px;z-index:10;">
                <div style="width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.2);"><span style="font-weight:900;font-size:10px;color:white;">L</span></div>
                <span style="font-size:8px;font-weight:900;letter-spacing:0.2em;color:rgba(255,255,255,0.85);text-transform:uppercase;">LAPORANMU</span>
              </div>
              <div style="position:absolute;top:38px;left:16px;right:16px;bottom:28px;display:flex;gap:12px;z-index:10;">
                <div style="width:72px;height:90px;border-radius:10px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                  ${photoDataUrl ? `<img src="${photoDataUrl}" style="width:100%;height:100%;object-fit:cover;"/>` : `<span style="font-size:30px;font-weight:900;color:rgba(255,255,255,0.4);">${(student.name || '?').charAt(0)}</span>`}
                </div>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:2px 0;">
                  <div>
                    <div style="font-size:13px;font-weight:900;color:white;text-transform:uppercase;line-height:1.2;margin-bottom:4px;word-break:break-word;">${student.name}</div>
                    <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.05em;">${student.className || '-'}</div>
                    <div style="font-size:6px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.18em;margin-top:2px;">MUHAMMADIYAH BOARDING SCHOOL</div>
                  </div>
                  <div style="padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);">
                    <div style="font-size:5px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.2em;margin-bottom:3px;">NOMOR REGISTRASI</div>
                    <div style="font-size:11px;font-weight:700;color:#c7d2fe;font-family:monospace;letter-spacing:0.08em;">${student.code || '-'}</div>
                  </div>
                </div>
              </div>
              <div style="position:absolute;bottom:8px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:center;opacity:0.22;">
                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.3em;">KARTU PELAJAR</span>
                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.2em;">2026/2027</span>
              </div>`;
            const backCard = document.createElement('div');
            backCard.style.cssText = 'width:340px;height:213px;background:white;border-radius:18px;border:1px solid #e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;flex-shrink:0;font-family:system-ui,-apple-system,sans-serif;';
            backCard.innerHTML = `
              <div style="padding:8px;background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:10px;">
                ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:80px;height:80px;display:block;"/>` : '<div style="width:80px;height:80px;background:#f3f4f6;border-radius:4px;"></div>'}
              </div>
              <div style="font-size:8px;font-weight:900;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;text-align:center;">AKSES PORTAL ORANG TUA</div>
              <div style="font-size:6px;font-weight:600;color:#9ca3af;text-align:center;line-height:1.5;max-width:180px;">Silakan scan kode di atas untuk<br/>mengecek perkembangan siswa</div>
              <div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;opacity:0.2;">
                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">TAHUN 2026/2027</span>
                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">MBS TANGGUL</span>
              </div>`;
            offscreen.appendChild(frontCard);
            offscreen.appendChild(backCard);
            document.body.appendChild(offscreen);

            const canvas = await html2canvas(offscreen, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: null, logging: false });
            document.body.removeChild(offscreen);

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `KARTU_${student.name.toUpperCase().replace(/\s+/g, '_')}.png`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                addToast('Kartu berhasil disimpan sebagai PNG!', 'success');
            }, 'image/png');
        } catch (e) {
            console.error('PNG export error:', e);
            addToast('Gagal menyimpan kartu sebagai gambar', 'error');
        } finally { setGeneratingPdf(false); }
    }


    const getBase64Image = (url) => {
        return new Promise((resolve) => {
            if (!url) return resolve(null);
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    /**
     * Capture elemen kartu dari DOM menggunakan html2canvas,
     * lalu embed hasilnya ke PDF — kartu di PDF identik dengan preview modal.
     *
     * @param {Array}  targets     - array siswa yang akan dicetak
     * @param {Object} captureRef  - React ref ke elemen #card-capture-target di modal
     */
    const generateStudentPDF = async (targets, captureRef = null) => {
        setGeneratingPdf(true);
        addToast('Menyiapkan dokumen resmi...', 'info');
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // (tidak ada kop surat)

            const pageWidth = 210;
            const margin = 20;

            for (let i = 0; i < targets.length; i++) {
                const s = targets[i];
                if (i > 0) doc.addPage();

                // ════════════════════════════════════════════
                // WARNA AKSEN — berdasarkan gender siswa
                // Putra/L = biru indigo | Putri/P = mauve/rose
                // ════════════════════════════════════════════
                const isFemale = s.gender === 'P' || s.gender === 'Perempuan' ||
                    (s.className || '').toLowerCase().includes('putri');
                const accentR = isFemale ? 180 : 67;
                const accentG = isFemale ? 60 : 56;
                const accentB = isFemale ? 140 : 202;
                // helper set accent color
                const setAccent = () => doc.setTextColor(accentR, accentG, accentB);
                const setAccentDraw = () => doc.setDrawColor(accentR, accentG, accentB);
                const setAccentFill = () => doc.setFillColor(accentR, accentG, accentB);

                // ════════════════════════════════════════════
                // WATERMARK — teks diagonal samar di tengah halaman
                // ════════════════════════════════════════════
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.045 }));
                doc.setFontSize(38);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(accentR, accentG, accentB);
                // Rotasi 45° dari tengah halaman
                const wmCX = pageWidth / 2;
                const wmCY = 148; // tengah A4
                for (let wy = 60; wy < 260; wy += 55) {
                    for (let wx = 30; wx < 200; wx += 80) {
                        doc.text('RESMI', wx, wy, { angle: 45 });
                    }
                }
                doc.restoreGraphicsState();

                // ════════════════════════════════════════════
                // 1. JUDUL & TEKS PENGANTAR
                // ════════════════════════════════════════════
                const kopCenterX = pageWidth / 2;
                const garisBawahY = 0;
                const judulY = 16;

                doc.setTextColor(0, 0, 0);
                doc.setFontSize(13);
                doc.setFont('times', 'bold');
                doc.text('INFORMASI AKSES DIGITAL & KARTU PELAJAR', kopCenterX, judulY, { align: 'center' });

                // Garis dekoratif bawah judul — pakai warna aksen gender
                setAccentDraw();
                doc.setLineWidth(0.6);
                doc.line(kopCenterX - 52, judulY + 2.5, kopCenterX + 52, judulY + 2.5);

                // Teks pengantar — 2 kalimat ringkas
                doc.setFontSize(9);
                doc.setFont('times', 'normal');
                doc.setTextColor(50, 50, 50);
                const introText = `Yth. Orang Tua/Wali dari Ananda ${s.name}, dengan hormat kami sampaikan informasi akses digital dan kartu pelajar resmi yang diterbitkan oleh sistem Laporanmu. Dokumen ini memuat data akses portal pemantauan perkembangan akademik serta perilaku putera/puteri Bapak/Ibu — harap simpan dengan baik dan segera hubungi sekolah apabila terdapat kendala.`;
                const splitIntro = doc.splitTextToSize(introText, pageWidth - margin * 2);
                doc.text(splitIntro, margin, judulY + 12);

                // ════════════════════════════════════════════
                // 2. INFO SISWA — strip biru tipis di bawah intro
                // ════════════════════════════════════════════
                const infoY = judulY + 12 + (splitIntro.length * 4.5) + 5;

                doc.setFillColor(245, 246, 255);
                doc.setDrawColor(210, 214, 245);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, infoY, pageWidth - margin * 2, 18, 3, 3, 'FD');

                // Garis aksen kiri — warna gender
                setAccentFill();
                doc.rect(margin, infoY, 2.5, 18, 'F');

                const infoColW = (pageWidth - margin * 2 - 2.5) / 3;
                const infoCols = [
                    { label: 'NAMA SISWA', val: s.name },
                    { label: 'KELAS', val: s.className || '-' },
                    { label: 'NISN', val: s.nisn || '-' },
                ];
                infoCols.forEach(({ label, val }, idx) => {
                    const cx = margin + 2.5 + infoColW * idx + infoColW / 2;
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(120, 120, 140);
                    doc.text(label, cx, infoY + 6, { align: 'center' });
                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(20, 20, 50);
                    doc.text(String(val), cx, infoY + 13, { align: 'center' });
                });

                // ════════════════════════════════════════════
                // 3. KARTU DIGITAL
                // ════════════════════════════════════════════
                const cardAreaY = infoY + 20;
                let cardAreaH = 55;

                if (targets.length === 1) {
                    try {
                        // Ambil foto siswa sebagai dataURL dulu (agar tidak CORS issue saat render)
                        let photoDataUrl = null;
                        if (s.photo_url) {
                            photoDataUrl = await getBase64Image(s.photo_url);
                        }

                        const qrValue = `${window.location.origin}/check?code=${s.code}&pin=${s.pin}`;

                        // ── Buat kontainer offscreen (di luar viewport) ──────────────
                        const offscreen = document.createElement('div');
                        offscreen.style.cssText = `
                            position: fixed;
                            top: -9999px; left: -9999px;
                            display: flex; flex-direction: row; gap: 10px;
                            align-items: center;
                            background: transparent;
                            padding: 8px;
                        `;

                        // ── FRONT CARD (inline styles, no Tailwind) ──────────────────
                        const frontCard = document.createElement('div');
                        frontCard.style.cssText = `
                            width: 300px; height: 188px;
                            background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                            border-radius: 16px;
                            position: relative;
                            overflow: hidden;
                            box-shadow: 0 20px 40px rgba(79,70,229,0.35);
                            flex-shrink: 0;
                            font-family: system-ui, -apple-system, sans-serif;
                        `;
                        frontCard.innerHTML = `
                            <!-- dekorasi lingkaran blur -->
                            <div style="
                                position:absolute; top:-40px; right:-40px;
                                width:176px; height:176px;
                                background:rgba(255,255,255,0.06);
                                border-radius:50%; filter:blur(20px);
                            "></div>
                            <!-- badge LAPORANMU -->
                            <div style="
                                position:absolute; top:12px; right:12px;
                                display:flex; align-items:center; gap:6px; z-index:10;
                            ">
                                <div style="
                                    width:22px; height:22px; border-radius:6px;
                                    background:rgba(255,255,255,0.15);
                                    display:flex; align-items:center; justify-content:center;
                                    border:1px solid rgba(255,255,255,0.2);
                                ">
                                    <span style="font-weight:900; font-size:9px; color:white;">L</span>
                                </div>
                                <span style="font-size:8px; font-weight:900; letter-spacing:0.2em; color:rgba(255,255,255,0.85); text-transform:uppercase;">LAPORANMU</span>
                            </div>
                            <!-- isi kartu -->
                            <div style="
                                position:absolute; top:36px; left:16px; right:16px; bottom:28px;
                                display:flex; gap:12px; z-index:10;
                            ">
                                <!-- foto -->
                                <div style="
                                    width:66px; height:82px; border-radius:10px;
                                    background:rgba(255,255,255,0.12);
                                    border:1.5px solid rgba(255,255,255,0.25);
                                    overflow:hidden; flex-shrink:0;
                                    display:flex; align-items:center; justify-content:center;
                                ">
                                    ${photoDataUrl
                                ? `<img src="${photoDataUrl}" style="width:100%;height:100%;object-fit:cover;" />`
                                : `<span style="font-size:28px;font-weight:900;color:rgba(255,255,255,0.4);">${(s.name || '?').charAt(0)}</span>`
                            }
                                </div>
                                <!-- teks -->
                                <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:space-between; padding:2px 0;">
                                    <div>
                                        <div style="font-size:12px; font-weight:900; color:white; text-transform:uppercase; line-height:1.2; margin-bottom:4px; word-break:break-word;">
                                            ${s.name}
                                        </div>
                                        <div style="font-size:8px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.05em;">
                                            ${s.className || '-'}
                                        </div>
                                        <div style="font-size:6px; font-weight:700; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.18em; margin-top:2px;">
                                            MUHAMMADIYAH BOARDING SCHOOL
                                        </div>
                                    </div>
                                    <div style="padding-top:8px; border-top:1px solid rgba(255,255,255,0.12);">
                                        <div style="font-size:5px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.2em; margin-bottom:3px;">
                                            NOMOR REGISTRASI
                                        </div>
                                        <div style="font-size:10px; font-weight:700; color:#c7d2fe; font-family:monospace; letter-spacing:0.08em;">
                                            ${s.code || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- footer -->
                            <div style="
                                position:absolute; bottom:8px; left:16px; right:16px;
                                display:flex; justify-content:space-between; align-items:center;
                                opacity:0.22;
                            ">
                                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.3em;">KARTU PELAJAR</span>
                                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.2em;">2026/2027</span>
                            </div>
                        `;

                        // ── BACK CARD (QR) ───────────────────────────────────────────
                        const backCard = document.createElement('div');
                        backCard.style.cssText = `
                            width: 300px; height: 188px;
                            background: white;
                            border-radius: 16px;
                            border: 1px solid #e5e7eb;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                            display: flex; flex-direction: column;
                            align-items: center; justify-content: center;
                            position: relative;
                            flex-shrink: 0;
                            font-family: system-ui, -apple-system, sans-serif;
                        `;

                        // Render QR ke canvas dulu, lalu embed sebagai <img>
                        const qrContainer = document.createElement('div');
                        qrContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
                        document.body.appendChild(qrContainer);

                        // Pakai QRCodeCanvas yang sudah ter-import
                        const qrRoot = createRoot(qrContainer);
                        await new Promise(resolve => {
                            qrRoot.render(
                                <QRCodeCanvas
                                    value={qrValue}
                                    size={200}
                                    level="H"
                                    id="__qr_offscreen__"
                                />
                            );
                            setTimeout(resolve, 150); // tunggu render selesai
                        });
                        const qrCanvas = qrContainer.querySelector('canvas');
                        const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;
                        qrRoot.unmount();
                        document.body.removeChild(qrContainer);

                        backCard.innerHTML = `
                            <div style="
                                padding:8px; background:white;
                                border-radius:10px; border:1px solid #e5e7eb;
                                box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:10px;
                            ">
                                ${qrDataUrl
                                ? `<img src="${qrDataUrl}" style="width:70px;height:70px;display:block;" />`
                                : `<div style="width:70px;height:70px;background:#f3f4f6;border-radius:4px;"></div>`
                            }
                            </div>
                            <div style="font-size:8px;font-weight:900;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;text-align:center;">
                                AKSES PORTAL ORANG TUA
                            </div>
                            <div style="font-size:6px;font-weight:600;color:#9ca3af;text-align:center;line-height:1.5;max-width:180px;">
                                Silakan scan kode di atas untuk<br/>mengecek perkembangan siswa
                            </div>
                            <div style="
                                position:absolute; bottom:10px; left:0; right:0;
                                display:flex; justify-content:space-between;
                                padding:0 16px; opacity:0.2;
                            ">
                                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">TAHUN 2026/2027</span>
                                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">MBS TANGGUL</span>
                            </div>
                        `;

                        offscreen.appendChild(frontCard);
                        offscreen.appendChild(backCard);
                        document.body.appendChild(offscreen);

                        // ── Capture dengan html2canvas ───────────────────────────────
                        const canvas = await html2canvas(offscreen, {
                            scale: 3,
                            useCORS: true,
                            allowTaint: false,
                            backgroundColor: null,
                            logging: false,
                        });

                        document.body.removeChild(offscreen);

                        const imgData = canvas.toDataURL('image/png');
                        const maxCardW = pageWidth - margin * 2;
                        const ratio = canvas.height / canvas.width;
                        const cardImgW = maxCardW;
                        const cardImgH = maxCardW * ratio;
                        const cardImgX = (pageWidth - cardImgW) / 2;

                        doc.addImage(imgData, 'PNG', cardImgX, cardAreaY, cardImgW, cardImgH);
                        cardAreaH = cardImgH;
                    } catch (captureErr) {
                        console.warn('Capture kartu gagal, fallback ke jsPDF manual:', captureErr);
                        cardAreaH = await drawCardsFallback(doc, s, margin, pageWidth, cardAreaY);
                    }
                } else {
                    // Bulk print → pakai fallback
                    cardAreaH = await drawCardsFallback(doc, s, margin, pageWidth, cardAreaY);
                }

                // ════════════════════════════════════════════
                // 4. KOTAK DETAIL AKSES + INFO TAMBAHAN
                // ════════════════════════════════════════════
                const detailY = cardAreaY + cardAreaH + 5;
                const detailH = 58;

                doc.setFillColor(248, 249, 252);
                doc.setDrawColor(220, 225, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, detailY, pageWidth - margin * 2, detailH, 4, 4, 'FD');

                // Header kiri: DETAIL DATA AKSES
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text('DETAIL DATA AKSES', margin + 6, detailY + 10);

                // Header kanan: PETUNJUK — geser ke tengah kotak
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text('PETUNJUK', margin + 90, detailY + 10);

                // Garis pemisah internal
                doc.setDrawColor(215, 220, 240);
                doc.setLineWidth(0.3);
                doc.line(margin + 6, detailY + 13, pageWidth - margin - 6, detailY + 13);
                // Garis vertikal pemisah — di tengah kotak (170mm / 2 = 85mm)
                doc.line(margin + 85, detailY + 13, margin + 85, detailY + detailH - 6);

                // Data kiri — 5 baris
                const rows = [
                    ['ID Registrasi', s.code || '-'],
                    ['PIN Akses', s.pin || '-'],
                    ['Tahun Ajaran', s.academic_year || '2026/2027'],
                    ['Status', s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Aktif'],
                    ['Portal', `${window.location.origin}/check`],
                ];
                rows.forEach(([label, val], idx) => {
                    const rowY = detailY + 20 + idx * 8;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(130, 130, 150);
                    doc.text(label, margin + 6, rowY);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(label === 'Portal' ? 7 : 8.5);
                    doc.setTextColor(20, 20, 50);
                    doc.text(String(val), margin + 38, rowY);
                });

                // Petunjuk kanan — 4 tips (mulai dari center divider + padding)
                const tips = [
                    '1. Simpan dokumen ini dengan baik.',
                    '2. Akses portal melalui URL di kolom kiri.',
                    '3. Masukkan PIN apabila diminta sistem.',
                    '4. Hubungi sekolah jika ada kendala akses.',
                ];
                tips.forEach((tip, idx) => {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(70, 70, 90);
                    doc.text(tip, margin + 90, detailY + 20 + idx * 8);
                });

                // ════════════════════════════════════════════
                // 5. INFO WALI MURID (selalu tampil)
                // ════════════════════════════════════════════
                const waliY = detailY + detailH + 4;
                const waliBoxH = 26;

                doc.setFillColor(250, 250, 255);
                doc.setDrawColor(220, 225, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, waliY, pageWidth - margin * 2, waliBoxH, 3, 3, 'FD');

                // Judul section
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text('DATA WALI MURID', margin + 6, waliY + 8);

                // Garis bawah judul
                doc.setDrawColor(215, 220, 240);
                doc.setLineWidth(0.3);
                doc.line(margin + 6, waliY + 11, pageWidth - margin - 6, waliY + 11);

                // 3 kolom rata tengah: Nama Wali | Hubungan | No. Handphone
                const waliCols = [
                    { label: 'Nama Wali', val: s.guardian_name || '-' },
                    { label: 'Hubungan', val: s.guardian_relation || '-' },
                    { label: 'No. Handphone', val: s.phone || '-' },
                ];
                const waliColW = (pageWidth - margin * 2) / 3;
                waliCols.forEach(({ label, val }, idx) => {
                    const wx = margin + waliColW * idx + waliColW / 2;
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(130, 130, 150);
                    doc.text(label, wx, waliY + 17, { align: 'center' });
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(20, 20, 50);
                    doc.text(String(val), wx, waliY + 23, { align: 'center' });
                });

                // ════════════════════════════════════════════
                // 6. FOOTER & TANDA TANGAN
                // ════════════════════════════════════════════
                const signBaseY = waliY + waliBoxH + 6;
                const signY = Math.max(signBaseY, 225);

                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(40, 40, 40);
                const dateStr = 'Jember, ' + new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
                doc.text(dateStr, pageWidth - margin - 55, signY);
                doc.text('Admin Laporanmu', pageWidth - margin - 55, signY + 22);

                // Garis tanda tangan
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.3);
                doc.line(pageWidth - margin - 55, signY + 18, pageWidth - margin, signY + 18);

                // Catatan kecil di kiri (sejajar ttd)
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150, 150, 150);
                doc.text('* Dokumen ini diterbitkan secara digital oleh sistem Laporanmu.', margin, signY + 5);
                doc.text('  Harap simpan dokumen ini dengan baik dan jangan disebarluaskan.', margin, signY + 10);

                // Footer bawah halaman
                doc.setDrawColor(220, 220, 230);
                doc.setLineWidth(0.2);
                doc.line(margin, 283, pageWidth - margin, 283);

                doc.setFontSize(6.5);
                doc.setTextColor(180, 180, 180);
                const docSerial = `DOC-${s.code}-${Date.now().toString(36).toUpperCase()}`;
                doc.text(`No. Seri: ${docSerial}`, margin, 287);
                doc.text('Dokumen Digital Otomatis · MBS Tanggul · Laporanmu', pageWidth / 2, 287, { align: 'center' });
            }

            doc.save(`SURAT_AKSES_${targets.length > 1 ? 'BULK' : targets[0].name.toUpperCase().replace(/\s+/g, '_')}.pdf`);
            addToast('Dokumen berhasil dibuat!', 'success');
        } catch (e) {
            console.error(e);
            addToast('Gagal membuat dokumen PDF', 'error');
        } finally {
            setGeneratingPdf(false);
        }
    };

    /**
     * Fallback: gambar kartu manual dengan jsPDF (dipakai saat bulk print
     * atau ketika elemen DOM tidak tersedia / html2canvas gagal).
     * Mengembalikan tinggi area kartu (mm) agar layout di bawahnya bisa menyesuaikan.
     */
    const drawCardsFallback = async (doc, s, margin, pageWidth, cardY) => {
        const cardW = 82;
        const cardH = 52;
        const cardGap = 6;
        const startX = (pageWidth - (cardW * 2 + cardGap)) / 2;

        // ── Front Card ────────────────────────────────────────────────
        // Gradient simulasi: dua rect warna indigo bertumpuk
        doc.setFillColor(67, 56, 202);
        doc.roundedRect(startX, cardY, cardW, cardH, 3, 3, 'F');
        doc.setFillColor(55, 48, 163);
        doc.roundedRect(startX, cardY + cardH * 0.55, cardW, cardH * 0.45, 0, 3, 'F');

        // Dekorasi lingkaran blur (simulasi)
        doc.setFillColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.04 }));
        doc.circle(startX + cardW - 5, cardY + 5, 22, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));

        // Badge "LAPORANMU" kanan atas
        doc.setFillColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.12 }));
        doc.roundedRect(startX + cardW - 30, cardY + 3, 28, 7, 1.5, 1.5, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORANMU', startX + cardW - 16, cardY + 7.8, { align: 'center' });

        // Foto siswa
        doc.setFillColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.15 }));
        doc.roundedRect(startX + 5, cardY + 10, 18, 22, 2, 2, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));

        if (s.photo_url) {
            try {
                const sPhoto = await getBase64Image(s.photo_url);
                if (sPhoto) doc.addImage(sPhoto, 'JPEG', startX + 6, cardY + 11, 16, 20);
            } catch (_) { }
        } else {
            // Placeholder inisial
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text((s.name || '?').charAt(0), startX + 14, cardY + 24, { align: 'center' });
        }

        // Nama & kelas
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        const nameLines = doc.splitTextToSize(s.name.toUpperCase(), 50);
        doc.text(nameLines, startX + 28, cardY + 16);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(s.className || '-', startX + 28, cardY + 16 + nameLines.length * 4.5);

        doc.setFontSize(5);
        doc.setTextColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.5 }));
        doc.text('MUHAMMADIYAH BOARDING SCHOOL', startX + 28, cardY + 16 + nameLines.length * 4.5 + 4);
        doc.setGState(doc.GState({ opacity: 1 }));

        // Garis pemisah
        doc.setDrawColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.15 }));
        doc.setLineWidth(0.2);
        doc.line(startX + 28, cardY + 34, startX + cardW - 4, cardY + 34);
        doc.setGState(doc.GState({ opacity: 1 }));

        // Nomor registrasi
        doc.setTextColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.5 }));
        doc.setFontSize(4);
        doc.setFont('helvetica', 'normal');
        doc.text('NOMOR REGISTRASI', startX + 28, cardY + 38);
        doc.setGState(doc.GState({ opacity: 1 }));

        doc.setFontSize(8.5);
        doc.setFont('courier', 'bold');
        doc.setTextColor(199, 210, 254);
        doc.text(s.code || '-', startX + 28, cardY + 43);

        // Footer kartu depan
        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.25 }));
        doc.text('KARTU PELAJAR', startX + 5, cardY + cardH - 3);
        doc.text('2026/2027', startX + cardW - 5, cardY + cardH - 3, { align: 'right' });
        doc.setGState(doc.GState({ opacity: 1 }));

        // ── Back Card ─────────────────────────────────────────────────
        const backX = startX + cardW + cardGap;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230, 230, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(backX, cardY, cardW, cardH, 3, 3, 'FD');

        // Fetch QR dari API eksternal (fallback, pakai URL)
        const qrVal = `${window.location.origin}/check?code=${s.code}&pin=${s.pin}`;
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(qrVal)}`;
        try {
            const qrImg = await getBase64Image(qrSrc);
            if (qrImg) {
                // Frame putih QR
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(230, 230, 230);
                doc.roundedRect(backX + cardW / 2 - 14, cardY + 7, 28, 28, 1.5, 1.5, 'FD');
                doc.addImage(qrImg, 'PNG', backX + cardW / 2 - 13, cardY + 8, 26, 26);
            }
        } catch (_) { }

        doc.setTextColor(55, 48, 163);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('AKSES PORTAL ORANG TUA', backX + cardW / 2, cardY + 40, { align: 'center' });

        doc.setTextColor(160, 160, 160);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text('Scan kode di atas untuk memantau perkembangan siswa', backX + cardW / 2, cardY + 44.5, { align: 'center' });

        doc.setFontSize(4.5);
        doc.setTextColor(200, 200, 210);
        doc.text('TAHUN 2026/2027', backX + 5, cardY + cardH - 3);
        doc.text('MBS TANGGUL', backX + cardW - 5, cardY + cardH - 3, { align: 'right' });

        return cardH; // kembalikan tinggi kartu
    };

    // NEW: Download template import xlsx
    const handleDownloadTemplate = () => {
        const templateData = [
            { name: 'Contoh: Ahmad Rizki', gender: 'L', phone: '081234567890', class_name: 'XII IPA 1', nisn: '1234567890' },
            { name: 'Contoh: Siti Aminah', gender: 'P', phone: '081234567891', class_name: 'XI IPS 2', nisn: '0987654321' },
        ]
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 15 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'template_import_siswa.xlsx'
        link.click()
        addToast('Template berhasil didownload', 'success')
    }

    // Helper: format relative date
    const formatRelativeDate = (isoString) => {
        if (!isoString) return null
        const d = new Date(isoString)
        const now = new Date()
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Hari ini'
        if (diffDays === 1) return 'Kemarin'
        if (diffDays < 7) return `${diffDays} hari lalu`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} bln lalu`
        return `${Math.floor(diffDays / 365)} thn lalu`
    }

    // Helper: reset all filters
    const resetAllFilters = () => {
        setSearchQuery('')
        setFilterClass('')
        setFilterClasses([])
        setFilterGender('')
        setFilterStatus('')
        setFilterTag('')
        setSortBy('name_asc')
        setFilterPointMode('')
        setFilterPointMin('')
        setFilterPointMax('')
        setSelectedStudentIds([])
        localStorage.removeItem('students_filters') // ← tambahkan ini
    }

    const activeFilterCount = [filterClass, filterClasses.length > 0 ? 'multi' : '', filterGender, filterStatus, filterTag, filterPointMode, debouncedSearch].filter(Boolean).length

    const sanitizeText = (s) => String(s ?? '').replace(/[<>]/g, '').trim()

    const normalizePhone = (raw) => {
        const v = String(raw ?? '').trim()
        if (!v) return ''
        const cleaned = v.replace(/[\s-]/g, '')
        const keepPlus = cleaned.startsWith('+') ? '+' : ''
        const digits = cleaned.replace(/[^\d]/g, '')
        return keepPlus ? `+${digits}` : digits
    }

    const isValidPhone = (phone) => {
        if (!phone) return true
        return /^(\+?62|08)\d{8,11}$/.test(phone)
    }

    const pick = (obj, keys) => {
        for (const k of keys) {
            const v = obj?.[k]
            if (v !== undefined && v !== null && String(v).trim() !== '') return v
        }
        return ''
    }

    const parseCSVFile = async (file) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data || []),
                error: (err) => reject(err)
            })
        })
    }

    const parseExcelFile = async (file) => {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const firstSheet = wb.SheetNames[0]
        const ws = wb.Sheets[firstSheet]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        return json
    }

    const buildImportPreview = (rows) => {
        const issues = []
        const preview = rows.map((r, idx) => {
            // header fleksibel
            const name = sanitizeText(pick(r, ['name', 'nama']))
            const genderRaw = sanitizeText(pick(r, ['gender', 'jk', 'jenis_kelamin']))
            const phone = normalizePhone(pick(r, ['phone', 'no_hp', 'hp', 'whatsapp']))
            const className = sanitizeText(pick(r, ['class_name', 'kelas', 'class']))

            // normalisasi gender ringan
            let gender = genderRaw
            if (genderRaw) {
                const g = genderRaw.toLowerCase()
                if (['l', 'lk', 'laki', 'laki-laki', 'male'].includes(g)) gender = 'L'
                else if (['p', 'pr', 'perempuan', 'female'].includes(g)) gender = 'P'
            }
            if (!gender) gender = 'L'

            const classObj = classesList.find(c => (c.name || '').toLowerCase() === className.toLowerCase())
            const class_id = classObj?.id || null

            const rowIssues = []
            // blocking errors minimal (biar import ga “ngaco”)
            if (!name) rowIssues.push({ level: 'error', msg: 'Nama wajib diisi' })
            if (!className) rowIssues.push({ level: 'error', msg: 'Kelas wajib diisi (kolom class_name/kelas)' })
            if (className && !class_id) rowIssues.push({ level: 'error', msg: `Kelas "${className}" tidak ditemukan di database` })

            // warnings (ga ngeblok import)
            if (phone && !isValidPhone(phone)) rowIssues.push({ level: 'warn', msg: 'No HP formatnya aneh (08/+62, 10-13 digit)' })
            if (gender && !['L', 'P'].includes(gender)) rowIssues.push({ level: 'warn', msg: 'Gender sebaiknya L/P' })

            if (rowIssues.length) {
                const level = rowIssues.some(x => x.level === 'error') ? 'error' : 'warn'
                issues.push({
                    row: idx + 2,
                    level,
                    messages: rowIssues.map(x => x.msg)
                })
            }

            return {
                name,
                gender,
                phone: phone || null,
                class_id,
                photo_url: null
            }
        })

        setImportPreview(preview)
        setImportIssues(issues)
    }

    const handleImportClick = () => importFileInputRef.current?.click()

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])

        try {
            const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || (file.type || '').includes('sheet')
            const rows = isXlsx ? await parseExcelFile(file) : await parseCSVFile(file)

            if (!rows.length) {
                addToast('File kosong atau tidak terbaca', 'error')
                return
            }

            buildImportPreview(rows)
            setIsImportModalOpen(true)
        } catch (err) {
            console.error(err)
            addToast('Gagal membaca file import', 'error')
        } finally {
            e.target.value = ''
        }
    }

    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    const handleCommitImport = async () => {
        if (!importPreview.length) {
            addToast('Tidak ada data untuk diimport', 'error')
            return
        }
        if (hasImportBlockingErrors) {
            addToast('Masih ada ERROR. Perbaiki file dulu ya.', 'error')
            return
        }

        // Filter hanya baris yang tidak punya error blocking
        const errorRows = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        const validRows = importPreview.filter((_, i) => !errorRows.has(i))

        setImporting(true)
        setImportProgress({ done: 0, total: validRows.length })

        // FIX: batch insert (chunk 50) jauh lebih cepat dari sequential
        const CHUNK = 50
        try {
            for (let i = 0; i < validRows.length; i += CHUNK) {
                const chunk = validRows.slice(i, i + CHUNK).map(r => ({
                    ...r,
                    registration_code: generateCode(),
                    pin: String(Math.floor(1000 + Math.random() * 9000)),
                    total_points: 0
                }))
                const { error } = await supabase.from('students').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length })
            }

            addToast(`Berhasil import ${validRows.length} siswa`, 'success')
            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            await fetchData();
            fetchStats()
        } catch (err) {
            console.error(err)
            addToast('Gagal import (cek constraint DB / duplikat / koneksi)', 'error')
        } finally {
            setImporting(false)
        }
    }

    const downloadBlob = (blob, filename) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
    }

    const handleExportCSV = async () => {
        setExporting(true)
        try {
            const rows = await fetchFilteredForExport()
            const headers = ['ID', 'Kode', 'Nama', 'Gender', 'Kelas', 'Poin', 'Phone']
            const csvContent = [
                headers.join(','),
                ...rows.map(s =>
                    [
                        s.ID,
                        s.Kode,
                        `"${String(s.Nama).replace(/"/g, '""')}"`,
                        s.Gender,
                        `"${String(s.Kelas).replace(/"/g, '""')}"`,
                        s.Poin,
                        `"${String(s.Phone).replace(/"/g, '""')}"`
                    ].join(',')
                )
            ].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            downloadBlob(blob, `data_siswa_${new Date().toISOString().slice(0, 10)}.csv`)
            addToast('Export CSV berhasil', 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal export CSV', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    const handleExportExcel = async () => {
        setExporting(true)
        try {
            const data = await fetchFilteredForExport()
            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Students')
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            downloadBlob(blob, `data_siswa_${new Date().toISOString().slice(0, 10)}.xlsx`)
            addToast('Export Excel berhasil', 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal export Excel', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    const handleExportPDF = async () => {
        setExporting(true)
        try {
            const allRows = await fetchFilteredForExport()
            const doc = new jsPDF({ orientation: 'landscape' })
            doc.setFontSize(12)
            doc.text('Laporan Data Siswa', 14, 12)
            const filterInfo = []
            if (filterGender) filterInfo.push(`Gender: ${filterGender}`)
            if (filterStatus) filterInfo.push(`Status: ${filterStatus}`)
            if (filterTag) filterInfo.push(`Label: ${filterTag}`)
            if (debouncedSearch) filterInfo.push(`Cari: "${debouncedSearch}"`)
            if (filterInfo.length > 0) {
                doc.setFontSize(8)
                doc.text(`Filter aktif: ${filterInfo.join(' | ')}`, 14, 24)
            }
            doc.setFontSize(9)
            doc.text(`Tanggal: ${new Date().toLocaleDateString()}`, 14, 18)

            const rows = allRows.map(s => ([s.ID, s.Kode, s.Nama, s.Gender, s.Kelas, String(s.Poin), s.Phone]))

            autoTable(doc, {
                head: [['ID', 'Kode', 'Nama', 'Gender', 'Kelas', 'Poin', 'Phone']],
                body: rows,
                startY: 22,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [30, 30, 30] }
            })

            doc.save(`laporan_siswa_${new Date().toISOString().slice(0, 10)}.pdf`)
            addToast('Export PDF berhasil', 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal export PDF', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    const isAnyModalOpen = !!(
        isModalOpen || isArchivedModalOpen || isClassHistoryModalOpen || isBulkModalOpen ||
        isBulkDeleteModalOpen || isResetPointsModalOpen || isTagModalOpen || isGSheetsModalOpen ||
        isImportModalOpen || isExportModalOpen || isPrintModalOpen || isProfileModalOpen ||
        isBulkWAModalOpen || isClassBreakdownOpen || photoZoom
    );

    return (
        <DashboardLayout title="Data Siswa" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>
                {isAnyModalOpen ? `
                    .top-nav, .sidebar, .floating-dock { display: none !important; }
                    main { padding-top: 0 !important; }
                ` : ''}
            </style>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Siswa</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Kelola {globalStats.total} data siswa aktif dalam sistem laporan.
                    </p>
                </div>

                <div className="flex gap-2 items-center">
                    {/* Dropdown menu untuk aksi sekunder */}
                    <div className="relative" ref={headerMenuRef}>
                        <button
                            onClick={() => setIsHeaderMenuOpen(v => !v)}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            title="Aksi lainnya"
                        >
                            <FontAwesomeIcon icon={faSliders} />
                        </button>

                        {isHeaderMenuOpen && (
                            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/10 overflow-hidden">
                                <div className="p-1.5 space-y-0.5">
                                    <p className="px-3 pt-1.5 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Data</p>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); handleImportClick() }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faUpload} className="w-3.5 text-[var(--color-text-muted)]" />
                                        Import CSV / Excel
                                    </button>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); setIsGSheetsModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-emerald-600 hover:bg-emerald-500/10 transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faLink} className="w-3.5" />
                                        Import Google Sheets
                                    </button>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faDownload} className="w-3.5 text-[var(--color-text-muted)]" />
                                        Export Data
                                    </button>

                                    <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                    <p className="px-3 pt-0.5 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); fetchArchivedStudents(); setIsArchivedModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-amber-600 hover:bg-amber-500/10 transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faBoxArchive} className="w-3.5" />
                                        Arsip Siswa
                                    </button>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); setResetPointsClassId(''); setIsResetPointsModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-orange-600 hover:bg-orange-500/10 transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faRotateLeft} className="w-3.5" />
                                        Reset Poin
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={importFileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv,.xlsx"
                    />

                    <button
                        onClick={handleAdd}
                        className="h-9 px-5 rounded-lg btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Tambah
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-[var(--color-primary)] flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-[var(--color-primary)]/5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faUsers} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Total Siswa</p>
                        <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.total}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-blue-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-blue-500/5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faMars} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putra</p>
                        <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.boys}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-pink-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-pink-500/5">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faVenus} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putri</p>
                        <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.girls}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-emerald-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-emerald-500/5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Rata-rata Poin</p>
                        <h3 className={`text-xl font-black font-heading leading-none ${globalStats.avgPoints >= 0 ? 'text-[var(--color-text)]' : 'text-red-500'}`}>{globalStats.avgPoints}</h3>
                    </div>
                </div>

                {/* Kelas Bermasalah */}
                <div
                    className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-red-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-red-500/5 cursor-pointer col-span-2 lg:col-span-1"
                    onClick={() => { if (globalStats.worstClass) { setFilterClass(''); setFilterPointMode('risk') } }}
                    title="Klik untuk filter siswa risiko"
                >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Kelas Bermasalah</p>
                        {globalStats.worstClass ? (
                            <>
                                <h3 className="text-sm font-black font-heading leading-none text-red-500 truncate">{globalStats.worstClass.name}</h3>
                                <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">avg {globalStats.worstClass.avg} poin</p>
                            </>
                        ) : (
                            <h3 className="text-sm font-black text-[var(--color-text-muted)]">-</h3>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">

                {/* Row 1: Search + action buttons */}
                <div className="flex gap-2 p-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, kode... (Ctrl+K)"
                            className="input-field pl-10 w-full h-9 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                    </div>

                    {/* Filter toggle button */}
                    <button
                        type="button"
                        onClick={() => setShowAdvancedFilter(v => !v)}
                        className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showAdvancedFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                    >
                        <FontAwesomeIcon icon={faSliders} />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Reset */}
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={resetAllFilters}
                            className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5"
                        >
                            <FontAwesomeIcon icon={faXmark} />
                            Reset
                        </button>
                    )}
                </div>

                {/* Row 2: Expandable filter panel */}
                {showAdvancedFilter && (
                    <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                            {/* Kelas */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kelas</label>
                                <select
                                    value={filterClass}
                                    onChange={(e) => { setFilterClass(e.target.value); setFilterClasses([]); setPage(1) }}
                                    className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                >
                                    <option value="">Semua Kelas</option>
                                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Jenis Kelamin</label>
                                <select
                                    value={filterGender}
                                    onChange={(e) => { setFilterGender(e.target.value); setPage(1) }}
                                    className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                >
                                    <option value="">Semua Gender</option>
                                    <option value="L">Putra</option>
                                    <option value="P">Putri</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Status Siswa</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                                    className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="aktif">Aktif</option>
                                    <option value="lulus">Lulus</option>
                                    <option value="pindah">Pindah</option>
                                    <option value="keluar">Keluar</option>
                                </select>
                            </div>

                            {/* Label/Tag */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Label</label>
                                <select
                                    value={filterTag}
                                    onChange={(e) => { setFilterTag(e.target.value); setPage(1) }}
                                    className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                >
                                    <option value="">Semua Label</option>
                                    {AvailableTags.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* Urutkan */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                >
                                    {SortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>

                            {/* Filter Poin Min */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Minimum</label>
                                <input
                                    type="number"
                                    value={filterPointMin}
                                    onChange={(e) => { setFilterPointMin(e.target.value); setFilterPointMode(e.target.value || filterPointMax ? 'custom' : ''); setPage(1) }}
                                    placeholder="0"
                                    className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                                />
                            </div>

                            {/* Filter Poin Max */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Maksimum</label>
                                <input
                                    type="number"
                                    value={filterPointMax}
                                    onChange={(e) => { setFilterPointMax(e.target.value); setFilterPointMode(filterPointMin || e.target.value ? 'custom' : ''); setPage(1) }}
                                    placeholder="Unlimited"
                                    className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                                />
                            </div>

                            {/* Quick poin presets */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Preset Poin</label>
                                <div className="flex gap-1.5">
                                    {[
                                        { value: '', label: 'Semua' },
                                        { value: 'risk', label: '⚠ Risiko' },
                                        { value: 'positive', label: '✓ Positif' },
                                    ].map(opt => (
                                        <button key={opt.value} type="button"
                                            onClick={() => { setFilterPointMode(opt.value); setFilterPointMin(''); setFilterPointMax(''); setPage(1) }}
                                            className={`flex-1 h-9 rounded-xl text-[9px] font-black uppercase border transition-all ${filterPointMode === opt.value && opt.value !== '' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                        >{opt.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table / Loading */}
            {loading ? (
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--color-surface-alt)]">
                                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    <th className="px-6 py-4 w-10"></th>
                                    <th className="px-6 py-4">Siswa</th>
                                    <th className="px-6 py-4 text-center">Gender</th>
                                    <th className="px-6 py-4 text-center">Kelas</th>
                                    <th className="px-6 py-4 text-center">Poin</th>
                                    <th className="px-6 py-4 text-center">Lap. Terakhir</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-t border-[var(--color-border)]">
                                        <td className="px-6 py-4"><div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[var(--color-border)] animate-pulse shrink-0" />
                                                <div className="space-y-2">
                                                    <div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" />
                                                    <div className="h-2 w-24 rounded bg-[var(--color-border)] animate-pulse opacity-60" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><div className="w-8 h-8 rounded-lg bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-5 w-20 rounded-md bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-10 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-7 w-28 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                        <th className="px-6 py-4 text-center w-12">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.length === students.length && students.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-center">Siswa</th>
                                        <th className="px-6 py-4 text-center">Gender</th>
                                        <th className="px-6 py-4 text-center">Kelas</th>
                                        <th className="px-6 py-4 text-center">Poin</th>
                                        <th className="px-6 py-4 text-center pr-6">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-14 ">
                                                <div className="flex flex-col items-center text-center gap-2">
                                                    <FontAwesomeIcon icon={faTableList} className="text-3xl text-[var(--color-text-muted)] opacity-30 mb-2" />
                                                    <div className="text-sm font-extrabold text-[var(--color-text)]">Data tidak ditemukan</div>
                                                    <div className="text-xs font-bold text-[var(--color-text-muted)]">Coba ganti filter / kata kunci pencarian.</div>
                                                    <button
                                                        type="button"
                                                        onClick={resetAllFilters}
                                                        className="mt-3 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4"
                                                    >
                                                        Reset Semua Filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (students.map((student) => (
                                        <StudentRow
                                            key={student.id}
                                            student={student}
                                            selectedIds={selectedStudentIds}
                                            lastReportMap={lastReportMap}
                                            onEdit={handleEdit}
                                            onViewProfile={handleViewProfile}
                                            onViewQR={handleViewQR}
                                            onViewPrint={handleViewPrint}
                                            onViewTags={(s) => { setStudentForTags(s); setIsTagModalOpen(true) }}
                                            onViewClassHistory={handleViewClassHistory}
                                            onConfirmDelete={confirmDelete}
                                            onClassBreakdown={handleClassBreakdown}
                                            onPhotoZoom={setPhotoZoom}
                                            onToggleSelect={toggleSelectStudent}
                                            formatRelativeDate={formatRelativeDate}
                                            RiskThreshold={RiskThreshold}
                                        />
                                    )))}

                                    {/* Quick Inline Add Row */}
                                    {isInlineAddOpen && (
                                        <tr className="border-t-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.02]">
                                            <td className="px-6 py-3" colSpan={1}></td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="text"
                                                    value={inlineForm.name}
                                                    onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                                                    onKeyDown={e => e.key === 'Enter' && handleInlineSubmit()}
                                                    placeholder="Nama siswa baru..."
                                                    autoFocus
                                                    className="input-field text-sm h-8 px-3 rounded-lg border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent w-full max-w-[200px]"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <div className="flex gap-1 justify-center">
                                                    {['L', 'P'].map(g => (
                                                        <button key={g} type="button" onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                                                            className={`w-7 h-7 rounded-md text-[10px] font-black border transition-all ${inlineForm.gender === g ? (g === 'L' ? 'bg-blue-500/20 border-blue-500/40 text-blue-500' : 'bg-pink-500/20 border-pink-500/40 text-pink-500') : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                                                        >{g}</button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <select
                                                    value={inlineForm.class_id}
                                                    onChange={e => setInlineForm(p => ({ ...p, class_id: e.target.value }))}
                                                    className="select-field text-xs h-8 px-2 rounded-lg border-[var(--color-border)] bg-transparent font-bold min-w-[110px]"
                                                >
                                                    <option value="">Pilih kelas</option>
                                                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <input
                                                    type="text"
                                                    value={inlineForm.phone}
                                                    onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                                    placeholder="08xxx"
                                                    className="input-field text-xs h-8 px-2 rounded-lg border-[var(--color-border)] bg-transparent w-24"
                                                />
                                            </td>
                                            <td className="px-6 py-3"></td>
                                            <td className="px-6 py-3 text-right pr-6">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={handleInlineSubmit} disabled={submittingInline}
                                                        className="h-8 px-3 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition disabled:opacity-50 flex items-center gap-1.5">
                                                        {submittingInline ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                                                    </button>
                                                    <button onClick={() => setIsInlineAddOpen(false)}
                                                        className="h-8 w-8 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faXmark} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Quick Add trigger */}
                        {!isInlineAddOpen && (
                            <button
                                onClick={() => setIsInlineAddOpen(true)}
                                className="w-full py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all border-t border-[var(--color-border)] border-dashed"
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                                Quick Add Siswa
                            </button>
                        )}

                        {/* Bulk action footer */}
                        {selectedStudentIds.length > 0 && (
                            <div className="p-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--color-surface-alt)]/40">
                                <div className="text-xs font-bold text-[var(--color-text-muted)]">
                                    <span className="text-[var(--color-primary)] font-black">{selectedStudentIds.length}</span> siswa terpilih
                                    <span className="text-[var(--color-text-muted)]/60 ml-1">(halaman ini)</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleBulkWA}
                                        className="btn bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white border border-green-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faWhatsapp} />
                                        WA Wali
                                    </button>
                                    <button
                                        onClick={handleBulkPrint}
                                        className="btn bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white border border-indigo-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faPrint} />
                                        Cetak Kartu
                                    </button>
                                    <button
                                        onClick={() => setIsBulkDeleteModalOpen(true)}
                                        className="btn bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                        Hapus
                                    </button>
                                    <button
                                        onClick={() => setIsBulkModalOpen(true)}
                                        className="btn btn-primary h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faGraduationCap} />
                                        Naik Kelas
                                    </button>
                                    {/* Fitur 9 - Export filter aktif */}
                                    {activeFilterCount > 0 && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const rows = await fetchFilteredForExport()
                                                    const ws = XLSX.utils.json_to_sheet(rows)
                                                    const wb = XLSX.utils.book_new()
                                                    XLSX.utils.book_append_sheet(wb, ws, 'Filter')
                                                    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
                                                    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                                                    downloadBlob(blob, `export_filter_${new Date().toISOString().slice(0, 10)}.xlsx`)
                                                    addToast(`${rows.length} baris berhasil diekspor`, 'success')
                                                } catch { addToast('Gagal export', 'error') }
                                            }}
                                            className="btn bg-teal-500/10 hover:bg-teal-500 text-teal-600 hover:text-white border border-teal-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            <FontAwesomeIcon icon={faDownload} />
                                            Export Filter
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-[var(--color-border)] flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[var(--color-surface-alt)]/30">
                {/* Left info */}
                <div className="text-xs font-bold text-[var(--color-text-muted)]">
                    Menampilkan <span className="text-[var(--color-text)]">{fromRow}</span> – <span className="text-[var(--color-text)]">{toRow}</span> dari{' '}
                    <span className="text-[var(--color-text)]">{totalRows}</span>
                </div>

                {/* Right controls */}
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    {/* Page size */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-muted)]">Tampilkan</span>
                        <select
                            className="h-10 rounded-xl border border-[var(--color-border)] bg-transparent px-3 text-sm font-bold"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value))
                                setPage(1)
                            }}
                        >
                            {[10, 25, 50, 100].map(n => (
                                <option key={n} value={n}>{n} / halaman</option>
                            ))}
                        </select>
                    </div>

                    {/* Hide page controls kalau cuma 1 halaman atau data kosong */}
                    {(totalPages > 1 && totalRows > 0) && (
                        <>
                            {/* First */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page === 1}
                                onClick={() => setPage(1)}
                                title="Halaman pertama"
                            >
                                <FontAwesomeIcon icon={faAnglesLeft} />
                            </button>

                            {/* Prev */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                title="Sebelumnya"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>

                            {/* Page numbers */}
                            <div className="flex items-center gap-1 px-1">
                                {getPageItems(page, totalPages).map((it, idx) => {
                                    if (it === '...') {
                                        return (
                                            <div key={`dots-${idx}`} className="h-10 px-2 flex items-center text-[var(--color-text-muted)] font-black">
                                                …
                                            </div>
                                        )
                                    }
                                    const n = it
                                    const active = n === page
                                    return (
                                        <button
                                            key={n}
                                            onClick={() => setPage(n)}
                                            className={
                                                `h-10 min-w-[40px] px-3 rounded-xl border transition font-black text-xs ` +
                                                (active
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
                                                    : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text)]')
                                            }
                                        >
                                            {n}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Next */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                title="Berikutnya"
                            >
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>

                            {/* Last */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page >= totalPages}
                                onClick={() => setPage(totalPages)}
                                title="Halaman terakhir"
                            >
                                <FontAwesomeIcon icon={faAnglesRight} />
                            </button>

                            {/* Jump to page */}
                            <div className="flex items-center gap-2 ml-1">
                                <span className="text-xs font-bold text-[var(--color-text-muted)] hidden sm:inline">Ke</span>
                                <input
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value.replace(/[^\d]/g, ''))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const n = Number(jumpPage)
                                            if (!n) return
                                            setPage(Math.min(totalPages, Math.max(1, n)))
                                            setJumpPage('')
                                        }
                                    }}
                                    placeholder={`${page}/${totalPages}`}
                                    className="h-10 w-24 rounded-xl border border-[var(--color-border)] bg-transparent px-3 text-sm font-bold"
                                />
                                <button
                                    className="h-10 px-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition text-xs font-black uppercase tracking-widest"
                                    onClick={() => {
                                        const n = Number(jumpPage)
                                        if (!n) return
                                        setPage(Math.min(totalPages, Math.max(1, n)))
                                        setJumpPage('')
                                    }}
                                >
                                    Go
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ===================== */}
            {/* IMPORT MODAL */}
            {/* ===================== */}
            {isImportModalOpen && (
                <Modal
                    isOpen={isImportModalOpen}
                    onClose={() => {
                        if (importing) return
                        setIsImportModalOpen(false)
                    }}
                    title={`Import Students${importFileName ? ` — ${importFileName}` : ''}`}
                    size="xl"
                >
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="text-xs text-[var(--color-text-muted)]">
                                Support file: <b>.csv</b> / <b>.xlsx</b>. Header fleksibel:
                                <b> name/nama</b>, <b> gender/jk</b>, <b> phone/no_hp</b>, <b> class_name/kelas</b>, <b> nisn</b>
                            </div>
                            {/* Download template button */}
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="shrink-0 btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                            >
                                <FontAwesomeIcon icon={faDownload} />
                                Template
                            </button>
                        </div>

                        {importIssues.length > 0 && (
                            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm">
                                <div className="font-black mb-2">
                                    Issues ditemukan: {importIssues.length} baris
                                    {hasImportBlockingErrors ? ' (ada ERROR, import diblok)' : ' (hanya WARNING, import boleh)'}
                                </div>
                                <div className="max-h-44 overflow-auto space-y-1 text-xs">
                                    {importIssues.slice(0, 60).map((e, idx) => (
                                        <div key={idx}>
                                            <b>{e.level.toUpperCase()}</b> — Baris {e.row}: {e.messages.join(', ')}
                                        </div>
                                    ))}
                                    {importIssues.length > 60 && (
                                        <div className="text-[var(--color-text-muted)]">… dan lainnya</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                            <div className="max-h-[45vh] overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                        <tr className="text-left">
                                            <th className="p-3">#</th>
                                            <th className="p-3">Nama</th>
                                            <th className="p-3">Gender</th>
                                            <th className="p-3">Phone</th>
                                            <th className="p-3">Kelas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importPreview.slice(0, 200).map((r, i) => (
                                            <tr key={i} className="border-t border-[var(--color-border)]">
                                                <td className="p-3">{i + 1}</td>
                                                <td className="p-3">{r.name || '-'}</td>
                                                <td className="p-3">{r.gender || '-'}</td>
                                                <td className="p-3">{r.phone || '-'}</td>
                                                <td className="p-3">
                                                    {classesList.find(c => c.id === r.class_id)?.name || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {importPreview.length > 200 && (
                                <div className="p-3 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]">
                                    Preview menampilkan 200 baris pertama dari total {importPreview.length}.
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                disabled={importing}
                                className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)]
              border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                            >
                                Tutup
                            </button>

                            <div className="flex items-center gap-3">
                                {importing && (
                                    <div className="text-xs text-[var(--color-text-muted)]">
                                        Importing {importProgress.done}/{importProgress.total}...
                                    </div>
                                )}

                                <button
                                    onClick={handleCommitImport}
                                    disabled={importing || hasImportBlockingErrors || importPreview.length === 0}
                                    className="btn bg-[var(--color-primary)] hover:brightness-110 text-white
                text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                                >
                                    {importing ? 'Mengimport...' : 'Import ke Database'}
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ===================== */}
            {/* EXPORT MODAL */}
            {/* ===================== */}
            {isExportModalOpen && (
                <Modal
                    isOpen={isExportModalOpen}
                    onClose={() => {
                        if (exporting) return
                        setIsExportModalOpen(false)
                    }}
                    title="Export Data Students"
                    size="lg"
                >
                    <div className="space-y-3">
                        <div className="text-sm text-[var(--color-text-muted)]">
                            Pilih format export:
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                onClick={handleExportCSV}
                                disabled={exporting}
                                className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)]
              border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                            >
                                CSV
                            </button>

                            <button
                                onClick={handleExportExcel}
                                disabled={exporting}
                                className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)]
              border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                            >
                                Excel (.xlsx)
                            </button>

                            <button
                                onClick={handleExportPDF}
                                disabled={exporting}
                                className="btn bg-[var(--color-primary)] hover:brightness-110 text-white
              text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                            >
                                PDF
                            </button>
                        </div>

                        {exporting && (
                            <div className="text-xs text-[var(--color-text-muted)]">
                                Menyiapkan file export...
                            </div>
                        )}
                    </div>
                </Modal>
            )}


            {isModalOpen && (
                <StudentFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedStudent={selectedStudent}
                    classesList={classesList}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    onPhotoUpload={handlePhotoUpload}
                    uploadingPhoto={uploadingPhoto}
                />
            )}


            {/* Modal Cetak Kartu & Akses Siswa */}
            {isPrintModalOpen && (
                <Modal
                    isOpen={isPrintModalOpen}
                    onClose={() => {
                        setIsPrintModalOpen(false);
                        if (newlyCreatedStudent) setNewlyCreatedStudent(null);
                    }}
                    title={newlyCreatedStudent ? "Registrasi Berhasil!" : "Akses & Kartu"}
                    size="lg"
                >
                    {selectedStudent && (
                        <div className="space-y-4 py-1">
                            {newlyCreatedStudent && (
                                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-600">
                                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-[10px]">
                                        <FontAwesomeIcon icon={faCheckCircle} />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest">Registrasi Berhasil! Data akses & kartu tersedia di bawah.</p>
                                </div>
                            )}

                            {/* Card Previews - Compact size */}
                            <div
                                id="card-capture-target"
                                ref={cardCaptureRef}
                                className="flex flex-col sm:flex-row gap-2.5 justify-center items-center"
                                style={{ background: 'transparent' }}
                            >
                                {/* Front Card */}
                                <div className="w-[300px] h-[188px] bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl text-white relative shadow-xl overflow-hidden shadow-indigo-500/20 shrink-0 scale-95 sm:scale-100 origin-center transition-transform">
                                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full blur-2xl" />
                                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                        <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                                            <span className="font-black text-[9px]">L</span>
                                        </div>
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Laporanmu</span>
                                    </div>
                                    <div className="absolute top-9 left-4 right-4 bottom-7 flex gap-3 z-10">
                                        <div className="w-[62px] h-[78px] rounded-lg bg-white/10 border border-white/20 p-1.5 shrink-0 shadow-lg overflow-hidden">
                                            {selectedStudent.photo_url ? (
                                                <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover rounded-md" />
                                            ) : (
                                                <div className="w-full h-full rounded-md bg-white/5 flex items-center justify-center border border-white/10">
                                                    <span className="text-2xl font-black opacity-30">{selectedStudent.name.charAt(0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                            <div>
                                                <h3 className="text-[11px] font-black leading-[1.2] uppercase mb-0.5 drop-shadow-sm line-clamp-2">{selectedStudent.name}</h3>
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] font-black text-white/90 uppercase tracking-tight leading-tight">{selectedStudent.className}</p>
                                                    <p className="text-[6px] font-bold text-white/40 uppercase tracking-widest leading-none">MUHAMMADIYAH BOARDING SCHOOL TANGGUL</p>
                                                </div>
                                            </div>
                                            <div className="pt-1.5 border-t border-white/10">
                                                <p className="text-[5px] font-bold opacity-30 uppercase tracking-widest mb-0.5 leading-none">NOMOR REGISTRASI</p>
                                                <p className="text-[9px] font-mono font-bold tracking-wider text-indigo-100 leading-tight">{selectedStudent.code}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between opacity-20">
                                        <div className="flex items-center gap-1 text-white">
                                            <FontAwesomeIcon icon={faGraduationCap} className="text-[7px]" />
                                            <span className="text-[6px] font-black uppercase tracking-[0.3em]">KARTU PELAJAR</span>
                                        </div>
                                        <span className="text-[5px] font-black uppercase tracking-[0.2em] text-white">2026/2027</span>
                                    </div>
                                </div>

                                {/* Back Card */}
                                <div className="w-[300px] h-[188px] bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 relative shadow-lg flex flex-col items-center justify-center text-center shrink-0 p-4 scale-95 sm:scale-100 origin-center transition-transform">
                                    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm mb-2">
                                        <QRCodeCanvas
                                            value={`${window.location.origin}/check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                            size={65}
                                            level="M"
                                        />
                                    </div>
                                    <h4 className="text-[8px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em] mb-1 leading-tight">AKSES PORTAL ORANG TUA</h4>
                                    <p className="text-[6px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[180px]">
                                        Silakan scan kode di atas untuk<br />mengecek perkembangan siswa
                                    </p>
                                    <div className="absolute bottom-3 w-full left-0 px-5 flex justify-between items-center opacity-20">
                                        <span className="text-[5px] font-black uppercase tracking-[0.25em]">TAHUN 2026/2027</span>
                                        <span className="text-[5px] font-black uppercase tracking-[0.25em]">MBS TANGGUL</span>
                                    </div>
                                </div>
                            </div>

                            {/* Access Info & Actions Bar */}
                            <div className="bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-2xl p-3 space-y-3 no-print">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Info Info */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">ID REG</label>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-black text-[var(--color-primary)] font-mono">{selectedStudent.code}</span>
                                                <button onClick={() => { navigator.clipboard.writeText(selectedStudent.code); addToast('Kode dicopy', 'success') }} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"><FontAwesomeIcon icon={faLink} /></button>
                                            </div>
                                        </div>
                                        <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">PIN</label>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-black text-emerald-500 font-mono tracking-wider">{selectedStudent.pin}</span>
                                                <button onClick={() => { navigator.clipboard.writeText(selectedStudent.pin); addToast('PIN dicopy', 'success') }} className="text-[10px] text-[var(--color-text-muted)] hover:text-emerald-500"><FontAwesomeIcon icon={faLink} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main WA Action */}
                                    <button
                                        onClick={() => openWAForStudent(selectedStudent, buildWAMessage(selectedStudent, waTemplate))}
                                        className="h-10 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 px-4 w-full"
                                    >
                                        <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
                                        BAGIKAN KE WALI MURID
                                    </button>
                                </div>

                                {/* Tools Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/50">
                                    <button
                                        onClick={() => handleResetPin(selectedStudent)}
                                        disabled={resettingPin}
                                        className="h-9 px-3 rounded-lg border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={resettingPin ? faSpinner : faRotateLeft} className={resettingPin ? 'fa-spin' : ''} />
                                        Reset PIN Akses
                                    </button>

                                    <div className="flex gap-2 items-center">
                                        {/* Satu tombol dropdown: PDF / PNG / Thermal */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowExportMenu(v => !v)}
                                                disabled={generatingPdf}
                                                className="h-9 px-3 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {generatingPdf
                                                    ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Menyiapkan...</>
                                                    : <><FontAwesomeIcon icon={faDownload} /> Ekspor <FontAwesomeIcon icon={faChevronDown} className="text-[8px] opacity-70" /></>
                                                }
                                            </button>
                                            {showExportMenu && (
                                                <>
                                                    {/* Backdrop klik-luar tutup menu */}
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                                    <div className="absolute bottom-full mb-1.5 right-0 z-20 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 pt-2.5 pb-1">Pilih Format</p>
                                                        <button
                                                            onClick={() => { handlePrintSingle(selectedStudent); setShowExportMenu(false); }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors text-left"
                                                        >
                                                            <FontAwesomeIcon icon={faFileLines} className="w-5 text-center text-[11px] text-[var(--color-primary)]" /> Surat Akses PDF
                                                        </button>
                                                        <button
                                                            onClick={() => { handleSavePNG(selectedStudent); setShowExportMenu(false); }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-left"
                                                        >
                                                            <FontAwesomeIcon icon={faImage} className="w-5 text-center text-[11px] text-emerald-500" /> Simpan PNG
                                                        </button>
                                                        <button
                                                            onClick={() => { handlePrintThermal(selectedStudent); setShowExportMenu(false); }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-orange-500/10 hover:text-orange-600 transition-colors text-left mb-1"
                                                        >
                                                            <FontAwesomeIcon icon={faPrint} className="w-5 text-center text-[11px] text-orange-500" /> Struk Thermal 58mm
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
            {/* Modal Detail Profil Siswa - Premium Mini Dashboard */}
            {isProfileModalOpen && (
                <Modal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    title="Profil Siswa"
                    size="md"
                >
                    {selectedStudent && (
                        <div className="space-y-4 -mt-2">
                            {/* Header Section - Glassmorphism */}
                            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 shadow-xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)]/80 to-[var(--color-accent)] opacity-90"></div>
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>

                                <div className="relative p-4 flex items-center gap-5 text-white">
                                    {/* Avatar with Glow */}
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-110 opacity-50"></div>
                                        <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl font-black shadow-xl overflow-hidden relative z-10">
                                            {selectedStudent.photo_url ? (
                                                <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{selectedStudent.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        {/* Status Badge */}
                                        <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20 shadow-lg z-20 ${selectedStudent.status === 'aktif' ? 'bg-emerald-500' : 'bg-amber-500'
                                            }`}>
                                            {selectedStudent.status}
                                        </div>
                                    </div>

                                    {/* Name & Basic Info */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div>
                                            <h2 className="text-xl font-black font-heading leading-tight truncate">
                                                {selectedStudent.name}
                                            </h2>
                                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-1 opacity-90">
                                                <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                                                    {selectedStudent.className}
                                                </span>
                                                <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                                                    {selectedStudent.gender === 'L' ? 'PUTRA' : 'PUTRI'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Quick Stats in Header */}
                                        <div className="flex items-center gap-4 pt-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-[8px] font-black uppercase tracking-wider opacity-60">POIN</span>
                                                <span className="text-sm font-black tracking-tighter">{selectedStudent.points}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[8px] font-black uppercase tracking-wider opacity-60">STATUS</span>
                                                <span className="text-[10px] font-black uppercase">
                                                    {selectedStudent.points >= 0 ? 'AMAN' : 'RISIKO'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Information Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1 flex items-center gap-2">
                                        <span className="w-4 h-px bg-[var(--color-border)]"></span>
                                        Data Akademik
                                    </h3>
                                    <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
                                        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 hover:bg-[var(--color-surface-alt)]/50 transition-colors">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">ID REG</p>
                                            <p className="font-mono font-black text-[11px] text-[var(--color-primary)] whitespace-nowrap overflow-hidden">{selectedStudent.code}</p>
                                        </div>
                                        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 hover:bg-[var(--color-surface-alt)]/50 transition-colors">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">NISN</p>
                                            <p className="font-bold text-xs text-[var(--color-text)] whitespace-nowrap overflow-hidden">{selectedStudent.nisn || '---'}</p>
                                        </div>
                                    </div>

                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1 mt-4 flex items-center gap-2">
                                        <span className="w-4 h-px bg-[var(--color-border)]"></span>
                                        Kontak Wali
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 group">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">WHATSAPP</p>
                                                {selectedStudent.phone && (
                                                    <a href={`https://wa.me/${selectedStudent.phone.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer"
                                                        className="text-green-500 hover:text-green-600 flex items-center gap-1.5 text-[9px] font-black uppercase">
                                                        <FontAwesomeIcon icon={faWhatsapp} /> Chat
                                                    </a>
                                                )}
                                            </div>
                                            <p className="font-bold text-[var(--color-text)] text-xs tracking-wider">{selectedStudent.phone || 'Nomor tidak tersedia'}</p>
                                        </div>

                                        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">NAMA WALI</p>
                                            <p className="font-bold text-[var(--color-text)] text-xs">
                                                {selectedStudent.guardian_name || '---'}
                                                {selectedStudent.guardian_relation && (
                                                    <span className="text-[9px] ml-1.5 opacity-50 capitalize">({selectedStudent.guardian_relation})</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline/History Section */}
                                <div className="flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1 flex items-center gap-2">
                                            <span className="w-4 h-px bg-[var(--color-border)]"></span>
                                            Riwayat
                                        </h3>
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                            {behaviorHistory.length}
                                        </span>
                                    </div>

                                    <div className="flex-1 max-h-[220px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 p-3 scrollbar-none">
                                        {behaviorHistory.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-6">
                                                <p className="text-[10px] font-black uppercase tracking-widest">Kosong</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {behaviorHistory.map((item, idx) => (
                                                    <div key={item.id} className="relative pl-4 group">
                                                        {idx !== behaviorHistory.length - 1 && (
                                                            <div className="absolute left-[5px] top-3 w-px h-full bg-[var(--color-border)]"></div>
                                                        )}
                                                        <div className={`absolute left-0 top-1.5 w-[10px] h-[10px] rounded-full border border-[var(--color-surface)] z-10 ${item.type === 'prestasi' ? 'bg-emerald-500' : 'bg-red-500'
                                                            }`}></div>

                                                        <div className="bg-[var(--color-surface)] rounded-lg p-2 border border-[var(--color-border)] shadow-sm">
                                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                                <div className="text-xs font-black text-[var(--color-text)] line-clamp-1">{item.title || item.type || 'Laporan'}</div>
                                                                <div className={`text-xs font-black ${item.points >= 0 ? 'text-emerald-500' : 'text-red-500'
                                                                    }`}>
                                                                    {item.points > 0 ? '+' : ''}{item.points}
                                                                </div>
                                                            </div>
                                                            <div className="text-[9px] text-[var(--color-text-muted)] font-bold opacity-70">
                                                                {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                                <button
                                    onClick={() => {
                                        setStudentForTags(selectedStudent)
                                        setIsTagModalOpen(true)
                                    }}
                                    className="h-8 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                >
                                    <FontAwesomeIcon icon={faFilter} /> Label
                                </button>
                                <button
                                    onClick={() => {
                                        setIsProfileModalOpen(false)
                                        handleEdit(selectedStudent)
                                    }}
                                    className="h-8 px-3 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                >
                                    <FontAwesomeIcon icon={faEdit} /> Edit
                                </button>
                                <button
                                    onClick={() => setIsProfileModalOpen(false)}
                                    className="h-8 px-4 rounded-lg bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}



            {/* Bulk Promote Modal */}
            {isBulkModalOpen && (
                <Modal
                    isOpen={isBulkModalOpen}
                    onClose={() => setIsBulkModalOpen(false)}
                    title="Kenaikan Kelas Massal"
                    size="sm"
                >
                    <div className="space-y-6">
                        <div className="p-4 glass bg-[var(--color-primary)]/10 rounded-[1.5rem] border border-[var(--color-primary)]/20">
                            <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                Target Kenaikan
                            </p>
                            <p className="text-[11px] text-[var(--color-text)] leading-relaxed font-bold">
                                Anda akan memindahkan <span className="text-[var(--color-primary)] font-black text-[13px] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20">{selectedStudentIds.length} siswa</span> terpilih ke kelas tujuan.
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2 ml-1">Pilih Kelas Baru</label>
                            <select
                                value={bulkClassId}
                                onChange={(e) => setBulkClassId(e.target.value)}
                                className="select-field text-sm py-3 bg-[var(--color-surface-alt)] border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-[1rem] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]"
                            >
                                <option value="">Cari Kelas Tujuan</option>
                                {classesList.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black h-11 text-[10px] uppercase tracking-widest rounded-[1rem] transition-all">
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkPromote}
                                disabled={submitting}
                                className="btn btn-primary flex-1 font-black h-11 text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 rounded-[1rem] transition-all hover:scale-[1.02]"
                            >
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Proses'}
                            </button>
                        </div>
                    </div>
                </Modal >
            )}

            {/* Delete (Arsip) Modal */}
            {isDeleteModalOpen && (
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    title="Arsipkan Siswa?"
                >
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-500/10 rounded-[1.5rem] flex items-center gap-4 text-amber-600 border border-amber-500/20">
                            <div className="w-12 h-12 rounded-[1rem] bg-amber-500/20 flex items-center justify-center shrink-0 text-xl border border-amber-500/30">
                                <FontAwesomeIcon icon={faBoxArchive} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Pindahkan ke Arsip?</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Data dapat dipulihkan kapan saja dari menu Arsip.</p>
                            </div>
                        </div>

                        <div className="px-1">
                            <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                                <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{studentToDelete?.name}</span> akan dipindahkan ke arsip. Riwayat laporan & poin tetap tersimpan dan bisa dipulihkan.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                                BATAL
                            </button>
                            <button type="button" onClick={executeDelete} className="btn bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                                ARSIPKAN
                            </button>
                        </div>
                    </div>
                </Modal >
            )}
            {isBulkWAModalOpen && (
                <Modal
                    isOpen={isBulkWAModalOpen}
                    onClose={() => setIsBulkWAModalOpen(false)}
                    title="Kirim WA ke Wali Murid"
                    size="md"
                >
                    {(() => {
                        const targets = students.filter(s => selectedStudentIds.includes(s.id))
                        const withPhone = targets.filter(s => s.phone)
                        const noPhone = targets.filter(s => !s.phone)
                        return (
                            <div className="space-y-4">
                                <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-3">
                                    <FontAwesomeIcon icon={faWhatsapp} className="text-green-600 text-xl shrink-0" />
                                    <div>
                                        <p className="text-xs font-black text-green-700 dark:text-green-400">{withPhone.length} siswa siap dikirim</p>
                                        {noPhone.length > 0 && <p className="text-[10px] text-[var(--color-text-muted)]">{noPhone.length} siswa tidak punya nomor WA</p>}
                                    </div>
                                </div>

                                {/* Fitur 11 - Template WA customizable */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">
                                        Template Pesan <span className="normal-case font-normal opacity-60">({'{nama}'} {'{kelas}'} {'{poin}'} {'{kode}'} {'{pin}'})</span>
                                    </label>
                                    <textarea
                                        value={waTemplate}
                                        onChange={e => setWaTemplate(e.target.value)}
                                        rows={3}
                                        className="input-field w-full text-xs rounded-xl border-[var(--color-border)] bg-transparent resize-none p-3"
                                        placeholder="Template pesan WA..."
                                    />
                                    {withPhone.length > 0 && (
                                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 italic">
                                            Preview: {buildWAMessage(withPhone[0], waTemplate).slice(0, 80)}...
                                        </p>
                                    )}
                                </div>

                                <div className="max-h-40 overflow-auto space-y-1 border border-[var(--color-border)] rounded-xl p-3">
                                    {withPhone.map(s => (
                                        <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                                            <span className="font-bold text-[var(--color-text)]">{s.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[var(--color-text-muted)]">{s.phone}</span>
                                                <button
                                                    onClick={() => openWAForStudent(s, buildWAMessage(s, waTemplate))}
                                                    className="h-6 px-2 rounded-md bg-green-500/10 text-green-600 text-[10px] font-black hover:bg-green-500/20 transition"
                                                >
                                                    Kirim
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {noPhone.map(s => (
                                        <div key={s.id} className="flex items-center justify-between py-1 text-xs opacity-40">
                                            <span className="font-bold">{s.name}</span>
                                            <span className="text-[10px]">Tidak ada nomor</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => {
                                            withPhone.forEach((s, i) => {
                                                setTimeout(() => openWAForStudent(s, buildWAMessage(s, waTemplate)), i * 800)
                                            })
                                            addToast(`Membuka ${withPhone.length} chat WA...`, 'success')
                                        }}
                                        disabled={!withPhone.length}
                                        className="btn bg-green-500 hover:bg-green-600 text-white flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-40"
                                    >
                                        <FontAwesomeIcon icon={faBullhorn} className="mr-2" />
                                        Kirim Semua ({withPhone.length})
                                    </button>
                                    <button onClick={() => setIsBulkWAModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-10 px-5 text-[10px] font-black uppercase rounded-xl">
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        )
                    })()}
                </Modal>
            )}

            {/* Bulk Delete Modal */}
            {isBulkDeleteModalOpen && (
                <Modal
                    isOpen={isBulkDeleteModalOpen}
                    onClose={() => setIsBulkDeleteModalOpen(false)}
                    title="Hapus Siswa Terpilih?"
                    size="sm"
                >
                    <div className="space-y-6">
                        <div className="p-4 bg-red-500/10 rounded-[1.5rem] flex items-center gap-4 text-red-500 border border-red-500/20">
                            <div className="w-12 h-12 rounded-[1rem] bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30">
                                <FontAwesomeIcon icon={faTrash} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Hapus {selectedStudentIds.length} Siswa?</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Riwayat laporan & poin terhapus permanen.</p>
                            </div>
                        </div>
                        <div className="px-1">
                            <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                                Tindakan ini akan menghapus <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedStudentIds.length} siswa</span> beserta seluruh riwayat perilaku mereka. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setIsBulkDeleteModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                                BATAL
                            </button>
                            <button type="button" onClick={handleBulkDelete} disabled={submitting} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS PERMANEN'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
            {/* Modal Arsip Siswa */}
            {/* Modal Arsip */}
            {isArchivedModalOpen && (
                <Modal
                    isOpen={isArchivedModalOpen}
                    onClose={() => setIsArchivedModalOpen(false)}
                    title="Arsip Siswa"
                    size="xl"
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3">
                            <FontAwesomeIcon icon={faBoxArchive} className="text-amber-600 text-lg shrink-0" />
                            <div>
                                <p className="text-xs font-black text-amber-700 dark:text-amber-400">{archivedStudents.length} siswa di arsip</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">Pulihkan untuk mengembalikan ke daftar aktif, atau hapus permanen.</p>
                            </div>
                        </div>

                        {loadingArchived ? (
                            <div className="text-center py-8 text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" /> Memuat arsip...
                            </div>
                        ) : archivedStudents.length === 0 ? (
                            <div className="text-center py-10 text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faBoxArchive} className="text-3xl opacity-20 mb-2 block" />
                                <p className="text-sm font-bold">Arsip kosong</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                <th className="px-4 py-3">Siswa</th>
                                                <th className="px-4 py-3 text-center">Kelas</th>
                                                <th className="px-4 py-3 text-center">Diarsipkan</th>
                                                <th className="px-4 py-3 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {archivedStudents.slice((archivePage - 1) * archivePageSize, archivePage * archivePageSize).map(s => (
                                                <tr key={s.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40">
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-[var(--color-text)]">{s.name}</p>
                                                        <p className="text-[10px] font-mono text-[var(--color-text-muted)]">{s.registration_code}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20">{s.className}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-[11px] text-[var(--color-text-muted)]">
                                                        {formatRelativeDate(s.deleted_at)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleRestoreStudent(s)}
                                                                className="h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                                                            >
                                                                <FontAwesomeIcon icon={faRotateLeft} />
                                                                Pulihkan
                                                            </button>
                                                            <button
                                                                onClick={() => handlePermanentDelete(s)}
                                                                className="h-8 px-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Arsip */}
                                {archivedStudents.length > archivePageSize && (
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                            Halaman {archivePage} dari {Math.ceil(archivedStudents.length / archivePageSize)}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={archivePage === 1}
                                                onClick={() => setArchivePage(p => p - 1)}
                                                className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
                                            >
                                                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                            </button>
                                            <button
                                                disabled={archivePage >= Math.ceil(archivedStudents.length / archivePageSize)}
                                                onClick={() => setArchivePage(p => p + 1)}
                                                className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
                                            >
                                                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button onClick={() => setIsArchivedModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                Tutup
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal Riwayat Kelas */}
            {isClassHistoryModalOpen && (
                <Modal
                    isOpen={isClassHistoryModalOpen}
                    onClose={() => setIsClassHistoryModalOpen(false)}
                    title={`Riwayat Kelas — ${selectedStudent?.name || ''}`}
                    size="md"
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center gap-3">
                            <FontAwesomeIcon icon={faClockRotateLeft} className="text-purple-500 text-lg shrink-0" />
                            <div>
                                <p className="text-xs font-black text-purple-600 dark:text-purple-400">Tracking perpindahan kelas</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">Tercatat setiap kali siswa berpindah kelas.</p>
                            </div>
                        </div>

                        {loadingClassHistory ? (
                            <div className="text-center py-6 text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" /> Memuat...
                            </div>
                        ) : classHistory.length === 0 ? (
                            <div className="text-center py-8 text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-3xl opacity-20 mb-2 block" />
                                <p className="text-sm font-bold">Belum ada riwayat perpindahan kelas</p>
                                <p className="text-[11px] mt-1 opacity-60">Siswa ini belum pernah berpindah kelas sejak terdaftar.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-auto">
                                {classHistory.map((h, idx) => (
                                    <div key={h.id || idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[11px]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs font-bold">
                                                <span className="text-[var(--color-text-muted)]">{h.from_class?.name || 'Tidak diketahui'}</span>
                                                <span className="text-[var(--color-text-muted)] opacity-50">→</span>
                                                <span className="text-[var(--color-text)]">{h.to_class?.name || 'Tidak diketahui'}</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{h.note || '-'} · {formatRelativeDate(h.changed_at)}</p>
                                        </div>
                                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{new Date(h.changed_at).toLocaleDateString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button onClick={() => setIsClassHistoryModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                Tutup
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Fitur 1 - Class Breakdown Modal */}
            {isClassBreakdownOpen && (
                <Modal
                    isOpen={isClassBreakdownOpen}
                    onClose={() => setIsClassBreakdownOpen(false)}
                    title={`Statistik Kelas — ${classBreakdownData?.className || ''}`}
                    size="md"
                >
                    {loadingBreakdown ? (
                        <div className="text-center py-10 text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl mb-2 block" />
                            <p className="text-sm">Memuat statistik...</p>
                        </div>
                    ) : classBreakdownData && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Siswa', value: classBreakdownData.total, color: 'text-[var(--color-primary)]' },
                                    { label: 'Putra', value: classBreakdownData.boys, color: 'text-blue-500' },
                                    { label: 'Putri', value: classBreakdownData.girls, color: 'text-pink-500' },
                                    { label: 'Rata-rata Poin', value: classBreakdownData.avgPoints, color: classBreakdownData.avgPoints >= 0 ? 'text-emerald-500' : 'text-red-500' },
                                ].map(item => (
                                    <div key={item.label} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-center">
                                        <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">{item.label}</p>
                                        <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">Siswa Risiko (≤ {RiskThreshold})</p>
                                    <p className="text-lg font-black text-red-500">{classBreakdownData.riskCount} siswa</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">🏆 Top 3 Poin Tertinggi</p>
                                <div className="space-y-2">
                                    {classBreakdownData.topStudents.map((s, idx) => (
                                        <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-yellow-400/20 text-yellow-600' :
                                                idx === 1 ? 'bg-gray-400/20 text-gray-500' :
                                                    'bg-orange-400/20 text-orange-600'
                                                }`}>#{idx + 1}</span>
                                            <span className="flex-1 text-sm font-bold text-[var(--color-text)] truncate">{s.name}</span>
                                            <span className={`text-sm font-black ${s.total_points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{s.total_points}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button onClick={() => { setIsClassBreakdownOpen(false); setFilterClass(''); const cls = classesList.find(c => c.name === classBreakdownData.className); if (cls) setFilterClass(cls.id) }}
                                    className="btn bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--color-primary)]/20 transition">
                                    Filter Kelas Ini
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}


            {/* Fitur 2 - Batch Reset Poin Modal */}
            {isResetPointsModalOpen && (
                <Modal
                    isOpen={isResetPointsModalOpen}
                    onClose={() => setIsResetPointsModalOpen(false)}
                    title="Reset Poin Semester Baru"
                    size="sm"
                >
                    <div className="space-y-5">
                        <div className="p-4 bg-orange-500/10 rounded-[1.5rem] border border-orange-500/20">
                            <FontAwesomeIcon icon={faRotateLeft} className="text-orange-500 text-2xl mb-2" />
                            <p className="text-sm font-bold text-[var(--color-text)]">Set semua poin ke 0 untuk semester/tahun ajaran baru.</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Pilih Kelas (kosongkan untuk semua kelas)</label>
                            <select
                                value={resetPointsClassId}
                                onChange={e => setResetPointsClassId(e.target.value)}
                                className="select-field text-sm py-2.5 w-full rounded-xl border-[var(--color-border)] bg-transparent font-bold"
                            >
                                <option value="">Semua Kelas</option>
                                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-[11px] text-red-600 font-bold">
                            ⚠ Tindakan ini tidak bisa dibatalkan. Semua poin akan direset ke 0.
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsResetPointsModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl">Batal</button>
                            <button onClick={handleBatchResetPoints} disabled={resettingPoints}
                                className="btn bg-orange-500 hover:bg-orange-600 text-white flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
                                {resettingPoints ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Reset Poin'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Fitur 7 - Tag Modal */}
            {isTagModalOpen && (
                <Modal
                    isOpen={isTagModalOpen}
                    onClose={() => setIsTagModalOpen(false)}
                    title={`Kelola Label — ${studentForTags?.name || ''}`}
                    size="sm"
                >
                    {studentForTags && (
                        <div className="space-y-4">
                            <p className="text-xs text-[var(--color-text-muted)]">Pilih label/tag untuk siswa ini. Bisa dipilih lebih dari satu.</p>
                            <div className="flex flex-wrap gap-2">
                                {AvailableTags.map(tag => {
                                    const active = (studentForTags.tags || []).includes(tag)
                                    return (
                                        <button key={tag} onClick={() => handleToggleTag(studentForTags, tag)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${active
                                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-600 dark:text-violet-400'
                                                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                                }`}>
                                            {active ? '✓ ' : ''}{tag}
                                        </button>
                                    )
                                })}
                            </div>
                            {(studentForTags.tags || []).length > 0 && (
                                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Label Aktif</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(studentForTags.tags || []).map(t => (
                                            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-600 font-bold">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end">
                                <button onClick={() => setIsTagModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">Tutup</button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {/* Fitur 12 - Google Sheets Import Modal */}
            {isGSheetsModalOpen && (
                <Modal
                    isOpen={isGSheetsModalOpen}
                    onClose={() => setIsGSheetsModalOpen(false)}
                    title="Import dari Google Sheets"
                    size="sm"
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                            Pastikan Google Sheets bersifat <b>publik</b> (Anyone with link can view).
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">URL Google Sheets</label>
                            <input
                                type="url"
                                value={gSheetsUrl}
                                onChange={e => setGSheetsUrl(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                className="input-field text-sm py-2.5 w-full rounded-xl border-[var(--color-border)] bg-transparent"
                            />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Header kolom: <b>name/nama</b>, <b>gender/jk</b>, <b>phone</b>, <b>class_name/kelas</b></p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsGSheetsModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl">Batal</button>
                            <button onClick={handleFetchGSheets} disabled={fetchingGSheets}
                                className="btn bg-emerald-500 hover:bg-emerald-600 text-white flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                {fetchingGSheets ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faLink} />}
                                Ambil Data
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Fitur 13 - Photo Zoom Overlay */}
            {
                photoZoom && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-pointer backdrop-blur-sm"
                        onClick={() => setPhotoZoom(null)}
                    >
                        <div className="text-center" onClick={e => e.stopPropagation()}>
                            <img
                                src={photoZoom.url}
                                alt={photoZoom.name}
                                className="max-w-[320px] max-h-[320px] w-auto h-auto rounded-2xl object-cover shadow-2xl ring-4 ring-white/10"
                            />
                            <p className="text-white font-black mt-3 text-sm drop-shadow">{photoZoom.name}</p>
                            <button onClick={() => setPhotoZoom(null)}
                                className="mt-3 h-8 px-4 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition">
                                Tutup
                            </button>
                        </div>
                    </div>
                )
            }

            {/* CSS Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Reset everything */
                    body > *:not(#portal-root) { 
                        position: absolute !important;
                        left: -9999px !important;
                        visibility: hidden !important;
                    }
                    #portal-root { 
                        display: block !important; 
                        position: static !important; 
                        visibility: visible !important;
                    }
                    
                    /* Background Colors */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Portal Content Positioning */
                    .modal-overlay {
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        width: 100vw !important; height: 100vh !important;
                        background: white !important;
                        display: block !important;
                        visibility: visible !important;
                        z-index: 9999999 !important;
                        padding: 0 !important; margin: 0 !important;
                        backdrop-filter: none !important;
                    }

                    .modal-content {
                        position: relative !important;
                        top: 0 !important; left: 0 !important;
                        width: 100% !important; max-width: none !important;
                        height: auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 20mm 0 !important; margin: 0 !important;
                        display: block !important;
                        visibility: visible !important;
                        background: white !important;
                    }

                    /* Hide Non-Card Elements */
                    .modal-content > div:first-child,
                    .no-print, 
                    button {
                        display: none !important;
                        visibility: hidden !important;
                    }

                    /* Card Container for Print */
                    #printable-cards {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 15mm !important;
                        justify-content: center !important;
                        align-items: center !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        transform: none !important;
                        scale: 1 !important;
                        margin: 0 auto !important;
                    }
                    
                    #printable-cards * {
                        visibility: visible !important;
                    }

                    /* Layout Setup */
                    @page {
                        size: landscape;
                        margin: 0;
                    }
                }
            `}} />
        </DashboardLayout>
    )
}