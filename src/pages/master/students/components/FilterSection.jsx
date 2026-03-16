import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSearch, faSliders, faXmark, faTriangleExclamation,
    faCheck, faUsers, faImage, faTrophy, faPlus,
    faDownload, faSchool
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

export function FilterSection({
    searchQuery, setSearchQuery,
    showAdvancedFilter, setShowAdvancedFilter,
    activeFilterCount,
    resetAllFilters,
    filterClass, setFilterClass,
    filterGender, setFilterGender,
    filterStatus, setFilterStatus,
    filterTag, setFilterTag,
    sortBy, setSortBy,
    filterPointMin, setFilterPointMin,
    filterPointMax, setFilterPointMax,
    filterPointMode, setFilterPointMode,
    filterMissing, setFilterMissing,
    classesList,
    allUsedTags,
    tagStats,
    onExportFilter,
    setPage,
    setFilterClasses,
    searchInputRef,
    SortOptions,
    AvailableTags
}) {
    return (
        <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
            {/* Row 1: Search + action buttons */}
            <div className="flex flex-row items-center gap-2 p-3">
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
                        className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                        className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvancedFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                    >
                        <FontAwesomeIcon icon={faSliders} />
                        <span className="hidden xs:inline">Filter</span>
                        {activeFilterCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={resetAllFilters}
                            className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5"
                        >
                            <FontAwesomeIcon icon={faXmark} />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Row 2: Expandable filter panel */}
            {showAdvancedFilter && (
                <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
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
                                {Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(t => (
                                    <option key={t} value={t}>{t} ({tagStats[t] || 0})</option>
                                ))}
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

                        {/* Poin Min */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Min</label>
                            <input
                                type="number"
                                value={filterPointMin}
                                onChange={(e) => { setFilterPointMin(e.target.value); setFilterPointMode(e.target.value || filterPointMax ? 'custom' : ''); setPage(1) }}
                                placeholder="0"
                                className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                            />
                        </div>

                        {/* Poin Max */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Max</label>
                            <input
                                type="number"
                                value={filterPointMax}
                                onChange={(e) => { setFilterPointMax(e.target.value); setFilterPointMode(filterPointMin || e.target.value ? 'custom' : ''); setPage(1) }}
                                placeholder="Unlimited"
                                className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                            />
                        </div>

                        {/* Quick poin presets */}
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Preset Poin</label>
                            <div className="flex gap-1.5">
                                {[
                                    { value: '', label: 'Semua', icon: null },
                                    { value: 'risk', label: 'Risiko', icon: faTriangleExclamation },
                                    { value: 'positive', label: 'Positif', icon: faCheck },
                                ].map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => { setFilterPointMode(opt.value); setFilterPointMin(''); setFilterPointMax(''); setPage(1) }}
                                        className={`flex-1 h-9 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center justify-center gap-2 ${filterPointMode === opt.value && opt.value !== '' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                    >
                                        {opt.icon && <FontAwesomeIcon icon={opt.icon} className="text-[10px]" />}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Full Width Section: Data Needs Presets */}
                    <div className="pt-1 mb-4">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Filter Kebutuhan Data</label>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                            {[
                                { label: 'Semua', icon: faUsers, active: !filterMissing && sortBy !== 'created_at' && sortBy !== 'total_points_desc', onClick: () => { setFilterMissing(''); setSortBy('name_asc'); } },
                                { label: 'Foto Kosong', icon: faImage, active: filterMissing === 'photo', onClick: () => { setFilterMissing('photo'); setPage(1); } },
                                { label: 'Belum Ada WA', icon: faWhatsapp, active: filterMissing === 'wa', onClick: () => { setFilterMissing('wa'); setPage(1); } },
                                { label: 'Top Performer', icon: faTrophy, active: sortBy === 'total_points_desc', onClick: () => { setSortBy('total_points_desc'); setPage(1); } },
                                { label: 'Siswa Baru', icon: faPlus, active: sortBy === 'created_at', onClick: () => { setSortBy('created_at'); setPage(1); } },
                            ].map((s, i) => (
                                <button key={i} onClick={s.onClick}
                                    className={`whitespace-nowrap h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={s.icon} className="text-[10px]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filter Panel Footer - Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]/50">
                        {activeFilterCount > 0 && (
                            <button
                                onClick={onExportFilter}
                                className="h-9 px-4 rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-teal-500/20"
                            >
                                <FontAwesomeIcon icon={faDownload} />
                                Export Hasil Filter
                            </button>
                        )}
                        <button
                            onClick={resetAllFilters}
                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                        >
                            Reset Filter
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
