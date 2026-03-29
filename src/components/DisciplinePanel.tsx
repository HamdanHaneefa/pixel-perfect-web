import { useMemo } from "react"
import type { Habit, LogMap } from "@/hooks/useHabitData"

interface Props {
  habits: Habit[]
  logs: LogMap
  daysInMonth: number
  today: number // current day of month (for consistency weight)
  monthName: string
  year: number
}

function calcDisciplineScore(
  habits: Habit[],
  logs: LogMap,
  daysInMonth: number,
  today: number
): number {
  if (!habits.length || !today) return 0
  const effectiveDays = Math.min(today, daysInMonth)
  let totalPossible = 0, totalDone = 0, consistentDays = 0

  for (let d = 1; d <= effectiveDays; d++) {
    const doneToday = habits.filter(h => logs[h.id]?.[d]).length
    totalDone += doneToday
    totalPossible += habits.length
    if (habits.length > 0 && doneToday / habits.length >= 0.5) consistentDays++
  }

  const completionRate = totalPossible > 0 ? totalDone / totalPossible : 0
  const consistencyRate = effectiveDays > 0 ? consistentDays / effectiveDays : 0
  // weighted: 60% completion, 40% consistency
  const raw = completionRate * 0.6 + consistencyRate * 0.4
  return Math.round(raw * 100)
}

function getScoreLabel(score: number) {
  if (score >= 85) return { label: "Elite", color: "text-emerald-400" }
  if (score >= 70) return { label: "Strong", color: "text-blue-400" }
  if (score >= 50) return { label: "Building", color: "text-yellow-400" }
  if (score >= 30) return { label: "Struggling", color: "text-orange-400" }
  return { label: "Starting", color: "text-red-400" }
}

export default function DisciplinePanel({ habits, logs, daysInMonth, today, monthName, year }: Props) {
  const score = useMemo(
    () => calcDisciplineScore(habits, logs, daysInMonth, today),
    [habits, logs, daysInMonth, today]
  )
  const { label, color } = getScoreLabel(score)
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 min-w-[160px]">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Discipline Score</div>
      <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
        <svg width={96} height={96} viewBox="0 0 96 96">
          <g transform="rotate(-90 48 48)">
            <circle cx={48} cy={48} r={40} stroke="rgba(255,255,255,0.08)" strokeWidth={10} fill="none" />
            <circle cx={48} cy={48} r={40}
              stroke={score >= 70 ? "#34d399" : score >= 50 ? "#60a5fa" : score >= 30 ? "#fbbf24" : "#f87171"}
              strokeWidth={10} strokeLinecap="round" fill="none"
              strokeDasharray={circumference} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          </g>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black text-foreground leading-none">{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <div className={`text-sm font-bold ${color}`}>{label}</div>
      <div className="text-[10px] text-muted-foreground text-center leading-relaxed">
        {monthName} {year} · {today} days tracked
      </div>
    </div>
  )
}
