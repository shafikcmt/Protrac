/**
 * Company horizontal wordmark, embedded as raw base64 (no `data:` prefix) so
 * exceljs can drop it straight into a workbook without a runtime fetch/CORS hop.
 *
 * Currently empty — the Excel export renders without a logo until this is
 * filled. To enable it, paste the base64 of
 * backend/tracking/static/images/company-logo-horizontal.png here, e.g.:
 *
 *   PowerShell:
 *     [Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\logo.png"))
 *
 * Keep it a PNG so `extension: "png"` in generateDailyProductionExcel matches.
 */
export const COMPANY_LOGO_BASE64: string = "";
