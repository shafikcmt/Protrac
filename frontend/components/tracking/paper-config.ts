export type PaperSize = "thermal" | "a4";

export interface PaperConfig {
  id: PaperSize;
  name: string;
  dimensions: string;
  printStyles: string;
}

// Print styles for thermal (single label) printing
const THERMAL_PRINT_STYLES = `
  @page { size: 100mm 50mm; margin: 1mm; }
  @media print {
    body { margin: 0; padding: 0; }
    .print-content { 
      width: 98mm !important; 
      height: 48mm !important; 
      margin: 0; 
      padding: 0;
      display: block !important;
    }
    .print-label {
      width: 98mm !important;
      height: 48mm !important;
      margin: 0 !important;
      padding: 1mm !important;
      page-break-after: always;
      display: block !important;
      box-sizing: border-box;
    }
    .print-label:last-child { page-break-after: avoid; }
  }
`;

// Print styles for A4 (multi-label) printing
const A4_PRINT_STYLES = `
  @page { size: A4; margin: 10mm; }
  @media print {
    body { margin: 0; padding: 0; }
    .print-content {
      width: 190mm !important;
      margin: 0 auto;
      padding: 0;
      display: grid !important;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: 6mm;
      page-break-inside: avoid;
    }
    .print-label {
      width: 92mm !important;
      height: 46mm !important;
      margin: 0 !important;
      padding: 2mm !important;
      break-inside: avoid;
      display: block !important;
      box-sizing: border-box;
      border: 1px solid #ddd;
    }
  }
`;

export const PAPER_CONFIGS: Record<PaperSize, PaperConfig> = {
  thermal: {
    id: "thermal",
    name: "Single Label",
    dimensions: "50×100mm",
    printStyles: THERMAL_PRINT_STYLES,
  },
  a4: {
    id: "a4",
    name: "Multi Label",
    dimensions: "A4 Paper",
    printStyles: A4_PRINT_STYLES,
  },
};
