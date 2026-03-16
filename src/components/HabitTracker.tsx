import { useState, useMemo, useCallback, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_HABITS = [
  "Wake up at 05:00",
  "Gym",
  "No porn",
  "Read 20 Pages",
  "Goal Journaling",
  "No Alcohol",
  "Eat health",
  "Cold shower",
  "Sleep by 10 PM",
  "Learn New Skill",
];

const YEAR = 2026;

const MONTHS = [
  { value: "2", label: "March 2026", name: "March", days: 31 },
  { value: "3", label: "April 2026", name: "April", days: 30 },
  { value: "4", label: "May 2026", name: "May", days: 31 },
  { value: "5", label: "June 2026", name: "June", days: 30 },
  { value: "6", label: "July 2026", name: "July", days: 31 },
  { value: "7", label: "August 2026", name: "August", days: 31 },
  { value: "8", label: "September 2026", name: "September", days: 30 },
  { value: "9", label: "October 2026", name: "October", days: 31 },
  { value: "10", label: "November 2026", name: "November", days: 30 },
  { value: "11", label: "December 2026", name: "December", days: 31 },
];

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayNames(monthIdx: number, year: number, daysInMonth: number) {
  const names: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIdx, d);
    names.push(DAY_ABBR[date.getDay()]);
  }
  return names;
}

function getWeekRanges(daysInMonth: number, monthName: string) {
  const colors = ["bg-week1", "bg-week2", "bg-week3", "bg-week4", "bg-week5"];
  const ranges: { label: string; days: number[]; color: string; dateRange: string }[] = [];
  let day = 1;
  let weekNum = 1;
  while (day <= daysInMonth) {
    const start = day;
    const end = Math.min(day + 6, daysInMonth);
    const days = [];
    for (let d = start; d <= end; d++) days.push(d);
    const mo = monthName.substring(0, 3);
    ranges.push({
      label: `Week ${weekNum}`,
      days,
      color: colors[(weekNum - 1) % 5],
      dateRange: `${String(start).padStart(2, "0")} – ${String(end).padStart(2, "0")} ${mo}`,
    });
    day = end + 1;
    weekNum++;
  }
  return ranges;
}

const WEEK_COLORS_BG = [
  "bg-week1", "bg-week2", "bg-week3", "bg-week4", "bg-week5", "bg-weekMonthly",
];

const WEEK_COLORS_TEXT = [
  "text-week1", "text-week2", "text-week3", "text-week4", "text-week5", "text-weekMonthly",
];

const WEEK_HSL_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(271, 81%, 56%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(300, 64%, 49%)",
];

// Light background tints for week panels and unchecked boxes
const WEEK_HSL_BG_LIGHT = [
  // a bit darker to increase contrast (user requested slightly stronger tint)
  "hsl(221, 83%, 86%)",
  "hsl(271, 81%, 86%)",
  "hsl(0, 84%, 87%)",
  "hsl(45, 93%, 87%)",
  "hsl(142, 71%, 87%)",
  "hsl(300, 64%, 87%)",
];

type HabitData = Record<string, Record<number, boolean>>;

