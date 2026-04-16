"use client";

import { LabelBase, LabelField, LabelFieldGrid } from "./label-base";

interface BundleLabelProps {
  code: string;
  orderNumber: string;
  style: string;
  size: string;
  color: string;
  quantity: number;
  cutPartName?: string;
  assemblyPartName?: string | null;
  partName?: string;
  partRangeDisplay?: string;
  bundleNumber?: string;
  isPreview?: boolean;
  className?: string;
}

export function BundleLabel50X100({
  code,
  orderNumber,
  style,
  size,
  color,
  quantity,
  cutPartName,
  assemblyPartName,
  partName,
  partRangeDisplay,
  bundleNumber,
  isPreview = true,
  className,
}: BundleLabelProps) {
  return (
    <LabelBase
      code={code}
      borderStyle="solid"
      borderColor="border-black"
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
      <LabelFieldGrid>
        <LabelField
          label="Qty"
          value={quantity}
        />
        <LabelField
          label="Bundle"
          value={bundleNumber || "N/A"}
        />
      </LabelFieldGrid>

      <LabelFieldGrid>
        {/* Show Cut and Part fields only for BundleIssueInfo (legacy) */}
        {cutPartName !== undefined && assemblyPartName !== undefined ? (
          <>
            <LabelField
              label="Cut"
              value={cutPartName || "N/A"}
            />
            <LabelField
              label="Part"
              value={assemblyPartName || "N/A"}
            />
          </>
        ) : (
          /* Show Part and Range for regular Bundles */
          <>
            <LabelField
              label="Part"
              value={partName || "N/A"}
            />
            <LabelField
              label="Range"
              value={partRangeDisplay || "N/A"}
            />
          </>
        )}
      </LabelFieldGrid>
    </LabelBase>
  );
}
