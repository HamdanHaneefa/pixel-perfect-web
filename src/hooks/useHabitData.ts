import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface Habit {
  id: string
  name: string
  order: number
}

export type LogMap = Record<string, Record<number, boolean>> // habit_id -> day -> completed

export function useHabitData(year: number, month: number) {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<LogMap>({})
  const [loading, setLoading] = useState(true)

  // ── Fetch habits ──────────────────────────────────────────────────────────
  const fetchHabits = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('habits')
      .select('id, name, order')
      .eq('user_id', user.id)
      .order('order', { ascending: true })
    if (data) setHabits(data)
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

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([fetchHabits(), fetchLogs()]).finally(() => setLoading(false))
  }, [fetchHabits, fetchLogs, user])

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

  // ── Realtime: habit_logs changes ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`habit_logs:${user.id}:${year}:${month}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'habit_logs',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchLogs())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, year, month, fetchLogs])

  // ── Toggle a checkbox ─────────────────────────────────────────────────────
  const toggle = useCallback(async (habitId: string, day: number) => {
    if (!user) return
    const current = logs[habitId]?.[day] ?? false
    // Optimistic update
    setLogs(prev => ({
      ...prev,
      [habitId]: { ...prev[habitId], [day]: !current },
    }))
    await supabase.from('habit_logs').upsert({
      user_id: user.id,
      habit_id: habitId,
      year,
      month,
      day,
      completed: !current,
    }, { onConflict: 'habit_id,year,month,day' })
  }, [user, logs, year, month])

  // ── Add a habit ───────────────────────────────────────────────────────────
  const addHabit = useCallback(async (name: string) => {
    if (!user) return
    const nextOrder = habits.length > 0 ? Math.max(...habits.map(h => h.order)) + 1 : 0
    await supabase.from('habits').insert({ user_id: user.id, name, order: nextOrder })
  }, [user, habits])

  // ── Rename a habit ────────────────────────────────────────────────────────
  const renameHabit = useCallback(async (id: string, name: string) => {
    await supabase.from('habits').update({ name }).eq('id', id)
  }, [])

  return { habits, logs, loading, toggle, addHabit, renameHabit }
}
