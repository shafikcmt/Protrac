"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import {
  OrderGroup,
  getStatus,
  STATUS_LABEL,
} from "@/app/kiosk/finishing/finishing-types";

interface SummaryStats {
  totalInput: number;
  totalOutput: number;
  totalWip: number;
  avgCompletionRate: number;
  totalOrders: number;
}

interface FinishingPrintableReportProps {
  groups: OrderGroup[];
  summaryStats: SummaryStats;
  qcPassRate: number | null;
}

export const FinishingPrintableReport = React.forwardRef<
  HTMLDivElement,
  FinishingPrintableReportProps
>(({ groups, summaryStats, qcPassRate }, ref) => {
  const now = format(new Date(), "MMMM d, yyyy 'at' HH:mm");

  return (
    <div ref={ref} className="hidden print:block bg-white text-black font-sans">
      <style>{`
        @page { margin: 0.65in; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="p-0">
        {/* Header */}
        <div style={{ borderBottom: "2px solid #111", paddingBottom: "12px", marginBottom: "20px" }}>
          <div style={{ fontSize: "20px", fontWeight: 900 }}>Humana Apparels Pvt. Ltd.</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#374151", marginTop: "2px" }}>
            Finishing Production Report
          </div>
          <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>
            Generated: {now}
          </div>
        </div>

        {/* Summary table */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
            Summary
          </div>
          <table style={{ borderCollapse: "collapse", fontSize: "12px", width: "320px" }}>
            <thead>
              <tr style={{ background: "#1E3A5F", color: "#fff" }}>
                <th style={{ border: "1px solid #d1d5db", padding: "5px 10px", textAlign: "left" }}>Metric</th>
                <th style={{ border: "1px solid #d1d5db", padding: "5px 10px", textAlign: "right" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Total Orders", summaryStats.totalOrders],
                ["Total Input", summaryStats.totalInput.toLocaleString()],
                ["Total Output", summaryStats.totalOutput.toLocaleString()],
                ["Total WIP", summaryStats.totalWip.toLocaleString()],
                ["Avg Completion", `${(summaryStats.avgCompletionRate * 100).toFixed(1)}%`],
                ...(qcPassRate !== null
                  ? [["QC Pass Rate", `${qcPassRate.toFixed(1)}%`]]
                  : []),
              ].map(([label, value], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 10px", fontWeight: 600 }}>{label}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "5px 10px", textAlign: "right" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order details */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
            Order Details ({groups.length} order{groups.length !== 1 ? "s" : ""})
          </div>

          {groups.map((order) => {
            const status = getStatus(order);
            const deliveryStr = order.delivery_date
              ? format(parseISO(order.delivery_date), "MMM dd, yyyy")
              : "—";
            const ratePct = (order.completion_rate * 100).toFixed(1);

            return (
              <div key={order.order_number} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                {/* Order header row */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px", fontSize: "12px" }}>
                  <span style={{ fontWeight: 900, fontSize: "13px" }}>{order.order_number}</span>
                  <span style={{ color: "#4B5563" }}>{order.style_name}</span>
                  <span style={{ color: "#6B7280", fontSize: "11px" }}>{order.customer_name}</span>
                  <span style={{ marginLeft: "auto", color: "#6B7280" }}>Delivery: {deliveryStr}</span>
                  <span style={{ fontWeight: 700 }}>[{STATUS_LABEL[status]}]</span>
                </div>

                <table style={{ borderCollapse: "collapse", fontSize: "11px", width: "100%" }}>
                  <thead>
                    <tr style={{ background: "#F3F4F6" }}>
                      {["Size", "Input", "Output", "WIP", "Done%"].map((h) => (
                        <th
                          key={h}
                          style={{
                            border: "1px solid #E5E7EB",
                            padding: "3px 8px",
                            textAlign: h === "Size" ? "left" : "right",
                            fontWeight: 700,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.sizes.map((s, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                        <td style={{ border: "1px solid #E5E7EB", padding: "3px 8px", fontWeight: 600 }}>{s.size_name}</td>
                        <td style={{ border: "1px solid #E5E7EB", padding: "3px 8px", textAlign: "right" }}>{s.input.toLocaleString()}</td>
                        <td style={{ border: "1px solid #E5E7EB", padding: "3px 8px", textAlign: "right" }}>{s.output.toLocaleString()}</td>
                        <td style={{ border: "1px solid #E5E7EB", padding: "3px 8px", textAlign: "right" }}>{s.wip.toLocaleString()}</td>
                        <td style={{ border: "1px solid #E5E7EB", padding: "3px 8px", textAlign: "right" }}>{s.rate.toFixed(0)}%</td>
                      </tr>
                    ))}
                    {order.sizes.length > 1 && (
                      <tr style={{ background: "#E5E7EB", fontWeight: 900 }}>
                        <td style={{ border: "1px solid #D1D5DB", padding: "3px 8px" }}>Total</td>
                        <td style={{ border: "1px solid #D1D5DB", padding: "3px 8px", textAlign: "right" }}>{order.total_input.toLocaleString()}</td>
                        <td style={{ border: "1px solid #D1D5DB", padding: "3px 8px", textAlign: "right" }}>{order.total_output.toLocaleString()}</td>
                        <td style={{ border: "1px solid #D1D5DB", padding: "3px 8px", textAlign: "right" }}>{order.total_wip.toLocaleString()}</td>
                        <td style={{ border: "1px solid #D1D5DB", padding: "3px 8px", textAlign: "right" }}>{ratePct}%</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #D1D5DB", paddingTop: "10px", marginTop: "24px", fontSize: "10px", color: "#9CA3AF", textAlign: "center" }}>
          ProTrac — Production Tracking System | Humana Apparels Pvt. Ltd.
        </div>
      </div>
    </div>
  );
});

FinishingPrintableReport.displayName = "FinishingPrintableReport";
