import React, { useState, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faXmark, faSpinner, faCheckCircle, faChevronDown, faSchool, faBuilding, faBed, faMars, faVenus
} from '@fortawesome/free-solid-svg-icons'

const ClassFormModal = memo(function ClassFormModal({
    isOpen,
    onClose,
    selectedItem,
    teachersList,
    academicYearsList,
    onSubmit,
    submitting
}) {
    const LEVELS = ['7', '8', '9', '10', '11', '12']
    const PROGRAMS = ['Boarding', 'Reguler']
    const GENDERS = ['Putra', 'Putri']

    const INIT = {
        name: '',
        level: '7',
        program: 'Boarding',
        gender_type: 'Putra',
        homeroom_teacher_id: '',
        academic_year_id: academicYearsList[0]?.id || ''
    }

    const [form, setForm] = useState(INIT)

    useEffect(() => {
        if (!isOpen) return
        if (selectedItem) {
            // Validasi homeroom_teacher_id — jika tidak ada di teachersList, reset ke ''
            const teacherIds = teachersList.map(t => t.id)
            const validTeacherId = teacherIds.includes(selectedItem.homeroom_teacher_id)
                ? selectedItem.homeroom_teacher_id
                : ''
            setForm({
                name: selectedItem.name || '',
                level: selectedItem.grade || '7',
                program: selectedItem.major?.includes('Reguler') ? 'Reguler' : 'Boarding',
                gender_type: selectedItem.major?.includes('Putri') ? 'Putri' : 'Putra',
                homeroom_teacher_id: validTeacherId,
                academic_year_id: selectedItem.academic_year_id || academicYearsList[0]?.id || ''
            })
        } else {
            setForm({ ...INIT, academic_year_id: academicYearsList[0]?.id || '' })
        }
    }, [isOpen, selectedItem, academicYearsList, teachersList])

    const handleSubmit = (e) => {
        e.preventDefault()
        // Pastikan string kosong dikonversi ke null — UUID FK tidak boleh empty string
        const sanitized = {
            ...form,
            homeroom_teacher_id: form.homeroom_teacher_id || null,
            academic_year_id: form.academic_year_id || null,
        }
        onSubmit(sanitized)
    }

    const setField = (key, val) => setForm(p => ({ ...p, [key]: val }))

    if (!isOpen) return null
    const hasTeachers = (teachersList?.length || 0) > 0

    const node = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[8px] transition-all animate-in fade-in duration-500"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-lg bg-[var(--color-surface)] rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface-alt)]/50 to-transparent">
                    <div className="flex items-center justify-between mb-0.5">
                        <h2 className="font-black text-xl text-[var(--color-text)] tracking-tight">
                            {selectedItem ? 'Edit Kelas' : 'Kelas Baru'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 group"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-lg group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-60">
                            {selectedItem ? 'Pembaruan data unit kelas' : 'Pendaftaran unit kelas baru dalam sistem'}
                        </p>
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] opacity-40">•</span>
                        <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-60">
                            Isi identitas kelas dan wali kelas
                        </p>
                    </div>
                    {selectedItem && (
                        <div className="mt-3">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]">
                                Mengubah: <span className="text-[var(--color-text)]">{selectedItem.name}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                    <div className="p-6 pt-5 overflow-y-auto scrollbar-none flex-1 min-h-0">
                        <div className="space-y-6">
                            {/* Section: Identitas Kelas */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)] opacity-70">
                                        Identitas Kelas
                                    </p>
                                    <div className="flex items-center gap-2 text-[9px] font-black text-[var(--color-text-muted)] opacity-60">
                                        <FontAwesomeIcon icon={faSchool} className="opacity-40" />
                                        Langkah 1/1
                                    </div>
                                </div>

                                <div className="relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Nama Kelas</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.name}
                                        onChange={e => setField('name', e.target.value)}
                                        placeholder="e.g. 7A, 10 MIPA 1"
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold placeholder:opacity-30"
                                        autoFocus
                                    />
                                    <p className="mt-1.5 ml-1 text-[10px] font-bold text-[var(--color-text-muted)] opacity-60">
                                        Gunakan format singkat dan konsisten (contoh: 7A, 10 MIPA 1).
                                    </p>
                                </div>

                                {/* Tingkat & Program */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Tingkat / Grade</label>
                                        <div className="relative">
                                            <select
                                                value={form.level}
                                                onChange={e => setField('level', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold appearance-none cursor-pointer pr-10"
                                            >
                                                {LEVELS.map(l => <option key={l} value={l}>Kelas {l}</option>)}
                                            </select>
                                            <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] opacity-30 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Program</label>
                                        <div className="flex p-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl">
                                            {PROGRAMS.map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setField('program', p)}
                                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 inline-flex items-center justify-center gap-2 ${form.program === p
                                                        ? 'bg-white dark:bg-[var(--color-surface)] shadow text-[var(--color-primary)]'
                                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                                >
                                                    <FontAwesomeIcon icon={p === 'Boarding' ? faBed : faBuilding} className="text-[10px] opacity-70" />
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Gender Segment */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Segmen Gender</label>
                                    <div className="flex p-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl">
                                        {GENDERS.map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setField('gender_type', g)}
                                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${form.gender_type === g
                                                    ? (g === 'Putra' ? 'bg-blue-500 text-white shadow' : 'bg-pink-500 text-white shadow')
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                            >
                                                <FontAwesomeIcon icon={g === 'Putra' ? faMars : faVenus} className="text-[10px]" />
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-dashed border-[var(--color-border)]" />

                            {/* Section: Penanggung Jawab & Periode */}
                            <div className="space-y-4">
                                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)] opacity-70">
                                    Penanggung Jawab & Periode
                                </p>

                                {/* Wali Kelas */}
                                <div className="relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Wali Kelas (Homeroom Teacher)</label>
                                    <div className="relative">
                                        <select
                                            value={form.homeroom_teacher_id || ''}
                                            onChange={e => setField('homeroom_teacher_id', e.target.value)}
                                            disabled={!hasTeachers}
                                            className={`w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold appearance-none cursor-pointer pr-10 ${!hasTeachers ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            <option value="">{hasTeachers ? '— Tanpa Wali Kelas —' : 'Tidak ada data guru'}</option>
                                            {teachersList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] opacity-30 pointer-events-none" />
                                    </div>
                                    {!hasTeachers && (
                                        <p className="mt-1.5 ml-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/20">!</span>
                                            Tidak ada data guru. Tambahkan guru dulu di menu Master → Guru.
                                        </p>
                                    )}
                                </div>

                                {/* Tahun Akademik */}
                                <div className="relative">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1.5 ml-1 opacity-60">Tahun Akademik</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={form.academic_year_id}
                                            onChange={e => setField('academic_year_id', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold appearance-none cursor-pointer pr-10"
                                        >
                                            {academicYearsList.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                                        </select>
                                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] opacity-30 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions (non-overlay) */}
                        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
                            <div className="flex items-center justify-end gap-3">
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
                                        <FontAwesomeIcon icon={selectedItem ? faCheckCircle : faPlus} className="opacity-60" />
                                    )}
                                    {selectedItem ? 'SIMPAN PERUBAHAN' : 'BUAT KELAS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )

    return createPortal(node, document.body)
})

export default ClassFormModal