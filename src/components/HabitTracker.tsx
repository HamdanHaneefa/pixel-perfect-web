import { useState, useMemo } from "react";

const HABITS = [
  "Morning Meditation",
  "Exercise 30 min",
  "Read 20 Pages",
  "Drink 8 Glasses Water",
  "No Social Media",
  "Journal Writing",
  "Healthy Breakfast",
  "Walk 10K Steps",
  "Sleep by 10 PM",
  "Learn New Skill",
];

const MONTH = "January";
const YEAR = 2025;
const DAYS_IN_MONTH = 31;

const WEEK_RANGES: { label: string; days: number[]; color: string; dateRange: string }[] = [
  { label: "Week 1", days: [1,2,3,4,5,6,7], color: "bg-week1", dateRange: "01 – 07 Jan" },
  { label: "Week 2", days: [8,9,10,11,12,13,14], color: "bg-week2", dateRange: "08 – 14 Jan" },
  { label: "Week 3", days: [15,16,17,18,19,20,21], color: "bg-week3", dateRange: "19 – 21 Jan" },
  { label: "Week 4", days: [22,23,24,25,26,27,28], color: "bg-week4", dateRange: "22 – 28 Jan" },
  { label: "Week 5", days: [29,30,31], color: "bg-week5", dateRange: "29 – 31 Jan" },
];

const DAY_NAMES = ["Wed","Thu","Fri","Sat","Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun","Mon","Tue","Wed","Thu","Fri"];

const WEEK_COLORS_RING = [
  "ring-week1",
  "ring-week2", 
  "ring-week3",
  "ring-week4",
  "ring-week5",
  "ring-weekMonthly",
];

const WEEK_COLORS_BG = [
  "bg-week1",
  "bg-week2",
  "bg-week3",
  "bg-week4",
  "bg-week5",
  "bg-weekMonthly",
];

const WEEK_COLORS_TEXT = [
  "text-week1",
  "text-week2",
  "text-week3",
  "text-week4",
  "text-week5",
  "text-weekMonthly",
];

type HabitData = Record<string, Record<number, boolean>>;

