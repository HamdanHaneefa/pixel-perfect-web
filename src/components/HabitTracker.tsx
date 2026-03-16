import { useState, useMemo, useRef, useCallback } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  // Mobile swipe state
  const [mobileWeekIdx, setMobileWeekIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) setMobileWeekIdx(i => Math.min(i + 1, weekRanges.length - 1));
      else setMobileWeekIdx(i => Math.max(i - 1, 0));
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [weekRanges.length]);

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

  const activeWeek = weekRanges[mobileWeekIdx];

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      {/* Header */}
      <div className="bg-tracker-header text-tracker-header-foreground rounded-t font-bold">
        {/* Mobile header */}
        <div className="flex sm:hidden flex-col gap-1.5 py-2 px-3">
          <div className="flex items-center justify-between">
            <span className="text-sm leading-tight">📅 {monthName} {YEAR}</span>
            {user && (
              <div className="flex items-center gap-1.5">
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="avatar" className="w-6 h-6 rounded-full" />
                  : <div className="w-6 h-6 rounded-full bg-primary-foreground/30 flex items-center justify-center text-xxs font-bold">
                      {(user.user_metadata?.name || user.email || "U")[0].toUpperCase()}
                    </div>
                }
                <button onClick={() => setShowSignOutDialog(true)} className="text-xxs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground px-2 py-1 rounded">
                  Sign out
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setMobileWeekIdx(0); }}>
              <SelectTrigger className="flex-1 h-7 text-xs bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Desktop header — 3-col: left=selector, center=title, right=user */}
        <div className="hidden sm:grid grid-cols-3 items-center py-3 px-5" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div className="flex items-center">
            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setMobileWeekIdx(0); }}>
              <SelectTrigger className="w-[150px] h-7 text-xs bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center">
            <span className="font-bold tracking-tight text-sm text-tracker-header-foreground whitespace-nowrap">{monthName} {YEAR} — Habit Tracker</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            {user && (
              <>
                {user.user_metadata?.avatar_url && (
                  <img src={user.user_metadata.avatar_url} alt="avatar" className="w-7 h-7 rounded-full" />
                )}
                <span className="text-xs opacity-80 text-tracker-header-foreground truncate max-w-[130px]">{user.user_metadata?.name || user.email}</span>
                <button onClick={() => setShowSignOutDialog(true)} className="text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground px-3 py-1 rounded font-medium whitespace-nowrap">
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: swipeable single-week view */}
      <div className="sm:hidden border border-border rounded-b overflow-hidden"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Week navigator */}
        <div className="flex items-center justify-between px-3 py-1.5"
          style={{ backgroundColor: WEEK_HSL_COLORS[mobileWeekIdx % WEEK_HSL_COLORS.length] }}>
          <button
            onClick={() => setMobileWeekIdx(i => Math.max(i - 1, 0))}
            disabled={mobileWeekIdx === 0}
            className="text-white text-lg px-2 disabled:opacity-30 select-none">‹</button>
          <span className="text-white font-semibold text-sm">
            {activeWeek.label} &nbsp;·&nbsp; {activeWeek.dateRange}
          </span>
          <button
            onClick={() => setMobileWeekIdx(i => Math.min(i + 1, weekRanges.length - 1))}
            disabled={mobileWeekIdx === weekRanges.length - 1}
            className="text-white text-lg px-2 disabled:opacity-30 select-none">›</button>
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 py-1.5 bg-card">
          {weekRanges.map((_, wi) => (
            <button key={wi} onClick={() => setMobileWeekIdx(wi)}
              className="w-2 h-2 rounded-full transition-all"
              style={{ backgroundColor: wi === mobileWeekIdx ? WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length] : '#d1d5db' }} />
          ))}
        </div>
        {/* Mobile week table */}
        <div>
          <table className="w-full border-collapse tabular-nums table-fixed" style={{ fontSize: '11px' }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              {activeWeek.days.map(d => <col key={d} style={{ width: `${70 / activeWeek.days.length}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="border border-border p-1 text-left font-semibold text-foreground bg-card">Habits</th>
                {activeWeek.days.map(d => (
                  <th key={d} className="border border-border p-0.5 text-center font-medium"
                    style={{ backgroundColor: WEEK_HSL_BG_LIGHT[mobileWeekIdx % WEEK_HSL_BG_LIGHT.length], color: '#1f2937' }}>
                    <div className="font-bold leading-tight">{d}</div>
                    <div className="text-[9px] text-gray-500 font-normal leading-tight">{dayNames[d - 1]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit, hi) => (
                <tr key={habit.id} className={hi % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                  <td
                    className="border border-border p-1 font-medium text-foreground overflow-hidden"
                    style={{ backgroundColor: hi % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.3)' }}
                    onDoubleClick={() => startEditing(habit.id, habit.name)}
                  >
                    {editingId === habit.id ? (
                      <input
                        className="bg-transparent border-b border-primary outline-none w-full text-foreground"
                        style={{ fontSize: '11px' }}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                      />
                    ) : (
                      <span className="block truncate" style={{ fontSize: '11px' }} title="Double-click to edit">{hi + 1}. {habit.name}</span>
                    )}
                  </td>
                  {activeWeek.days.map(d => {
                    const checked = logs[habit.id]?.[d] || false;
                    return (
                      <td key={d} className="border border-border p-0 text-center"
                        style={{ backgroundColor: WEEK_HSL_BG_LIGHT[mobileWeekIdx % WEEK_HSL_BG_LIGHT.length] }}>
                        <button onClick={() => toggle(habit.id, d)}
                          className="w-full h-full flex items-center justify-center py-1.5"
                          aria-label={`${habit.name} day ${d}`}>
                          <span className="inline-flex w-4 h-4 rounded-sm items-center justify-center transition-all duration-150"
                            style={checked
                              ? { backgroundColor: WEEK_HSL_COLORS[mobileWeekIdx % WEEK_HSL_COLORS.length], border: '1px solid rgba(0,0,0,0.12)' }
                              : { backgroundColor: WEEK_HSL_BG_LIGHT[mobileWeekIdx % WEEK_HSL_BG_LIGHT.length], border: '1px solid rgba(15,23,42,0.36)' }
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
                </tr>
              ))}

              {showAddRow ? (
                <tr className="bg-card">
                  <td className="border border-border p-1 font-medium text-foreground bg-card">
                    <div className="flex items-center gap-1">
                      <input ref={addInputRef} value={newHabitName}
                        onChange={e => setNewHabitName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveNewHabit(); if (e.key === 'Escape') cancelAdd(); }}
                        placeholder="New habit name"
                        className="flex-1 bg-transparent border-b border-primary outline-none text-xs" />
                      <button onClick={saveNewHabit} className="text-xxs px-1.5 py-0.5 bg-primary text-primary-foreground rounded">✓</button>
                      <button onClick={cancelAdd} className="text-xxs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">✕</button>
                    </div>
                  </td>
                  {activeWeek.days.map(d => (
                    <td key={d} className="border border-border p-0 text-center bg-card">&nbsp;</td>
                  ))}
                </tr>
              ) : (
                <tr className="bg-card">
                  <td colSpan={activeWeek.days.length + 1} className="border border-border p-0">
                    <button onClick={startAdd}
                      className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors flex items-center gap-1">
                      <span className="font-bold text-sm leading-none">+</span> Add Habit
                    </button>
                  </td>
                </tr>
              )}

              <tr className="bg-secondary/50">
                <td className="border border-border p-1 font-semibold text-muted-foreground text-xxs uppercase">Done</td>
                {activeWeek.days.map(d => (
                  <td key={d} className="border border-border p-0.5 text-center font-medium text-foreground text-xs">{stats.dailyCompleted[d]}</td>
                ))}
              </tr>
              <tr className="bg-secondary/50">
                <td className="border border-border p-1 font-semibold text-muted-foreground text-xxs uppercase">Left</td>
                {activeWeek.days.map(d => (
                  <td key={d} className="border border-border p-0.5 text-center font-medium text-foreground text-xs">{stats.dailyIncomplete[d]}</td>
                ))}
              </tr>
              <tr className="bg-card">
                <td className="border border-border p-1 font-semibold text-foreground text-xs">Week Total</td>
                <td colSpan={activeWeek.days.length} className="border border-border p-1 text-center font-bold text-foreground text-xs">
                  {stats.weeklyCompleted[mobileWeekIdx]} / {stats.weeklyTotal[mobileWeekIdx]}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop: full grid */}
      <div className="hidden sm:block border border-border rounded-b">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums min-w-[900px]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 min-w-[140px]"></th>
              {weekRanges.map((w, wi) => (
                <th key={w.label} colSpan={w.days.length} className="border border-border p-1.5 text-center font-semibold text-xs uppercase tracking-wider"
                  style={{ backgroundColor: WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length], color: '#fff' }}>
                  {w.label}
                </th>
              ))}
              <th className="bg-card border border-border p-1.5 text-center font-semibold text-foreground text-xs uppercase tracking-wide" rowSpan={2}>Goal</th>
              <th className="bg-card border border-border p-1.5 text-center font-semibold text-foreground text-xs uppercase tracking-wide" rowSpan={2}>Progress</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1.5 text-left font-semibold text-foreground text-xs uppercase tracking-wide">Habits</th>
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
              <th className="sticky left-0 z-10 bg-card border border-border p-1.5 text-left text-muted-foreground font-medium text-xs">Days</th>
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
                  className="sticky left-0 z-10 border border-border p-1.5 font-medium text-foreground whitespace-nowrap cursor-pointer text-xs"
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

            {showAddRow ? (
              <tr className="bg-card">
                <td className="sticky left-0 z-10 bg-card border border-border p-1 font-medium text-foreground whitespace-nowrap">
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
                  <td key={d} className="border border-border p-0 text-center bg-card">&nbsp;</td>
                ))}
                <td className="border border-border p-1 text-center bg-card">{daysInMonth}</td>
                <td className="border border-border p-1 text-center bg-card">0</td>
              </tr>
            ) : (
              <tr className="bg-card">
                <td colSpan={daysInMonth + 3} className="sticky left-0 border border-border p-0">
                  <button onClick={startAdd}
                    className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors flex items-center gap-1">
                    <span className="font-bold text-sm leading-none">+</span> Add Habit
                  </button>
                </td>
              </tr>
            )}

            <tr><td colSpan={daysInMonth + 3} className="border border-border p-1 bg-card h-2"></td></tr>

            <tr className="bg-secondary/50">
              <td className="sticky left-0 z-10 bg-secondary/50 border border-border p-1.5 font-semibold text-foreground text-xs tracking-wide uppercase text-muted-foreground">Completed</td>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <td key={i} className="border border-border p-0.5 text-center font-medium text-foreground">{stats.dailyCompleted[i + 1]}</td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center font-bold text-foreground">{stats.totalCompleted}</td>
            </tr>
            <tr className="bg-secondary/50">
              <td className="sticky left-0 z-10 bg-secondary/50 border border-border p-1.5 font-semibold text-foreground text-xs tracking-wide uppercase text-muted-foreground">Incomplete</td>
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
      </div>

      {/* Weekly Progress */}
      <section className="mt-4">
        <h2 className="hidden sm:block font-semibold text-xs text-foreground mb-3 tracking-tight uppercase" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Progress per Week</h2>
        <h2 className="sm:hidden font-bold text-sm text-foreground mb-3">📈 Progress per Week</h2>
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

      {/* Desktop week navigator — above Daily Progress */}
      <div className="hidden sm:flex items-center justify-between mt-5 px-4 py-2 rounded-t"
        style={{ backgroundColor: WEEK_HSL_COLORS[mobileWeekIdx % WEEK_HSL_COLORS.length], fontFamily: "'Inter', system-ui, sans-serif" }}>
        <button
          onClick={() => setMobileWeekIdx(i => Math.max(i - 1, 0))}
          disabled={mobileWeekIdx === 0}
          className="text-white text-xl px-3 py-0.5 rounded hover:bg-white/10 disabled:opacity-30 select-none">‹</button>
        <div className="flex items-center gap-4">
          <span className="text-white font-semibold text-sm tracking-tight">
            {activeWeek.label} &nbsp;·&nbsp; {activeWeek.dateRange}
          </span>
          <div className="flex gap-1.5">
            {weekRanges.map((_, wi) => (
              <button key={wi} onClick={() => setMobileWeekIdx(wi)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ backgroundColor: wi === mobileWeekIdx ? '#fff' : 'rgba(255,255,255,0.35)' }} />
            ))}
          </div>
        </div>
        <button
          onClick={() => setMobileWeekIdx(i => Math.min(i + 1, weekRanges.length - 1))}
          disabled={mobileWeekIdx === weekRanges.length - 1}
          className="text-white text-xl px-3 py-0.5 rounded hover:bg-white/10 disabled:opacity-30 select-none">›</button>
      </div>

      <DailyOverview stats={stats} activeDays={activeWeek.days} activeWeekIdx={mobileWeekIdx} activeWeekLabel={activeWeek.label} habits={habits.map(h => h.name)} monthName={monthName} />

      {/* Sign out confirmation */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You'll be returned to the login screen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function DailyOverview({ stats, activeDays, activeWeekIdx, activeWeekLabel, habits, monthName }: {
  stats: { dailyCompleted: Record<number, number>; dailyIncomplete: Record<number, number>; totalCompleted: number; totalPossible: number };
  activeDays: number[]; activeWeekIdx: number; activeWeekLabel: string; habits: string[]; monthName: string;
}) {
  const maxPerDay = habits.length;
  const weekIdx = activeWeekIdx % 5;
  return (
    <div className="mt-0">
      <h2 className="hidden sm:block font-semibold text-xs text-foreground mb-3 mt-4 tracking-tight uppercase" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Daily Progress — {activeWeekLabel} · {monthName} {YEAR}</h2>
      <h2 className="sm:hidden font-bold text-sm text-foreground mb-3 mt-4 truncate">📊 {activeWeekLabel} · {monthName} {YEAR}</h2>
      <div className="grid grid-cols-7 gap-1.5" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {activeDays.map(day => {
          const completed = stats.dailyCompleted[day];
          const pct = maxPerDay > 0 ? (completed / maxPerDay) * 100 : 0;
          return (
            <div key={day} className="border border-border rounded bg-card overflow-hidden shadow-sm">
              <div className={`${WEEK_COLORS_BG[weekIdx]} text-primary-foreground text-center py-1 text-[10px] font-semibold whitespace-nowrap leading-tight`}>Day {day}</div>
              <div className="p-1 space-y-0.5">
                <div className="text-center text-base font-bold text-foreground leading-tight">{completed}</div>
                <div className="text-center text-[10px] text-muted-foreground">of {maxPerDay}</div>
                <MiniBar percentage={pct} color={WEEK_HSL_COLORS[weekIdx]} />
                <div className="text-center text-[10px] font-semibold text-foreground">{Math.round(pct)}%</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center text-sm font-semibold text-foreground" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        Monthly Total: {stats.totalCompleted} / {stats.totalPossible} ({stats.totalPossible > 0 ? Math.round((stats.totalCompleted / stats.totalPossible) * 100) : 0}%)
      </div>
    </div>
  );
}
