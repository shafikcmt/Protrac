import { useMemo, useRef } from "react";
import isEqual from "fast-deep-equal";

export function useFinishingChartData(finishingOrders: any[]) {
  const previousDataRef = useRef<{
    inputOutput: Array<{
      order: string;
      orderNumber: string;
      size: string;
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
  } | null>(null);

  const stableChartDataRef = useRef<typeof previousDataRef.current>(null);

  const chartData = useMemo(() => {
    const emptyData = { inputOutput: [], qualityCheck: [] };

    if (!finishingOrders.length) {
      if (!isEqual(emptyData, previousDataRef.current)) {
        previousDataRef.current = emptyData;
        stableChartDataRef.current = emptyData;
      }
      return stableChartDataRef.current || emptyData;
    }

    const inputOutputData = finishingOrders.map((order) => {
      const sizeValue = order.size_name || order.size || "-";
      return {
        order: `${order.order_number}-${sizeValue}`,
        orderNumber: order.order_number,
        size: sizeValue,
        input: order.input_garments,
        output: order.output_garments,
        wip: order.in_progress_garments,
      };
    });

    const qualityCheckData = finishingOrders.map((order) => ({
      order: order.order_number,
      qc_pass: order.qc_stats.passed_qc,
      qc_fail: order.qc_stats.failed_qc,
      qc_rework: 0,
    }));

    const newData = {
      inputOutput: inputOutputData,
      qualityCheck: qualityCheckData,
    };

    if (!isEqual(newData, previousDataRef.current)) {
      previousDataRef.current = newData;
      stableChartDataRef.current = newData;
    }

    return stableChartDataRef.current || newData;
  }, [finishingOrders]);

  const summaryStats = useMemo(() => {
    const totalOrders = finishingOrders.length;

    const uniqueLines = new Set<string>();
    finishingOrders.forEach((order) => {
      order.source_lines?.forEach((line: any) => {
        uniqueLines.add(line.name);
      });
    });
    const totalLines = uniqueLines.size;

    const totalInput = finishingOrders.reduce(
      (sum, order) => sum + (order.input_garments || 0),
      0
    );

    const totalOutput = finishingOrders.reduce(
      (sum, order) => sum + (order.output_garments || 0),
      0
    );

    const totalWip = finishingOrders.reduce(
      (sum, order) => sum + (order.in_progress_garments || 0),
      0
    );

    const avgCompletionRate = totalInput > 0 ? totalOutput / totalInput : 0;
    const totalFifoViolations = 0;

    return {
      totalLines,
      totalOrders,
      totalFifoViolations,
      avgCompletionRate,
      totalInput,
      totalOutput,
      totalWip,
    };
  }, [finishingOrders]);

  return { chartData, summaryStats };
}