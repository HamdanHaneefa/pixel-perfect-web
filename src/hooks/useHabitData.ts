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

  // Pending writes: key = "habitId:day", value = debounce timer + final value
  const pendingWrites = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; value: boolean }>>(new Map())
  // Flag to suppress realtime re-fetch when we triggered the change ourselves
  const suppressRealtimeRef = useRef(false)

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

  // ── Toggle a checkbox — optimistic + debounced DB write ──────────────────
  const toggle = useCallback((habitId: string, day: number) => {
    if (!user) return

    const key = `${habitId}:${day}`

    // Compute the new value based on current optimistic state
    setLogs(prev => {
      const current = prev[habitId]?.[day] ?? false
      const next = !current

      // Cancel any pending write for this cell and schedule a new one
      const existing = pendingWrites.current.get(key)
      if (existing) clearTimeout(existing.timer)

      const timer = setTimeout(async () => {
        pendingWrites.current.delete(key)
        suppressRealtimeRef.current = true
        await supabase.from('habit_logs').upsert({
          user_id: user.id,
          habit_id: habitId,
          year,
          month,
          day,
          completed: next,
        }, { onConflict: 'habit_id,year,month,day' })
        // Allow realtime again after a short buffer
        setTimeout(() => { suppressRealtimeRef.current = false }, 1000)
      }, 300)

      pendingWrites.current.set(key, { timer, value: next })

      return {
        ...prev,
        [habitId]: { ...prev[habitId], [day]: next },
      }
    })
  }, [user, year, month])

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
