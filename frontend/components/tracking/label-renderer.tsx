"use client";

import { BundleLabel50X100 } from "./bundle-label-50x100";
import { GarmentLabel50X100 } from "./garment-label-50x100";
import { z } from "zod";
import { schemas } from "@/types/api/client";

type Bundle = z.infer<typeof schemas.Bundle>;
type BundleIssueInfo = z.infer<typeof schemas.BundleIssueInfo>;
type Garment = z.infer<typeof schemas.Garment>;

export interface LabelData {
  type: "bundle" | "garment";
  bundle?: Bundle | BundleIssueInfo;
  garment?: Garment;
  key: string;
}

interface LabelRendererProps {
  label: LabelData;
  isPreview: boolean;
}

export function LabelRenderer({ label, isPreview }: LabelRendererProps) {
  // Helper function to check if bundle is BundleIssueInfo (has old cut_part_name field)
  const isBundleIssueInfo = (
    bundle: Bundle | BundleIssueInfo
  ): bundle is BundleIssueInfo => {
    return "cut_part_name" in bundle;
  };

  if (label.type === "bundle" && label.bundle) {
    const bundle = label.bundle;

    if (isBundleIssueInfo(bundle)) {
      // Handle BundleIssueInfo type (legacy with cut/assembly parts)
      return (
        <BundleLabel50X100
          code={bundle.tracking_code}
          orderNumber={bundle.order_number}
          style={bundle.style_name}
          size={bundle.size_name}
          color={bundle.color_name}
          quantity={bundle.quantity}
          cutPartName={bundle.cut_part_name}
          assemblyPartName={bundle.assembly_part_name}
          bundleNumber={undefined} // BundleIssueInfo doesn't have display_bundle_number
          isPreview={isPreview}
        />
      );
    } else {
      // Handle Bundle type
      const regularBundle = bundle as Bundle;
      return (
        <BundleLabel50X100
          code={regularBundle.tracking_code}
          orderNumber={regularBundle.order_number}
          style={regularBundle.style_name}
          size={regularBundle.size_name}
          color={regularBundle.color_name}
          quantity={regularBundle.garment_quantity || 0}
          partName={regularBundle.part_name}
          partRangeDisplay={regularBundle.part_range_display}
          bundleNumber={regularBundle.display_bundle_number}
          isPreview={isPreview}
        />
      );
    }
  }

  if (label.type === "garment" && label.garment) {
    return (
      <GarmentLabel50X100
        code={label.garment.tracking_code}
        orderNumber={label.garment.order_number}
        style={label.garment.style_name}
        size={label.garment.size_name}
        color={label.garment.color_name}
        sequenceNumber={label.garment.sequence_number}
        isPreview={isPreview}
      />
    );
  }

  return null;
}
