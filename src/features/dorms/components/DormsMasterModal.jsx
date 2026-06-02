import React from 'react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import { Bed, Check, VenusAndMars, Info, User2 } from 'lucide-react'

export default function DormsMasterModal({
    isOpen,
    onClose,
    editingDorm,
    newDorm,
    setNewDorm,
    musyrifList,
    onSave,
    submitting
}) {
    const User2Icon = User2

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingDorm ? 'Edit Data Kamar' : 'Tambah Kamar Baru'}
            description={editingDorm ? `Mengubah data kamar ${editingDorm.id}` : 'Tambahkan kamar asrama baru ke sistem'}
            icon={Bed}
            size="md"
            footer={
                <div className="flex items-center justify-between gap-2 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="dorm-form"
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5" />
                        )}
                        Simpan Kamar
                    </button>
                </div>
            }
        >
            <form id="dorm-form" onSubmit={onSave} className="space-y-4">
                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Kamar</label>
                    <input
                        type="text"
                        required
                        disabled={!!editingDorm}
                        value={newDorm.id}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, id: e.target.value }))}
                        placeholder="Contoh: Fachruddin"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Arab (Optional)</label>
                    <input
                        type="text"
                        value={newDorm.ar || ''}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, ar: e.target.value }))}
                        placeholder="فخر الدين"
                        dir="rtl"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kapasitas Maksimal</label>
                    <input
                        type="number"
                        required
                        min="1"
                        value={newDorm.capacity}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                        placeholder="30"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Jenis Kelamin</label>
                        <RichSelect
                            usePortal={true}
                            value={newDorm.gender || ''}
                            onChange={(val) => setNewDorm(prev => ({ ...prev, gender: val }))}
                            placeholder="Semua"
                            options={[
                                { id: '', name: 'Semua' },
                                { id: 'putra', name: 'Putra' },
                                { id: 'putri', name: 'Putri' }
                            ]}
                            icon={VenusAndMars}
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Status Kamar</label>
                        <RichSelect
                            usePortal={true}
                            value={newDorm.status || 'active'}
                            onChange={(val) => setNewDorm(prev => ({ ...prev, status: val }))}
                            placeholder="Aktif"
                            options={[
                                { id: 'active', name: 'Aktif' },
                                { id: 'maintenance', name: 'Perbaikan' },
                                { id: 'full', name: 'Terkunci' }
                            ]}
                            icon={Info}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Gedung / Blok (Optional)</label>
                    <input
                        type="text"
                        value={newDorm.building || ''}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, building: e.target.value }))}
                        placeholder="Contoh: Gedung A, Blok Tahfidz"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">PJ Musyrif</label>
                    <RichSelect
                        usePortal={true}
                        value={newDorm.musyrif_id || ''}
                        onChange={(val) => setNewDorm(prev => ({ ...prev, musyrif_id: val }))}
                        placeholder="— Tidak Ada Musyrif —"
                        searchable
                        options={musyrifList.map(m => ({ id: m.id, name: m.name }))}
                        extraOption={{ id: '', name: '— Tidak Ada Musyrif —' }}
                        icon={User2Icon}
                    />
                </div>
            </form>
        </Modal>
    )
}
