import { useState, useMemo, useRef } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useHabitData } from "@/hooks/useHabitData";

const YEAR = 2026;

const MONTHS = [
  { value: "2", label: "March 2026",     name: "March",     days: 31 },
  { value: "3", label: "April 2026",     name: "April",     days: 30 },
  { value: "4", label: "May 2026",       name: "May",       days: 31 },
  { value: "5", label: "June 2026",      name: "June",      days: 30 },
  { value: "6", label: "July 2026",      name: "July",      days: 31 },
  { value: "7", label: "August 2026",    name: "August",    days: 31 },
  { value: "8", label: "September 2026", name: "September", days: 30 },
  { value: "9", label: "October 2026",   name: "October",   days: 31 },
  { value: "10", label: "November 2026", name: "November",  days: 30 },
  { value: "11", label: "December 2026", name: "December",  days: 31 },
];

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayNames(monthIdx: number, year: number, daysInMonth: number) {
  const names: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    names.push(DAY_ABBR[new Date(year, monthIdx, d).getDay()]);
  }
  return names;
}

function getWeekRanges(daysInMonth: number, monthName: string) {
  const colors = ["bg-week1","bg-week2","bg-week3","bg-week4","bg-week5"];
  const ranges: { label: string; days: number[]; color: string; dateRange: string }[] = [];
  let day = 1, weekNum = 1;
  while (day <= daysInMonth) {
    const start = day;
    const end = Math.min(day + 6, daysInMonth);
    const days = [];
    for (let d = start; d <= end; d++) days.push(d);
    const mo = monthName.substring(0, 3);
    ranges.push({
      label: `Week ${weekNum}`, days, color: colors[(weekNum - 1) % 5],
      dateRange: `${String(start).padStart(2,"0")} – ${String(end).padStart(2,"0")} ${mo}`,
    });
    day = end + 1; weekNum++;
  }
  return ranges;
}

const WEEK_COLORS_BG  = ["bg-week1","bg-week2","bg-week3","bg-week4","bg-week5","bg-weekMonthly"];
const WEEK_HSL_COLORS = [
  "hsl(221, 83%, 53%)","hsl(271, 81%, 56%)","hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)","hsl(142, 71%, 45%)","hsl(300, 64%, 49%)",
];
const WEEK_HSL_BG_LIGHT = [
  "hsl(221, 83%, 86%)","hsl(271, 81%, 86%)","hsl(0, 84%, 87%)",
  "hsl(45, 93%, 87%)","hsl(142, 71%, 87%)","hsl(300, 64%, 87%)",
];