export default function HabitTracker() {
  const [data, setData] = useState<HabitData>(() => {
    const saved = localStorage.getItem("habit-tracker-data");
    if (saved) return JSON.parse(saved);
    const init: HabitData = {};
    HABITS.forEach(h => { init[h] = {}; });
    return init;
  });

  const toggle = (habit: string, day: number) => {
    setData(prev => {
      const next = { ...prev, [habit]: { ...prev[habit], [day]: !prev[habit]?.[day] } };
      localStorage.setItem("habit-tracker-data", JSON.stringify(next));
      return next;
    });
  };

  const stats = useMemo(() => {
    const dailyCompleted: Record<number, number> = {};
    const dailyIncomplete: Record<number, number> = {};
    for (let d = 1; d <= DAYS_IN_MONTH; d++) {
      let c = 0;
      HABITS.forEach(h => { if (data[h]?.[d]) c++; });
      dailyCompleted[d] = c;
      dailyIncomplete[d] = HABITS.length - c;
    }

    const weeklyCompleted = WEEK_RANGES.map(w => {
      let total = 0;
      w.days.forEach(d => { total += dailyCompleted[d]; });
      return total;
    });

    const weeklyTotal = WEEK_RANGES.map(w => w.days.length * HABITS.length);
    const totalCompleted = Object.values(dailyCompleted).reduce((a, b) => a + b, 0);
    const totalPossible = DAYS_IN_MONTH * HABITS.length;

    return { dailyCompleted, dailyIncomplete, weeklyCompleted, weeklyTotal, totalCompleted, totalPossible };
  }, [data]);

  const habitProgress = (habit: string) => {
    let c = 0;
    for (let d = 1; d <= DAYS_IN_MONTH; d++) { if (data[habit]?.[d]) c++; }
    return c;
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 overflow-x-auto">
      {/* Title */}
      <div className="bg-tracker-header text-tracker-header-foreground text-center py-2 px-4 rounded-t font-bold text-sm sm:text-base">
        📅 {MONTH} {YEAR} — Habit Tracker
      </div>

      {/* Main Grid */}
      <div className="overflow-x-auto border border-border rounded-b">
        <table className="w-full border-collapse text-xxs sm:text-xs tabular-nums min-w-[900px]">
          <thead>
            {/* Week headers */}
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 min-w-[120px]"></th>
              {WEEK_RANGES.map((w, wi) => (
                <th
                  key={w.label}
                  colSpan={w.days.length}
                  className={`${WEEK_COLORS_BG[wi]} text-primary-foreground border border-border p-1 text-center font-semibold`}
                >
                  {w.label}
                </th>
              ))}
              <th className="bg-card border border-border p-1 text-center font-semibold text-foreground" rowSpan={2}>Goal</th>
              <th className="bg-card border border-border p-1 text-center font-semibold text-foreground" rowSpan={2}>Progress</th>
            </tr>
            {/* Day numbers */}
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 text-left font-semibold text-foreground">Habits</th>
              {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map(d => {
                const weekIdx = WEEK_RANGES.findIndex(w => w.days.includes(d));
                return (
                  <th key={d} className={`border border-border p-0.5 text-center font-medium ${WEEK_COLORS_BG[weekIdx]} text-primary-foreground`}>
                    <div>{d}</div>
                  </th>
                );
              })}
            </tr>
            {/* Day names */}
            <tr>
              <th className="sticky left-0 z-10 bg-card border border-border p-1 text-left text-muted-foreground font-normal">Days</th>
              {DAY_NAMES.map((dn, i) => {
                const weekIdx = WEEK_RANGES.findIndex(w => w.days.includes(i + 1));
                return (
                  <th key={i} className={`border border-border p-0.5 text-center font-normal ${i + 1 <= DAYS_IN_MONTH ? `${WEEK_COLORS_BG[weekIdx]} text-primary-foreground` : 'bg-card text-muted-foreground'}`}>
                    {dn}
                  </th>
                );
              })}
              <th className="bg-card border border-border p-1"></th>
              <th className="bg-card border border-border p-1"></th>
            </tr>
          </thead>
          <tbody>
            {/* Habit rows */}
            {HABITS.map((habit, hi) => (
              <tr key={habit} className={hi % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                <td className="sticky left-0 z-10 border border-border p-1 font-medium text-foreground whitespace-nowrap" style={{ backgroundColor: hi % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.3)' }}>
                  {hi + 1}. {habit}
                </td>
                {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map(d => {
                  const checked = data[habit]?.[d] || false;
                  const weekIdx = WEEK_RANGES.findIndex(w => w.days.includes(d));
                  return (
                    <td key={d} className="border border-border p-0 text-center">
                      <button
                        onClick={() => toggle(habit, d)}
                        className={`w-full h-full flex items-center justify-center p-0.5 transition-colors duration-100 ${
                          checked
                            ? `${WEEK_COLORS_BG[weekIdx]} text-primary-foreground`
                            : 'hover:bg-muted'
                        }`}
                        aria-label={`${habit} day ${d}`}
                      >
                        <span className={`inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 border rounded-sm ${
                          checked
                            ? 'bg-primary-foreground border-primary-foreground'
                            : 'border-muted-foreground/40'
                        }`}>
                          {checked && (
                            <svg viewBox="0 0 12 12" className={`w-full h-full ${WEEK_COLORS_TEXT[weekIdx]}`}>
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                          )}
                        </span>
                      </button>
                    </td>
                  );
                })}
                <td className="border border-border p-1 text-center font-medium text-foreground">{DAYS_IN_MONTH}</td>
                <td className="border border-border p-1 text-center font-medium text-foreground">{habitProgress(habit)}</td>
              </tr>
            ))}

            {/* Empty row */}
            <tr><td colSpan={DAYS_IN_MONTH + 3} className="border border-border p-1 bg-card h-2"></td></tr>

            {/* Summary rows */}
            <tr className="bg-secondary/50">
              <td className="sticky left-0 z-10 bg-secondary/50 border border-border p-1 font-semibold text-foreground">{HABITS.length + 2}. Habits Completed</td>
              {Array.from({ length: DAYS_IN_MONTH }, (_, i) => (
                <td key={i} className="border border-border p-0.5 text-center font-medium text-foreground">{stats.dailyCompleted[i + 1]}</td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center font-bold text-foreground">{stats.totalCompleted}</td>
            </tr>
            <tr className="bg-secondary/50">
              <td className="sticky left-0 z-10 bg-secondary/50 border border-border p-1 font-semibold text-foreground">{HABITS.length + 3}. Habits Incomplete</td>
              {Array.from({ length: DAYS_IN_MONTH }, (_, i) => (
                <td key={i} className="border border-border p-0.5 text-center font-medium text-foreground">{stats.dailyIncomplete[i + 1]}</td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center font-bold text-foreground">{stats.totalPossible - stats.totalCompleted}</td>
            </tr>

            {/* Weekly summary */}
            <tr className="bg-card">
              <td className="sticky left-0 z-10 bg-card border border-border p-1 font-semibold text-foreground">Weekly Completed</td>
              {WEEK_RANGES.map((w, wi) => (
                <td key={wi} colSpan={w.days.length} className="border border-border p-1 text-center font-bold text-foreground">
                  {stats.weeklyCompleted[wi]}
                </td>
              ))}
              <td className="border border-border p-1"></td>
              <td className="border border-border p-1 text-center text-muted-foreground text-xxs">Total Monthly Progress</td>
            </tr>
            <tr className="bg-card">
              <td className="sticky left-0 z-10 bg-card border border-border p-1 font-semibold text-foreground">Weekly Incomplete</td>
              {WEEK_RANGES.map((w, wi) => (
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
      <WeeklyOverview stats={stats} data={data} />
    </div>
  );
}

function DonutChart({ percentage, color, size = 80 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="block mx-auto">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        className="transition-all duration-500"
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="fill-foreground font-bold text-sm">
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

const WEEK_HSL_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(271, 81%, 56%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(300, 64%, 49%)",
];

const TASKS = [
  "Morning Meditation",
  "Exercise 30 min",
  "Read 20 Pages",
  "Drink 8 Glasses",
  "Journal Writing",
];

function WeeklyOverview({ stats, data }: { stats: any; data: HabitData }) {
  const cards = [
    ...WEEK_RANGES.map((w, i) => ({
      label: w.label,
      dateRange: w.dateRange,
      completed: stats.weeklyCompleted[i],
      total: stats.weeklyTotal[i],
      colorIdx: i,
    })),
    {
      label: "Monthly",
      dateRange: `${MONTH} ${YEAR}`,
      completed: stats.totalCompleted,
      total: stats.totalPossible,
      colorIdx: 5,
    },
  ];

  return (
    <div className="mt-4">
      <h2 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
        📊 Weekly Progress Overview
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {cards.map((card, i) => {
          const pct = card.total > 0 ? (card.completed / card.total) * 100 : 0;
          return (
            <div key={i} className="border border-border rounded bg-card overflow-hidden shadow-sm">
              <div className={`${WEEK_COLORS_BG[card.colorIdx]} text-primary-foreground text-center py-1 text-xxs font-bold`}>
                {card.label}
              </div>
              <div className="text-center text-xxs text-muted-foreground py-0.5">{card.dateRange}</div>
              <div className="p-2">
                <DonutChart percentage={pct} color={WEEK_HSL_COLORS[card.colorIdx]} size={70} />
              </div>
              <div className={`${WEEK_COLORS_BG[card.colorIdx]} text-primary-foreground text-center py-0.5 text-xxs font-bold`}>
                Tasks
              </div>
              <div className="p-1.5 space-y-0.5">
                {TASKS.map((task, ti) => (
                  <div key={ti} className="flex items-center gap-1 text-xxs text-foreground">
                    <span className="w-2.5 h-2.5 border border-muted-foreground/40 rounded-sm inline-block flex-shrink-0" />
                    <span className="truncate">{task}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border text-center py-1 text-xxs text-muted-foreground font-medium">
                Completed: {card.completed} / {card.total}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
