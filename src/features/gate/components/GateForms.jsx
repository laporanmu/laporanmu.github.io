import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Calendar, Clock, Search, X, Check, Tag, LogOut, LogIn, Keyboard, Building2, Car, Plus, IdCard, Loader2
} from 'lucide-react'
import { useLanguage } from '@context'
import {
  PAGE_T, getVisitorTypes, presetTranslations,
  PRESETS_GURU, PRESETS_KARYAWAN, PRESETS_SANTRI, PRESETS_TAMU
} from '@features/gate/utils/gateConstants'
import { PresetPills } from './GateModals'
import { nowDateStr, nowTimeStr, dateTimeToISO } from '@features/gate/hooks/useGateCore'
import RichDatePicker from '@shared/components/RichDatePicker'
import RichTimePicker from '@shared/components/RichTimePicker'

// ─── DateTimeInput ────────────────────────────────────────────────────────────

export function DateTimeInput({ dateValue, timeValue, onDateChange, onTimeChange, label }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
        {label} <span className="normal-case opacity-70">({tp('formEtaDesc')})</span>
      </label>
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
        <RichDatePicker
          value={dateValue}
          onChange={onDateChange}
          clearable={false}
        />
        <RichTimePicker
          value={timeValue}
          onChange={onTimeChange}
        />
      </div>
    </div>
  )
}

// ─── PurposeInput ─────────────────────────────────────────────────────────────