export default function HabitTracker() {
  const [selectedMonth, setSelectedMonth] = useState("2"); // March = index 2
  const monthInfo = MONTHS.find(m => m.value === selectedMonth)!;
  const monthIdx = parseInt(selectedMonth);
  const daysInMonth = monthInfo.days;
  const monthName = monthInfo.name;

  const dayNames = useMemo(() => getDayNames(monthIdx, YEAR, daysInMonth), [monthIdx, daysInMonth]);
  const weekRanges = useMemo(() => getWeekRanges(daysInMonth, monthName), [daysInMonth, monthName]);

  const [habits, setHabits] = useState<string[]>(() => {
    const saved = localStorage.getItem("habit-tracker-habits");
    if (saved) return JSON.parse(saved);
    return [...DEFAULT_HABITS];
  });

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add-habit UI state
  const [showAddRow, setShowAddRow] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const storageKey = `habit-tracker-data-${YEAR}-${selectedMonth}`;
  const [data, setData] = useState<HabitData>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    const init: HabitData = {};
    habits.forEach(h => { init[h] = {}; });
    return init;
  });

  // Start showing the add-new-habit row and focus input
  const startAdd = () => {
    setShowAddRow(true);
    setTimeout(() => addInputRef.current?.focus(), 50);
  };

  const cancelAdd = () => {
    setShowAddRow(false);
    setNewHabitName("");
  };

  const saveNewHabit = () => {
    const name = newHabitName.trim();
    if (!name) return;
    // append to habits
    setHabits(prev => {
      const nextHabits = [...prev, name];
      localStorage.setItem("habit-tracker-habits", JSON.stringify(nextHabits));
      return nextHabits;
    });
    // initialize data for the new habit
    setData(prev => {
      const next = { ...prev, [name]: {} };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    setShowAddRow(false);
    setNewHabitName("");
  };

  // Reload data when month changes
  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    const key = `habit-tracker-data-${YEAR}-${val}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setData(JSON.parse(saved));
    } else {
      const init: HabitData = {};
      habits.forEach(h => { init[h] = {}; });
      setData(init);
    }
  };

  const toggle = (habit: string, day: number) => {
    setData(prev => {
      const next = { ...prev, [habit]: { ...prev[habit], [day]: !prev[habit]?.[day] } };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const startEditing = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(habits[idx]);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const oldName = habits[editingIdx];
    const newName = editValue.trim() || oldName;
    if (newName !== oldName) {
      const newHabits = [...habits];
      newHabits[editingIdx] = newName;
      setHabits(newHabits);
      localStorage.setItem("habit-tracker-habits", JSON.stringify(newHabits));
      // Migrate data
      setData(prev => {
        const next = { ...prev };
        if (next[oldName]) {
          next[newName] = next[oldName];
          delete next[oldName];
        }
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    }
    setEditingIdx(null);
  };

  const stats = useMemo(() => {
    const dailyCompleted: Record<number, number> = {};
    const dailyIncomplete: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      let c = 0;
      habits.forEach(h => { if (data[h]?.[d]) c++; });
      dailyCompleted[d] = c;
      dailyIncomplete[d] = habits.length - c;
    }

    const weeklyCompleted = weekRanges.map(w => {
      let total = 0;
      w.days.forEach(d => { total += dailyCompleted[d]; });
      return total;
    });

    const weeklyTotal = weekRanges.map(w => w.days.length * habits.length);
    const totalCompleted = Object.values(dailyCompleted).reduce((a, b) => a + b, 0);
    const totalPossible = daysInMonth * habits.length;

    return { dailyCompleted, dailyIncomplete, weeklyCompleted, weeklyTotal, totalCompleted, totalPossible };
  }, [data, daysInMonth, habits, weekRanges]);

  const habitProgress = (habit: string) => {
    let c = 0;
    for (let d = 1; d <= daysInMonth; d++) { if (data[habit]?.[d]) c++; }
    return c;
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 overflow-x-auto">
      {/* Title with month selector */}
      <div className="bg-tracker-header text-tracker-header-foreground flex items-center justify-between py-2 px-4 rounded-t font-bold text-sm sm:text-base">
        <span>📅 {monthName} {YEAR} — Habit Tracker</span>
        <div className="flex items-center gap-2">
          <button
            onClick={startAdd}
            className="text-xxs sm:text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            aria-label="Add Habit"
          >
            + Add Habit
          </button>
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
           <SelectTrigger className="w-[160px] h-7 text-xs bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground">
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             {MONTHS.map(m => (
               <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
             ))}
           </SelectContent>
         </Select>
        </div>
       </div>

      {/* Main Grid */}
      <div className="overflow-x-auto border border-border rounded-b">
        <table className="w-full border-collapse text-xxs sm:text-xs tabular-nums min-w-[900px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 min-w-[120px]"></th>
              {weekRanges.map((w, wi) => (
                <th
                  key={w.label}
                  colSpan={w.days.length}
                  className={`border border-border p-1 text-center font-semibold`} 
                  style={{ backgroundColor: WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length], color: '#fff' }}
                >
                  {w.label}
                </th>
              ))}
              <th className="bg-card border border-border p-1 text-center font-semibold text-foreground" rowSpan={2}>Goal</th>
              <th className="bg-card border border-border p-1 text-center font-semibold text-foreground" rowSpan={2}>Progress</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 text-left font-semibold text-foreground">Habits</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const weekIdx = weekRanges.findIndex(w => w.days.includes(d));
                return (
                  <th key={d} className={`border border-border p-0.5 text-center font-medium text-primary-foreground`} style={{ backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length], color: '#1f2937' }}>
                     <div>{d}</div>
                   </th>
                 );
               })}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 text-left text-muted-foreground font-normal">Days</th>
              {dayNames.map((dn, i) => {
                const weekIdx = weekRanges.findIndex(w => w.days.includes(i + 1));
                return (
                  <th key={i} className={`border border-border p-0.5 text-center font-normal text-primary-foreground`} style={{ backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length], color: '#6b7280' }}>
                    {dn}
                  </th>
                 );
               })}
              <th className="bg-card border border-border p-1"></th>
              <th className="bg-card border border-border p-1"></th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit, hi) => (
              <tr key={hi} className={hi % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                <td
                  className="sticky left-0 z-10 border border-border p-1 font-medium text-foreground whitespace-nowrap cursor-pointer"
                  style={{ backgroundColor: hi % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.3)' }}
                  onDoubleClick={() => startEditing(hi)}
                >
                  {editingIdx === hi ? (
                    <input
                      className="bg-transparent border-b border-primary outline-none w-full text-foreground text-xxs sm:text-xs"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingIdx(null); }}
                      autoFocus
                    />
                  ) : (
                    <span title="Double-click to edit">{hi + 1}. {habit}</span>
                  )}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const checked = data[habit]?.[d] || false;
                  const weekIdx = weekRanges.findIndex(w => w.days.includes(d));
                  return (
                    <td key={d} className="border border-border p-0 text-center" style={{ backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length] }}>
                      <button
                        onClick={() => toggle(habit, d)}
                        className={`w-full h-full flex items-center justify-center p-0.5 transition-colors duration-100`}
                        aria-label={`${habit} day ${d}`}
                      >
                        <span
                          className={`inline-flex w-3.5 h-3.5 rounded-sm items-center justify-center transition-all duration-150`} 
                          style={checked
                            ? { backgroundColor: WEEK_HSL_COLORS[weekIdx % WEEK_HSL_COLORS.length], border: `1px solid rgba(0,0,0,0.12)`, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.08)' }
                            : { backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length], border: `1px solid rgba(15,23,42,0.36)` }
                          }
                        >
                           {checked && (
                             <svg viewBox="0 0 12 12" className="w-3 h-3 text-white">
                               <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" />
                             </svg>
                           )}
                         </span>
                      </button>
                    </td>
                  );
                })}
                <td className="border border-border p-1 text-center font-medium text-foreground">{daysInMonth}</td>
                {/* Progress bar instead of raw number */}
                {(() => {
                  const completed = habitProgress(habit);
                  const pct = daysInMonth > 0 ? (completed / daysInMonth) * 100 : 0;
                  const color = WEEK_HSL_COLORS[hi % WEEK_HSL_COLORS.length];
                  return (
                    <td className="border border-border p-1 text-center font-medium text-foreground">
                      <div className="w-28 mx-auto">
                        <MiniBar percentage={pct} color={color} />
                        <div className="text-xxs text-muted-foreground mt-0.5">{Math.round(pct)}%</div>
                      </div>
                    </td>
                  );
                })()}
              </tr>
            ))}

            {/* Inline add-new-habit row shown when user clicks Add Habit */}
            {showAddRow && (
              <tr className={habits.length % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                <td
                  className="sticky left-0 z-10 border border-border p-1 font-medium text-foreground whitespace-nowrap"
                  style={{ backgroundColor: habits.length % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.3)' }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      ref={addInputRef}
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNewHabit(); if (e.key === 'Escape') cancelAdd(); }}
                      placeholder="New habit name"
                      className="w-48 bg-transparent border-b border-primary outline-none text-xxs sm:text-xs"
                    />
                    <button onClick={saveNewHabit} className="text-xxs px-2 py-0.5 bg-primary text-primary-foreground rounded">Save</button>
                    <button onClick={cancelAdd} className="text-xxs px-2 py-0.5 bg-muted text-muted-foreground rounded">Cancel</button>
                  </div>
                </td>
                {Array.from({ length: daysInMonth }, (_, d) => (
                  <td key={d} className="border border-border p-0 text-center">&nbsp;</td>
                ))}
                <td className="border border-border p-1 text-center font-medium text-foreground">{daysInMonth}</td>
                <td className="border border-border p-1 text-center font-medium text-foreground">0</td>
              </tr>
            )}

            <tr><td colSpan={daysInMonth + 3} className="border border-border p-1 bg-card h-2"></td></tr>

            <tr className="bg-secondary/50">
              <td className="sticky left-0 z-10 bg-secondary/50 border border-border p-1 font-semibold text-foreground">{habits.length + 2}. Habits Completed</td>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <td key={i} className="border border-border p-0.5 text-center font-medium text-foreground">{stats.dailyCompleted[i + 1]}</td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center font-bold text-foreground">{stats.totalCompleted}</td>
            </tr>
            <tr className="bg-secondary/50">
              <td className="sticky left-0 z-10 bg-secondary/50 border border-border p-1 font-semibold text-foreground">{habits.length + 3}. Habits Incomplete</td>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <td key={i} className="border border-border p-0.5 text-center font-medium text-foreground">{stats.dailyIncomplete[i + 1]}</td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center font-bold text-foreground">{stats.totalPossible - stats.totalCompleted}</td>
            </tr>

            <tr className="bg-card">
              <td className="sticky left-0 z-10 bg-card border border-border p-1 font-semibold text-foreground">Weekly Completed</td>
              {weekRanges.map((w, wi) => (
                <td key={wi} colSpan={w.days.length} className="border border-border p-1 text-center font-bold text-foreground">
                  {stats.weeklyCompleted[wi]}
                </td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center text-muted-foreground text-xxs">Total Monthly Progress</td>
            </tr>
            <tr className="bg-card">
              <td className="sticky left-0 z-10 bg-card border border-border p-1 font-semibold text-foreground">Weekly Incomplete</td>
              {weekRanges.map((w, wi) => (
                <td key={wi} colSpan={w.days.length} className="border border-border p-1 text-center font-bold text-foreground">
                  {stats.weeklyTotal[wi] - stats.weeklyCompleted[wi]}
                </td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center font-bold text-foreground">{stats.totalCompleted}/{stats.totalPossible}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Weekly Progress Overview */}
      <section className="mt-4">
        <h2 className="font-bold text-sm text-foreground mb-3">📈 Progress per Week</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {weekRanges.map((w, wi) => {
            const completed = stats.weeklyCompleted[wi] || 0;
            const total = stats.weeklyTotal[wi] || (w.days.length * habits.length);
            const pct = total > 0 ? (completed / total) * 100 : 0;
            const color = WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length];
            return (
              <div key={wi} className="flex flex-col items-center">
                <WeeklyDonut percentage={pct} color={color} label={w.label} />
                <div className="text-xxs text-muted-foreground mt-1 text-center">{w.dateRange}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Daily Progress Overview */}
      <DailyOverview stats={stats} daysInMonth={daysInMonth} habits={habits} monthName={monthName} />
    </div>
  );
}

function MiniBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

// Weekly donut chart used in the Weekly Progress Overview
function WeeklyDonut({ percentage, color, label }: { percentage: number; color: string; label?: string }) {
  const size = 72;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-[72px] h-[72px] flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e6e6e6" strokeWidth={stroke} fill="transparent" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </g>
      </svg>
      <div className="absolute text-xxs font-semibold text-foreground">{Math.round(percentage)}%</div>
    </div>
  );
}

function DailyOverview({ stats, daysInMonth, habits, monthName }: {
  stats: { dailyCompleted: Record<number, number>; dailyIncomplete: Record<number, number>; totalCompleted: number; totalPossible: number };
  daysInMonth: number;
  habits: string[];
  monthName: string;
}) {
  const maxPerDay = habits.length;

  return (
    <div className="mt-4">
      <h2 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
        📊 Daily Progress Overview — {monthName} {YEAR}
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-1.5">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const completed = stats.dailyCompleted[day];
          const pct = maxPerDay > 0 ? (completed / maxPerDay) * 100 : 0;
          const weekIdx = Math.floor(i / 7) % 5;
          return (
            <div key={day} className="border border-border rounded bg-card overflow-hidden shadow-sm">
              <div className={`${WEEK_COLORS_BG[weekIdx]} text-primary-foreground text-center py-0.5 text-xxs font-bold`}>
                Day {day}
              </div>
              <div className="p-1.5 space-y-1">
                <div className="text-center text-lg font-bold text-foreground">{completed}</div>
                <div className="text-center text-xxs text-muted-foreground">of {maxPerDay}</div>
                <MiniBar percentage={pct} color={WEEK_HSL_COLORS[weekIdx]} />
                <div className="text-center text-xxs font-medium text-foreground">{Math.round(pct)}%</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center text-sm font-semibold text-foreground">
        Monthly Total: {stats.totalCompleted} / {stats.totalPossible} ({stats.totalPossible > 0 ? Math.round((stats.totalCompleted / stats.totalPossible) * 100) : 0}%)
      </div>
    </div>
  );
}
