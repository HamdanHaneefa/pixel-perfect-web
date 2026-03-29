import type { Habit, LogMap } from "@/hooks/useHabitData"

interface Props {
  habits: Habit[]
  logs: LogMap
  today: number
  todayDate: string
  toggle: (habitId: string, day: number) => void
  getStreaks: (habitId: string, daysInMonth: number, today: number) => { current: number; best: number }
  daysInMonth: number
  weekColor: string
  stats: { dailyCompleted: Record<number, number>; totalCompleted: number; totalPossible: number }
  isDark: boolean
  onHabitSelect?: (habitId: string) => void
}

export default function TodayFocusMode({ habits, logs, today, toggle, getStreaks, daysInMonth, weekColor, stats, isDark, onHabitSelect }: Props) {
  const completedToday = habits.filter(h => logs[h.id]?.[today]).length
  const totalHabits = habits.length
  const pct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0

  // Build last 7 days bar data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = today - 6 + i
    if (d < 1) return null
    const done = habits.filter(h => logs[h.id]?.[d]).length
    return { day: d, done, pct: totalHabits > 0 ? (done / totalHabits) * 100 : 0 }
  }).filter(Boolean) as { day: number; done: number; pct: number }[]

  const barBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  return (
    <div className="space-y-3">
      {/* Today header card */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Today — Day {today}</div>
            <div className="text-2xl font-black text-foreground">{completedToday} <span className="text-base font-normal text-muted-foreground">/ {totalHabits} habits</span></div>
          </div>
          {/* Circular progress */}
          <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
            <svg width={64} height={64} viewBox="0 0 64 64">
              <g transform="rotate(-90 32 32)">
                <circle cx={32} cy={32} r={26} stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} strokeWidth={7} fill="none"/>
                <circle cx={32} cy={32} r={26} stroke={weekColor} strokeWidth={7} strokeLinecap="round"
                  fill="none" strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 - (pct / 100) * 2 * Math.PI * 26}
                  style={{ transition: 'stroke-dashoffset 0.7s ease' }}/>
              </g>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-foreground">{pct}%</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: barBg }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: weekColor }} />
        </div>
      </div>

      {/* Last 7 days mini bar chart */}
      {last7.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 text-muted-foreground" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 14l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Last {last7.length} days</span>
          </div>
          <div className="flex items-end gap-1.5 h-14">
            {last7.map(({ day, done, pct: p }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md relative" style={{ height: 40, backgroundColor: barBg }}>
                  <div className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-700"
                    style={{ height: `${p}%`, backgroundColor: day === today ? weekColor : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)') }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habit list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Habits</span>
        </div>
        <div className="divide-y divide-border">
          {habits.map(habit => {
            const done = logs[habit.id]?.[today] || false
            const { current, best } = getStreaks(habit.id, daysInMonth, today)
            const lostStreak = !done && current === 0 && best > 2

            return (
              <div
                key={habit.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors
                  ${done ? 'bg-emerald-950/10' : lostStreak ? 'bg-red-950/5' : 'hover:bg-secondary/30'}`}
              >
                {/* Checkbox only toggles */}
                <button
                  onClick={() => toggle(habit.id, today)}
                  className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all border-2 active:scale-90"
                  style={done
                    ? { backgroundColor: weekColor, borderColor: 'transparent' }
                    : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                  }>
                  {done && (
                    <svg viewBox="0 0 12 12" className="w-3 h-3">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>

                {/* Name — clicking navigates to tracker row, only text width */}
                <button
                  onClick={() => onHabitSelect?.(habit.id)}
                  className={`text-sm font-medium text-left transition-colors ${done ? 'line-through text-muted-foreground' : 'text-foreground hover:text-primary'}`}
                  title="Click to highlight in Tracker"
                >
                  {habit.name}
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Streak indicators */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {current > 0 && (
                    <div className="flex items-center gap-1 bg-orange-500/10 rounded-full px-2 py-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <span className="text-[10px] font-bold text-orange-400">{current}d</span>
                    </div>
                  )}
                  {best > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      <span className="text-[10px] text-muted-foreground">best {best}</span>
                    </div>
                  )}
                  {lostStreak && (
                    <span className="text-[10px] text-red-400 font-medium">lost {best}d</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
