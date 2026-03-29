import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useHabitData } from "@/hooks/useHabitData";
import { useTodos } from "@/hooks/useTodos";
import TodayFocusMode from "@/components/TodayFocusMode";
import {
  MonthlyLineChart, HabitProgressBars, WeeklyTrendChart,
  DisciplineCard, StreakLeaderboard, WeeklySummaryCards,
} from "@/components/InsightsCharts";

// Dynamic year — always use current year, extend to next if in Dec
const NOW = new Date();
const YEAR = NOW.getFullYear();

const MONTH_NAMES = [
  { name: "January",   days: 31 },
  { name: "February",  days: (YEAR % 4 === 0 && (YEAR % 100 !== 0 || YEAR % 400 === 0)) ? 29 : 28 },
  { name: "March",     days: 31 },
  { name: "April",     days: 30 },
  { name: "May",       days: 31 },
  { name: "June",      days: 30 },
  { name: "July",      days: 31 },
  { name: "August",    days: 31 },
  { name: "September", days: 30 },
  { name: "October",   days: 31 },
  { name: "November",  days: 30 },
  { name: "December",  days: 31 },
];

// Build months list: current month ± 3 months, always include today
const MONTHS = (() => {
  const todayMonth = NOW.getMonth(); // 0-indexed
  const result = [];
  for (let i = 0; i < 12; i++) {
    const m = MONTH_NAMES[i];
    result.push({
      value: String(i),
      label: `${m.name} ${YEAR}`,
      name: m.name,
      days: m.days,
    });
  }
  return result;
})();

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
  "hsl(38, 90%, 50%)","hsl(142, 60%, 42%)","hsl(300, 60%, 49%)",
];
// Cell backgrounds — original week tints
const WEEK_HSL_BG_LIGHT = [
  "hsl(221, 83%, 86%)","hsl(271, 81%, 86%)","hsl(0, 84%, 87%)",
  "hsl(38, 90%, 87%)","hsl(142, 60%, 87%)","hsl(300, 60%, 87%)",
];
const WEEK_HSL_BG_DARK = [
  "hsl(221, 40%, 18%)","hsl(271, 35%, 19%)","hsl(0, 35%, 19%)",
  "hsl(38, 35%, 18%)","hsl(142, 30%, 17%)","hsl(300, 30%, 18%)",
];

// Single consistent check color — same for all weeks, light and calm
const CHECK_COLOR = "hsl(221, 55%, 58%)";