export function PurposeInput({ value, onChange, presets, placeholder, label, required }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { language } = useLanguage()

  const translatePreset = (p) => {
    return presetTranslations[language]?.[p] || p
  }

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-8 pr-3 rtl:pl-3 rtl:pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all"
        />
      </div>

      {open && presets && presets.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl p-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {presets.map(p => {
            const translated = translatePreset(p)
            const isSelected = value === p || value === translated
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onChange(translated)
                  setOpen(false)
                }}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all border shrink-0 ${isSelected
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                  }`}
              >
                {translated}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── QuickGuide ───────────────────────────────────────────────────────────────

export function QuickGuide({ mode = 'internal' }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const isTamu = mode === 'tamu'
  const items = isTamu
    ? [
      { icon: Plus, text: tp('guideTamu1'), color: 'bg-emerald-400' },
      { icon: LogOut, text: tp('guideTamu2'), color: 'bg-red-400' },
      { icon: Car, text: tp('guideTamu3'), color: 'bg-amber-400' }
    ]
    : [
      { icon: Search, text: tp('guideInt1'), color: 'bg-[var(--color-primary)]' },
      { icon: Tag, text: tp('guideInt2'), color: 'bg-indigo-400' },
      { icon: Clock, text: tp('guideInt3'), color: 'bg-emerald-400' },
      { icon: RotateCcwHelper, text: tp('guideInt4'), color: 'bg-amber-400' }
    ]

  // Helper helper internally
  function RotateCcwHelper(props) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    )
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-4 flex items-center gap-2">
        <Keyboard className="w-3.5 h-3.5" /> {tp('guideTitle')}
      </p>
      <div className="space-y-3">
        {items.map((t, i) => {
          const IconComp = t.icon
          return (
            <div key={i} className="flex items-start gap-3 group">
              <div className={`w-6 h-6 rounded-lg ${t.color}/10 ${t.color.replace('bg-', 'text-')} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <IconComp className="w-3 h-3" />
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed group-hover:text-[var(--color-text)] transition-colors">
                {t.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import RichSelect from '@shared/components/RichSelect'

// ─── TeacherSearch ────────────────────────────────────────────────────────────

export function TeacherSearch({ teacherList, value, onChange, label, icon }) {
  const { language } = useLanguage()
  const options = useMemo(() => {
    return teacherList.map(t => ({
      id: t.id,
      name: t.nbm ? `${t.name} (${t.nbm})` : t.name
    }))
  }, [teacherList])

  const placeholderText = language === 'ar'
    ? `-- اختر ${label} --`
    : language === 'en'
      ? `-- Select ${label} --`
      : `-- Pilih ${label} --`

  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{label}</label>
      <RichSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholderText}
        searchable={true}
        icon={icon}
        className="w-full"
        buttonClassName="h-10 rounded-xl"
      />
    </div>
  )
}

// ─── FormInternal ─────────────────────────────────────────────────────────────

export function FormInternal({ internalList, onSubmit, loading }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  const [visitorType, setVisitorType] = useState('guru')
  const [personId, setPersonId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [dateOut, setDateOut] = useState(() => nowDateStr())
  const [timeOut, setTimeOut] = useState(() => nowTimeStr())
  const [visitorName, setVisitorName] = useState('')
  const [timeEst, setTimeEst] = useState('')

  const filteredList = useMemo(
    () => internalList.filter(t => {
      if (visitorType === 'santri') return t.type === 'santri'
      return t.type === visitorType || (!t.type && visitorType !== 'santri')
    }),
    [internalList, visitorType]
  )

  const activePresets = visitorType === 'karyawan' ? PRESETS_KARYAWAN : visitorType === 'santri' ? PRESETS_SANTRI : PRESETS_GURU

  const canSubmit = personId && purpose.trim()

  const submit = () => {
    if (!canSubmit) return
    const person = internalList.find(t => t.id === personId)
    onSubmit({
      flow: 'internal',
      visitorType,
      personId,
      name: person?.name || '',
      nbm: person?.nbm || '',
      purpose: purpose.trim(),
      dateOut,
      timeOut,
      estimatedReturn: timeEst ? dateTimeToISO(dateOut, timeEst) : null,
    })
    setPersonId('')
    setPurpose('')
    setDateOut(nowDateStr())
    setTimeOut(nowTimeStr())
    setTimeEst('')
  }

  const handleKeyDown = e => { if (e.key === 'Enter' && canSubmit && !loading) submit() }

  const tanggalLabel = language === 'ar' ? 'التاريخ' : language === 'en' ? 'Date' : 'Tanggal'
  const jamKeluarLabel = language === 'ar' ? 'وقت الخروج' : language === 'en' ? 'Time Out' : 'Jam Keluar'
  const opsionalText = language === 'ar' ? '(اختياري)' : language === 'en' ? '(optional)' : '(opsional)'

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      {/* Sub-tab Guru / Karyawan / Santri — scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-0.5">
        {visitorTypes.filter(t => t.key !== 'tamu').map(t => {
          const IconComp = t.icon
          return (
            <button key={t.key} onClick={() => { setVisitorType(t.key); setPersonId('') }}
              className={`shrink-0 flex-1 min-w-0 h-8 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 border transition-all ${visitorType === t.key
                ? `${t.bg} ${t.color} ${t.border}`
                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              <IconComp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <TeacherSearch
          teacherList={filteredList}
          value={personId}
          onChange={setPersonId}
          label={typeMeta[visitorType].label}
          icon={typeMeta[visitorType].icon}
        />

        <PurposeInput
          value={purpose}
          onChange={setPurpose}
          presets={activePresets}
          placeholder={tp('formPurposePlaceholder')}
          label={tp('formPurpose')}
        />
      </div>

      {/* Datetime: tanggal + jam keluar + estimasi */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              {tanggalLabel}
            </label>
            <RichDatePicker value={dateOut} onChange={setDateOut} clearable={false} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              {jamKeluarLabel}
            </label>
            <RichTimePicker value={timeOut} onChange={setTimeOut} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
            {tp('formEta')} <span className="normal-case font-medium opacity-65">({opsionalText})</span>
          </label>
          <RichTimePicker value={timeEst} onChange={setTimeEst} clearable={true} />
        </div>
      </div>


      <button onClick={submit} disabled={loading || !canSubmit}
        className="w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] text-white shadow-lg shadow-[var(--color-primary)]/20 px-4">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <LogOut className="w-4 h-4" />}
        <span className="whitespace-nowrap">{tp('formSubmitOut')}</span>
      </button>

      <div className="flex items-center gap-1.5 justify-end opacity-30 mt-1.5 cursor-default hover:opacity-100 transition-opacity">
        <Keyboard className="w-3.5 h-3.5" />
        <span className="text-[9px] font-bold">{tp('formEnterHint')}</span>
      </div>
    </div>
  )
}

// ─── FormTamu ─────────────────────────────────────────────────────────────────

export function FormTamu({ onSubmit, loading }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [purpose, setPurpose] = useState('')
  const [destination, setDestination] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [dateIn, setDateIn] = useState(() => nowDateStr())
  const [timeIn, setTimeIn] = useState(() => nowTimeStr())
  const [timeEst, setTimeEst] = useState('')

  const canSubmit = name.trim() && purpose.trim()

  const submit = () => {
    if (!canSubmit) return
    onSubmit({
      flow: 'tamu',
      visitorType: 'tamu',
      name: name.trim(),
      institution: institution.trim(),
      purpose: purpose.trim(),
      destination: destination.trim(),
      vehicle: vehicle.trim(),
      dateIn,
      timeIn,
      estimatedReturn: timeEst ? dateTimeToISO(dateIn, timeEst) : null
    })
    setName(''); setInstitution(''); setPurpose(''); setDestination(''); setVehicle('')
    setDateIn(nowDateStr()); setTimeIn(nowTimeStr()); setTimeEst('')
  }

  const handleKeyDown = e => { if (e.key === 'Enter' && canSubmit && !loading) submit() }

  const destLabel = tp('formInstitution') === 'Instansi' ? 'Menemui / Tujuan' : language === 'en' ? 'Person to Visit / Destination' : 'الشخص المراد زيارته / الوجهة'

  const tanggalLabel = language === 'ar' ? 'التاريخ' : language === 'en' ? 'Date' : 'Tanggal'
  const jamMasukLabel = language === 'ar' ? 'وقت الدخول' : language === 'en' ? 'Time In' : 'Jam Masuk'
  const opsionalText = language === 'ar' ? '(اختياري)' : language === 'en' ? '(optional)' : '(opsional)'

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">{tp('formName')} <span className="text-red-400">*</span></label>
          <div className="relative">
            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap..."
              className="w-full h-10 pl-8 pr-3 rtl:pl-3 rtl:pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">{tp('formInstitution')}</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
            <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Asal/Desa..."
              className="w-full h-10 pl-8 pr-3 rtl:pl-3 rtl:pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
      </div>

      <PurposeInput
        value={purpose}
        onChange={setPurpose}
        presets={PRESETS_TAMU}
        placeholder="Keperluan kunjungan..."
        label={tp('formPurposeTamu')}
        required
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">{destLabel}</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ustadz X, TU..."
            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1 block">{tp('tableVehicle')}</label>
          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
            <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Nopol opsional..."
              className="w-full h-10 pl-8 pr-3 rtl:pl-3 rtl:pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
      </div>

      {/* Datetime: tanggal + jam masuk + estimasi */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              {tanggalLabel}
            </label>
            <RichDatePicker value={dateIn} onChange={setDateIn} clearable={false} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              {jamMasukLabel}
            </label>
            <RichTimePicker value={timeIn} onChange={setTimeIn} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
            {tp('formEtaTamu')} <span className="normal-case font-medium opacity-65">({opsionalText})</span>
          </label>
          <RichTimePicker value={timeEst} onChange={setTimeEst} clearable={true} />
        </div>
      </div>

      <div className="p-2.5 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group cursor-pointer hover:border-emerald-500/30 transition-all">
            <Plus className="w-3.5 h-3.5 opacity-40 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[var(--color-text)] leading-tight">{tp('formIdentityPhoto')}</p>
            <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{tp('formIdentityPhotoDesc')}</p>
          </div>
        </div>
        <IdCard className="w-4 h-4 text-emerald-500/20" />
      </div>

      <button onClick={submit} disabled={loading || !canSubmit}
        className="w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] text-white shadow-lg shadow-[var(--color-primary)]/20 px-4">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <LogIn className="w-4 h-4" />}
        <span className="whitespace-nowrap">{tp('formSubmitIn')}</span>
      </button>

      <div className="flex items-center gap-1.5 justify-end opacity-30 mt-1.5 cursor-default hover:opacity-100 transition-opacity">
        <Keyboard className="w-3.5 h-3.5" />
        <span className="text-[9px] font-bold">{tp('formEnterHint')}</span>
      </div>
    </div>
  )
}
