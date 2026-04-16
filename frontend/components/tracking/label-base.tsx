"use client";

import { TrackingCode } from "@/components/tracking/tracking-code";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface LabelBaseProps {
  code: string;
  borderStyle: "solid" | "dashed";
  borderColor: string;
  isPreview?: boolean;
  className?: string;
  children: ReactNode;
}

export function LabelBase({
  code,
  borderStyle,
  borderColor,
  isPreview = true,
  className,
  children,
}: LabelBaseProps) {
  return (
    <div
      className={cn(
        "bg-white border-2 flex items-center overflow-hidden",
        `border-${borderStyle} ${borderColor}`,
        className
      )}
      style={{
        width: isPreview ? "280px" : "100%",
        height: isPreview ? "140px" : "100%",
        fontSize: "10px",
        lineHeight: "1.1",
        minHeight: isPreview ? "140px" : "46mm",
      }}>
      {/* Hole punch space */}
      <div className="bg-gray-50 border-r border-gray-200 h-full flex-shrink-0 w-[35px] md:w-[12.5%]" />
      
      {/* Content */}
      <div className="flex-1 h-full p-2 flex flex-col justify-center space-y-1 overflow-hidden min-w-0">
        {children}
      </div>
      
      {/* QR Code */}
      <div className="h-full flex items-center justify-center px-1 flex-shrink-0 w-[100px] md:w-[35.7%]">
        <div className="flex flex-col items-center justify-center">
          <TrackingCode data={code} size={70} />
          <div className="font-mono font-bold text-center mt-1 leading-tight break-all max-w-full text-[7px]">
            {code}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LabelFieldProps {
  label: string;
  value: string | number;
  className?: string;
}

export function LabelField({ label, value, className }: LabelFieldProps) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <span className="font-medium text-gray-600 text-[8px]">{label}:</span>
      <div className="font-bold truncate text-[9px]">{value}</div>
    </div>
  );
}

export function LabelFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-1 text-[8px]">{children}</div>;
}