export default function HabitTracker() {
  const { user, signOut } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState("2");
  const monthInfo   = MONTHS.find(m => m.value === selectedMonth)!;
  const monthIdx    = parseInt(selectedMonth);
  const daysInMonth = monthInfo.days;
  const monthName   = monthInfo.name;

  const { habits, logs, loading, toggle, addHabit, renameHabit } =
    useHabitData(YEAR, monthIdx);

  const dayNames  = useMemo(() => getDayNames(monthIdx, YEAR, daysInMonth), [monthIdx, daysInMonth]);
  const weekRanges = useMemo(() => getWeekRanges(daysInMonth, monthName), [daysInMonth, monthName]);

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const startAdd = () => { setShowAddRow(true); setTimeout(() => addInputRef.current?.focus(), 50); };
  const cancelAdd = () => { setShowAddRow(false); setNewHabitName(""); };
  const saveNewHabit = async () => {
    const name = newHabitName.trim();
    if (!name) return;
    await addHabit(name);
    setShowAddRow(false); setNewHabitName("");
  };

  const startEditing = (id: string, name: string) => { setEditingId(id); setEditValue(name); };
  const saveEdit = async () => {
    if (!editingId) return;
    const name = editValue.trim();
    if (name) await renameHabit(editingId, name);
    setEditingId(null);
  };

  const stats = useMemo(() => {
    const dailyCompleted: Record<number, number>   = {};
    const dailyIncomplete: Record<number, number>  = {};
    for (let d = 1; d <= daysInMonth; d++) {
      let c = 0;
      habits.forEach(h => { if (logs[h.id]?.[d]) c++; });
      dailyCompleted[d]  = c;
      dailyIncomplete[d] = habits.length - c;
    }
    const weeklyCompleted = weekRanges.map(w => {
      let total = 0; w.days.forEach(d => { total += dailyCompleted[d]; }); return total;
    });
    const weeklyTotal     = weekRanges.map(w => w.days.length * habits.length);
    const totalCompleted  = Object.values(dailyCompleted).reduce((a, b) => a + b, 0);
    const totalPossible   = daysInMonth * habits.length;
    return { dailyCompleted, dailyIncomplete, weeklyCompleted, weeklyTotal, totalCompleted, totalPossible };
  }, [logs, daysInMonth, habits, weekRanges]);

  const habitProgress = (habitId: string) => {
    let c = 0;
    for (let d = 1; d <= daysInMonth; d++) { if (logs[habitId]?.[d]) c++; }
    return c;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading your habits...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 overflow-x-auto">
      {/* Header */}
      <div className="bg-tracker-header text-tracker-header-foreground flex items-center justify-between py-2 px-4 rounded-t font-bold text-sm sm:text-base">
        <span>📅 {monthName} {YEAR} — Habit Tracker</span>
        <div className="flex items-center gap-2">
          <button onClick={startAdd} className="text-xxs sm:text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90">
            + Add Habit
          </button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {user && (
            <div className="flex items-center gap-2 ml-2">
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-6 h-6 rounded-full" />
              )}
              <span className="text-xxs hidden sm:inline opacity-80">{user.user_metadata?.name || user.email}</span>
              <button onClick={signOut} className="text-xxs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground px-2 py-1 rounded">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="overflow-x-auto border border-border rounded-b">
        <table className="w-full border-collapse text-xxs sm:text-xs tabular-nums min-w-[900px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 min-w-[120px]"></th>
              {weekRanges.map((w, wi) => (
                <th key={w.label} colSpan={w.days.length} className="border border-border p-1 text-center font-semibold"
                  style={{ backgroundColor: WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length], color: '#fff' }}>
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
                  <th key={d} className="border border-border p-0.5 text-center font-medium"
                    style={{ backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length], color: '#1f2937' }}>
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
                  <th key={i} className="border border-border p-0.5 text-center font-normal"
                    style={{ backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length], color: '#6b7280' }}>
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
              <tr key={habit.id} className={hi % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                <td
                  className="sticky left-0 z-10 border border-border p-1 font-medium text-foreground whitespace-nowrap cursor-pointer"
                  style={{ backgroundColor: hi % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.3)' }}
                  onDoubleClick={() => startEditing(habit.id, habit.name)}
                >
                  {editingId === habit.id ? (
                    <input
                      className="bg-transparent border-b border-primary outline-none w-full text-foreground text-xxs sm:text-xs"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                    />
                  ) : (
                    <span title="Double-click to edit">{hi + 1}. {habit.name}</span>
                  )}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const checked  = logs[habit.id]?.[d] || false;
                  const weekIdx  = weekRanges.findIndex(w => w.days.includes(d));
                  return (
                    <td key={d} className="border border-border p-0 text-center"
                      style={{ backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length] }}>
                      <button onClick={() => toggle(habit.id, d)}
                        className="w-full h-full flex items-center justify-center p-0.5 transition-colors duration-100"
                        aria-label={`${habit.name} day ${d}`}>
                        <span className="inline-flex w-3.5 h-3.5 rounded-sm items-center justify-center transition-all duration-150"
                          style={checked
                            ? { backgroundColor: WEEK_HSL_COLORS[weekIdx % WEEK_HSL_COLORS.length], border: '1px solid rgba(0,0,0,0.12)', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.08)' }
                            : { backgroundColor: WEEK_HSL_BG_LIGHT[weekIdx % WEEK_HSL_BG_LIGHT.length], border: '1px solid rgba(15,23,42,0.36)' }
                          }>
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
                {(() => {
                  const completed = habitProgress(habit.id);
                  const pct   = daysInMonth > 0 ? (completed / daysInMonth) * 100 : 0;
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

            {showAddRow && (
              <tr className={habits.length % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                <td className="sticky left-0 z-10 border border-border p-1 font-medium text-foreground whitespace-nowrap"
                  style={{ backgroundColor: habits.length % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.3)' }}>
                  <div className="flex items-center gap-2">
                    <input ref={addInputRef} value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNewHabit(); if (e.key === 'Escape') cancelAdd(); }}
                      placeholder="New habit name"
                      className="w-48 bg-transparent border-b border-primary outline-none text-xxs sm:text-xs" />
                    <button onClick={saveNewHabit} className="text-xxs px-2 py-0.5 bg-primary text-primary-foreground rounded">Save</button>
                    <button onClick={cancelAdd} className="text-xxs px-2 py-0.5 bg-muted text-muted-foreground rounded">Cancel</button>
                  </div>
                </td>
                {Array.from({ length: daysInMonth }, (_, d) => (
                  <td key={d} className="border border-border p-0 text-center">&nbsp;</td>
                ))}
                <td className="border border-border p-1 text-center">{daysInMonth}</td>
                <td className="border border-border p-1 text-center">0</td>
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

      {/* Weekly Progress */}
      <section className="mt-4">
        <h2 className="font-bold text-sm text-foreground mb-3">📈 Progress per Week</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {weekRanges.map((w, wi) => {
            const completed = stats.weeklyCompleted[wi] || 0;
            const total     = stats.weeklyTotal[wi] || (w.days.length * habits.length);
            const pct       = total > 0 ? (completed / total) * 100 : 0;
            return (
              <div key={wi} className="flex flex-col items-center">
                <WeeklyDonut percentage={pct} color={WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length]} label={w.label} />
                <div className="text-xxs text-muted-foreground mt-1 text-center">{w.dateRange}</div>
              </div>
            );
          })}
        </div>
      </section>

      <DailyOverview stats={stats} daysInMonth={daysInMonth} habits={habits.map(h => h.name)} monthName={monthName} />
    </div>
  );
}

function MiniBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }} />
    </div>
  );
}

function WeeklyDonut({ percentage, color, label }: { percentage: number; color: string; label?: string }) {
  const size = 72, stroke = 8, radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative w-[72px] h-[72px] flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size/2} cy={size/2} r={radius} stroke="#e6e6e6" strokeWidth={stroke} fill="transparent" />
          <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={stroke} strokeLinecap="round"
            fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </g>
      </svg>
      <div className="absolute text-xxs font-semibold text-foreground">{Math.round(percentage)}%</div>
    </div>
  );
}

function DailyOverview({ stats, daysInMonth, habits, monthName }: {
  stats: { dailyCompleted: Record<number, number>; dailyIncomplete: Record<number, number>; totalCompleted: number; totalPossible: number };
  daysInMonth: number; habits: string[]; monthName: string;
}) {
  const maxPerDay = habits.length;
  return (
    <div className="mt-4">
      <h2 className="font-bold text-sm text-foreground mb-3">📊 Daily Progress Overview — {monthName} {YEAR}</h2>
      <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-1.5">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const completed = stats.dailyCompleted[day];
          const pct = maxPerDay > 0 ? (completed / maxPerDay) * 100 : 0;
          const weekIdx = Math.floor(i / 7) % 5;
          return (
            <div key={day} className="border border-border rounded bg-card overflow-hidden shadow-sm">
              <div className={`${WEEK_COLORS_BG[weekIdx]} text-primary-foreground text-center py-0.5 text-xxs font-bold`}>Day {day}</div>
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
