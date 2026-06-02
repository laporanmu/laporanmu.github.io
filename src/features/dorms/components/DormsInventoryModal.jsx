import React, { useState } from 'react'
import Modal from '@shared/components/Modal'
import { EmptyState } from '@shared/components/DataDisplay'
import RichSelect from '@shared/components/RichSelect'
import { Search, ClipboardList, Edit2, Trash2, Plus, Check, X } from 'lucide-react'

// Private Helper sub-component
function InventoryModalContent({
    inventoryModalDorm,
    inventories,
    setSelectedDormForInventory,
    setEditingInventoryItem,
    setNewInventoryItem,
    setIsInventoryModalOpen,
    setInventoryToDelete,
    setIsConfirmDeleteInventoryOpen,
    setPendingInventoryDorm,
    setInventoryModalDorm,
}) {
    const [invSearch, setInvSearch] = useState('')
    const [invSort, setInvSort] = useState('name_asc')
    const [invFilter, setInvFilter] = useState('all')

    const roomItems = inventories.filter(i => i.dorm_id === inventoryModalDorm?.id)

    const filtered = roomItems
        .filter(item => {
            const matchSearch = item.item_name.toLowerCase().includes(invSearch.toLowerCase())
            const matchFilter =
                invFilter === 'all' ? true :
                    invFilter === 'good' ? item.damaged_condition_count === 0 :
                        invFilter === 'damaged' ? item.damaged_condition_count > 0 : true
            return matchSearch && matchFilter
        })
        .sort((a, b) => {
            if (invSort === 'name_asc') return a.item_name.localeCompare(b.item_name)
            if (invSort === 'name_desc') return b.item_name.localeCompare(a.item_name)
            if (invSort === 'total_desc') return b.total_quantity - a.total_quantity
            if (invSort === 'damaged_desc') return b.damaged_condition_count - a.damaged_condition_count
            return 0
        })

    return (
        <div className="flex flex-col gap-0">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-40" />
                    <input
                        type="text"
                        value={invSearch}
                        onChange={e => setInvSearch(e.target.value)}
                        placeholder="Cari item..."
                        className="w-full h-8 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                {/* Filter pills */}
                {['all', 'good', 'damaged'].map(f => (
                    <button
                        key={f}
                        onClick={() => setInvFilter(f)}
                        className={`h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${invFilter === f
                            ? 'bg-[var(--color-primary)] text-white border-transparent'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                            }`}
                    >
                        {f === 'all' ? 'Semua' : f === 'good' ? 'Baik' : 'Rusak'}
                    </button>
                ))}

                {/* Sort */}
                <div className="shrink-0 w-[130px]">
                    <RichSelect
                        compact
                        value={invSort}
                        onChange={setInvSort}
                        options={[
                            { id: 'name_asc', name: 'Nama A–Z' },
                            { id: 'name_desc', name: 'Nama Z–A' },
                            { id: 'total_desc', name: 'Terbanyak' },
                            { id: 'damaged_desc', name: 'Rusak' },
                        ]}
                    />
                </div>

                <span className="text-[9px] text-[var(--color-text-muted)] font-black opacity-50 shrink-0">
                    {filtered.length}/{roomItems.length}
                </span>
            </div>

            {/* Table */}
            <div className="px-4 py-4">
                {filtered.length === 0 ? (
                    <EmptyState
                        variant="dashed"
                        icon={ClipboardList}
                        color="indigo"
                        title={roomItems.length === 0 ? 'Belum Ada Inventaris' : 'Tidak Ditemukan'}
                        description={
                            roomItems.length === 0
                                ? 'Klik "+ Tambah Item" untuk menambahkan fasilitas kamar ini.'
                                : 'Tidak ada item yang cocok dengan pencarian atau filter saat ini.'
                        }
                    />
                ) : (
                    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <table className="w-full text-left table-fixed border-separate border-spacing-0">
                            <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                <tr>
                                    <th className="pl-4 pr-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[50%]">Nama Item</th>
                                    <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[20%]">Total</th>
                                    <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[20%]">Kondisi</th>
                                    <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[15%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-[var(--color-surface-alt)]/25 transition-colors">
                                        {/* Nama Item */}
                                        <td className="pl-4 pr-2 py-3.5 text-left">
                                            <p className="text-[12px] font-black text-[var(--color-text)]">{item.item_name}</p>
                                            {item.notes && <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 mt-0.5">{item.notes}</p>}
                                        </td>

                                        {/* Total */}
                                        <td className="px-2 py-3.5 text-center">
                                            <p className="text-[13px] font-black text-[var(--color-text)]">{item.total_quantity} Buah</p>
                                        </td>

                                        {/* Kondisi */}
                                        <td className="px-2 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-2.5">
                                                <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                    {item.good_condition_count}
                                                </span>
                                                <span className="text-[var(--color-border)]">|</span>
                                                <span className={`flex items-center gap-1 text-[11px] font-black ${item.damaged_condition_count > 0 ? 'text-rose-500' : 'text-[var(--color-text-muted)] opacity-30'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.damaged_condition_count > 0 ? 'bg-rose-500' : 'bg-[var(--color-border)]'}`} />
                                                    {item.damaged_condition_count}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Aksi */}
                                        <td className="px-2 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setPendingInventoryDorm(inventoryModalDorm)
                                                        setSelectedDormForInventory(inventoryModalDorm?.id)
                                                        setEditingInventoryItem(item)
                                                        setNewInventoryItem({
                                                            item_name: item.item_name,
                                                            total_quantity: item.total_quantity,
                                                            good_condition_count: item.good_condition_count,
                                                            damaged_condition_count: item.damaged_condition_count,
                                                            notes: item.notes || ''
                                                        })
                                                        setInventoryModalDorm(null)
                                                        setIsInventoryModalOpen(true)
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPendingInventoryDorm(inventoryModalDorm)
                                                        setInventoryModalDorm(null)
                                                        setInventoryToDelete(item)
                                                        setIsConfirmDeleteInventoryOpen(true)
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export function DormsInventoryModal({
    inventoryModalDorm,
    setInventoryModalDorm,
    inventories,
    setSelectedDormForInventory,
    setEditingInventoryItem,
    setNewInventoryItem,
    setIsInventoryModalOpen,
    setInventoryToDelete,
    setIsConfirmDeleteInventoryOpen,
    pendingInventoryDorm,
    setPendingInventoryDorm
}) {
    return (
        <Modal
            isOpen={!!inventoryModalDorm}
            onClose={() => setInventoryModalDorm(null)}
            title={`Inventori — ${inventoryModalDorm?.id}`}
            description="Daftar fasilitas dan kondisi barang di kamar ini."
            icon={ClipboardList}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-500"
            size="md"
            noPadding
            footer={
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-black opacity-60">
                        {inventories.filter(i => i.dorm_id === inventoryModalDorm?.id).length} item tercatat
                    </span>
                    <button
                        onClick={() => {
                            setPendingInventoryDorm(inventoryModalDorm)
                            setSelectedDormForInventory(inventoryModalDorm?.id)
                            setEditingInventoryItem(null)
                            setNewInventoryItem({ item_name: '', total_quantity: 1, good_condition_count: 1, damaged_condition_count: 0, notes: '' })
                            setInventoryModalDorm(null)
                            setIsInventoryModalOpen(true)
                        }}
                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Item
                    </button>
                </div>
            }
        >
            <InventoryModalContent
                inventoryModalDorm={inventoryModalDorm}
                inventories={inventories}
                setSelectedDormForInventory={setSelectedDormForInventory}
                setEditingInventoryItem={setEditingInventoryItem}
                setNewInventoryItem={setNewInventoryItem}
                setIsInventoryModalOpen={setIsInventoryModalOpen}
                setInventoryToDelete={setInventoryToDelete}
                setIsConfirmDeleteInventoryOpen={setIsConfirmDeleteInventoryOpen}
                setPendingInventoryDorm={setPendingInventoryDorm}
                setInventoryModalDorm={setInventoryModalDorm}
            />
        </Modal>
    )
}

export function DormsInventoryFormModal({
    isOpen,
    onClose,
    selectedDormForInventory,
    editingInventoryItem,
    newInventoryItem,
    setNewInventoryItem,
    submittingInventory,
    handleSaveInventoryItem,
    pendingInventoryDorm,
    setInventoryModalDorm,
    setPendingInventoryDorm,
    setEditingInventoryItem
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                onClose()
                setEditingInventoryItem(null)
            }}
            title={editingInventoryItem ? 'Edit Item Inventaris' : 'Tambah Item Inventaris'}
            description={`Kamar: ${selectedDormForInventory || '—'}`}
            icon={ClipboardList}
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button type="button" onClick={() => {
                        onClose()
                        if (pendingInventoryDorm) {
                            setInventoryModalDorm(pendingInventoryDorm)
                            setPendingInventoryDorm(null)
                        }
                        setEditingInventoryItem(null)
                    }}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition">
                        Batal
                    </button>
                    <button type="submit" form="inventory-form" disabled={submittingInventory}
                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2 ml-auto">
                        {submittingInventory ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Simpan
                    </button>
                </div>
            }
        >
            <form id="inventory-form" onSubmit={handleSaveInventoryItem} className="space-y-4">
                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Item *</label>
                    <input type="text" required value={newInventoryItem.item_name}
                        onChange={e => setNewInventoryItem(p => ({ ...p, item_name: e.target.value }))}
                        placeholder="Contoh: Kasur, Kipas Angin, Lemari"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Total</label>
                        <input type="number" min="0" required value={newInventoryItem.total_quantity}
                            onChange={e => setNewInventoryItem(p => ({ ...p, total_quantity: Number(e.target.value) }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kondisi Baik</label>
                        <input type="number" min="0" value={newInventoryItem.good_condition_count}
                            onChange={e => setNewInventoryItem(p => ({ ...p, good_condition_count: Number(e.target.value) }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Rusak</label>
                        <input type="number" min="0" value={newInventoryItem.damaged_condition_count}
                            onChange={e => setNewInventoryItem(p => ({ ...p, damaged_condition_count: Number(e.target.value) }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                    </div>
                </div>
                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Catatan (Optional)</label>
                    <input type="text" value={newInventoryItem.notes}
                        onChange={e => setNewInventoryItem(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Contoh: Perlu penggantian, bantalan sudah tipis"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                </div>
            </form>
        </Modal>
    )
}
