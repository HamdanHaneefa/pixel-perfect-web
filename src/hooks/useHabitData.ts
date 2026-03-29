import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface Habit {
  id: string
  name: string
  order: number
  goal: number
  year: number
  month: number
}

export type LogMap = Record<string, Record<number, boolean>>

const DEFAULT_HABITS = [
  'Wake up at 05:00 ⏰',
  'Gym 💪',
  'No porn 💦🚫',
  'Read 20 Pages 📖',
  'Goal Journaling ✍️',
  'No Alcohol 🍾',
  'Sleep by 10 PM 💤',
  'Learn New Skill 🔑',
  'Eat healthy 🍽️',
  'Cold shower 🚿',
]

export function useHabitData(year: number, month: number) {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<LogMap>({})
  const [loading, setLoading] = useState(true)

  const pendingKeys = useRef<Set<string>>(new Set())
  const writeQueue = useRef<Map<string, { habitId: string; day: number; value: boolean }>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logsRef = useRef<LogMap>({})
  useEffect(() => { logsRef.current = logs }, [logs])

  const flushWrites = useCallback(async () => {
    if (!user || writeQueue.current.size === 0) return
    const batch = Array.from(writeQueue.current.values())
    writeQueue.current.clear()
    await supabase.from('habit_logs').upsert(
      batch.map(({ habitId, day, value }) => ({
        user_id: user.id, habit_id: habitId, year, month, day, completed: value,
      })),
      { onConflict: 'habit_id,year,month,day' }
    )
    batch.forEach(({ habitId, day }) => pendingKeys.current.delete(`${habitId}:${day}`))
  }, [user, year, month])

  // ── Fetch habits for this specific month ──────────────────────────────────
  const fetchHabits = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('habits')
      .select('id, name, order, goal, year, month')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .order('order', { ascending: true })
    if (data) setHabits(data)
    return data
  }, [user, year, month])

  // ── Seed habits for a new month ───────────────────────────────────────────
  // Priority: copy from previous month → fallback to defaults
  const seedHabitsForMonth = useCallback(async () => {
    if (!user) return

    // Try to get previous month's habits
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year

    const { data: prevHabits } = await supabase
      .from('habits')
      .select('name, order, goal')
      .eq('user_id', user.id)
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .order('order', { ascending: true })

    const source = prevHabits && prevHabits.length > 0
      ? prevHabits
      : DEFAULT_HABITS.map((name, i) => ({ name, order: i, goal: 0 }))

    await supabase.from('habits').insert(
      source.map((h, i) => ({
        user_id: user.id,
        name: h.name,
        order: h.order ?? i,
        goal: h.goal ?? 0,
        year,
        month,
      }))
    )
  }, [user, year, month])

  // ── Fetch logs ────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('habit_logs')
      .select('habit_id, day, completed')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
    if (!data) return

    setLogs(prev => {
      const next: LogMap = {}
      data.forEach(row => {
        if (!next[row.habit_id]) next[row.habit_id] = {}
        next[row.habit_id][row.day] = row.completed
      })
      pendingKeys.current.forEach(key => {
        const [habitId, dayStr] = key.split(':')
        const day = parseInt(dayStr)
        const optimistic = prev[habitId]?.[day]
        if (optimistic !== undefined) {
          if (!next[habitId]) next[habitId] = {}
          next[habitId][day] = optimistic
        }
      })
      return next
    })
  }, [user, year, month])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setLoading(true)
    setHabits([])
    setLogs({})
    ;(async () => {
      const data = await fetchHabits()
      if (data && data.length === 0) {
        await seedHabitsForMonth()
        await fetchHabits()
      }
      await fetchLogs()
      setLoading(false)
    })()
  }, [fetchHabits, fetchLogs, seedHabitsForMonth, user])

  // ── Realtime: habits for this month ──────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`habits:${user.id}:${year}:${month}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${user.id}`,
      }, () => fetchHabits())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, year, month, fetchHabits])

  // ── Realtime: habit_logs ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`habit_logs:${user.id}:${year}:${month}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = (payload.new ?? payload.old) as { habit_id?: string; day?: number; completed?: boolean } | null
        if (!row?.habit_id || row.day == null) return
        const key = `${row.habit_id}:${row.day}`
        if (pendingKeys.current.has(key)) return
        const completed = payload.eventType === 'DELETE' ? false : (row.completed ?? false)
        setLogs(prev => ({
          ...prev,
          [row.habit_id!]: { ...prev[row.habit_id!], [row.day!]: completed },
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, year, month])

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback((habitId: string, day: number, onFutureDayBlocked?: () => void) => {
    if (!user) return
    const now = new Date()
    const isFutureDay =
      year > now.getFullYear() ||
      (year === now.getFullYear() && month > now.getMonth()) ||
      (year === now.getFullYear() && month === now.getMonth() && day > now.getDate())
    if (isFutureDay) { onFutureDayBlocked?.(); return }

    const key = `${habitId}:${day}`
    setLogs(prev => {
      const next = !(prev[habitId]?.[day] ?? false)
      pendingKeys.current.add(key)
      writeQueue.current.set(key, { habitId, day, value: next })
      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(() => { flushTimer.current = null; flushWrites() }, 300)
      return { ...prev, [habitId]: { ...prev[habitId], [day]: next } }
    })
  }, [user, year, month, flushWrites])

  // ── Add habit — scoped to this month ─────────────────────────────────────
  const addHabit = useCallback(async (name: string) => {
    if (!user) return
    const nextOrder = habits.length > 0 ? Math.max(...habits.map(h => h.order)) + 1 : 0
    await supabase.from('habits').insert({ user_id: user.id, name, order: nextOrder, goal: 0, year, month })
  }, [user, habits, year, month])

  const renameHabit = useCallback(async (id: string, name: string) => {
    await supabase.from('habits').update({ name }).eq('id', id)
  }, [])

  const deleteHabit = useCallback(async (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id))
    await supabase.from('habits').delete().eq('id', id)
  }, [])

  const updateGoal = useCallback(async (id: string, goal: number) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, goal } : h))
    await supabase.from('habits').update({ goal }).eq('id', id)
  }, [])

  const getStreaks = useCallback((habitId: string, daysInMonth: number, today: number) => {
    let current = 0
    for (let d = today; d >= 1; d--) {
      if (logs[habitId]?.[d]) current++
      else break
    }
    let best = 0, run = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (logs[habitId]?.[d]) { run++; best = Math.max(best, run) }
      else run = 0
    }
    return { current, best }
  }, [logs])

  return { habits, logs, loading, toggle, addHabit, renameHabit, deleteHabit, updateGoal, getStreaks }
}
