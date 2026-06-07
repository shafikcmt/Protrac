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

interface StatCardProps {
  label: string;
  value: string;
  topBorderClass: string;
  labelColorClass: string;
}

function StatCard({ label, value, topBorderClass, labelColorClass }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-slate-700",
        "bg-white dark:bg-slate-800",
        "px-6 py-5 flex flex-col justify-between min-h-[140px] border-t-4",
        topBorderClass
      )}
    >
      <span className={cn("text-sm font-bold uppercase tracking-widest", labelColorClass)}>
        {label}
      </span>
      <span className="text-6xl font-black tabular-nums leading-none text-gray-900 dark:text-white">
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
        topBorderClass="border-t-blue-500"
        labelColorClass="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="Total Output"
        value={summaryStats.totalOutput.toLocaleString()}
        topBorderClass="border-t-green-500"
        labelColorClass="text-green-600 dark:text-green-400"
      />
      <StatCard
        label="Total WIP"
        value={summaryStats.totalWip.toLocaleString()}
        topBorderClass="border-t-amber-500"
        labelColorClass="text-amber-600 dark:text-amber-400"
      />
      <StatCard
        label="Completion"
        value={completionPct}
        topBorderClass="border-t-purple-500"
        labelColorClass="text-purple-600 dark:text-purple-400"
      />
      <StatCard
        label="QC Pass Rate"
        value={qcPassRate !== null ? `${qcPassRate.toFixed(1)}%` : "N/A"}
        topBorderClass="border-t-teal-500"
        labelColorClass="text-teal-600 dark:text-teal-400"
      />
    </div>
  );
}
