"use client";

import { forwardRef } from "react";
import { useQRCode } from "next-qrcode";
import { cn } from "@/lib/utils";

interface TrackingCodeProps {
  data: string;
  size?: number;
  className?: string;
}

export const TrackingCode = forwardRef<HTMLDivElement, TrackingCodeProps>(
  ({ data, size = 100, className }, ref) => {
    const { Canvas } = useQRCode();

    // Validate input data
    if (!data || data.trim() === "") {
      return (
        <div
          ref={ref}
          className={cn(
            "bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500",
            className
          )}
          style={{ width: size, height: size }}>
          No Data
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("bg-white", className)}>
        <Canvas
          text={data.trim()}
          options={{
            width: size,
            margin: 0,
            errorCorrectionLevel: "H",
          }}
        />
      </div>
    );
  }
);

TrackingCode.displayName = "TrackingCode";