export default function HabitTracker() {
  const { user, signOut } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth()));
  const monthInfo   = MONTHS.find(m => m.value === selectedMonth)!;
  const monthIdx    = parseInt(selectedMonth);
  const daysInMonth = monthInfo.days;
  const monthName   = monthInfo.name;

  const { habits, logs, loading, toggle, addHabit, renameHabit, deleteHabit, updateGoal, getStreaks } =
    useHabitData(YEAR, monthIdx);

  const handleFutureDayBlocked = useCallback(() => {
    toast.error("Can't log future days", {
      description: "You can only mark habits for today or past days.",
      duration: 2500,
    });
  }, []);

  const dayNames  = useMemo(() => getDayNames(monthIdx, YEAR, daysInMonth), [monthIdx, daysInMonth]);
  const weekRanges = useMemo(() => getWeekRanges(daysInMonth, monthName), [daysInMonth, monthName]);

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const addInputRef = useRef<HTMLInputElement | null>(null);

  // Goal editing
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalValue, setEditGoalValue] = useState("");

  // Keyboard navigation: [habitIndex, dayIndex (0-based)]
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);
  const focusedCellRef = useRef<[number, number] | null>(null);
  const gridRef = useRef<HTMLTableSectionElement | null>(null);

  // Keep ref in sync so the keydown listener always has latest value
  useEffect(() => { focusedCellRef.current = focusedCell; }, [focusedCell]);

  // Mobile swipe state
  const [mobileWeekIdx, setMobileWeekIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  // Dark mode toggle — persisted in localStorage
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  // Today's actual date info
  const todayDate = useMemo(() => {
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth(), // 0-indexed
      year: now.getFullYear(),
      iso: now.toISOString().split('T')[0],
    };
  }, []);

  // Auto-select today's week on mount
  useEffect(() => {
    const now = new Date();
    const todayMonthIdx = now.getMonth();
    const match = MONTHS.find(m => parseInt(m.value) === todayMonthIdx);
    if (match) {
      const todayDay = now.getDate();
      const ranges = getWeekRanges(match.days, match.name);
      const wi = ranges.findIndex(w => w.days.includes(todayDay));
      if (wi >= 0) setMobileWeekIdx(wi);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active tab: 'tracker' | 'today' | 'todos' | 'summary'
  const [activeTab, setActiveTab] = useState<'tracker' | 'today' | 'todos' | 'summary'>('today');

  // Selected habit — syncs Today tab clicks to Tracker grid highlight
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const habitRowRefs = useRef<Record<string, HTMLElement | null>>({});

  const handleHabitSelect = useCallback((habitId: string) => {
    setSelectedHabitId(habitId);
    // Scroll to the habit row directly — no tab switch needed
    const tryScroll = () => {
      const el = habitRowRefs.current[habitId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Clear highlight after 2s
        setTimeout(() => setSelectedHabitId(null), 2000);
      }
    };
    tryScroll();
    setTimeout(tryScroll, 100);
  }, []);

  // Clear selection when tab changes
  useEffect(() => { setSelectedHabitId(null); }, [activeTab]);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  // Apply on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellBg = isDark ? WEEK_HSL_BG_DARK : WEEK_HSL_BG_LIGHT;
  const checkEmptyBorder = isDark ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(15,23,42,0.36)';

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

  const startEditingGoal = (id: string, currentGoal: number) => {
    setEditingGoalId(id);
    setEditGoalValue(currentGoal > 0 ? String(currentGoal) : String(daysInMonth));
  };
  const saveGoal = async () => {
    if (!editingGoalId) return;
    const val = parseInt(editGoalValue);
    if (!isNaN(val) && val > 0) await updateGoal(editingGoalId, val);
    setEditingGoalId(null);
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

  // Effective goal for a habit — falls back to daysInMonth if not set
  const effectiveGoal = (habit: { goal: number }) =>
    habit.goal > 0 ? habit.goal : daysInMonth;

  // Global keydown listener — intercepts arrow keys to prevent page scroll
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const cell = focusedCellRef.current;
      if (!cell) return;
      // Don't hijack when user is typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      const [hi, di] = cell;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next: [number, number] = [hi, Math.min(di + 1, daysInMonth - 1)];
        setFocusedCell(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const next: [number, number] = [hi, Math.max(di - 1, 0)];
        setFocusedCell(next);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next: [number, number] = [Math.min(hi + 1, habits.length - 1), di];
        setFocusedCell(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next: [number, number] = [Math.max(hi - 1, 0), di];
        setFocusedCell(next);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const habit = habits[hi];
        if (habit) toggle(habit.id, di + 1, handleFutureDayBlocked);
      } else if (e.key === 'Escape') {
        setFocusedCell(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [habits, daysInMonth, toggle]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-medium tracking-wide">Loading your habits...</span>
      </div>
    );
  }

  const activeWeek = weekRanges[mobileWeekIdx];

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3">
      {/* Header */}
      <div className="bg-tracker-header text-tracker-header-foreground rounded-t-xl font-bold shadow-sm">
        {/* Mobile header */}
        <div className="flex sm:hidden flex-col gap-1.5 py-2.5 px-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold leading-tight">
              {monthName} {YEAR}
            </span>
            {user && (
              <div className="flex items-center gap-1.5">
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="avatar" className="w-6 h-6 rounded-full ring-1 ring-white/20" />
                  : <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                      {(user.user_metadata?.name || user.email || "U")[0].toUpperCase()}
                    </div>
                }
                <button onClick={() => setShowSignOutDialog(true)} className="text-[11px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-md font-medium transition-colors">
                  Sign out
                </button>
                <button onClick={toggleDark} className="text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md text-sm leading-none transition-colors" aria-label="Toggle dark mode">
                  {isDark ? '☀' : '☾'}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setMobileWeekIdx(0); }}>
              <SelectTrigger className="flex-1 h-7 text-xs bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-3 items-center py-3 px-5">
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setMobileWeekIdx(0); }}>
              <SelectTrigger className="w-[148px] h-7 text-xs bg-white/10 border-white/20 text-white hover:bg-white/15 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center">
            <span className="font-bold tracking-[0.12em] text-sm text-white whitespace-nowrap uppercase">{monthName} {YEAR} — Habit Tracker</span>
          </div>
          <div className="flex items-center justify-end gap-2.5">
            {user && (
              <>
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="avatar" className="w-7 h-7 rounded-full ring-2 ring-white/20" />
                  : <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                      {(user.user_metadata?.name || user.email || "U")[0].toUpperCase()}
                    </div>
                }
                <span className="text-xs text-white/60 truncate max-w-[120px]">{user.user_metadata?.name || user.email}</span>
                <button onClick={() => setShowSignOutDialog(true)} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors">
                  Sign out
                </button>
                <button onClick={toggleDark} className="text-white bg-white/10 hover:bg-white/20 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors" aria-label="Toggle dark mode">
                  {isDark ? '☀' : '☾'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: swipeable single-week view */}
      <div className="sm:hidden border border-border rounded-b-xl overflow-hidden"
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
        {/* Mobile week — card layout, no table, full habit names */}
        <div className="divide-y divide-border">
          {/* Day header row */}
          <div className="flex items-end bg-card px-3 py-2 gap-1.5 border-b border-border">
            {activeWeek.days.map(d => (
              <div key={d} className="flex-1 flex flex-col items-center">
                <span className="text-xs font-bold text-foreground">{d}</span>
                <span className="text-[9px] text-muted-foreground">{dayNames[d - 1]}</span>
              </div>
            ))}
          </div>

          {/* Habit rows */}
          {habits.map((habit, hi) => {
            return (
              <div key={habit.id}
                ref={el => { habitRowRefs.current[habit.id] = el; }}
                className="px-3 py-2.5 border-b border-border"
                style={{
                  backgroundColor: hi % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.3)',
                  ...(selectedHabitId === habit.id ? { outline: '2px solid hsl(221, 55%, 65%)', outlineOffset: '-1px', backgroundColor: 'hsl(221, 55%, 58%, 0.08)' } : {}),
                }}>
                {/* Full habit name on its own line */}
                <div className="flex items-center justify-between mb-2" onDoubleClick={() => startEditing(habit.id, habit.name)}>
                  {editingId === habit.id ? (
                    <input
                      className="bg-transparent border-b border-primary outline-none w-full text-foreground text-xs"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs font-medium text-foreground leading-tight">{hi + 1}. {habit.name}</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); deleteHabit(habit.id); }}
                    className="flex-shrink-0 ml-2 text-muted-foreground hover:text-destructive transition-colors text-base leading-none"
                    aria-label="Delete habit">×</button>
                </div>
                {/* Checkboxes row — full width, evenly spaced */}
                <div className="flex gap-1.5">
                  {activeWeek.days.map(d => {
                    const checked = logs[habit.id]?.[d] || false;
                    const weekColor = WEEK_HSL_COLORS[mobileWeekIdx % WEEK_HSL_COLORS.length];
                    return (
                      <button
                        key={d}
                        onClick={() => toggle(habit.id, d, handleFutureDayBlocked)}
                        className="flex-1 h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-90"
                        style={checked
                          ? { backgroundColor: weekColor, border: '1.5px solid rgba(255,255,255,0.15)' }
                          : { backgroundColor: 'transparent', border: checkEmptyBorder }
                        }
                        aria-label={`${habit.name} day ${d}`}>
                        {checked && (
                          <svg viewBox="0 0 12 12" className="w-3.5 h-3.5">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add habit */}
          {showAddRow ? (
            <div className="px-3 py-2 bg-card flex items-center gap-2">
              <input ref={addInputRef} value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveNewHabit(); if (e.key === 'Escape') cancelAdd(); }}
                placeholder="New habit name"
                className="flex-1 bg-transparent border-b border-primary outline-none text-xs text-foreground" />
              <button onClick={saveNewHabit} className="text-xxs px-2 py-1 bg-primary text-primary-foreground rounded-md">Save</button>
              <button onClick={cancelAdd} className="text-xxs px-2 py-1 bg-muted text-muted-foreground rounded-md">Cancel</button>
            </div>
          ) : (
            <button onClick={startAdd}
              className="w-full text-left px-3 py-2.5 text-xs text-primary hover:bg-primary/5 transition-colors flex items-center gap-1.5 bg-card">
              <span className="font-bold text-sm leading-none">+</span> Add Habit
            </button>
          )}

          {/* Daily completion bars */}
          <div className="px-3 py-2 bg-secondary/30 border-b border-border">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Done</div>
            <div className="flex gap-1.5">
              {activeWeek.days.map(d => {
                const done = stats.dailyCompleted[d] || 0;
                const pct = habits.length > 0 ? (done / habits.length) * 100 : 0;
                const color = WEEK_HSL_COLORS[mobileWeekIdx % WEEK_HSL_COLORS.length];
                const trackBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full h-5 rounded-sm overflow-hidden relative" style={{ backgroundColor: trackBg }}>
                      <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-t-sm"
                        style={{ height: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: done > 0 ? color : 'hsl(var(--muted-foreground))' }}>{done}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Week total */}
          <div className="px-3 py-2 bg-card flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Week Total</span>
            <span className="text-xs font-bold text-foreground">
              {stats.weeklyCompleted[mobileWeekIdx]} / {stats.weeklyTotal[mobileWeekIdx]}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop: full grid */}
      <div className="hidden sm:block border border-border rounded-b-xl shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums min-w-[900px]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 min-w-[140px]"></th>
              {weekRanges.map((w, wi) => (
                <th key={w.label} colSpan={w.days.length} className="border border-border p-1.5 text-center font-semibold text-xs uppercase tracking-wider overflow-hidden"
                  style={{ backgroundColor: WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length], color: '#fff', minWidth: `${w.days.length * 28}px` }}>
                  {w.label}
                </th>
              ))}
              <th className="bg-card border border-border p-1.5 text-center font-semibold text-foreground text-xs uppercase tracking-wide" rowSpan={2}>Goal</th>
              <th className="bg-card border border-border p-1.5 text-center font-semibold text-foreground text-xs uppercase tracking-wide" rowSpan={2}>Progress</th>
              <th className="bg-card border border-border p-1.5 text-center font-semibold text-foreground text-xs uppercase tracking-wide" rowSpan={2}>Streak</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1.5 text-left font-semibold text-foreground text-xs uppercase tracking-wide">Habits</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const weekIdx = weekRanges.findIndex(w => w.days.includes(d));
                return (
                  <th key={d} className="border border-border p-0.5 text-center font-medium"
                    style={{ backgroundColor: cellBg[weekIdx % cellBg.length], color: 'hsl(var(--foreground))' }}>
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
                    style={{ backgroundColor: cellBg[weekIdx % cellBg.length], color: 'hsl(var(--muted-foreground))' }}>
                    {dn}
                  </th>
                );
              })}
              <th className="bg-card border border-border p-1"></th>
              <th className="bg-card border border-border p-1"></th>
              <th className="bg-card border border-border p-1"></th>
            </tr>
          </thead>
          <tbody ref={gridRef}>
            {habits.map((habit, hi) => (
              <tr key={habit.id}
                ref={el => { habitRowRefs.current[habit.id] = el; }}
                className={hi % 2 === 0 ? "bg-card" : "bg-secondary/30"}
                style={selectedHabitId === habit.id ? { outline: '2px solid hsl(221, 55%, 65%)', outlineOffset: '-1px', position: 'relative', zIndex: 1 } : {}}
              >                <td
                  className="sticky left-0 z-10 border border-border p-1.5 font-medium text-foreground whitespace-nowrap cursor-pointer text-xs group"
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
                    <div className="flex items-center justify-between gap-1">
                      <span title="Double-click to edit">{hi + 1}. {habit.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteHabit(habit.id); }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-sm leading-none px-0.5"
                        aria-label="Delete habit">×</button>
                    </div>
                  )}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const checked  = logs[habit.id]?.[d] || false;
                  const weekIdx  = weekRanges.findIndex(w => w.days.includes(d));
                  const isFocused = focusedCell?.[0] === hi && focusedCell?.[1] === d - 1;
                  // Missed day: past day (in current month/year) that wasn't completed
                  const isPastDay = YEAR < todayDate.year
                    || (YEAR === todayDate.year && monthIdx < todayDate.month)
                    || (YEAR === todayDate.year && monthIdx === todayDate.month && d < todayDate.day);
                  const isTodayDay = YEAR === todayDate.year && monthIdx === todayDate.month && d === todayDate.day;
                  const isFutureDay = !isPastDay && !isTodayDay;
                  const isMissed = isPastDay && !checked;
                  return (
                    <td key={d} className="border border-border p-0 text-center"
                      style={{
                        backgroundColor: isFutureDay ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)') : cellBg[weekIdx % cellBg.length],
                        opacity: isFutureDay ? 0.45 : 1,
                      }}>
                      <button
                        ref={el => { if (isFocused && el && document.activeElement === el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
                        onClick={() => { toggle(habit.id, d, handleFutureDayBlocked); if (!isFutureDay) setFocusedCell([hi, d - 1]); }}
                        onFocus={() => setFocusedCell([hi, d - 1])}
                        onMouseDown={() => setFocusedCell([hi, d - 1])}
                        className={`w-full h-full flex items-center justify-center p-0.5 transition-colors duration-100 focus:outline-none ${isFutureDay ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        aria-label={isFutureDay ? `${habit.name} day ${d} — future day` : `${habit.name} day ${d}`}
                        tabIndex={isFocused ? 0 : -1}
                        title={isFutureDay ? "Can't log future days" : undefined}
                      >
                        <span className="inline-flex w-5 h-5 rounded-sm items-center justify-center transition-all duration-150 active:scale-90"
                          style={checked
                            ? { backgroundColor: WEEK_HSL_COLORS[weekIdx % WEEK_HSL_COLORS.length], border: '1.5px solid rgba(255,255,255,0.12)', outline: isFocused ? '2px solid white' : 'none', outlineOffset: '1px' }
                            : { backgroundColor: 'transparent', border: checkEmptyBorder, outline: isFocused ? `2px solid ${WEEK_HSL_COLORS[weekIdx % WEEK_HSL_COLORS.length]}` : 'none', outlineOffset: '1px' }
                          }>
                          {checked && (
                            <svg viewBox="0 0 12 12" className="w-3 h-3">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                            </svg>
                          )}
                        </span>                      </button>
                    </td>
                  );
                })}
                <td className="border border-border p-1 text-center font-medium text-foreground cursor-pointer select-none"
                  onClick={() => startEditingGoal(habit.id, habit.goal)}
                  title="Click to edit goal">
                  {editingGoalId === habit.id ? (
                    <input
                      className="w-10 bg-transparent border-b border-primary outline-none text-center text-xs text-foreground"
                      value={editGoalValue}
                      onChange={e => setEditGoalValue(e.target.value)}
                      onBlur={saveGoal}
                      onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditingGoalId(null); }}
                      autoFocus
                    />
                  ) : (
                    <span>{effectiveGoal(habit)}</span>
                  )}
                </td>
                {(() => {
                  const completed = habitProgress(habit.id);
                  const goal = effectiveGoal(habit);
                  const pct   = goal > 0 ? Math.min((completed / goal) * 100, 100) : 0;
                  const color = WEEK_HSL_COLORS[hi % WEEK_HSL_COLORS.length];
                  const { current, best } = getStreaks(habit.id, daysInMonth, todayDate.month === monthIdx && todayDate.year === YEAR ? todayDate.day : daysInMonth);
                  return (
                    <>
                      <td className="border border-border p-1 text-center">
                        <div className="flex flex-col items-center gap-1 min-w-[52px]">
                          <MiniBar percentage={pct} color={color} />
                          <div className="text-[10px] font-semibold text-foreground">{Math.round(pct)}%</div>
                        </div>
                      </td>
                      <td className="border border-border p-1.5 text-center min-w-[64px]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1">
                            <svg viewBox="0 0 10 12" fill="currentColor" className="w-2.5 h-3 text-orange-400 flex-shrink-0">
                              <path d="M5 0C5 3 2 4.5 2 7.5a3 3 0 006 0C8 4.5 5 3 5 0z"/>
                            </svg>
                            <span className="text-[10px] font-bold text-foreground tabular-nums">{current}</span>
                          </div>
                          <span className="text-border">·</span>
                          <div className="flex items-center gap-1">
                            <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5 text-yellow-500 flex-shrink-0">
                              <path d="M6 0l1.5 3.5H11l-2.8 2 1 3.5L6 7.2 2.8 9l1-3.5L1 3.5h3.5z"/>
                            </svg>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{best}</span>
                          </div>
                        </div>
                      </td>
                    </>
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
                <td className="border border-border p-1 text-center bg-card">—</td>
              </tr>
            ) : (
              <tr className="bg-card">
                <td colSpan={daysInMonth + 4} className="sticky left-0 border border-border p-0">
                  <button onClick={startAdd}
                    className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors flex items-center gap-1">
                    <span className="font-bold text-sm leading-none">+</span> Add Habit
                  </button>
                </td>
              </tr>
            )}

            <tr><td colSpan={daysInMonth + 4} className="border border-border p-1 bg-card h-2"></td></tr>

            {/* Completion bar row */}
            <tr className="bg-secondary/30">
              <td className="sticky left-0 z-10 bg-secondary/30 border border-border p-1.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wide">Daily</td>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const done = stats.dailyCompleted[d] || 0;
                const pct = habits.length > 0 ? (done / habits.length) * 100 : 0;
                const weekIdx = weekRanges.findIndex(w => w.days.includes(d));
                const color = WEEK_HSL_COLORS[weekIdx % WEEK_HSL_COLORS.length];
                const trackBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
                return (
                  <td key={i} className="border border-border p-0" style={{ verticalAlign: 'bottom' }}>
                    <div className="flex flex-col items-center justify-end gap-0.5 px-0.5 pb-0.5 pt-1" style={{ height: 32 }}>
                      <div className="w-full rounded-t-sm overflow-hidden flex-1 relative" style={{ backgroundColor: trackBg }}>
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500"
                          style={{ height: `${pct}%`, backgroundColor: pct === 0 ? 'transparent' : color }} />
                      </div>
                      <span className="text-[8px] font-medium leading-none" style={{ color: pct > 0 ? color : 'transparent' }}>{done}</span>
                    </div>
                  </td>
                );
              })}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center">
                <div className="text-[10px] font-bold text-foreground">{stats.totalCompleted}</div>
                <div className="text-[9px] text-muted-foreground">done</div>
              </td>
              <td className="border border-border p-1"></td>
            </tr>

            {/* Weekly completion bars */}
            <tr className="bg-card">
              <td className="sticky left-0 z-10 bg-card border border-border p-1.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wide">Weekly</td>
              {weekRanges.map((w, wi) => {
                const pct = stats.weeklyTotal[wi] > 0 ? Math.round((stats.weeklyCompleted[wi] / stats.weeklyTotal[wi]) * 100) : 0;
                const color = WEEK_HSL_COLORS[wi % WEEK_HSL_COLORS.length];
                const trackBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
                return (
                  <td key={wi} colSpan={w.days.length} className="border border-border px-2 py-1.5 text-center">
                    <div className="flex flex-col gap-1">
                      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[10px] font-bold text-foreground">{pct}%</span>
                    </div>
                  </td>
                );
              })}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center">
                <div className="text-[10px] font-bold text-foreground">{stats.totalPossible > 0 ? Math.round((stats.totalCompleted / stats.totalPossible) * 100) : 0}%</div>
                <div className="text-[9px] text-muted-foreground">month</div>
              </td>
              <td className="border border-border p-1"></td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mt-3 flex gap-1 bg-card border border-border rounded-xl p-1 shadow-sm">
        {([
          {
            id: 'today', label: 'Today',
            icon: <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4l2.5 2.5" strokeLinecap="round"/></svg>
          },
          {
            id: 'todos', label: 'Todos',
            icon: <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.7"><path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="14" height="14" rx="2"/></svg>
          },
          {
            id: 'tracker', label: 'Tracker',
            icon: <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 2v4M13 2v4M3 9h14" strokeLinecap="round"/></svg>
          },
          {
            id: 'summary', label: 'Insights',
            icon: <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.7"><path d="M4 14l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="2" width="16" height="16" rx="2"/></svg>
          },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
            onClick={() => { setActiveTab(tab.id); if (tab.id !== 'tracker') setSelectedHabitId(null); }}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Today Focus Mode */}
      {activeTab === 'today' && (
        <div className="mt-4">
          <TodayFocusMode
            habits={habits}
            logs={logs}
            today={todayDate.month === monthIdx && todayDate.year === YEAR ? todayDate.day : daysInMonth}
            todayDate={todayDate.iso}
            toggle={toggle}
            getStreaks={getStreaks}
            daysInMonth={daysInMonth}
            weekColor={WEEK_HSL_COLORS[mobileWeekIdx % WEEK_HSL_COLORS.length]}
            stats={stats}
            isDark={isDark}
            onHabitSelect={handleHabitSelect}
          />
        </div>
      )}

      {/* Weekly Progress — tracker tab */}
      {activeTab === 'tracker' && (
      <section className="mt-4 space-y-4">
        <MonthlyLineChart
          habits={habits} logs={logs} daysInMonth={daysInMonth}
          today={todayDate.month === monthIdx && todayDate.year === YEAR ? todayDate.day : daysInMonth}
          monthName={monthName} isDark={isDark}
        />
        <WeeklyTrendChart
          weekRanges={weekRanges}
          weeklyCompleted={stats.weeklyCompleted}
          weeklyTotal={stats.weeklyTotal}
          isDark={isDark}
        />
        <HabitProgressBars habits={habits} logs={logs} daysInMonth={daysInMonth} isDark={isDark} />
      </section>
      )}

      {/* Daily Todos — separate tab */}
      {activeTab === 'todos' && (
        <div className="mt-4">
          <TodosPanel todayDate={todayDate.iso} weekColor={WEEK_HSL_COLORS[mobileWeekIdx % WEEK_HSL_COLORS.length]} />
        </div>
      )}

      {/* Insights tab */}
      {activeTab === 'summary' && (() => {
        const todayNum = todayDate.month === monthIdx && todayDate.year === YEAR ? todayDate.day : daysInMonth;
        // Discipline score calc
        const effectiveDays = Math.min(todayNum, daysInMonth);
        let totalDone = 0, totalPoss = 0, consistentDays = 0;
        for (let d = 1; d <= effectiveDays; d++) {
          const done = habits.filter(h => logs[h.id]?.[d]).length;
          totalDone += done; totalPoss += habits.length;
          if (habits.length > 0 && done / habits.length >= 0.5) consistentDays++;
        }
        const cr = totalPoss > 0 ? totalDone / totalPoss : 0;
        const conr = effectiveDays > 0 ? consistentDays / effectiveDays : 0;
        const score = Math.round((cr * 0.6 + conr * 0.4) * 100);
        return (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DisciplineCard score={score} monthName={monthName} year={YEAR} today={todayNum} isDark={isDark} />
              <WeeklySummaryCards habits={habits} logs={logs} week={weekRanges[mobileWeekIdx]} weekLabel={weekRanges[mobileWeekIdx]?.label ?? ''} />
            </div>
            <MonthlyLineChart habits={habits} logs={logs} daysInMonth={daysInMonth} today={todayNum} monthName={monthName} isDark={isDark} />
            <WeeklyTrendChart weekRanges={weekRanges} weeklyCompleted={stats.weeklyCompleted} weeklyTotal={stats.weeklyTotal} isDark={isDark} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HabitProgressBars habits={habits} logs={logs} daysInMonth={daysInMonth} isDark={isDark} />
              <StreakLeaderboard habits={habits} logs={logs} daysInMonth={daysInMonth} today={todayNum} getStreaks={getStreaks} isDark={isDark} />
            </div>
          </div>
        );
      })()}

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
    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }} />
    </div>
  );
}

function TodosPanel({ todayDate, weekColor }: { todayDate: string; weekColor: string }) {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos(todayDate);
  const [newTodo, setNewTodo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!newTodo.trim()) return;
    await addTodo(newTodo);
    setNewTodo("");
  };

  const pending = todos.filter(t => !t.completed);
  const done = todos.filter(t => t.completed);
  const pct = todos.length > 0 ? Math.round((done.length / todos.length) * 100) : 0;

  // Radial progress
  const r = 28, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="space-y-3">
      {/* Progress card */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-5">
        {/* Radial */}
        <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <g transform="rotate(-90 36 36)">
              <circle cx={36} cy={36} r={r} stroke="hsl(var(--border))" strokeWidth={7} fill="none"/>
              <circle cx={36} cy={36} r={r} stroke={weekColor} strokeWidth={7} strokeLinecap="round"
                fill="none" strokeDasharray={circ} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}/>
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-black text-foreground leading-none">{pct}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="3" width="14" height="14" rx="2"/>
            </svg>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily Todos</span>
          </div>
          <div className="flex gap-4">
            <div>
              <div className="text-xl font-black text-foreground leading-none">{done.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">done</div>
            </div>
            <div>
              <div className="text-xl font-black text-foreground leading-none">{pending.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">left</div>
            </div>
            <div>
              <div className="text-xl font-black text-foreground leading-none">{todos.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">total</div>
            </div>
          </div>
          {/* Linear bar */}
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: weekColor }} />
          </div>
        </div>
      </div>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add a task for today..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newTodo.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-30 transition-all hover:opacity-90"
          style={{ backgroundColor: weekColor }}>
          Add
        </button>
      </div>

      {/* Pending todos */}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          {pending.map(todo => (
            <div key={todo.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors">
              <button onClick={() => toggleTodo(todo.id)}
                className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-border hover:border-primary transition-colors" />
              <span className="flex-1 text-sm text-foreground">{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete">
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completed todos */}
      {done.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">Completed</div>
          {done.map(todo => (
            <div key={todo.id} className="flex items-center gap-3 bg-secondary/20 border border-border/50 rounded-xl px-4 py-3">
              <button onClick={() => toggleTodo(todo.id)}
                className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                style={{ backgroundColor: weekColor }}>
                <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/></svg>
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through">{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete">
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {todos.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">No tasks yet. Add one above.</div>
      )}
    </div>
  );
}

// ── Insights dashboard ────────────────────────────────────────────────────

