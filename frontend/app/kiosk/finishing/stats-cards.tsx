import { cn } from "@/lib/utils";

interface StatsCardsProps {
  chartData: {
    inputOutput: Array<{
      order: string;
      input: number;
      output: number;
      wip: number;
    }>;
    qualityCheck: Array<{
      order: string;
      qc_pass: number;
      qc_fail: number;
      qc_rework: number;
    }>;
  };
  summaryStats: {
    totalLines: number;
    totalOrders: number;
    totalFifoViolations: number;
    avgCompletionRate: number;
    totalInput: number;
    totalOutput: number;
    totalWip: number;
  };
}

type AccentKey = "blue" | "green" | "amber" | "purple" | "teal";

const ACCENT: Record<
  AccentKey,
  { bar: string; wash: string; label: string; dot: string; glow: string }
> = {
  blue: {
    bar: "from-blue-400 to-blue-600",
    wash: "from-blue-50/80 dark:from-blue-500/10",
    label: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    glow: "group-hover:shadow-blue-500/10",
  },
  green: {
    bar: "from-emerald-400 to-green-600",
    wash: "from-emerald-50/80 dark:from-emerald-500/10",
    label: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    glow: "group-hover:shadow-emerald-500/10",
  },
  amber: {
    bar: "from-amber-400 to-orange-500",
    wash: "from-amber-50/80 dark:from-amber-500/10",
    label: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    glow: "group-hover:shadow-amber-500/10",
  },
  purple: {
    bar: "from-violet-400 to-purple-600",
    wash: "from-violet-50/80 dark:from-violet-500/10",
    label: "text-purple-600 dark:text-purple-400",
    dot: "bg-violet-500",
    glow: "group-hover:shadow-violet-500/10",
  },
  teal: {
    bar: "from-teal-400 to-cyan-600",
    wash: "from-teal-50/80 dark:from-teal-500/10",
    label: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
    glow: "group-hover:shadow-teal-500/10",
  },
};

interface StatCardProps {
  label: string;
  value: string;
  accent: AccentKey;
}

function StatCard({ label, value, accent }: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border border-gray-200/80 dark:border-slate-700/80",
        "bg-white dark:bg-slate-800/90",
        "px-6 py-5 flex flex-col justify-between min-h-[140px]",
        "shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        a.glow
      )}
    >
      {/* Accent top bar */}
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", a.bar)} />
      {/* Subtle corner wash */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl",
          "bg-gradient-to-br to-transparent opacity-70",
          a.wash
        )}
      />

      <span
        className={cn(
          "relative flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em]",
          a.label
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", a.dot)} />
        {label}
      </span>
      <span className="relative text-6xl font-black tabular-nums leading-none tracking-tight text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

export function StatsCards({ chartData, summaryStats }: StatsCardsProps) {
  const totalQcChecks = chartData.qualityCheck.reduce(
    (sum, item) => sum + item.qc_pass + item.qc_fail + item.qc_rework,
    0
  );
  const totalQcPass = chartData.qualityCheck.reduce(
    (sum, item) => sum + item.qc_pass,
    0
  );
  const qcPassRate =
    totalQcChecks > 0 ? (totalQcPass / totalQcChecks) * 100 : null;

  const completionPct =
    summaryStats.avgCompletionRate >= 0
      ? `${(summaryStats.avgCompletionRate * 100).toFixed(1)}%`
      : "N/A";

  return (
    <div className="grid grid-cols-5 gap-4 shrink-0">
      <StatCard
        label="Total Input"
        value={summaryStats.totalInput.toLocaleString()}
        accent="blue"
      />
      <StatCard
        label="Total Output"
        value={summaryStats.totalOutput.toLocaleString()}
        accent="green"
      />
      <StatCard
        label="Total WIP"
        value={summaryStats.totalWip.toLocaleString()}
        accent="amber"
      />
      <StatCard
        label="Completion"
        value={completionPct}
        accent="purple"
      />
      <StatCard
        label="QC Pass Rate"
        value={qcPassRate !== null ? `${qcPassRate.toFixed(1)}%` : "N/A"}
        accent="teal"
      />
    </div>
  );
}
