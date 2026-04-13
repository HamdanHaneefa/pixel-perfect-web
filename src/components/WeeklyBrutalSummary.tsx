import { useMemo } from "react"
import type { Habit, LogMap } from "@/hooks/useHabitData"

interface WeekRange { label: string; days: number[]; dateRange: string }

interface Props {
  habits: Habit[]
  logs: LogMap
  weekRanges: WeekRange[]
  activeWeekIdx: number
  monthName: string
}

export default function WeeklyBrutalSummary({ habits, logs, weekRanges, activeWeekIdx, monthName }: Props) {
  const week = weekRanges[activeWeekIdx]

  const summary = useMemo(() => {
    if (!week || !habits.length) return null
    const totalPossible = week.days.length * habits.length
    let completed = 0, failed = 0, consistentDays = 0, wastedDays = 0

    week.days.forEach(d => {
      const done = habits.filter(h => logs[h.id]?.[d]).length
      completed += done
      failed += habits.length - done
      if (done === habits.length) consistentDays++
      if (done === 0) wastedDays++
    })

    const pct = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0
    return { completed, failed, totalPossible, consistentDays, wastedDays, pct, totalDays: week.days.length }
  }, [week, habits, logs])

  if (!summary) return null

  const isGood = summary.pct >= 70

  return (
    <div className={`rounded-xl border p-4 ${isGood ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{isGood ? "🏆" : "💀"}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-foreground">
          {week.label} Brutal Summary — {monthName}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-card/60 rounded-lg p-2.5 text-center">
          <div className="text-xl font-black text-primary">{summary.completed}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">habits done</div>
        </div>
        <div className="bg-card/60 rounded-lg p-2.5 text-center">
          <div className="text-xl font-black text-destructive">{summary.failed}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">times failed</div>
        </div>
        <div className="bg-card/60 rounded-lg p-2.5 text-center">
          <div className="text-xl font-black text-primary/70">{summary.consistentDays}/{summary.totalDays}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">consistent days</div>
        </div>
        <div className="bg-card/60 rounded-lg p-2.5 text-center">
          <div className={`text-xl font-black ${summary.wastedDays > 0 ? "text-destructive/70" : "text-primary"}`}>{summary.wastedDays}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">days wasted</div>
        </div>
      </div>
      <div className={`mt-3 text-xs font-semibold text-center rounded-lg py-2 px-3 ${isGood ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
        {summary.pct >= 90 && "You're absolutely crushing it. Keep going."}
        {summary.pct >= 70 && summary.pct < 90 && "Solid week. Push harder next one."}
        {summary.pct >= 50 && summary.pct < 70 && `You completed ${summary.completed} / ${summary.totalPossible} habits. More discipline needed.`}
        {summary.pct >= 30 && summary.pct < 50 && `You failed ${summary.failed} times. That's on you. Fix it.`}
        {summary.pct < 30 && `${summary.wastedDays} wasted days. You wasted ${summary.failed} opportunities. Wake up.`}
      </div>
    </div>
  )
}
