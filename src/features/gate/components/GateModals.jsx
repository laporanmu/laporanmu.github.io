import { useState, useEffect } from 'react'
import {
  Clock, Edit2, Trash2, Loader2, Check, Send, Settings, X, Tag,
  Printer, FileText, ClipboardList
} from 'lucide-react'
import Modal from '@components/ui/Modal'
import { useLanguage } from '@context'
import {
  PAGE_T, presetTranslations, getVisitorTypes,
  PRESETS_GURU, PRESETS_KARYAWAN, PRESETS_SANTRI, PRESETS_TAMU
} from '@features/gate/utils/gateConstants'
import { fmtTime, timeStrToISO } from '@features/gate/hooks/useGateCore'
import RichTimePicker from '@components/ui/RichTimePicker'

// ─── Local Components ─────────────────────────────────────────────────────────

export function TimeInput({ value, onChange, label, clearable = true }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
        {label} <span className="normal-case opacity-70">({tp('formEtaDesc')})</span>
      </label>
      <RichTimePicker
        value={value}
        onChange={onChange}
        clearable={clearable}
        placeholder="--:--"
      />
    </div>
  )
}

export function PresetPills({ presets, value, onSelect }) {
  const { language } = useLanguage()
  const translatePreset = (p) => {
    return presetTranslations[language]?.[p] || p
  }
  return (
    <div className="flex flex-row overflow-x-auto gap-1.5 mt-2 scrollbar-none pb-1">
      {presets.map(p => {
        const translated = translatePreset(p)
        const isSelected = value === p || value === translated
        return (
          <button key={p} type="button" onClick={() => onSelect(translated)}
            className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all border shrink-0 ${isSelected
              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}>
            {translated}
          </button>
        )
      })}
    </div>
  )
}

// ─── ConfirmTimeModal ─────────────────────────────────────────────────────────

export function ConfirmTimeModal({ log, onConfirm, onCancel }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const isInternal = log.visitor_type !== 'tamu'
  const [time, setTime] = useState(() => {
    const d = new Date()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  })
  const label = isInternal ? (language === 'en' ? 'Return' : language === 'ar' ? 'العودة' : 'Kembali') : (language === 'en' ? 'Exit' : language === 'ar' ? 'الخروج' : 'Keluar')
  const colorCls = isInternal
    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
    : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`${tp('modalConfirmTitle')} ${label}`}
      description={log.purpose}
      icon={Clock}
      iconBg={isInternal ? 'bg-emerald-500/10' : 'bg-red-500/10'}
      iconColor={isInternal ? 'text-emerald-500' : 'text-red-500'}
      size="sm"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalConfirmCancel').toUpperCase()}</button>
          <div className="flex-1" />
          <button onClick={() => onConfirm(time)} className={`h-10 px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 ${colorCls}`}>
            <Check className="w-3.5 h-3.5" />
            <span>{`${tp('modalConfirmSave')} ${label}`.toUpperCase()}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-xl">
          <p className="text-[12px] font-black text-[var(--color-primary)] mb-1">{log.visitor_name}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-snug">{log.purpose}</p>
        </div>
        <TimeInput value={time} onChange={setTime} label={`${tp('modalConfirmTimeLabel')} ${label}`} clearable={false} />
      </div>
    </Modal>
  )
}

// ─── EditLogModal ─────────────────────────────────────────────────────────────

