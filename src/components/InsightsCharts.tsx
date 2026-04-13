import { useMemo, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, RadialBarChart,
  RadialBar, Legend, LineChart, Line,
} from "recharts"
import type { Habit, LogMap } from "@/hooks/useHabitData"

const ACCENT = [
  "hsl(183, 62%, 19%)",
  "hsl(183, 50%, 28%)",
  "hsl(183, 42%, 38%)",
  "hsl(183, 38%, 48%)",
  "hsl(183, 32%, 58%)",
  "hsl(183, 55%, 23%)",
]

// ── Shared tooltip style ──────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, suffix = "%" }: {
  active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string; suffix?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name ?? 'Value'}:</span>
          <span className="font-bold text-foreground">{p.value}{suffix}</span>
        </div>
      ))}
    </div>
  )
}

// ── 1. Monthly completion area/line chart ─────────────────────────────────
export function MonthlyLineChart({ habits, logs, daysInMonth, today, monthName, isDark }: {
  habits: Habit[]; logs: LogMap; daysInMonth: number; today: number; monthName: string; isDark: boolean
}) {
  const data = useMemo(() => {
    const result = []
    for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
      const done = habits.filter(h => logs[h.id]?.[d]).length
      const pct = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0
      result.push({ day: `${d}`, pct, done, total: habits.length })
    }
    return result
  }, [habits, logs, daysInMonth, today])

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth="1.7">
            <path d="M3 14l4-5 3 3 4-5 3 3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily Completion Rate</span>
        </div>
        <span className="text-xs text-muted-foreground">{monthName}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT[0]} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={ACCENT[0]} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} interval={3}/>
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`}/>
          <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ stroke: ACCENT[0], strokeWidth: 1, strokeDasharray: "4 4" }}/>
          <Area type="monotone" dataKey="pct" name="Completion" stroke={ACCENT[0]} strokeWidth={2.5}
            fill="url(#areaGrad)" dot={false} activeDot={{ r: 5, fill: ACCENT[0], stroke: "white", strokeWidth: 2 }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 2. Per-habit progress bar chart ──────────────────────────────────────
export function HabitProgressBars({ habits, logs, daysInMonth, isDark }: {
  habits: Habit[]; logs: LogMap; daysInMonth: number; isDark: boolean
}) {
  const data = useMemo(() =>
    habits.map((h, i) => {
      let done = 0
      for (let d = 1; d <= daysInMonth; d++) if (logs[h.id]?.[d]) done++
      const goal = h.goal > 0 ? h.goal : daysInMonth
      return {
        name: h.name.length > 18 ? h.name.slice(0, 16) + "…" : h.name,
        pct: goal > 0 ? Math.round((done / goal) * 100) : 0,
        done, goal,
        color: ACCENT[i % ACCENT.length],
      }
    }).sort((a, b) => b.pct - a.pct),
    [habits, logs, daysInMonth]
  )

  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="10" width="3" height="7" rx="1"/><rect x="8.5" y="6" width="3" height="11" rx="1"/><rect x="14" y="2" width="3" height="15" rx="1"/>
        </svg>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Habit Progress</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(habits.length * 32, 120)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false}/>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`}/>
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} width={110}/>
          <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}/>
          <Bar dataKey="pct" name="Progress" radius={[0, 6, 6, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 3. Weekly trend line chart ────────────────────────────────────────────
export function WeeklyTrendChart({ weekRanges, weeklyCompleted, weeklyTotal, isDark }: {
  weekRanges: { label: string; dateRange: string }[]
  weeklyCompleted: number[]; weeklyTotal: number[]; isDark: boolean
}) {
  const data = weekRanges.map((w, i) => ({
    week: w.label,
    pct: weeklyTotal[i] > 0 ? Math.round((weeklyCompleted[i] / weeklyTotal[i]) * 100) : 0,
    done: weeklyCompleted[i],
    range: w.dateRange,
  }))

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth="1.7">
          <path d="M3 17V7l4-4 4 4 4-4v14" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Weekly Trend</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false}/>
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`}/>
          <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ stroke: ACCENT[1], strokeWidth: 1, strokeDasharray: "4 4" }}/>
          <Line type="monotone" dataKey="pct" name="Completion" stroke={ACCENT[1]} strokeWidth={2.5}
            dot={{ r: 5, fill: ACCENT[1], stroke: "white", strokeWidth: 2 }}
            activeDot={{ r: 7, fill: ACCENT[1], stroke: "white", strokeWidth: 2 }}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 4. Discipline score radial + streak leaderboard ───────────────────────
export function DisciplineCard({ score, monthName, year, today, isDark }: {
  score: number; monthName: string; year: number; today: number; isDark: boolean
}) {
  const scoreColor = score >= 70 ? "hsl(183, 62%, 19%)" : score >= 50 ? "hsl(183, 42%, 38%)" : score >= 30 ? "hsl(183, 32%, 58%)" : "hsl(0, 84%, 58%)"
  const scoreLabel = score >= 85 ? "Elite" : score >= 70 ? "Strong" : score >= 50 ? "Building" : score >= 30 ? "Struggling" : "Starting"
  const trackColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"

  const radialData = [{ name: "Score", value: score, fill: scoreColor }]

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
        <ResponsiveContainer width={110} height={110}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="100%"
            startAngle={90} endAngle={-270} data={radialData} barSize={10}>
            <RadialBar background={{ fill: trackColor }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-foreground leading-none">{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Discipline Score</div>
        <div className="text-2xl font-black leading-none" style={{ color: scoreColor }}>{scoreLabel}</div>
        <div className="text-xs text-muted-foreground mt-2">{monthName} {year}</div>
        <div className="text-xs text-muted-foreground">{today} days tracked</div>
      </div>
    </div>
  )
}

// ── 5. Streak leaderboard ─────────────────────────────────────────────────
export function StreakLeaderboard({ habits, logs, daysInMonth, today, getStreaks, isDark }: {
  habits: Habit[]; logs: LogMap; daysInMonth: number; today: number
  getStreaks: (id: string, dim: number, today: number) => { current: number; best: number }
  isDark: boolean
}) {
  const streaks = useMemo(() =>
    habits.map(h => ({ name: h.name, ...getStreaks(h.id, daysInMonth, today) }))
      .sort((a, b) => b.current - a.current || b.best - a.best),
    [habits, getStreaks, daysInMonth, today]
  )

  const maxBest = Math.max(...streaks.map(s => s.best), 1)

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth="1.7">
          <path d="M10 2c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Streak Board</span>
      </div>
      {streaks.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6">Complete habits to build streaks</div>
      )}
      <div className="space-y-3">
        {streaks.map((s, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground truncate max-w-[60%]">{s.name}</span>
              <div className="flex items-center gap-3 text-[10px]">
                {s.current > 0 && (
                  <span className="font-bold text-orange-400 flex items-center gap-1">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8 1c0 3-3 4.5-3 7.5a3 3 0 006 0C11 5.5 8 4 8 1z"/></svg>
                    {s.current}d
                  </span>
                )}
                <span className="text-muted-foreground">best <span className="font-semibold text-foreground">{s.best}d</span></span>
              </div>
            </div>
            {/* Best streak bar */}
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(s.best / maxBest) * 100}%`, backgroundColor: ACCENT[i % ACCENT.length] }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 6. Weekly summary stat cards ──────────────────────────────────────────
export function WeeklySummaryCards({ habits, logs, week, weekLabel }: {
  habits: Habit[]; logs: LogMap
  week: { label: string; days: number[] }; weekLabel: string
}) {
  const s = useMemo(() => {
    let completed = 0, failed = 0, perfectDays = 0, wastedDays = 0
    week.days.forEach(d => {
      const done = habits.filter(h => logs[h.id]?.[d]).length
      completed += done; failed += habits.length - done
      if (done === habits.length && habits.length > 0) perfectDays++
      if (done === 0) wastedDays++
    })
    const total = week.days.length * habits.length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, failed, perfectDays, wastedDays, pct, totalDays: week.days.length }
  }, [week, habits, logs])

  const isGood = s.pct >= 60
  const items = [
    { label: "Completed", value: s.completed, color: "hsl(183, 62%, 19%)" },
    { label: "Missed", value: s.failed, color: "hsl(0, 84%, 58%)" },
    { label: "Perfect days", value: `${s.perfectDays}/${s.totalDays}`, color: "hsl(183, 50%, 28%)" },
    { label: "Wasted days", value: s.wastedDays, color: s.wastedDays > 0 ? "hsl(0, 84%, 58%)" : "hsl(183, 62%, 19%)" },
  ]

  return (
    <div className={`border rounded-xl p-4 ${isGood ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 2v4M13 2v4M3 9h14" strokeLinecap="round"/>
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{weekLabel}</span>
        </div>
        <span className="text-sm font-black" style={{ color: isGood ? "hsl(183, 62%, 19%)" : "hsl(0, 84%, 58%)" }}>{s.pct}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className="bg-card/60 rounded-lg p-2.5 text-center">
            <div className="text-xl font-black leading-none mb-0.5" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[10px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] font-medium text-center rounded-lg py-1.5 px-2"
        style={{ backgroundColor: isGood ? "hsl(183, 62%, 19%, 0.08)" : "rgba(248,113,113,0.08)", color: isGood ? "hsl(183, 62%, 19%)" : "hsl(0, 84%, 58%)" }}>
        {s.pct >= 90 && "Exceptional week. You're building real discipline."}
        {s.pct >= 70 && s.pct < 90 && "Strong week. Keep the momentum going."}
        {s.pct >= 50 && s.pct < 70 && "Decent effort. Push harder next week."}
        {s.pct >= 30 && s.pct < 50 && `${s.failed} missed habits. Consistency is the key.`}
        {s.pct < 30 && `${s.wastedDays} wasted days. Time to get serious.`}
      </div>
    </div>
  )
}
