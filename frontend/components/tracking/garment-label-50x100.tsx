"use client";

import { LabelBase, LabelField, LabelFieldGrid } from "./label-base";

interface GarmentLabelProps {
  code: string;
  orderNumber: string;
  style: string;
  size: string;
  color: string;
  sequenceNumber?: number | null;
  isPreview?: boolean;
  className?: string;
}

export function GarmentLabel50X100({
  code,
  orderNumber,
  style,
  size,
  color,
  sequenceNumber,
  isPreview = true,
  className,
}: GarmentLabelProps) {
  return (
    <LabelBase
      code={code}
      borderStyle="dashed"
      borderColor="border-gray-600"
      isPreview={isPreview}
      className={className}>
      <LabelFieldGrid>
        <LabelField
          label="Order"
          value={orderNumber}
        />
        <LabelField
          label="Style"
          value={style}
        />
      </LabelFieldGrid>

      <LabelFieldGrid>
        <LabelField
          label="Size"
          value={size}
        />
        <LabelField
          label="Color"
          value={color}
        />
      </LabelFieldGrid>

      <LabelField
        label="SL"
        value={sequenceNumber || "N/A"}
        className="text-[8px]"
      />
    </LabelBase>
  );
}
