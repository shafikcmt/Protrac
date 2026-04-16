import { useMemo, useRef } from "react";
import isEqual from "fast-deep-equal";

export function useSewingChartData(sewingLines: any[]) {
  const previousDataRef = useRef<{
    inputOutput: Array<{ line: string; input: number; output: number }>;
    qualityCheck: Array<{
      line: string;
      qc_pass: number;
      qc_fail: number;
      qc_rework: number;
    }>;
    partsYield: Array<{
      part: string;
      total_produced: number;
      max_possible: number;
    }>;
  } | null>(null);
  const stableChartDataRef = useRef<typeof previousDataRef.current>(null);

  // Transform data for charts
  const chartData = useMemo(() => {
    const emptyData = { inputOutput: [], qualityCheck: [], partsYield: [] };

    if (!sewingLines.length) {
      // For empty data, still do comparison to avoid unnecessary re-renders
      if (!isEqual(emptyData, previousDataRef.current)) {
        previousDataRef.current = emptyData;
        stableChartDataRef.current = emptyData;
      }
      return stableChartDataRef.current || emptyData;
    }

    // Aggregate data across all orders in all sewing lines
    const inputOutputData = sewingLines.map((line) => {
      const totalInput = line.orders.reduce(
        (sum: number, order: any) => sum + order.input,
        0
      );
      const totalOutput = line.orders.reduce(
        (sum: number, order: any) => sum + order.output,
        0
      );

      return {
        line: line.production_line_name,
        input: totalInput,
        output: totalOutput,
      };
    });

    // Quality check data aggregated by line
    const qualityCheckData = sewingLines.map((line) => {
      const aggregatedStats = line.orders.reduce(
        (acc: any, order: any) => ({
          qc_pass: acc.qc_pass + order.qc_stats.qc_pass,
          qc_fail: acc.qc_fail + order.qc_stats.qc_fail,
          qc_rework: acc.qc_rework + order.qc_stats.qc_rework,
        }),
        { qc_pass: 0, qc_fail: 0, qc_rework: 0 }
      );

      return {
        line: line.production_line_name,
        ...aggregatedStats,
      };
    });

    // Assembly parts data - get unique parts across all orders
    const partsMap = new Map<
      string,
      { total_produced: number; max_possible: number }
    >();

    sewingLines.forEach((line) => {
      line.orders.forEach((order: any) => {
        order.assembly_parts.forEach((part: any) => {
          if (partsMap.has(part.name)) {
            const existing = partsMap.get(part.name)!;
            partsMap.set(part.name, {
              total_produced: existing.total_produced + part.total_produced,
              max_possible: existing.max_possible + part.max_possible,
            });
          } else {
            partsMap.set(part.name, {
              total_produced: part.total_produced,
              max_possible: part.max_possible,
            });
          }
        });
      });
    });

    const partsYieldData = Array.from(partsMap.entries()).map(
      ([name, data]) => ({
        part: name,
        ...data,
      })
    );

    const newChartData = {
      inputOutput: inputOutputData,
      qualityCheck: qualityCheckData,
      partsYield: partsYieldData,
    };

    // Only update if data has actually changed
    if (!isEqual(newChartData, previousDataRef.current)) {
      previousDataRef.current = newChartData;
      stableChartDataRef.current = newChartData;
    }

    return stableChartDataRef.current || newChartData;
  }, [sewingLines]);

  // Calculate summary statistics with stable references
  const summaryStatsRef = useRef<{
    totalLines: number;
    totalOrders: number;
    totalFifoViolations: number;
    avgCompletionRate: number;
  } | null>(null);

  const summaryStats = useMemo(() => {
    const emptySummary = {
      totalLines: 0,
      totalOrders: 0,
      totalFifoViolations: 0,
      avgCompletionRate: 0,
    };

    if (!sewingLines.length) {
      if (!isEqual(emptySummary, summaryStatsRef.current)) {
        summaryStatsRef.current = emptySummary;
      }
      return summaryStatsRef.current || emptySummary;
    }

    const totalLines = sewingLines.length;
    const totalOrders = sewingLines.reduce(
      (sum: number, line: any) => sum + line.orders.length,
      0
    );
    const totalFifoViolations = sewingLines.reduce(
      (sum: number, line: any) => sum + line.fifo_summary.total_fifo_violations,
      0
    );
    const avgCompletionRate =
      sewingLines.reduce((sum: number, line: any) => {
        const lineAvg =
          line.orders.reduce(
            (orderSum: number, order: any) => orderSum + order.completion_rate,
            0
          ) / (line.orders.length || 1);
        return sum + lineAvg;
      }, 0) / totalLines;

    const newSummaryStats = {
      totalLines,
      totalOrders,
      totalFifoViolations,
      avgCompletionRate,
    };

    // Only update if summary stats have actually changed
    if (!isEqual(newSummaryStats, summaryStatsRef.current)) {
      summaryStatsRef.current = newSummaryStats;
    }

    return summaryStatsRef.current || newSummaryStats;
  }, [sewingLines]);

  return { chartData, summaryStats };
}
