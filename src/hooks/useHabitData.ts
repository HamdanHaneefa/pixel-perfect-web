import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface Habit {
  id: string
  name: string
  order: number
  goal: number
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

  // Pending writes: keys that are in-flight to DB — realtime events for these are ignored
  const pendingKeys = useRef<Set<string>>(new Set())
  const writeQueue = useRef<Map<string, { habitId: string; day: number; value: boolean }>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stable ref to avoid stale closure in toggle
  const logsRef = useRef<LogMap>({})

  // Keep logsRef in sync without causing re-renders
  useEffect(() => { logsRef.current = logs }, [logs])

  const flushWrites = useCallback(async () => {
    if (!user || writeQueue.current.size === 0) return
    const batch = Array.from(writeQueue.current.values())
    writeQueue.current.clear()

    await supabase.from('habit_logs').upsert(
      batch.map(({ habitId, day, value }) => ({
        user_id: user.id,
        habit_id: habitId,
        year,
        month,
        day,
        completed: value,
      })),
      { onConflict: 'habit_id,year,month,day' }
    )

    // Only clear pending keys after DB confirms — prevents realtime from overwriting
    batch.forEach(({ habitId, day }) => pendingKeys.current.delete(`${habitId}:${day}`))
  }, [user, year, month])

  // ── Fetch habits ──────────────────────────────────────────────────────────
  const fetchHabits = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('habits')
      .select('id, name, order, goal')
      .eq('user_id', user.id)
      .order('order', { ascending: true })
    if (data) setHabits(data)
    return data
  }, [user])

  const seedDefaultHabits = useCallback(async () => {
    if (!user) return
    await supabase.from('habits').insert(
      DEFAULT_HABITS.map((name, i) => ({ user_id: user.id, name, order: i, goal: 0 }))
    )
  }, [user])

  // ── Fetch logs — merges with optimistic state, never overwrites pending keys ──
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
      // Start from DB data
      data.forEach(row => {
        if (!next[row.habit_id]) next[row.habit_id] = {}
        next[row.habit_id][row.day] = row.completed
      })
      // Re-apply any pending optimistic values — DB data must not win over in-flight writes
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
    ;(async () => {
      const data = await fetchHabits()
      if (data && data.length === 0) {
        await seedDefaultHabits()
        await fetchHabits()
      }
      await fetchLogs()
      setLoading(false)
    })()
  }, [fetchHabits, fetchLogs, seedDefaultHabits, user])

  // ── Realtime: habits ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`habits:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${user.id}` },
        () => fetchHabits())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchHabits])

  // ── Realtime: habit_logs — surgical merge, never overwrites pending ────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`habit_logs:${user.id}:${year}:${month}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        // Surgical update: only touch the specific row that changed
        const row = (payload.new ?? payload.old) as { habit_id?: string; day?: number; completed?: boolean } | null
        if (!row?.habit_id || row.day == null) return

        const key = `${row.habit_id}:${row.day}`
        // If we have a pending write for this cell, ignore the DB event — our optimistic value wins
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

  // ── Toggle — instant optimistic, zero flicker, future days blocked ──────
  const toggle = useCallback((habitId: string, day: number, onFutureDayBlocked?: () => void) => {
    if (!user) return

    // Block future days on the client — compare against today in the current month/year
    const now = new Date()
    const todayYear = now.getFullYear()
    const todayMonth = now.getMonth() // 0-indexed
    const todayDay = now.getDate()

    const isFutureDay =
      year > todayYear ||
      (year === todayYear && month > todayMonth) ||
      (year === todayYear && month === todayMonth && day > todayDay)

    if (isFutureDay) {
      onFutureDayBlocked?.()
      return
    }

    const key = `${habitId}:${day}`

    setLogs(prev => {
      const current = prev[habitId]?.[day] ?? false
      const next = !current

      pendingKeys.current.add(key)
      writeQueue.current.set(key, { habitId, day, value: next })

      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null
        flushWrites()
      }, 300)

      return {
        ...prev,
        [habitId]: { ...prev[habitId], [day]: next },
      }
    })
  }, [user, year, month, flushWrites])

  // ── Add habit ─────────────────────────────────────────────────────────────
  const addHabit = useCallback(async (name: string) => {
    if (!user) return
    const nextOrder = habits.length > 0 ? Math.max(...habits.map(h => h.order)) + 1 : 0
    await supabase.from('habits').insert({ user_id: user.id, name, order: nextOrder, goal: 0 })
  }, [user, habits])

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

  // ── Streak calculation ────────────────────────────────────────────────────
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
