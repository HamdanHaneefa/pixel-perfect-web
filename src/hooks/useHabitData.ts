import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface Habit {
  id: string
  name: string
  order: number
  goal: number  // 0 = use days-in-month as default
}

export type LogMap = Record<string, Record<number, boolean>> // habit_id -> day -> completed

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

  // Write queue: key = "habitId:day" -> final boolean value
  // A single shared flush timer batches ALL pending cell changes into one upsert
  const writeQueue = useRef<Map<string, { habitId: string; day: number; value: boolean }>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressRealtimeRef = useRef(false)

  const flushWrites = useCallback(async () => {
    if (!user || writeQueue.current.size === 0) return
    const batch = Array.from(writeQueue.current.values())
    writeQueue.current.clear()
    suppressRealtimeRef.current = true
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
    setTimeout(() => { suppressRealtimeRef.current = false }, 1000)
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

  // ── Seed default habits for new users ─────────────────────────────────────
  const seedDefaultHabits = useCallback(async () => {
    if (!user) return
    await supabase.from('habits').insert(
      DEFAULT_HABITS.map((name, i) => ({ user_id: user.id, name, order: i, goal: 0 }))
    )
  }, [user])

  // ── Fetch logs for current month ──────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('habit_logs')
      .select('habit_id, day, completed')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
    if (data) {
      const map: LogMap = {}
      data.forEach(row => {
        if (!map[row.habit_id]) map[row.habit_id] = {}
        map[row.habit_id][row.day] = row.completed
      })
      setLogs(map)
    }
  }, [user, year, month])

  // ── Initial load — seed defaults if new user ──────────────────────────────
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

  // ── Realtime: habits changes ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`habits:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'habits',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchHabits())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchHabits])

  // ── Realtime: habit_logs changes — skip if we triggered it ───────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`habit_logs:${user.id}:${year}:${month}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'habit_logs',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        // If we triggered this change ourselves, skip the re-fetch
        if (suppressRealtimeRef.current) return
        fetchLogs()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, year, month, fetchLogs])

  // ── Toggle a checkbox — instant optimistic update + batched DB flush ─────
  const toggle = useCallback((habitId: string, day: number) => {
    if (!user) return

    // Update UI instantly using functional update to always read latest state
    setLogs(prev => {
      const current = prev[habitId]?.[day] ?? false
      const next = !current

      // Queue this write — overwrites any previous pending value for same cell
      writeQueue.current.set(`${habitId}:${day}`, { habitId, day, value: next })

      // Reset the shared flush timer — all queued writes go out together
      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null
        flushWrites()
      }, 400)

      return {
        ...prev,
        [habitId]: { ...prev[habitId], [day]: next },
      }
    })
  }, [user, flushWrites])

  // ── Add a habit ───────────────────────────────────────────────────────────
  const addHabit = useCallback(async (name: string) => {
    if (!user) return
    const nextOrder = habits.length > 0 ? Math.max(...habits.map(h => h.order)) + 1 : 0
    await supabase.from('habits').insert({ user_id: user.id, name, order: nextOrder, goal: 0 })
  }, [user, habits])

  // ── Rename a habit ────────────────────────────────────────────────────────
  const renameHabit = useCallback(async (id: string, name: string) => {
    await supabase.from('habits').update({ name }).eq('id', id)
  }, [])

  // ── Delete a habit ────────────────────────────────────────────────────────
  const deleteHabit = useCallback(async (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id))
    await supabase.from('habits').delete().eq('id', id)
  }, [])

  // ── Update goal ───────────────────────────────────────────────────────────
  const updateGoal = useCallback(async (id: string, goal: number) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, goal } : h))
    await supabase.from('habits').update({ goal }).eq('id', id)
  }, [])

  return { habits, logs, loading, toggle, addHabit, renameHabit, deleteHabit, updateGoal }
}
