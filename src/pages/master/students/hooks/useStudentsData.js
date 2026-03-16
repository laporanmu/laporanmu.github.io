import { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'

export function useStudentsData(pageSize = 10) {
    const [students, setStudents] = useState([])
    const [classesList, setClassesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalRows, setTotalRows] = useState(0)
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterClasses, setFilterClasses] = useState([])
    const [filterGender, setFilterGender] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterTag, setFilterTag] = useState('')
    const [filterPointMode, setFilterPointMode] = useState('')
    const [filterPointMin, setFilterPointMin] = useState('')
    const [filterPointMax, setFilterPointMax] = useState('')
    const [filterMissing, setFilterMissing] = useState('')
    const [sortBy, setSortBy] = useState('name_asc')
    
    const [globalStats, setGlobalStats] = useState({ 
        total: 0, boys: 0, girls: 0, avgPoints: 0, risk: 0, 
        worstClass: null, topPerformer: null, incompleteCount: 0, 
        noPhoneCount: 0, avgPointsLastWeek: null 
    })

    const deferredSearchQuery = useDeferredValue(searchQuery)
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(deferredSearchQuery.trim()), 350)
        return () => clearTimeout(t)
    }, [deferredSearchQuery])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data: cData } = await supabase.from('classes').select('id, name').order('name')
            setClassesList(cData || [])

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            const sortMap = {
                name_asc: { col: 'name', asc: true },
                name_desc: { col: 'name', asc: false },
                class_asc: { col: 'class_id', asc: true },
                points_desc: { col: 'total_points', asc: false },
                total_points_desc: { col: 'total_points', asc: false },
                points_asc: { col: 'total_points', asc: true },
                created_at: { col: 'created_at', asc: false },
            }
            const orderCfg = sortMap[sortBy] || sortMap.name_asc

            let q = supabase
                .from('students')
                .select(`*, classes (id, name)`, { count: 'exact' })
                .order(orderCfg.col, { ascending: orderCfg.asc })
                .range(from, to)
                .is('deleted_at', null)

            if (filterClasses.length === 1) q = q.eq('class_id', filterClasses[0])
            else if (filterClasses.length > 1) q = q.in('class_id', filterClasses)
            else if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterTag) q = q.contains('tags', [filterTag])

            if (filterMissing === 'photo') q = q.or('photo_url.is.null,photo_url.eq.""')
            else if (filterMissing === 'wa') q = q.or('phone.is.null,phone.eq.""')

            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%`)
            }

            if (filterPointMode === 'risk') q = q.lt('total_points', -30) // Hardcoded RiskThreshold
            else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
            else if (filterPointMode === 'custom') {
                if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
                if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
            }

            const { data, count, error } = await q
            if (error) throw error
            setStudents(data || [])
            setTotalRows(count || 0)
        } catch (err) {
            console.error('Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, sortBy, filterClass, filterClasses, filterGender, filterStatus, filterTag, filterMissing, debouncedSearch, filterPointMode, filterPointMin, filterPointMax])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('students').select('*').is('deleted_at', null)
            if (data) {
                const boys = data.filter(s => s.gender === 'L').length
                const girls = data.filter(s => s.gender === 'P').length
                const avgPoints = data.length > 0 ? Math.round(data.reduce((a, b) => a + (b.total_points || 0), 0) / data.length) : 0
                const risk = data.filter(s => (s.total_points || 0) <= -30).length
                const incompleteCount = data.filter(s => !s.photo_url || !s.nisn || !s.phone).length
                const noPhoneCount = data.filter(s => !s.phone).length
                
                setGlobalStats({ 
                    total: data.length, boys, girls, avgPoints, risk,
                    incompleteCount, noPhoneCount, worstClass: null, topPerformer: null 
                })
            }
        } catch (err) {
            console.error('Stats error:', err)
        }
    }, [])

    useEffect(() => {
        fetchData()
        fetchStats()
    }, [fetchData, fetchStats])

    return {
        students, setStudents,
        classesList,
        loading,
        totalRows,
        page, setPage,
        searchQuery, setSearchQuery,
        filterClass, setFilterClass,
        filterClasses, setFilterClasses,
        filterGender, setFilterGender,
        filterStatus, setFilterStatus,
        filterTag, setFilterTag,
        filterPointMode, setFilterPointMode,
        filterPointMin, setFilterPointMin,
        filterPointMax, setFilterPointMax,
        filterMissing, setFilterMissing,
        sortBy, setSortBy,
        globalStats,
        fetchData,
        fetchStats
    }
}
