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
  colorClass: string;
  borderClass: string;
}

function StatCard({ label, value, colorClass, borderClass }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-t-4 px-6 py-4 bg-card shadow-sm flex flex-col gap-1",
        borderClass
      )}
    >
      <span
        className={cn(
          "text-xs font-bold uppercase tracking-widest",
          colorClass
        )}
      >
        {label}
      </span>
      <span className="text-5xl font-black tabular-nums leading-none">
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
        colorClass="text-blue-600 dark:text-blue-400"
        borderClass="border-blue-500"
      />
      <StatCard
        label="Total Output"
        value={summaryStats.totalOutput.toLocaleString()}
        colorClass="text-green-600 dark:text-green-400"
        borderClass="border-green-500"
      />
      <StatCard
        label="Total WIP"
        value={summaryStats.totalWip.toLocaleString()}
        colorClass="text-amber-600 dark:text-amber-400"
        borderClass="border-amber-500"
      />
      <StatCard
        label="Completion"
        value={completionPct}
        colorClass="text-purple-600 dark:text-purple-400"
        borderClass="border-purple-500"
      />
      <StatCard
        label="QC Pass Rate"
        value={qcPassRate !== null ? `${qcPassRate.toFixed(1)}%` : "N/A"}
        colorClass="text-teal-600 dark:text-teal-400"
        borderClass="border-teal-500"
      />
    </div>
  );
}
