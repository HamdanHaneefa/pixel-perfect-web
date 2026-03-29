import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface Todo {
  id: string
  text: string
  completed: boolean
  date: string // YYYY-MM-DD
  created_at: string
}

export function useTodos(date: string) {
  const { user } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true })
    if (data) setTodos(data)
  }, [user, date])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchTodos().finally(() => setLoading(false))
  }, [fetchTodos, user])

  const addTodo = useCallback(async (text: string) => {
    if (!user || !text.trim()) return
    const { data } = await supabase
      .from('todos')
      .insert({ user_id: user.id, text: text.trim(), completed: false, date })
      .select()
      .single()
    if (data) setTodos(prev => [...prev, data])
  }, [user, date])

  const toggleTodo = useCallback(async (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    await supabase.from('todos').update({ completed: !todo.completed }).eq('id', id)
  }, [todos])

  const deleteTodo = useCallback(async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
  }, [])

  return { todos, loading, addTodo, toggleTodo, deleteTodo }
}
