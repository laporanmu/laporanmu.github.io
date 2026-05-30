import React, { useState, useEffect, useMemo, useRef, memo } from 'react'
import {
    Plus, Search, Loader2, ArrowUp, ArrowDown, AlertTriangle,
    ChevronRight, ArrowRight, ArrowLeft, RotateCcw, Edit2, Clock
} from 'lucide-react'
import Modal from '../ui/Modal'
import RichSelect from '../ui/RichSelect'
import RichDatePicker from '../ui/RichDatePicker'
import RichTimePicker from '../ui/RichTimePicker'
import { faBook } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '../../context/ToastContext'

const BehaviorFormModal = memo(function BehaviorFormModal({
    isOpen,
    onClose,
    selectedItem,
    students = [],
    violationTypes = [],
    classesList = [],
    onSubmit,
    submitting = false
}) {
    const { addToast } = useToast()
    const [currentStep, setCurrentStep] = useState(1)
    const [modalSearch, setModalSearch] = useState('')
    const [modalClassFilter, setModalClassFilter] = useState('')
    // Timezone-aware local ISO converter helper
    const toLocalDatetimeString = (dateOrIso) => {
        const d = dateOrIso ? new Date(dateOrIso) : new Date()
        const tzOffset = d.getTimezoneOffset() * 60000
        return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16)
    }

    const [formData, setFormData] = useState({ student_id: '', violation_type_id: '', notes: '', reported_at: toLocalDatetimeString() })
    const [formErrors, setFormErrors] = useState({})
    const [hasDraft, setHasDraft] = useState(false)
    const [recentStudentIds, setRecentStudentIds] = useState([])
    const searchInputRef = useRef(null)

    // Highlight search match helper
    const highlightText = (text, search) => {
        if (!search) return text
        const parts = text.split(new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'))
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === search.toLowerCase() ? (
                        <span key={i} className="bg-yellow-100 text-amber-950 px-0.5 rounded font-black">{part}</span>
                    ) : (
                        part
                    )
                )}
            </>
        )
    }

    const DRAFT_KEY = selectedItem ? `behavior_draft_edit_${selectedItem.id}` : 'behavior_draft_new'

    // Load Draft suggestion when modal is opened
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(DRAFT_KEY)
            if (saved && !selectedItem) {
                setHasDraft(true)
            }
        }
    }, [isOpen, DRAFT_KEY, selectedItem])

    // Auto-Save Draft (Debounced 500ms)
    useEffect(() => {
        if (!isOpen || submitting || selectedItem) return
        // Only save if student is chosen or notes is typed
        if (!formData.student_id && !formData.notes) return

        const timer = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
            } catch (e) {
                console.error('Failed to save draft', e)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [formData, isOpen, submitting, DRAFT_KEY, selectedItem])

    const loadDraft = () => {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) {
            try {
                const savedForm = JSON.parse(saved)
                setFormData(savedForm)
                setHasDraft(false)
                if (savedForm.student_id) {
                    setCurrentStep(2)
                }
                if (addToast) addToast('Draft berhasil dimuat', 'success')
            } catch (e) {
                console.error('Failed to parse draft', e)
            }
        }
    }

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY)
        setHasDraft(false)
    }

    // Load Recent Students on modal open
    useEffect(() => {
        if (isOpen) {
            try {
                const key = 'recent_reported_student_ids'
                const saved = localStorage.getItem(key)
                if (saved) {
                    setRecentStudentIds(JSON.parse(saved))
                }
            } catch (e) {
                console.error('Failed to load recent students', e)
            }
        }
    }, [isOpen])

    // Reset / Populate form
    useEffect(() => {
        if (!isOpen) return
        if (selectedItem) {
            setFormData({
                student_id: selectedItem.student_id || '',
                violation_type_id: selectedItem.violation_type_id || '',
                notes: selectedItem.notes || '',
                reported_at: toLocalDatetimeString(selectedItem.reported_at)
            })
            setFormErrors({})
            setCurrentStep(2)
        } else {
            setFormData({ student_id: '', violation_type_id: '', notes: '', reported_at: toLocalDatetimeString() })
            setFormErrors({})
            setCurrentStep(1)
            setModalSearch('')
            setModalClassFilter('')
        }
        setHasDraft(false)
    }, [isOpen, selectedItem])

    // Autofocus search input in step 1
    useEffect(() => {
        if (isOpen && currentStep === 1) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen, currentStep])

    // Filter students
    const filteredStudentsForModal = useMemo(() => {
        let list = students
        if (modalClassFilter) list = list.filter(s => s.class_name === modalClassFilter)
        if (modalSearch) list = list.filter(s => s.name.toLowerCase().includes(modalSearch.toLowerCase()))
        return list
    }, [students, modalClassFilter, modalSearch])

    // Limit displayed students initially to prevent DOM thrashing and lag on open
    const displayedStudents = useMemo(() => {
        if (modalSearch || modalClassFilter) return filteredStudentsForModal
        return filteredStudentsForModal.slice(0, 25)
    }, [filteredStudentsForModal, modalSearch, modalClassFilter])

    // Filter and map recent students
    const recentStudents = useMemo(() => {
        if (!recentStudentIds || recentStudentIds.length === 0) return []
        return recentStudentIds
            .map(id => students.find(s => s.id === id))
            .filter(Boolean)
            .slice(0, 4) // Limit to 4 chips
    }, [recentStudentIds, students])

    // Category separation for violationTypes
    const positiveTypes = useMemo(() => violationTypes.filter(vt => vt.points > 0), [violationTypes])
    const negativeTypes = useMemo(() => violationTypes.filter(vt => vt.points < 0), [violationTypes])

    const selectedVT = useMemo(() => {
        return violationTypes.find(vt => vt.id === formData.violation_type_id)
    }, [violationTypes, formData.violation_type_id])

    const selectOptions = useMemo(() => {
        return violationTypes.map(vt => {
            const isNegative = vt.points < 0
            const ptsText = `[Poin ${isNegative ? '' : '+'}${vt.points}]`
            return {
                id: vt.id,
                name: `${isNegative ? '🔴' : '🟢'} ${ptsText} ${vt.name}`,
                group: isNegative ? 'Pelanggaran' : 'Prestasi',
                render: (
                    <span className="flex items-center gap-1.5 font-bold">
                        {isNegative ? (
                            <ArrowDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className={isNegative ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-emerald-600 dark:text-emerald-400 font-black'}>
                            {ptsText}
                        </span>
                        <span className="text-[var(--color-text)] font-semibold truncate">{vt.name}</span>
                    </span>
                )
            }
        })
    }, [violationTypes])

    const classOptions = useMemo(() => {
        return classesList.map(c => ({ id: c, name: c }))
    }, [classesList])

    const nextStep = (studentId = null) => {
        const activeStudentId = studentId || formData.student_id
        if (!activeStudentId) return

        if (studentId) {
            setFormData(prev => ({ ...prev, student_id: studentId }))
        }
        setFormErrors(prev => ({ ...prev, student_id: '' }))
        setCurrentStep(2)
    }

    const prevStep = () => {
        if (selectedItem) return
        setCurrentStep(1)
    }

    const handleSubmit = (e) => {
        if (e) e.preventDefault()
        const errors = {}
        if (!formData.student_id) errors.student_id = 'Siswa wajib dipilih'
        if (!formData.violation_type_id) errors.violation_type_id = 'Jenis laporan wajib dipilih'

        if (Object.keys(errors).length) {
            setFormErrors(errors)
            return
        }
        setFormErrors({})

        // Save to recent reported students
        try {
            const key = 'recent_reported_student_ids'
            const saved = localStorage.getItem(key)
            const list = saved ? JSON.parse(saved) : []
            const updated = [formData.student_id, ...list.filter(id => id !== formData.student_id)].slice(0, 5)
            localStorage.setItem(key, JSON.stringify(updated))
        } catch (e) {
            console.error('Failed to save recent student', e)
        }

        onSubmit(formData)
        clearDraft()
    }

    const progress = selectedItem ? 100 : (currentStep === 1 ? 50 : 100)

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedItem ? 'Edit Laporan' : 'Tambah Laporan Baru'}
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
            icon={selectedItem ? Edit2 : Plus}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="md"
            mobileVariant="bottom-sheet"
            contentClassName="!overflow-y-hidden"
            footer={
                <div className="flex items-center justify-between w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Batal
                    </button>

                    <div className="flex-1" />

                    {currentStep === 1 ? (
                        <button
                            type="button"
                            onClick={() => nextStep()}
                            disabled={!formData.student_id}
                            className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            <span>Lanjut</span>
                            <ArrowRight className="w-3.5 h-3.5 text-white" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting || !formData.violation_type_id}
                            className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    {selectedItem ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    <span>{selectedItem ? 'Simpan Perubahan' : 'Simpan Laporan'}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4 py-1">
                {/* Draft Banner */}
                {hasDraft && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <RotateCcw className="text-amber-500 w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold text-amber-700">Ada draft data yang belum selesai</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={clearDraft}
                                className="text-[9px] font-black uppercase text-amber-600/50 hover:text-amber-600 transition-colors"
                            >
                                Hapus
                            </button>
                            <button
                                onClick={loadDraft}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm hover:bg-amber-600 transition-all active:scale-95"
                            >
                                Lanjutkan
                            </button>
                        </div>
                    </div>
                )}



                {currentStep === 1 ? (
                    <div className="space-y-2.5 animate-in fade-in">
                        <div className="grid grid-cols-[130px_1fr] gap-2">
                            <div>
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1.5">
                                    Kelas
                                </label>
                                <RichSelect
                                    value={modalClassFilter}
                                    onChange={setModalClassFilter}
                                    options={classOptions}
                                    placeholder="Semua"
                                    extraOption={{ id: '', name: 'Semua' }}
                                    small={true}
                                    buttonClassName="!h-10 sm:!h-10 rounded-xl px-3.5"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1.5">
                                    Cari Nama
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-3.5 h-3.5 pointer-events-none" />
                                    <input
                                        type="text"
                                        ref={searchInputRef}
                                        value={modalSearch}
                                        onChange={e => setModalSearch(e.target.value)}
                                        placeholder="Nama siswa..."
                                        className="input-field w-full h-10 pl-9 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold focus:border-[var(--color-primary)] transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {recentStudents.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest opacity-80">
                                    <Clock className="w-3 h-3 text-[var(--color-primary)]" />
                                    <span>Baru Dilaporkan</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {recentStudents.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => nextStep(s.id)}
                                            className="h-7 px-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-95 text-[10px] font-extrabold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <div className="w-4 h-4 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black text-[8px] leading-none">
                                                {s.name[0].toUpperCase()}
                                            </div>
                                            <span>{s.name.split(' ').slice(0, 2).join(' ')}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border border-[var(--color-border)]/80 rounded-[1.25rem] p-2 bg-[var(--color-surface-alt)]/35">
                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-1.5 space-y-1">
                                {filteredStudentsForModal.length === 0 ? (
                                    <div className="py-10 text-center opacity-40">
                                        <Search className="w-5 h-5 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                            {students.length === 0 ? 'Memuat data...' : 'Tidak ditemukan'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {displayedStudents.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => nextStep(s.id)}
                                                className={`w-full px-3 py-2 rounded-xl border transition-all text-left flex items-center justify-between group active:scale-[0.99] ${formData.student_id === s.id
                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                    : 'bg-[var(--color-surface)] border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${formData.student_id === s.id
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                                                            }`}
                                                    >
                                                        {s.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black leading-tight">
                                                            {highlightText(s.name, modalSearch)}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {s.class_name && (
                                                                <span className={`text-[9px] font-extrabold uppercase tracking-wider ${formData.student_id === s.id
                                                                    ? 'text-white/80'
                                                                    : 'text-[var(--color-text-muted)] opacity-60'
                                                                    }`}>
                                                                    {s.class_name}
                                                                </span>
                                                            )}
                                                            <span className={`text-[9px] font-black ${formData.student_id === s.id
                                                                ? 'text-white/90'
                                                                : (s.total_points ?? 0) >= 100
                                                                    ? 'text-emerald-500'
                                                                    : (s.total_points ?? 0) < 100
                                                                        ? 'text-rose-500'
                                                                        : 'text-[var(--color-primary)]'
                                                                }`}>
                                                                • {(s.total_points ?? 0)} Poin
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight
                                                    className={`w-3.5 h-3.5 ${formData.student_id === s.id ? 'text-white' : 'text-[var(--color-text-muted)]'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                        {filteredStudentsForModal.length > displayedStudents.length && (
                                            <div className="py-2 text-center text-[9px] font-bold text-[var(--color-text-muted)] opacity-50 bg-[var(--color-surface)] rounded-xl border border-dashed border-[var(--color-border)]/60 my-1 mx-1">
                                                Menampilkan 25 dari {filteredStudentsForModal.length} santri. Gunakan pencarian untuk mencari santri lainnya.
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="p-3 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black flex-shrink-0">
                                {(students.find(s => s.id === formData.student_id)?.name || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest leading-none mb-0.5">
                                    Penerima Laporan
                                </p>
                                <p className="text-sm font-black text-[var(--color-text)] truncate">
                                    {students.find(s => s.id === formData.student_id)?.name}
                                </p>
                                {students.find(s => s.id === formData.student_id)?.class_name && (
                                    <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide opacity-80">
                                        {students.find(s => s.id === formData.student_id)?.class_name}
                                    </p>
                                )}
                            </div>
                            {!selectedItem && (
                                <button
                                    onClick={prevStep}
                                    className="w-8 h-8 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all flex-shrink-0"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block">
                                Jenis Perilaku / Laporan
                            </label>
                            <RichSelect
                                value={formData.violation_type_id}
                                onChange={val => {
                                    setFormData({ ...formData, violation_type_id: val })
                                    setFormErrors(p => ({ ...p, violation_type_id: '' }))
                                }}
                                options={selectOptions}
                                placeholder="Pilih kategori perilaku..."
                                icon={faBook}
                                searchable={true}
                                status={formErrors.violation_type_id ? 'error' : 'normal'}
                            />
                            {formErrors.violation_type_id && (
                                <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {formErrors.violation_type_id}
                                </p>
                            )}
                        </div>

                        {/* Waktu Kejadian Section */}
                        <div className="space-y-1.5 border-t border-[var(--color-border)]/50 pt-3 mt-1 animate-in fade-in duration-200">
                            <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1">
                                Tanggal & Waktu Kejadian
                            </label>
                            <div className="grid grid-cols-[1fr_150px] gap-2">
                                <RichDatePicker
                                    value={formData.reported_at.slice(0, 10)}
                                    clearable={false}
                                    onChange={(newDateVal) => {
                                        if (newDateVal) {
                                            const timePart = formData.reported_at.slice(11, 16) || '12:00'
                                            setFormData(prev => ({ ...prev, reported_at: `${newDateVal}T${timePart}` }))
                                        }
                                    }}
                                />
                                <RichTimePicker
                                    value={formData.reported_at.slice(11, 16)}
                                    onChange={(newTimeVal) => {
                                        if (newTimeVal) {
                                            const datePart = formData.reported_at.slice(0, 10) || toLocalDatetimeString().slice(0, 10)
                                            setFormData(prev => ({ ...prev, reported_at: `${datePart}T${newTimeVal}` }))
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block">
                                Catatan <span className="normal-case font-medium opacity-50">(opsional)</span>
                            </label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Detail kronologi jika diperlukan..."
                                className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-3 text-sm font-medium text-[var(--color-text)] outline-none min-h-[72px] focus:ring-2 ring-[var(--color-primary)]/20 transition-all resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
})

export default BehaviorFormModal