export function EditLogModal({ log, onSave, onDelete, onCancel, saving }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  const isInternal = log.visitor_type !== 'tamu'
  const [purpose, setPurpose] = useState(log.purpose || '')
  const [destination, setDestination] = useState(log.destination || '')
  const [vehicle, setVehicle] = useState(log.vehicle_plate || '')
  const [timeIn, setTimeIn] = useState(fmtTime(log.check_in).replace('.', ':'))
  const [timeOut, setTimeOut] = useState(log.check_out ? fmtTime(log.check_out).replace('.', ':') : '')
  const [timeEst, setTimeEst] = useState(log.estimated_return ? fmtTime(log.estimated_return).replace('.', ':') : '')
  const [confirmDel, setConfirmDel] = useState(false)

  const handleSave = () => {
    const today = new Date(log.check_in)
    onSave({
      purpose: purpose.trim() || log.purpose,
      destination: destination.trim() || null,
      vehicle_plate: vehicle.trim() || null,
      check_in: timeStrToISO(today, timeIn),
      check_out: timeOut ? timeStrToISO(today, timeOut) : null,
      estimated_return: timeEst ? timeStrToISO(today, timeEst) : null,
    })
  }

  const meta = typeMeta[log.visitor_type] || typeMeta.tamu
  const activePresets = log.visitor_type === 'karyawan' ? PRESETS_KARYAWAN : log.visitor_type === 'tamu' ? PRESETS_TAMU : log.visitor_type === 'santri' ? PRESETS_SANTRI : PRESETS_GURU

  const destLabel = tp('formInstitution') === 'Instansi' ? 'Menemui / Tujuan' : language === 'en' ? 'Person to Visit / Destination' : 'الشخص المراد زيارته / الوجهة'

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={tp('modalEditTitle')}
      description={log.visitor_name}
      icon={Edit2}
      iconBg={meta.bg}
      iconColor={meta.color}
      size="md"
      footer={
        (() => {
          const saveWords = tp('modalEditSave').toUpperCase().split(' ')
          const saveLabel = (
            <>
              {saveWords[0]}
              {saveWords.slice(1).join(' ') && (
                <span className="hidden min-[380px]:inline"> {saveWords.slice(1).join(' ')}</span>
              )}
            </>
          )

          const delWords = tp('modalEditDeleteConfirm').toUpperCase().split(' ')
          const delLabel = (
            <>
              {delWords[0]}
              {delWords.slice(1).join(' ') && (
                <span className="hidden min-[380px]:inline"> {delWords.slice(1).join(' ')}</span>
              )}
            </>
          )

          return (
            <div className="flex items-center w-full gap-2 sm:gap-3">
              {onDelete && (
                confirmDel ? (
                  <>
                    <button onClick={() => setConfirmDel(false)} className="h-10 px-3.5 sm:px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalEditCancel').toUpperCase()}</button>
                    <div className="flex-1" />
                    <button onClick={onDelete} disabled={saving} className="h-10 px-4 sm:px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {delLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirmDel(true)} disabled={saving} className="w-10 h-10 rounded-xl border border-red-500/30 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1" />
                    <button onClick={onCancel} disabled={saving} className="h-10 px-3.5 sm:px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalEditCancel').toUpperCase()}</button>
                    <button onClick={handleSave} disabled={saving} className="h-10 px-4 sm:px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {saveLabel}
                    </button>
                  </>
                )
              )}
              {!onDelete && (
                <>
                  <div className="flex-1" />
                  <button onClick={onCancel} disabled={saving} className="h-10 px-3.5 sm:px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalEditCancel').toUpperCase()}</button>
                  <button onClick={handleSave} disabled={saving} className="h-10 px-4 sm:px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {saveLabel}
                  </button>
                </>
              )}
            </div>
          )
        })()
      }
    >
      <div className="space-y-3 pt-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{tp('formPurposeTamu')}</label>
          <input value={purpose} onChange={e => setPurpose(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          <PresetPills presets={activePresets} value={purpose} onSelect={setPurpose} />
        </div>
        {!isInternal && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{destLabel}</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Opsional..."
              className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <TimeInput value={timeIn} onChange={setTimeIn} label={isInternal ? tp('formTimeOut') : tp('formTimeIn')} clearable={false} />
          <TimeInput value={timeOut} onChange={setTimeOut} label={isInternal ? (language === 'en' ? 'Return Time' : language === 'ar' ? 'وقت العودة' : 'Jam Kembali') : tp('formTimeOut')} clearable={true} />
        </div>
        <TimeInput value={timeEst} onChange={setTimeEst} label={isInternal ? tp('formEta') : tp('formEtaTamu')} clearable={true} />
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{tp('tableVehicle')}</label>
          <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Opsional..."
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
      </div>
    </Modal>
  )
}

// ─── ConfigModal ──────────────────────────────────────────────────────────────

export function ConfigModal({ onSave, onCancel, testNotification }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const [url, setUrl] = useState(() => localStorage.getItem('GATE_WEBHOOK_URL') || import.meta.env.VITE_GATE_WEBHOOK_URL || '')
  const [testing, setTesting] = useState(false)

  const handleSave = () => {
    localStorage.setItem('GATE_WEBHOOK_URL', url.trim())
    onSave()
  }

  const handleTest = async () => {
    if (!url) return
    setTesting(true)
    localStorage.setItem('GATE_WEBHOOK_URL', url.trim())
    const success = await testNotification()
    setTesting(false)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={tp('modalConfigTitle')}
      description={tp('modalConfigDesc')}
      icon={Settings}
      iconBg="bg-indigo-500/10"
      iconColor="text-indigo-500"
      size="sm"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalConfigCancel').toUpperCase()}</button>
          <div className="flex-1" />
          <button onClick={handleSave} className="h-10 px-6 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span>{tp('modalConfigSave').toUpperCase()}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2 block">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>"
              className="flex-1 h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all shadow-inner"
            />
            <button onClick={handleTest} disabled={testing || !url}
              className="h-10 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-[10px] font-black text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 shadow-sm"
              title="Test Kirim Notifikasi">
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{testing ? tp('modalConfigTesting') : tp('modalConfigTest')}</span>
            </button>
          </div>
          {import.meta.env.VITE_GATE_WEBHOOK_URL && !localStorage.getItem('GATE_WEBHOOK_URL') && (
            <p className="mt-2 text-[10px] text-emerald-500 font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" /> Webhook default aktif (.env)
            </p>
          )}
          <p className="mt-2 text-[9px] text-[var(--color-text-muted)] opacity-60">{tp('modalConfigHelp')}</p>
        </div>
      </div>
    </Modal>
  )
}

export function PrintOptionsModal({
  isOpen,
  onClose,
  activeTab,
  rekapView,
  selectedCount = 0,
  onConfirm,
}) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key

  const defaultSigTitle = language === 'en' ? 'Security Officer' : language === 'ar' ? 'ضابط الأمن' : 'Petugas Keamanan'

  const [format, setFormat] = useState(rekapView === 'ringkasan' ? 'ringkasan' : 'detail')
  const [scope, setScope] = useState(selectedCount > 0 ? 'selected' : 'all')
  const [showNip, setShowNip] = useState(true)
  const [showPurpose, setShowPurpose] = useState(true)
  const [showDuration, setShowDuration] = useState(true)
  const [showVehicle, setShowVehicle] = useState(true)
  const [showSignature, setShowSignature] = useState(false)
  const [sigTitle, setSigTitle] = useState(defaultSigTitle)
  const [sigName, setSigName] = useState('')

  useEffect(() => {
    setSigTitle(language === 'en' ? 'Security Officer' : language === 'ar' ? 'ضابط الأمن' : 'Petugas Keamanan')
  }, [language])

  const handlePrint = () => {
    onConfirm({
      format,
      scope,
      showNip,
      showPurpose,
      showDuration,
      showVehicle,
      showSignature,
      signatureTitle: sigTitle,
      signatureName: sigName,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tp('printModalTitle')}
      description={tp('printModalDesc')}
      icon={Printer}
      iconBg="bg-indigo-500/10"
      iconColor="text-indigo-500"
      size="sm"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onClose} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">
            {tp('modalConfirmCancel').toUpperCase()}
          </button>
          <div className="flex-1" />
          <button onClick={handlePrint} className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/90 transition-all flex items-center justify-center gap-2 shrink-0">
            <Printer className="w-3.5 h-3.5" />
            <span>{tp('btnCetak').toUpperCase()}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Format Laporan */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2 block">
            {tp('printFormatLabel')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setFormat('detail')}
              className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-all ${format === 'detail'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-black'
                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] font-bold'}`}>
              <span className="text-[11px]">{tp('printFormatDetail')}</span>
              <span className="text-[8px] opacity-75 font-normal">{tp('printFormatDetailSub')}</span>
            </button>
            <button onClick={() => setFormat('ringkasan')}
              className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-all ${format === 'ringkasan'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-black'
                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] font-bold'}`}>
              <span className="text-[11px]">{tp('printFormatSummary')}</span>
              <span className="text-[8px] opacity-75 font-normal">{tp('printFormatSummarySub')}</span>
            </button>
          </div>
        </div>

        {/* Cakup Data (jika ada selection) */}
        {selectedCount > 0 && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2 block">
              {tp('printScopeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScope('all')}
                className={`h-9 rounded-xl border transition-all text-[11px] ${scope === 'all'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-black'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] font-bold'}`}>
                {tp('printScopeAll')}
              </button>
              <button onClick={() => setScope('selected')}
                className={`h-9 rounded-xl border transition-all text-[11px] ${scope === 'selected'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-black'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] font-bold'}`}>
                {tp('printScopeSelected').replace('{count}', selectedCount)}
              </button>
            </div>
          </div>
        )}

        {/* Kolom yang Ditampilkan */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2 block">
            {tp('printColumnsLabel')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'nip', label: tp('printColNip'), val: showNip, set: setShowNip },
              { id: 'purpose', label: tp('printColPurpose'), val: showPurpose, set: setShowPurpose },
              { id: 'duration', label: tp('printColDuration'), val: showDuration, set: setShowDuration },
              format === 'detail' && { id: 'vehicle', label: tp('printColVehicle'), val: showVehicle, set: setShowVehicle }
            ].filter(Boolean).map(col => (
              <button key={col.id} onClick={() => col.set(!col.val)}
                className={`h-8 px-3 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-between ${col.val
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                <span>{col.label}</span>
                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${col.val ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'}`}>
                  {col.val && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="border-t border-[var(--color-border)]/60 pt-3">
          <button type="button" onClick={() => setShowSignature(!showSignature)}
            className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-80 mb-2">
            <span>{tp('printSigLabel')}</span>
            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${showSignature ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--color-border)]'}`}>
              {showSignature && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </span>
          </button>

          {showSignature && (
            <div className="grid grid-cols-2 gap-3 mt-2 animate-in fade-in duration-200">
              <div>
                <label className="text-[8px] font-black uppercase text-[var(--color-text-muted)] mb-1 block">
                  {tp('printSigTitleLabel')}
                </label>
                <input value={sigTitle} onChange={e => setSigTitle(e.target.value)} placeholder={tp('printSigTitlePlaceholder')}
                  className="w-full h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-[var(--color-text-muted)] mb-1 block">
                  {tp('printSigNameLabel')}
                </label>
                <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder={tp('printSigNamePlaceholder')}
                  className="w-full h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── BulkCheckoutModal ────────────────────────────────────────────────────────

export function BulkCheckoutModal({ logs = [], onConfirm, onCancel }) {
  const { language } = useLanguage()
  const [reason, setReason] = useState('')
  const count = logs.length

  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  const presets = language === 'en'
    ? ['End of session', 'Dismissal time', 'Administrative process']
    : language === 'ar'
      ? ['نهاية الجلسة', 'وقت الانصراف', 'إجراء إداري']
      : ['Akhir sesi', 'Waktu pulang', 'Proses administrasi']

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={language === 'en' ? 'Bulk Check-out' : language === 'ar' ? 'تسجيل خروج جماعي' : 'Check-out Massal'}
      description={language === 'en'
        ? `Process check-out for ${count} selected entries`
        : language === 'ar'
          ? `معالجة تسجيل خروج ${count} إدخالات محددة`
          : `Proses check-out untuk ${count} entri yang dipilih`}
      icon={Check}
      iconBg="bg-indigo-500/10"
      iconColor="text-indigo-500"
      size="sm"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--color-surface-alt)] transition-all shrink-0">
            {language === 'en' ? 'CANCEL' : language === 'ar' ? 'إلغاء' : 'BATAL'}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onConfirm(reason.trim())}
            className="h-10 px-6 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'CONFIRM CHECK-OUT' : language === 'ar' ? 'تأكيد الخروج' : 'PROSES CHECK-OUT'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        {/* Name list */}
        <div className="border border-indigo-500/20 rounded-xl overflow-hidden">
          <div className="px-3 py-1.5 bg-indigo-500/5 border-b border-indigo-500/15">
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500/70">
              {language === 'en' ? `${count} entries to check-out` : language === 'ar' ? `${count} إدخالات للخروج` : `${count} entri akan di-check-out`}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border)] max-h-36 overflow-y-auto">
            {logs.map(log => {
              const meta = typeMeta[log.visitor_type] || typeMeta.tamu
              return (
                <div key={log.id} className="flex items-center gap-2.5 px-3 py-1.5">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 ${meta.bg} ${meta.color}`}>{meta.label}</span>
                  <span className="text-[12px] font-bold text-[var(--color-text)] truncate">{log.visitor_name}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 ml-auto">{log.purpose}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Reason field */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
            {language === 'en' ? 'Reason / Note (optional)' : language === 'ar' ? 'السبب / ملاحظة (اختياري)' : 'Alasan / Catatan (opsional)'}
          </label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={language === 'en' ? 'e.g. Dismissal time...' : language === 'ar' ? 'مثال: وقت الانصراف...' : 'cth. Waktu pulang...'}
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {presets.map(p => (
              <button key={p} type="button" onClick={() => setReason(p)}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all border shrink-0 ${reason === p
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── BulkDeleteModal ──────────────────────────────────────────────────────────

export function BulkDeleteModal({ logs = [], onConfirm, onCancel }) {
  const { language } = useLanguage()
  const count = logs.length

  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={language === 'en' ? 'Delete Entries' : language === 'ar' ? 'حذف الإدخالات' : 'Hapus Entri'}
      description={language === 'en' ? 'This action cannot be undone' : language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء' : 'Tindakan ini tidak dapat dibatalkan'}
      icon={Trash2}
      iconBg="bg-red-500/10"
      iconColor="text-red-500"
      size="sm"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--color-surface-alt)] transition-all shrink-0">
            {language === 'en' ? 'CANCEL' : language === 'ar' ? 'إلغاء' : 'BATAL'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onConfirm}
            className="h-10 px-6 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'en' ? `DELETE ${count}` : language === 'ar' ? `حذف ${count}` : `HAPUS ${count} ENTRI`}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        {/* Warning */}
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-[11px] text-red-500/80 font-bold">
            {language === 'en' ? 'These entries will be permanently deleted!' : language === 'ar' ? 'سيتم حذف هذه الإدخالات نهائيًا!' : 'Entri berikut akan dihapus permanen!'}
          </p>
        </div>

        {/* Name list */}
        <div className="border border-red-500/20 rounded-xl overflow-hidden">
          <div className="px-3 py-1.5 bg-red-500/5 border-b border-red-500/15">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-500/70">
              {language === 'en' ? `${count} entries to delete` : language === 'ar' ? `${count} إدخالات للحذف` : `${count} entri akan dihapus`}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border)] max-h-40 overflow-y-auto">
            {logs.map(log => {
              const meta = typeMeta[log.visitor_type] || typeMeta.tamu
              return (
                <div key={log.id} className="flex items-center gap-2.5 px-3 py-1.5">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 ${meta.bg} ${meta.color}`}>{meta.label}</span>
                  <span className="text-[12px] font-bold text-[var(--color-text)] truncate">{log.visitor_name}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 ml-auto">{log.purpose}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
