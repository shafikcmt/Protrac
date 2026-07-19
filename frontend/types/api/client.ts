import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const TokenObtainPairRequest = z
  .object({ username: z.string().min(1), password: z.string().min(1) })
  .passthrough();
const TokenObtainPair = z
  .object({ access: z.string(), refresh: z.string() })
  .passthrough();
const UserScannerInfo = z
  .object({
    id: z.number().int(),
    name: z.string(),
    scanner_type: z.string(),
    scanner_type_display: z.string(),
    production_line: z.string(),
    production_line_type: z.string(),
  })
  .passthrough();
const UserProfile = z
  .object({
    id: z.number().int(),
    username: z.string(),
    email: z.string().email().nullable(),
    full_name: z.string(),
    image: z.string().url().nullish(),
    groups: z.array(z.string()),
    permissions: z.array(z.string()),
    assigned_scanner: UserScannerInfo.nullable(),
    can_perform_tracking: z.boolean(),
  })
  .passthrough();
const PatchedUserProfileUpdateRequest = z
  .object({
    first_name: z.string().max(150),
    last_name: z.string().max(150),
    image: z.instanceof(File).nullable(),
  })
  .partial()
  .passthrough();
const TokenRefreshRequest = z
  .object({ refresh: z.string().min(1) })
  .passthrough();
const TokenRefresh = z.object({ access: z.string() }).passthrough();
const Message = z.object({ message: z.string() }).passthrough();
const DailySummaryPart = z
  .object({ part_name: z.string(), issued_today: z.number().int() })
  .passthrough();
const DailySummaryGarment = z
  .object({ id: z.string(), time: z.string() })
  .passthrough();
const DailySummaryActiveOrder = z
  .object({ order_number: z.string(), style: z.string() })
  .passthrough();
const DailySummaryGarmentCell = z
  .object({
    sequence_number: z.number().int(),
    tracking_code: z.string(),
    status: z.string(),
  })
  .passthrough();
const DailySummaryOrderGroup = z
  .object({
    order_number: z.string(),
    style: z.string(),
    size: z.string(),
    last_activity_at: z.string(),
    garments_grid: z.array(DailySummaryGarmentCell),
  })
  .passthrough();
const DailySummaryHour = z
  .object({
    hour: z.number().int(),
    target: z.number().int(),
    bundles_received: z.number().int(),
    assembly_complete: z.number().int(),
  })
  .passthrough();
const AssemblyDailySummaryResponse = z
  .object({
    line: z.string(),
    date: z.string(),
    total_assemble: z.number().int(),
    parts_summary: z.array(DailySummaryPart),
    total_parts_issued: z.number().int(),
    parts_issued_count: z.number().int(),
    parts_total_count: z.number().int(),
    recent_garments: z.array(DailySummaryGarment),
    active_order: DailySummaryActiveOrder.nullable(),
    garments_grid: z.array(DailySummaryGarmentCell),
    order_groups: z.array(DailySummaryOrderGroup),
    hourly: z.array(DailySummaryHour),
  })
  .passthrough();
const BundleStatusEnum = z.enum(["created", "issued_to_sewing", "completed"]);
const Bundle = z
  .object({
    id: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    tracking_code: z.string(),
    order: z.number().int(),
    order_number: z.string(),
    part: z.number().int(),
    part_name: z.string(),
    style_name: z.string(),
    size_name: z.string(),
    color_name: z.string(),
    spread: z.number().int(),
    spread_number: z.string(),
    bundle_number_in_spread: z.number().int().gte(0).lte(2147483647),
    garment_quantity: z.number().int().gte(0).lte(2147483647).optional(),
    part_number_start: z.number().int(),
    part_number_end: z.number().int(),
    display_bundle_number: z.string(),
    part_range_display: z.string(),
    status: BundleStatusEnum,
    assigned_sewing_line: z.number().int().nullable(),
    issued_at: z.string().datetime({ offset: true }).nullable(),
    completed_at: z.string().datetime({ offset: true }).nullable(),
    fifo_violation_flag: z.boolean(),
  })
  .passthrough();
const PaginatedBundleList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Bundle),
  })
  .passthrough();
const SingleBundleSetCreateResponse = z
  .object({
    bundles: z.array(Bundle),
    bundle_count: z.number().int(),
    bundle_number: z.number().int(),
    bundle_size: z.number().int(),
    part_range: z.string(),
  })
  .passthrough();
const PaginatedSingleBundleSetCreateResponseList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(SingleBundleSetCreateResponse),
  })
  .passthrough();
const SingleBundleSetCreateRequest = z
  .object({
    order: z.number().int(),
    bundle_size: z.number().int().gte(1),
    spread: z.number().int(),
  })
  .passthrough();
const BundleRequest = z
  .object({
    order: z.number().int(),
    part: z.number().int(),
    spread: z.number().int(),
    bundle_number_in_spread: z.number().int().gte(0).lte(2147483647),
    garment_quantity: z.number().int().gte(0).lte(2147483647).optional(),
  })
  .passthrough();
const PatchedBundleRequest = z
  .object({
    order: z.number().int(),
    part: z.number().int(),
    spread: z.number().int(),
    bundle_number_in_spread: z.number().int().gte(0).lte(2147483647),
    garment_quantity: z.number().int().gte(0).lte(2147483647),
  })
  .partial()
  .passthrough();
const BulkBundleCreateRequest = z
  .object({
    order: z.number().int(),
    total_garment_quantity: z.number().int().gte(1),
    bundle_size: z.number().int().gte(1).optional().default(10),
    spread: z.number().int(),
  })
  .passthrough();
const BundleSetInfo = z
  .object({
    bundle_count: z.number().int(),
    bundle_number: z.number().int(),
    garment_quantity: z.number().int(),
    part_range: z.string(),
  })
  .passthrough();
const BulkBundleCreateResponse = z
  .object({
    bundles: z.array(Bundle),
    bundle_sets: z.array(BundleSetInfo),
    total_bundle_count: z.number().int(),
    total_garment_quantity: z.number().int(),
    distribution: z.array(z.number().int()),
  })
  .passthrough();
const BundleCreationPreviewRequestRequest = z
  .object({
    order: z.number().int(),
    total_garment_quantity: z.number().int().gte(1),
    bundle_size: z.number().int().gte(1).optional().default(10),
    spread: z.number().int(),
  })
  .passthrough();
const OrderInfo = z
  .object({
    order_number: z.string(),
    style_name: z.string(),
    size_name: z.string(),
    color_name: z.string(),
  })
  .passthrough();
const BundleSetPreviewItem = z
  .object({
    part_id: z.number().int(),
    part_name: z.string(),
    bundles_count: z.number().int(),
  })
  .passthrough();
const BundleCreationPreview = z
  .object({
    order_info: OrderInfo,
    spread_number: z.string(),
    total_garment_quantity: z.number().int(),
    bundle_sets: z.number().int(),
    total_bundles: z.number().int(),
    distribution: z.array(z.number().int()),
    parts: z.array(BundleSetPreviewItem),
  })
  .passthrough();
const BundleTransferRequestRequest = z
  .object({
    bundle_ids: z.array(z.number().int()),
    sewing_line: z.number().int(),
    reason: z.string().max(255).optional().default(""),
  })
  .passthrough();
const BundleTransferItem = z
  .object({
    bundle_id: z.number().int(),
    tracking_code: z.string(),
    from_line: z.string().nullable(),
    to_line: z.string(),
  })
  .passthrough();
const BundleTransferResponse = z
  .object({
    success: z.boolean(),
    message: z.string(),
    transferred_count: z.number().int(),
    transferred: z.array(BundleTransferItem),
  })
  .passthrough();
const Buyer = z
  .object({
    id: z.number().int(),
    name: z.string().max(100),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedBuyerList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Buyer),
  })
  .passthrough();
const BuyerRequest = z
  .object({ name: z.string().min(1).max(100) })
  .passthrough();
const PatchedBuyerRequest = z
  .object({ name: z.string().min(1).max(100) })
  .partial()
  .passthrough();
const Color = z
  .object({
    id: z.number().int(),
    name: z.string().max(50),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedColorList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Color),
  })
  .passthrough();
const ColorRequest = z
  .object({ name: z.string().min(1).max(50) })
  .passthrough();
const PatchedColorRequest = z
  .object({ name: z.string().min(1).max(50) })
  .partial()
  .passthrough();
const Defect = z
  .object({
    id: z.number().int(),
    code: z.string().max(10).optional(),
    name: z.string().max(100),
    description: z.string().nullish(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedDefectList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Defect),
  })
  .passthrough();
const DefectRequest = z
  .object({
    code: z.string().max(10).optional(),
    name: z.string().min(1).max(100),
    description: z.string().nullish(),
  })
  .passthrough();
const PatchedDefectRequest = z
  .object({
    code: z.string().max(10),
    name: z.string().min(1).max(100),
    description: z.string().nullable(),
  })
  .partial()
  .passthrough();
const FinishingQCActiveOrder = z
  .object({ order_number: z.string(), style: z.string() })
  .passthrough();
const FinishingQCGarmentCell = z
  .object({
    sequence_number: z.number().int(),
    tracking_code: z.string(),
    sewing_status: z.string(),
    finishing_status: z.string(),
    finishing_checked_date: z.string().nullable(),
  })
  .passthrough();
const FinishingQCOrderGroup = z
  .object({
    order_number: z.string(),
    style: z.string(),
    size: z.string(),
    last_activity_at: z.string(),
    garments_grid: z.array(FinishingQCGarmentCell),
  })
  .passthrough();
const FinishingQCDailySummaryResponse = z
  .object({
    line: z.string(),
    date: z.string(),
    total_output: z.number().int(),
    total_rework: z.number().int(),
    total_fail: z.number().int(),
    pass_rate: z.number(),
    total_inspected: z.number().int(),
    total_defects: z.number().int(),
    dhu: z.number(),
    active_order: FinishingQCActiveOrder.nullable(),
    garments_grid: z.array(FinishingQCGarmentCell),
    order_groups: z.array(FinishingQCOrderGroup),
  })
  .passthrough();
const GarmentStatusEnum = z.enum([
  "pending_assembly",
  "issued_for_assembly",
  "sewing_qc_pass",
  "sewing_qc_fail",
  "sewing_qc_rework",
  "finishing_qc_pass",
  "finishing_qc_fail",
  "finishing_qc_rework",
]);
const Garment = z
  .object({
    id: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    tracking_code: z.string(),
    order: z.number().int(),
    order_number: z.string(),
    style_name: z.string(),
    size_name: z.string(),
    color_name: z.string(),
    primary_bundle: z.number().int().nullish(),
    primary_bundle_id: z.number().int(),
    primary_bundle_tracking_code: z.string(),
    sequence_number: z.number().int(),
    bundle_set_number: z.number().int().nullable(),
    part_number_in_bundle: z.number().int().nullable(),
    display_number: z.string(),
    status: GarmentStatusEnum.optional(),
    sewing_line: z.number().int().nullish(),
    finishing_line: z.number().int().nullish(),
    issued_for_assembly_at: z.string().datetime({ offset: true }).nullable(),
    assembly_completed_at: z.string().datetime({ offset: true }).nullable(),
    finishing_completed_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedGarmentList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Garment),
  })
  .passthrough();
const ScannerInfo = z
  .object({
    scanner_type: z.string(),
    scanner_name: z.string(),
    scanner_production_line: z.string(),
  })
  .passthrough();
const BundleIssueInfo = z
  .object({
    id: z.number().int(),
    order_number: z.string(),
    style_name: z.string(),
    season_name: z.string(),
    size_name: z.string(),
    color_name: z.string(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    tracking_code: z.string(),
    cut_part_name: z.string(),
    assembly_part_name: z.string().nullable(),
    quantity: z.number().int(),
    issued_to_sewing_line: z.string(),
    bundle_id: z.number().int(),
    status: z.string(),
    assigned_sewing_line_id: z.number().int().nullable(),
  })
  .passthrough();
const BundleIssueInfoResponse = z
  .object({
    scanner_info: ScannerInfo,
    count: z.number().int(),
    results: z.array(BundleIssueInfo),
  })
  .passthrough();
const FinishingQCInfo = z
  .object({
    id: z.number().int(),
    tracking_code: z.string(),
    garment_status: z.string(),
    sewing_line: z.string(),
    latest_qc_status: z.string().nullable(),
    defect_count: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    finishing_line: z.string(),
  })
  .passthrough();
const FinishingQCInfoResponse = z
  .object({
    scanner_info: ScannerInfo,
    count: z.number().int(),
    results: z.array(FinishingQCInfo),
  })
  .passthrough();
const AssemblyTrackingIssueInfo = z
  .object({
    id: z.number().int(),
    tracking_code: z.string(),
    garment_status: z.string(),
    sewing_line: z.string(),
    created_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const AssemblyTrackingIssueInfoResponse = z
  .object({
    scanner_info: ScannerInfo,
    count: z.number().int(),
    results: z.array(AssemblyTrackingIssueInfo),
  })
  .passthrough();
const PartInventoryItem = z
  .object({
    order_id: z.number().int(),
    order_number: z.string(),
    style: z.string(),
    season: z.string(),
    size: z.string(),
    color: z.string(),
    part: z.string(),
    order_quantity: z.number().int(),
    total_quantity: z.number().int(),
    issued_quantity: z.number().int(),
    available_quantity: z.number().int(),
  })
  .passthrough();
const PartReceiveInfoResponse = z
  .object({
    scanner_info: ScannerInfo,
    count: z.number().int(),
    recent_scans: z.array(z.unknown()),
    inventory_items: z.array(PartInventoryItem),
    inventory_count: z.number().int(),
  })
  .passthrough();
const SewingQCInfo = z
  .object({
    id: z.number().int(),
    tracking_code: z.string(),
    garment_status: z.string(),
    sewing_line: z.string(),
    latest_qc_status: z.string().nullable(),
    defect_count: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const SewingQCInfoResponse = z
  .object({
    scanner_info: ScannerInfo,
    count: z.number().int(),
    results: z.array(SewingQCInfo),
  })
  .passthrough();
const LineTarget = z
  .object({
    id: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    line: z.number().int(),
    line_name: z.string(),
    date: z.string(),
    target_quantity: z.number().int().gte(0).lte(2147483647),
    work_hours: z.number().int().gte(0).lte(2147483647).optional(),
    worker_count: z.number().int().gte(0).lte(2147483647).optional(),
  })
  .passthrough();
const PaginatedLineTargetList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(LineTarget),
  })
  .passthrough();
const LineTargetRequest = z
  .object({
    line: z.number().int(),
    date: z.string(),
    target_quantity: z.number().int().gte(0).lte(2147483647),
    work_hours: z.number().int().gte(0).lte(2147483647).optional(),
    worker_count: z.number().int().gte(0).lte(2147483647).optional(),
  })
  .passthrough();
const PatchedLineTargetRequest = z
  .object({
    line: z.number().int(),
    date: z.string(),
    target_quantity: z.number().int().gte(0).lte(2147483647),
    work_hours: z.number().int().gte(0).lte(2147483647),
    worker_count: z.number().int().gte(0).lte(2147483647),
  })
  .partial()
  .passthrough();
const Order = z
  .object({
    id: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    order_number: z.string().max(100),
    style: z.number().int(),
    style_name: z.string(),
    size: z.number().int(),
    size_name: z.string(),
    color: z.number().int(),
    color_name: z.string(),
    buyer_name: z.string(),
    season_name: z.string(),
    quantity: z.number().int().gte(0).lte(2147483647),
    production_cutting_date: z.string().nullish(),
    delivery_date: z.string().nullish(),
    potential_garments: z.number().int(),
  })
  .passthrough();
const PaginatedOrderList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Order),
  })
  .passthrough();
const OrderRequest = z
  .object({
    order_number: z.string().min(1).max(100),
    style: z.number().int(),
    size: z.number().int(),
    color: z.number().int(),
    quantity: z.number().int().gte(0).lte(2147483647),
    production_cutting_date: z.string().nullish(),
    delivery_date: z.string().nullish(),
  })
  .passthrough();
const PatchedOrderRequest = z
  .object({
    order_number: z.string().min(1).max(100),
    style: z.number().int(),
    size: z.number().int(),
    color: z.number().int(),
    quantity: z.number().int().gte(0).lte(2147483647),
    production_cutting_date: z.string().nullable(),
    delivery_date: z.string().nullable(),
  })
  .partial()
  .passthrough();
const Part = z
  .object({
    id: z.number().int(),
    name: z.string().max(100),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedPartList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Part),
  })
  .passthrough();
const PartRequest = z
  .object({ name: z.string().min(1).max(100) })
  .passthrough();
const PatchedPartRequest = z
  .object({ name: z.string().min(1).max(100) })
  .partial()
  .passthrough();
const LineTypeEnum = z.enum(["cutting", "sewing", "finishing"]);
const ScannerTypeEnum = z.enum([
  "bundle_issue",
  "assembly_tracking",
  "sewing_qc_check",
  "finishing_qc_check",
]);
const ScannerList = z
  .object({
    id: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    name: z.string().max(100),
    scanner_type: ScannerTypeEnum,
    production_line_name: z.string(),
    production_line_type: z.string(),
  })
  .passthrough();
const ProductionLine = z
  .object({
    id: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    name: z.string().max(100),
    line_type: LineTypeEnum,
    scanners: z.array(ScannerList),
  })
  .passthrough();
const PaginatedProductionLineList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(ProductionLine),
  })
  .passthrough();
const ProductionLineRequest = z
  .object({ name: z.string().min(1).max(100), line_type: LineTypeEnum })
  .passthrough();
const PatchedProductionLineRequest = z
  .object({ name: z.string().min(1).max(100), line_type: LineTypeEnum })
  .partial()
  .passthrough();
const PartProduction = z
  .object({ day: z.number().int(), cumulative: z.number().int() })
  .passthrough();
const DayAndCumulative = z
  .object({ day: z.number().int(), cumulative: z.number().int() })
  .passthrough();
const OrderProductionReport = z
  .object({
    order_id: z.number().int().nullish(),
    production_line_id: z.number().int().nullish(),
    line: z.string(),
    buyer: z.string(),
    style: z.string(),
    size: z.string().nullish(),
    color: z.string().nullish(),
    order_quantity: z.number().int(),
    working_days: z.number().int(),
    working_hours: z.number().nullish(),
    input: z.number().int(),
    front: PartProduction.optional(),
    back: PartProduction.optional(),
    sleeve: PartProduction.optional(),
    collar: PartProduction.optional(),
    hood: PartProduction.optional(),
    lining: PartProduction.optional(),
    assembly_input: DayAndCumulative,
    output: DayAndCumulative,
    dhu_day: z.number(),
    dhu_average: z.number(),
    inspection: DayAndCumulative,
    packed: DayAndCumulative,
    needs_manual_complete: z.boolean().optional().default(false),
    is_pending_transition: z.boolean().optional().default(false),
    pending_quantity: z.number().int().optional().default(0),
    remarks: z.string().optional().default(""),
    is_hidden: z.boolean().optional().default(false),
    completion_id: z.number().int().nullish(),
  })
  .passthrough();
const ProductionLineReport = z
  .object({
    production_line_id: z.number().int(),
    production_line_name: z.string(),
    orders: z.array(OrderProductionReport),
  })
  .passthrough();
const ReportSummary = z
  .object({
    total_production_lines: z.number().int(),
    total_orders: z.number().int(),
    total_order_quantity: z.number().int(),
    daily_input: z.number().int(),
    daily_output: z.number().int(),
    daily_inspection: z.number().int(),
    daily_packed: z.number().int(),
    overall_efficiency: z.number(),
  })
  .passthrough();
const DailyProductionReportResponse = z
  .object({
    report_date: z.string(),
    company_name: z.string().optional().default("HUMANA APPARELS PVT. LTD"),
    report_title: z.string().optional().default("DAILY PRODUCTION REPORT"),
    production_lines: z.array(ProductionLineReport),
    summary: ReportSummary.optional(),
  })
  .passthrough();
const FifoViolation = z
  .object({
    id: z.number().int(),
    tracking_code: z.string(),
    display_bundle_number: z.string(),
    cut_part_name: z.string(),
    order_number: z.string(),
    status: z.string(),
    completed_at: z.string().datetime({ offset: true }).nullable(),
    fifo_violation_details: z.unknown().nullable(),
  })
  .passthrough();
const FifoViolationResponse = z
  .object({
    production_line_id: z.number().int(),
    production_line_name: z.string(),
    total_violations: z.number().int(),
    violations: z.array(FifoViolation),
  })
  .passthrough();
const FinishingQCStats = z
  .object({
    total_qc: z.number().int(),
    passed_qc: z.number().int(),
    failed_qc: z.number().int(),
    qc_rate: z.number(),
  })
  .passthrough();
const SourceLine = z
  .object({
    id: z.number().int(),
    name: z.string(),
    garment_count: z.number().int(),
  })
  .passthrough();
const FinishingOrderDashboard = z
  .object({
    id: z.number().int(),
    order_number: z.string(),
    customer_name: z.string(),
    style_name: z.string(),
    size_name: z.string().nullish(),
    delivery_date: z.string().nullish(),
    completion_rate: z.number().optional(),
    input_garments: z.number().int(),
    output_garments: z.number().int(),
    in_progress_garments: z.number().int(),
    qc_stats: FinishingQCStats,
    source_lines: z.array(SourceLine),
  })
  .passthrough();
const GarmentHeatmapItem = z
  .object({
    sequence_number: z.number().int(),
    status: z.string(),
    status_display: z.string(),
    tracking_code: z.string(),
    created_at: z.string().datetime({ offset: true }),
    issued_for_assembly_at: z.string().datetime({ offset: true }).nullable(),
    assembly_completed_at: z.string().datetime({ offset: true }).nullable(),
    finishing_completed_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const StatusSummary = z
  .object({
    pending_assembly: z.number().int().default(0),
    issued_for_assembly: z.number().int().default(0),
    sewing_qc_pass: z.number().int().default(0),
    sewing_qc_fail: z.number().int().default(0),
    sewing_qc_rework: z.number().int().default(0),
    finishing_qc_pass: z.number().int().default(0),
    finishing_qc_fail: z.number().int().default(0),
    finishing_qc_rework: z.number().int().default(0),
  })
  .partial()
  .passthrough();
const OrderHeatmap = z
  .object({
    order_id: z.number().int(),
    order_number: z.string(),
    style_name: z.string(),
    buyer_name: z.string(),
    season_name: z.string(),
    size_name: z.string(),
    color_name: z.string(),
    total_quantity: z.number().int(),
    garments: z.array(GarmentHeatmapItem),
    status_summary: StatusSummary,
  })
  .passthrough();
const GarmentHeatmapResponse = z
  .object({
    orders: z.array(OrderHeatmap),
    total_orders: z.number().int(),
    total_garments: z.number().int(),
    overall_status_summary: StatusSummary,
  })
  .passthrough();
const DefectItem = z
  .object({
    defect_name: z.string(),
    count: z.number().int(),
    percentage: z.number(),
  })
  .passthrough();
const SewingQCStats = z
  .object({
    qc_pass: z.number().int(),
    qc_fail: z.number().int(),
    qc_rework: z.number().int(),
    total_qc_completed: z.number().int(),
    total_defects: z.number().int(),
    dhu_percentage: z.number(),
    top_defects: z.array(DefectItem),
  })
  .passthrough();
const SewingAssemblyPartDetail = z
  .object({
    name: z.string(),
    available: z.number().int(),
    total_produced: z.number().int(),
    issued: z.number().int(),
    max_possible: z.number().int(),
    utilization_percentage: z.number(),
    is_bottleneck: z.boolean(),
  })
  .passthrough();
const FifoStatus = z
  .object({
    has_fifo_violations: z.boolean(),
    violation_count: z.number().int(),
    total_completed_bundles: z.number().int(),
  })
  .passthrough();
const SewingOrderDashboard = z
  .object({
    order_id: z.number().int(),
    order_number: z.string(),
    style: z.string(),
    season: z.string(),
    size: z.string(),
    color: z.string(),
    order_quantity: z.number().int(),
    input: z.number().int(),
    assembly_ready_count: z.number().int(),
    garment_assembly_wip: z.number().int(),
    output: z.number().int(),
    completion_rate: z.number(),
    total_inventory: z.number().int(),
    issued_inventory: z.number().int(),
    available_inventory: z.number().int(),
    qc_stats: SewingQCStats,
    assembly_parts: z.array(SewingAssemblyPartDetail),
    fifo_status: FifoStatus,
  })
  .passthrough();
const FifoSummary = z
  .object({
    total_fifo_violations: z.number().int(),
    recent_fifo_violations: z.number().int(),
  })
  .passthrough();
const ProductionLineQCSummary = z
  .object({
    total_qc_pass: z.number().int(),
    total_qc_fail: z.number().int(),
    total_qc_rework: z.number().int(),
    total_qc_completed: z.number().int(),
    total_defects: z.number().int(),
    line_dhu_percentage: z.number(),
    top_line_defects: z.array(DefectItem),
  })
  .passthrough();
const SewingLineDashboard = z
  .object({
    production_line_id: z.number().int(),
    production_line_name: z.string(),
    orders: z.array(SewingOrderDashboard),
    fifo_summary: FifoSummary,
    qc_summary: ProductionLineQCSummary,
  })
  .passthrough();
const HourlyData = z
  .object({
    hour: z.number().int(),
    target: z.number().int(),
    output: z.number().int(),
    rework: z.number().int(),
  })
  .passthrough();
const DefectDetail = z
  .object({
    name: z.string(),
    count: z.number().int(),
    percentage: z.string().regex(/^-?\d{0,3}(?:\.\d{0,2})?$/),
  })
  .passthrough();
const QCStats = z
  .object({
    qc_pass: z.number().int(),
    qc_fail: z.number().int(),
    qc_rework: z.number().int(),
    total_qc_completed: z.number().int(),
  })
  .passthrough();
const PartInventory = z
  .object({
    name: z.string(),
    expected: z.number().int(),
    total_produced: z.number().int(),
    issued: z.number().int(),
  })
  .passthrough();
const PartHourlyData = z
  .object({
    part: z.string(),
    target: z.number().int(),
    hours: z.array(z.number().int()),
  })
  .passthrough();
const DefectBreakdown = z
  .object({
    code: z.string(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    qty: z.number().int(),
  })
  .passthrough();
const HourlyQualityRow = z
  .object({
    hour: z.number().int(),
    dhu: z.number(),
    defects: z.number().int(),
    units: z.number().int().optional().default(0),
    remarks: z.array(z.string()).optional(),
    defect_breakdown: z.array(DefectBreakdown).optional(),
  })
  .passthrough();
const SewingLineDashboardV2 = z
  .object({
    production_line_id: z.number().int(),
    production_line_name: z.string(),
    target_qty: z.number().int(),
    pass_qty: z.number().int(),
    rework_qty: z.number().int(),
    rejected_qty: z.number().int(),
    efficiency_percentage: z.string().regex(/^-?\d{0,3}(?:\.\d{0,2})?$/),
    rejection_percentage: z.string().regex(/^-?\d{0,3}(?:\.\d{0,2})?$/),
    dhu_percentage: z.string().regex(/^-?\d{0,3}(?:\.\d{0,2})?$/),
    todays_loading: z.number().int(),
    hourly_data: z.array(HourlyData),
    end_line_defects: z.array(DefectDetail),
    qc_stats: QCStats,
    part_inventory: z.array(PartInventory),
    work_hours: z.number().int().optional().default(8),
    parts_hourly_data: z.array(PartHourlyData).optional(),
    hourly_quality_rows: z.array(HourlyQualityRow).optional(),
    total_input: z.number().int().optional().default(0),
    total_output: z.number().int().optional().default(0),
    line_wip: z.number().int(),
    active_style_id: z.number().int().nullish(),
    active_style_name: z.string().nullish(),
    active_style_names: z.array(z.string()).optional(),
    pending_old_style_count: z.number().int().optional().default(0),
    pending_old_pending_qty: z.number().int().optional().default(0),
    assembly_input_day: z.number().int().optional().default(0),
    assembly_input_cumulative: z.number().int().optional().default(0),
  })
  .passthrough();
const BundleIssueScanRequest = z
  .object({
    tracking_code: z.string().min(1).max(50),
    sewing_line: z.number().int(),
  })
  .passthrough();
const BundleIssueScanResponse = z
  .object({
    success: z.boolean(),
    message: z.string(),
    bundle_id: z.number().int(),
    bundle_tracking_code: z.string(),
    assigned_sewing_line: z.string(),
    scan_id: z.number().int(),
  })
  .passthrough();
const QcStatusEnum = z.enum(["pass", "fail", "rework"]);
const FinishingQCScanRequest = z
  .object({
    tracking_code: z.string().min(1).max(50),
    qc_status: QcStatusEnum,
    defect_ids: z.array(z.number().int()).optional(),
    is_reevaluation: z.boolean().optional().default(false),
  })
  .passthrough();
const FinishingQCScanResponse = z
  .object({
    success: z.boolean(),
    message: z.string(),
    garment_id: z.number().int(),
    garment_tracking_code: z.string(),
    qc_status: z.string(),
    garment_status: z.string(),
    defect_count: z.number().int(),
    is_reevaluation: z.boolean(),
    quality_check_id: z.number().int(),
    scan_id: z.number().int(),
    finishing_line: z.string(),
  })
  .passthrough();
const AssemblyTrackingIssueScanRequest = z
  .object({ tracking_code: z.string().min(1).max(50) })
  .passthrough();
const AssemblyTrackingIssueScanResponse = z
  .object({
    success: z.boolean(),
    message: z.string(),
    garment_id: z.number().int(),
    garment_tracking_code: z.string(),
    sewing_line: z.string(),
    scan_id: z.number().int(),
  })
  .passthrough();
const AssemblyPartReceiveScanRequest = z
  .object({ tracking_code: z.string().min(1).max(50) })
  .passthrough();
const FifoCompliance = z
  .object({
    is_compliant: z.boolean(),
    warnings: z.array(z.string()).optional(),
    violation_count: z.number().int(),
    details: z.unknown().nullish(),
  })
  .passthrough();
const AssemblyPartReceiveScanResponse = z
  .object({
    success: z.boolean(),
    message: z.string(),
    bundle_id: z.number().int(),
    part: z.string(),
    quantity_completed: z.number().int(),
    total_inventory: z.number().int(),
    processing_time_minutes: z.number().nullable(),
    scan_id: z.number().int(),
    fifo_compliance: FifoCompliance,
  })
  .passthrough();
const SewingQCScanRequest = z
  .object({
    tracking_code: z.string().min(1).max(50),
    qc_status: QcStatusEnum,
    defect_ids: z.array(z.number().int()).optional(),
    is_reevaluation: z.boolean().optional().default(false),
  })
  .passthrough();
const SewingQCScanResponse = z
  .object({
    success: z.boolean(),
    message: z.string(),
    garment_id: z.number().int(),
    garment_tracking_code: z.string(),
    qc_status: z.string(),
    garment_status: z.string(),
    defect_count: z.number().int(),
    is_reevaluation: z.boolean(),
    quality_check_id: z.number().int(),
    scan_id: z.number().int(),
  })
  .passthrough();
const PaginatedScannerListList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(ScannerList),
  })
  .passthrough();
const Season = z
  .object({
    id: z.number().int(),
    name: z.string().max(100),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedSeasonList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Season),
  })
  .passthrough();
const SeasonRequest = z
  .object({ name: z.string().min(1).max(100) })
  .passthrough();
const PatchedSeasonRequest = z
  .object({ name: z.string().min(1).max(100) })
  .partial()
  .passthrough();
const SewingQCTopDefect = z
  .object({ code: z.string(), name: z.string(), count: z.number().int() })
  .passthrough();
const SewingQCActiveOrder = z
  .object({ order_number: z.string(), style: z.string() })
  .passthrough();
const SewingQCGarmentCell = z
  .object({
    sequence_number: z.number().int(),
    tracking_code: z.string(),
    status: z.string(),
  })
  .passthrough();
const SewingQCOrderGroup = z
  .object({
    order_number: z.string(),
    style: z.string(),
    size: z.string(),
    last_activity_at: z.string(),
    garments_grid: z.array(SewingQCGarmentCell),
  })
  .passthrough();
const SewingQCHour = z
  .object({
    hour: z.number().int(),
    target: z.number().int(),
    actual: z.number().int(),
  })
  .passthrough();
const SewingQCOverlapOrder = z
  .object({
    order_id: z.number().int(),
    order_number: z.string(),
    style: z.string().nullable(),
    size: z.string().nullable(),
    pending_quantity: z.number().int(),
    completion_id: z.number().int().nullable(),
  })
  .passthrough();
const SewingQCStyleOverlapAlert = z
  .object({
    production_line_id: z.number().int(),
    line: z.string(),
    new_style_id: z.number().int().nullable(),
    new_style: z.string().nullable(),
    in_progress_orders: z.array(SewingQCOverlapOrder),
  })
  .passthrough();
const SewingQCDailySummaryResponse = z
  .object({
    line: z.string(),
    date: z.string(),
    total_output: z.number().int(),
    total_rework: z.number().int(),
    total_fail: z.number().int(),
    pass_rate: z.number(),
    total_inspected: z.number().int(),
    total_defects: z.number().int(),
    dhu: z.number(),
    top_defects: z.array(SewingQCTopDefect),
    active_order: SewingQCActiveOrder.nullable(),
    garments_grid: z.array(SewingQCGarmentCell),
    order_groups: z.array(SewingQCOrderGroup),
    hourly: z.array(SewingQCHour),
    style_overlap_alert: SewingQCStyleOverlapAlert.nullable(),
  })
  .passthrough();
const Size = z
  .object({
    id: z.number().int(),
    name: z.string().max(20),
    index: z.number().int().gte(0).lte(32767).optional(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedSizeList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Size),
  })
  .passthrough();
const SizeRequest = z
  .object({
    name: z.string().min(1).max(20),
    index: z.number().int().gte(0).lte(32767).optional(),
  })
  .passthrough();
const PatchedSizeRequest = z
  .object({
    name: z.string().min(1).max(20),
    index: z.number().int().gte(0).lte(32767),
  })
  .partial()
  .passthrough();
const Spread = z
  .object({
    id: z.number().int(),
    number: z.string().max(20),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .passthrough();
const PaginatedSpreadList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(Spread),
  })
  .passthrough();
const SpreadRequest = z
  .object({ number: z.string().min(1).max(20) })
  .passthrough();
const PatchedSpreadRequest = z
  .object({ number: z.string().min(1).max(20) })
  .partial()
  .passthrough();
const OverviewStats = z
  .object({
    total_orders: z.number().int(),
    total_styles: z.number().int(),
    total_bundles: z.number().int(),
    completed_bundles: z.number().int(),
    completion_rate: z.number(),
  })
  .passthrough();
const PartDetail = z
  .object({ id: z.number().int(), name: z.string() })
  .passthrough();
const StyleWithParts = z
  .object({
    id: z.number().int(),
    created_at: z.string().datetime({ offset: true }).nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    name: z.string().max(100),
    buyer: z.number().int(),
    buyer_name: z.string(),
    season: z.number().int(),
    season_name: z.string(),
    image: z.string().url().nullish(),
    smv_minutes: z
      .string()
      .regex(/^-?\d{0,3}(?:\.\d{0,2})?$/)
      .nullish(),
    parts: z.array(z.number().int()).optional(),
    parts_details: z.array(PartDetail),
  })
  .passthrough();
const PaginatedStyleWithPartsList = z
  .object({
    count: z.number().int(),
    next: z.string().url().nullish(),
    previous: z.string().url().nullish(),
    results: z.array(StyleWithParts),
  })
  .passthrough();
const StyleWithPartsRequest = z
  .object({
    name: z.string().min(1).max(100),
    buyer: z.number().int(),
    season: z.number().int(),
    image: z.instanceof(File).nullish(),
    smv_minutes: z
      .string()
      .regex(/^-?\d{0,3}(?:\.\d{0,2})?$/)
      .nullish(),
    parts: z.array(z.number().int()).optional(),
  })
  .passthrough();
const PatchedStyleWithPartsRequest = z
  .object({
    name: z.string().min(1).max(100),
    buyer: z.number().int(),
    season: z.number().int(),
    image: z.instanceof(File).nullable(),
    smv_minutes: z
      .string()
      .regex(/^-?\d{0,3}(?:\.\d{0,2})?$/)
      .nullable(),
    parts: z.array(z.number().int()),
  })
  .partial()
  .passthrough();

export const schemas = {
  TokenObtainPairRequest,
  TokenObtainPair,
  UserScannerInfo,
  UserProfile,
  PatchedUserProfileUpdateRequest,
  TokenRefreshRequest,
  TokenRefresh,
  Message,
  DailySummaryPart,
  DailySummaryGarment,
  DailySummaryActiveOrder,
  DailySummaryGarmentCell,
  DailySummaryOrderGroup,
  DailySummaryHour,
  AssemblyDailySummaryResponse,
  BundleStatusEnum,
  Bundle,
  PaginatedBundleList,
  SingleBundleSetCreateResponse,
  PaginatedSingleBundleSetCreateResponseList,
  SingleBundleSetCreateRequest,
  BundleRequest,
  PatchedBundleRequest,
  BulkBundleCreateRequest,
  BundleSetInfo,
  BulkBundleCreateResponse,
  BundleCreationPreviewRequestRequest,
  OrderInfo,
  BundleSetPreviewItem,
  BundleCreationPreview,
  BundleTransferRequestRequest,
  BundleTransferItem,
  BundleTransferResponse,
  Buyer,
  PaginatedBuyerList,
  BuyerRequest,
  PatchedBuyerRequest,
  Color,
  PaginatedColorList,
  ColorRequest,
  PatchedColorRequest,
  Defect,
  PaginatedDefectList,
  DefectRequest,
  PatchedDefectRequest,
  FinishingQCActiveOrder,
  FinishingQCGarmentCell,
  FinishingQCOrderGroup,
  FinishingQCDailySummaryResponse,
  GarmentStatusEnum,
  Garment,
  PaginatedGarmentList,
  ScannerInfo,
  BundleIssueInfo,
  BundleIssueInfoResponse,
  FinishingQCInfo,
  FinishingQCInfoResponse,
  AssemblyTrackingIssueInfo,
  AssemblyTrackingIssueInfoResponse,
  PartInventoryItem,
  PartReceiveInfoResponse,
  SewingQCInfo,
  SewingQCInfoResponse,
  LineTarget,
  PaginatedLineTargetList,
  LineTargetRequest,
  PatchedLineTargetRequest,
  Order,
  PaginatedOrderList,
  OrderRequest,
  PatchedOrderRequest,
  Part,
  PaginatedPartList,
  PartRequest,
  PatchedPartRequest,
  LineTypeEnum,
  ScannerTypeEnum,
  ScannerList,
  ProductionLine,
  PaginatedProductionLineList,
  ProductionLineRequest,
  PatchedProductionLineRequest,
  PartProduction,
  DayAndCumulative,
  OrderProductionReport,
  ProductionLineReport,
  ReportSummary,
  DailyProductionReportResponse,
  FifoViolation,
  FifoViolationResponse,
  FinishingQCStats,
  SourceLine,
  FinishingOrderDashboard,
  GarmentHeatmapItem,
  StatusSummary,
  OrderHeatmap,
  GarmentHeatmapResponse,
  DefectItem,
  SewingQCStats,
  SewingAssemblyPartDetail,
  FifoStatus,
  SewingOrderDashboard,
  FifoSummary,
  ProductionLineQCSummary,
  SewingLineDashboard,
  HourlyData,
  DefectDetail,
  QCStats,
  PartInventory,
  PartHourlyData,
  DefectBreakdown,
  HourlyQualityRow,
  SewingLineDashboardV2,
  BundleIssueScanRequest,
  BundleIssueScanResponse,
  QcStatusEnum,
  FinishingQCScanRequest,
  FinishingQCScanResponse,
  AssemblyTrackingIssueScanRequest,
  AssemblyTrackingIssueScanResponse,
  AssemblyPartReceiveScanRequest,
  FifoCompliance,
  AssemblyPartReceiveScanResponse,
  SewingQCScanRequest,
  SewingQCScanResponse,
  PaginatedScannerListList,
  Season,
  PaginatedSeasonList,
  SeasonRequest,
  PatchedSeasonRequest,
  SewingQCTopDefect,
  SewingQCActiveOrder,
  SewingQCGarmentCell,
  SewingQCOrderGroup,
  SewingQCHour,
  SewingQCOverlapOrder,
  SewingQCStyleOverlapAlert,
  SewingQCDailySummaryResponse,
  Size,
  PaginatedSizeList,
  SizeRequest,
  PatchedSizeRequest,
  Spread,
  PaginatedSpreadList,
  SpreadRequest,
  PatchedSpreadRequest,
  OverviewStats,
  PartDetail,
  StyleWithParts,
  PaginatedStyleWithPartsList,
  StyleWithPartsRequest,
  PatchedStyleWithPartsRequest,
};

const endpoints = makeApi([
  {
    method: "post",
    path: "/api/accounts/login/",
    alias: "accounts_login_create",
    description: `Takes a set of user credentials and returns an access and refresh JSON web
token pair to prove the authentication of those credentials.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: TokenObtainPairRequest,
      },
    ],
    response: TokenObtainPair,
  },
  {
    method: "get",
    path: "/api/accounts/profile/",
    alias: "get_user_profile",
    description: `Retrieve the current user&#x27;s profile information including permissions`,
    requestFormat: "json",
    response: UserProfile,
  },
  {
    method: "patch",
    path: "/api/accounts/profile/update/",
    alias: "update_user_profile",
    description: `Update user profile information (name and image only)`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedUserProfileUpdateRequest,
      },
    ],
    response: UserProfile,
    errors: [
      {
        status: 400,
        description: `Validation error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/api/accounts/refresh-token/",
    alias: "accounts_refresh_token_create",
    description: `Takes a refresh type JSON web token and returns an access type JSON web
token if the refresh token is valid.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ refresh: z.string().min(1) }).passthrough(),
      },
    ],
    response: z.object({ access: z.string() }).passthrough(),
  },
  {
    method: "get",
    path: "/api/common/health/",
    alias: "common_health_retrieve",
    description: `Returns a simple message indicating the API is healthy.`,
    requestFormat: "json",
    response: z.object({ message: z.string() }).passthrough(),
  },
  {
    method: "get",
    path: "/api/tracking/assembly/daily-summary/",
    alias: "tracking_assembly_daily_summary_retrieve",
    description: `Today&#x27;s assembly summary for the current user&#x27;s line: garments issued for assembly and parts received, scoped to the active order&#x27;s style.`,
    requestFormat: "json",
    parameters: [
      {
        name: "date",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AssemblyDailySummaryResponse,
  },
  {
    method: "get",
    path: "/api/tracking/bundles/",
    alias: "tracking_bundles_list",
    description: `List bundles or create bundle sets for a style.`,
    requestFormat: "json",
    parameters: [
      {
        name: "mother_only",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order__color",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order__size",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order__style",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "part",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "spread",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "status",
        type: "Query",
        schema: z.enum(["completed", "created", "issued_to_sewing"]).optional(),
      },
    ],
    response: PaginatedBundleList,
  },
  {
    method: "post",
    path: "/api/tracking/bundles/",
    alias: "tracking_bundles_create",
    description: `List bundles or create bundle sets for a style.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SingleBundleSetCreateRequest,
      },
      {
        name: "mother_only",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order__color",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order__size",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order__style",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "part",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "spread",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "status",
        type: "Query",
        schema: z.enum(["completed", "created", "issued_to_sewing"]).optional(),
      },
    ],
    response: PaginatedBundleList,
  },
  {
    method: "get",
    path: "/api/tracking/bundles/:id/",
    alias: "tracking_bundles_retrieve",
    description: `Retrieve, update or delete a bundle.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Bundle,
  },
  {
    method: "put",
    path: "/api/tracking/bundles/:id/",
    alias: "tracking_bundles_update",
    description: `Retrieve, update or delete a bundle.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: BundleRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Bundle,
  },
  {
    method: "patch",
    path: "/api/tracking/bundles/:id/",
    alias: "tracking_bundles_partial_update",
    description: `Retrieve, update or delete a bundle.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedBundleRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Bundle,
  },
  {
    method: "delete",
    path: "/api/tracking/bundles/:id/",
    alias: "tracking_bundles_destroy",
    description: `Retrieve, update or delete a bundle.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/api/tracking/bundles/bulk-create/",
    alias: "tracking_bundles_bulk_create_create",
    description: `Create multiple bundles for all required cut parts of an order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: BulkBundleCreateRequest,
      },
    ],
    response: BulkBundleCreateResponse,
  },
  {
    method: "post",
    path: "/api/tracking/bundles/bulk-preview/",
    alias: "tracking_bundles_bulk_preview_create",
    description: `Preview bundles that would be created for bulk creation.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: BundleCreationPreviewRequestRequest,
      },
    ],
    response: BundleCreationPreview,
  },
  {
    method: "post",
    path: "/api/tracking/bundles/transfer/",
    alias: "tracking_bundles_transfer_create",
    description: `Transfer one or more already-issued bundles to a different sewing line (correct a wrong-line issue). Requires a bundle-issue scanner. Only bundles with status &#x27;issued_to_sewing&#x27; that have not started assembly can be transferred; the batch is all-or-nothing.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: BundleTransferRequestRequest,
      },
    ],
    response: BundleTransferResponse,
  },
  {
    method: "get",
    path: "/api/tracking/buyers/",
    alias: "tracking_buyers_list",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedBuyerList,
  },
  {
    method: "post",
    path: "/api/tracking/buyers/",
    alias: "tracking_buyers_create",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(100) }).passthrough(),
      },
    ],
    response: Buyer,
  },
  {
    method: "get",
    path: "/api/tracking/buyers/:id/",
    alias: "tracking_buyers_retrieve",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Buyer,
  },
  {
    method: "put",
    path: "/api/tracking/buyers/:id/",
    alias: "tracking_buyers_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(100) }).passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Buyer,
  },
  {
    method: "patch",
    path: "/api/tracking/buyers/:id/",
    alias: "tracking_buyers_partial_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ name: z.string().min(1).max(100) })
          .partial()
          .passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Buyer,
  },
  {
    method: "delete",
    path: "/api/tracking/buyers/:id/",
    alias: "tracking_buyers_destroy",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/colors/",
    alias: "tracking_colors_list",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedColorList,
  },
  {
    method: "post",
    path: "/api/tracking/colors/",
    alias: "tracking_colors_create",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(50) }).passthrough(),
      },
    ],
    response: Color,
  },
  {
    method: "get",
    path: "/api/tracking/colors/:id/",
    alias: "tracking_colors_retrieve",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Color,
  },
  {
    method: "put",
    path: "/api/tracking/colors/:id/",
    alias: "tracking_colors_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(50) }).passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Color,
  },
  {
    method: "patch",
    path: "/api/tracking/colors/:id/",
    alias: "tracking_colors_partial_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ name: z.string().min(1).max(50) })
          .partial()
          .passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Color,
  },
  {
    method: "delete",
    path: "/api/tracking/colors/:id/",
    alias: "tracking_colors_destroy",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/defects/",
    alias: "tracking_defects_list",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedDefectList,
  },
  {
    method: "post",
    path: "/api/tracking/defects/",
    alias: "tracking_defects_create",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: DefectRequest,
      },
    ],
    response: Defect,
  },
  {
    method: "get",
    path: "/api/tracking/defects/:id/",
    alias: "tracking_defects_retrieve",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Defect,
  },
  {
    method: "put",
    path: "/api/tracking/defects/:id/",
    alias: "tracking_defects_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: DefectRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Defect,
  },
  {
    method: "patch",
    path: "/api/tracking/defects/:id/",
    alias: "tracking_defects_partial_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedDefectRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Defect,
  },
  {
    method: "delete",
    path: "/api/tracking/defects/:id/",
    alias: "tracking_defects_destroy",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/finishing-qc/daily-summary/",
    alias: "tracking_finishing_qc_daily_summary_retrieve",
    description: `Today&#x27;s finishing-QC tally for the current user&#x27;s line: output (pass), rework, fail, pass-rate and DHU%, plus a per-order serial grid where each serial shows both its sewing-QC and finishing-QC status.`,
    requestFormat: "json",
    parameters: [
      {
        name: "date",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: FinishingQCDailySummaryResponse,
  },
  {
    method: "get",
    path: "/api/tracking/garments/",
    alias: "tracking_garments_list",
    description: `List garments.`,
    requestFormat: "json",
    parameters: [
      {
        name: "bundle_ids",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order__order_number",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "primary_bundle",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "status",
        type: "Query",
        schema: z
          .enum([
            "finishing_qc_fail",
            "finishing_qc_pass",
            "finishing_qc_rework",
            "issued_for_assembly",
            "pending_assembly",
            "sewing_qc_fail",
            "sewing_qc_pass",
            "sewing_qc_rework",
          ])
          .optional(),
      },
    ],
    response: PaginatedGarmentList,
  },
  {
    method: "get",
    path: "/api/tracking/garments/:id/",
    alias: "tracking_garments_retrieve",
    description: `Retrieve garment details.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Garment,
  },
  {
    method: "get",
    path: "/api/tracking/info/bundle-issue/",
    alias: "tracking_info_bundle_issue_retrieve",
    description: `Get bundle issue history for current scanner`,
    requestFormat: "json",
    parameters: [
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "mother_only",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "tracking_code",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: BundleIssueInfoResponse,
  },
  {
    method: "get",
    path: "/api/tracking/info/finishing-qc/",
    alias: "tracking_info_finishing_qc_retrieve",
    description: `Get finishing QC history for current scanner`,
    requestFormat: "json",
    parameters: [
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "qc_status",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "tracking_code",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: FinishingQCInfoResponse,
  },
  {
    method: "get",
    path: "/api/tracking/info/garment-issue-for-assembly/",
    alias: "tracking_info_garment_issue_for_assembly_retrieve",
    description: `Get garment issue for assembly history for current scanner`,
    requestFormat: "json",
    parameters: [
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "tracking_code",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: AssemblyTrackingIssueInfoResponse,
  },
  {
    method: "get",
    path: "/api/tracking/info/part-receive/",
    alias: "tracking_info_part_receive_retrieve",
    description: `Get part receive scan history for the user&#x27;s scanner with filtering options`,
    requestFormat: "json",
    parameters: [
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "tracking_code",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PartReceiveInfoResponse,
  },
  {
    method: "get",
    path: "/api/tracking/info/sewing-qc/",
    alias: "tracking_info_sewing_qc_retrieve",
    description: `Get sewing QC history for current scanner`,
    requestFormat: "json",
    parameters: [
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "qc_status",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "tracking_code",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: SewingQCInfoResponse,
  },
  {
    method: "get",
    path: "/api/tracking/line-targets/",
    alias: "tracking_line_targets_list",
    description: `List and create line targets.`,
    requestFormat: "json",
    parameters: [
      {
        name: "date",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "line",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedLineTargetList,
  },
  {
    method: "post",
    path: "/api/tracking/line-targets/",
    alias: "tracking_line_targets_create",
    description: `List and create line targets.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: LineTargetRequest,
      },
    ],
    response: LineTarget,
  },
  {
    method: "get",
    path: "/api/tracking/line-targets/:id/",
    alias: "tracking_line_targets_retrieve",
    description: `Retrieve, update, and delete line targets.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: LineTarget,
  },
  {
    method: "put",
    path: "/api/tracking/line-targets/:id/",
    alias: "tracking_line_targets_update",
    description: `Retrieve, update, and delete line targets.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: LineTargetRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: LineTarget,
  },
  {
    method: "patch",
    path: "/api/tracking/line-targets/:id/",
    alias: "tracking_line_targets_partial_update",
    description: `Retrieve, update, and delete line targets.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedLineTargetRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: LineTarget,
  },
  {
    method: "delete",
    path: "/api/tracking/line-targets/:id/",
    alias: "tracking_line_targets_destroy",
    description: `Retrieve, update, and delete line targets.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/api/tracking/line-targets/bulk/",
    alias: "tracking_line_targets_bulk_create",
    description: `Bulk create or update line targets for a given date.
Accepts: { date: &quot;YYYY-MM-DD&quot;, targets: [ { line_id, target_quantity, work_hours, worker_count }, ... ] }
Uses update_or_create per line+date pair.
Skips entries where target_quantity is 0 or null.`,
    requestFormat: "json",
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/orders/",
    alias: "tracking_orders_list",
    description: `List all orders or create a new order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "color",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "size",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style__buyer",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style__season",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: PaginatedOrderList,
  },
  {
    method: "post",
    path: "/api/tracking/orders/",
    alias: "tracking_orders_create",
    description: `List all orders or create a new order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OrderRequest,
      },
    ],
    response: Order,
  },
  {
    method: "get",
    path: "/api/tracking/orders/:id/",
    alias: "tracking_orders_retrieve",
    description: `Retrieve, update or delete an order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Order,
  },
  {
    method: "put",
    path: "/api/tracking/orders/:id/",
    alias: "tracking_orders_update",
    description: `Retrieve, update or delete an order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: OrderRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Order,
  },
  {
    method: "patch",
    path: "/api/tracking/orders/:id/",
    alias: "tracking_orders_partial_update",
    description: `Retrieve, update or delete an order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedOrderRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Order,
  },
  {
    method: "delete",
    path: "/api/tracking/orders/:id/",
    alias: "tracking_orders_destroy",
    description: `Retrieve, update or delete an order.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/parts/",
    alias: "tracking_parts_list",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedPartList,
  },
  {
    method: "post",
    path: "/api/tracking/parts/",
    alias: "tracking_parts_create",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(100) }).passthrough(),
      },
    ],
    response: Part,
  },
  {
    method: "get",
    path: "/api/tracking/parts/:id/",
    alias: "tracking_parts_retrieve",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Part,
  },
  {
    method: "put",
    path: "/api/tracking/parts/:id/",
    alias: "tracking_parts_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(100) }).passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Part,
  },
  {
    method: "patch",
    path: "/api/tracking/parts/:id/",
    alias: "tracking_parts_partial_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ name: z.string().min(1).max(100) })
          .partial()
          .passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Part,
  },
  {
    method: "delete",
    path: "/api/tracking/parts/:id/",
    alias: "tracking_parts_destroy",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/productionlines/",
    alias: "tracking_productionlines_list",
    description: `List all production lines or create a new production line.`,
    requestFormat: "json",
    parameters: [
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedProductionLineList,
  },
  {
    method: "post",
    path: "/api/tracking/productionlines/",
    alias: "tracking_productionlines_create",
    description: `List all production lines or create a new production line.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ProductionLineRequest,
      },
    ],
    response: ProductionLine,
  },
  {
    method: "get",
    path: "/api/tracking/productionlines/:id/",
    alias: "tracking_productionlines_retrieve",
    description: `Retrieve, update or delete a production line.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: ProductionLine,
  },
  {
    method: "put",
    path: "/api/tracking/productionlines/:id/",
    alias: "tracking_productionlines_update",
    description: `Retrieve, update or delete a production line.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: ProductionLineRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: ProductionLine,
  },
  {
    method: "patch",
    path: "/api/tracking/productionlines/:id/",
    alias: "tracking_productionlines_partial_update",
    description: `Retrieve, update or delete a production line.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedProductionLineRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: ProductionLine,
  },
  {
    method: "delete",
    path: "/api/tracking/productionlines/:id/",
    alias: "tracking_productionlines_destroy",
    description: `Retrieve, update or delete a production line.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/reports/daily-production/",
    alias: "tracking_reports_daily_production_retrieve",
    description: `Generate daily cumulative production efficiency report for all production lines`,
    requestFormat: "json",
    parameters: [
      {
        name: "buyer_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "buyer_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "colors",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "include_hidden",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "order_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "production_line_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "production_line_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "report_date",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sizes",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "style_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
    ],
    response: DailyProductionReportResponse,
  },
  {
    method: "get",
    path: "/api/tracking/reports/fifo-violations/",
    alias: "tracking_reports_fifo_violations_retrieve",
    description: `Get FIFO violations for production line`,
    requestFormat: "json",
    parameters: [
      {
        name: "limit",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "production_line",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: FifoViolationResponse,
  },
  {
    method: "get",
    path: "/api/tracking/reports/finishing-dashboard/",
    alias: "tracking_reports_finishing_dashboard_list",
    description: `Get finishing dashboard data with metrics per order and source sewing lines`,
    requestFormat: "json",
    parameters: [
      {
        name: "active_only",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "buyer_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "buyer_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "color",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "colors",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "finishing_line_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "finishing_line_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "order_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "size",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sizes",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "style",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "style_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
    ],
    response: z.array(FinishingOrderDashboard),
  },
  {
    method: "get",
    path: "/api/tracking/reports/garment-heatmap/",
    alias: "tracking_reports_garment_heatmap_retrieve",
    description: `
        Get garment heatmap data showing garments grouped by orders with their statuses.
        
        **Features:**
        - Garments grouped by order with order metadata
        - Each garment includes status and timestamps
        - Status counts summary per order and overall
        - Comprehensive filtering support
        
        **Garment Statuses:**
        - pending_assembly: Garment created but not yet issued for assembly
        - issued_for_assembly: Garment issued to production line for assembly
        - sewing_qc_pass: Garment passed sewing quality check
        - sewing_qc_fail: Garment failed sewing quality check
        - sewing_qc_rework: Garment marked for rework during sewing QC
        - finishing_qc_pass: Garment passed finishing quality check
        - finishing_qc_fail: Garment failed finishing quality check
        - finishing_qc_rework: Garment marked for rework during finishing QC
        `,
    requestFormat: "json",
    parameters: [
      {
        name: "active_only",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "buyer_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "buyer_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "colors",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "order_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "production_line_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "production_line_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "sizes",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "style_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
    ],
    response: GarmentHeatmapResponse,
  },
  {
    method: "get",
    path: "/api/tracking/reports/line-style-completion/",
    alias: "tracking_reports_line_style_completion_retrieve",
    description: `GET  /api/tracking/reports/line-style-completion/  — list all manual completions
POST /api/tracking/reports/line-style-completion/  — mark a line+order as complete`,
    requestFormat: "json",
    response: z.void(),
  },
  {
    method: "post",
    path: "/api/tracking/reports/line-style-completion/",
    alias: "tracking_reports_line_style_completion_create",
    description: `GET  /api/tracking/reports/line-style-completion/  — list all manual completions
POST /api/tracking/reports/line-style-completion/  — mark a line+order as complete`,
    requestFormat: "json",
    response: z.void(),
  },
  {
    method: "delete",
    path: "/api/tracking/reports/line-style-completion/:id/",
    alias: "tracking_reports_line_style_completion_destroy",
    description: `DELETE /api/tracking/reports/line-style-completion/{id}/  — undo manual completion`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/reports/sewing-dashboard/",
    alias: "tracking_reports_sewing_dashboard_list",
    description: `Get sewing dashboard data with KPIs for all sewing lines and orders`,
    requestFormat: "json",
    parameters: [
      {
        name: "active_only",
        type: "Query",
        schema: z.boolean().optional(),
      },
      {
        name: "buyer_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "buyer_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "colors",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "order_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "production_line_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "production_line_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "sizes",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "style_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
    ],
    response: z.array(SewingLineDashboard),
  },
  {
    method: "get",
    path: "/api/tracking/reports/sewing-line-dashboard-v2/",
    alias: "tracking_reports_sewing_line_dashboard_v2_list",
    description: `
        Get comprehensive sewing dashboard data matching the production dashboard UI:
        
        **Header Metrics:**
        - Target Quantity (daily target)
        - Pass Quantity (QC passed garments)
        - Rework Quantity (QC rework garments) 
        - Rejected Quantity (QC failed garments)
        
        **Gauge Metrics:**
        - Efficiency % (calculated using SMV and worker count)
        - Rejection % (failed/total QC&#x27;d)
        - DHU % (defects per hundred units)
        
        **Additional Data:**
        - Hourly breakdown (target vs output vs rework per hour)
        - Line WIP count (garments in assembly)
        - Today&#x27;s loading (garments from today&#x27;s input)
        - End line defects (top defects for the day)
        `,
    requestFormat: "json",
    parameters: [
      {
        name: "buyer_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "buyer_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "color",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "colors",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "date",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_from",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "date_to",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "order_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "order_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "production_line_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "production_line_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
      {
        name: "size",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "sizes",
        type: "Query",
        schema: z.array(z.string()).optional(),
      },
      {
        name: "style_id",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "style_ids",
        type: "Query",
        schema: z.array(z.number().int()).optional(),
      },
    ],
    response: z.array(SewingLineDashboardV2),
  },
  {
    method: "get",
    path: "/api/tracking/reports/sewing-line-dashboard-v2/quality-export/",
    alias: "tracking_reports_sewing_line_dashboard_v2_quality_export_retrieve",
    description: `Slide-3 Export: Hourly Quality Monitoring
Exports: hour, dhu, defects, remarks, defect_breakdown`,
    requestFormat: "json",
    response: z.void(),
  },
  {
    method: "post",
    path: "/api/tracking/scan/bundle-issue/",
    alias: "tracking_scan_bundle_issue_create",
    description: `Issue bundle from cutting line to specified sewing line`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: BundleIssueScanRequest,
      },
    ],
    response: BundleIssueScanResponse,
  },
  {
    method: "post",
    path: "/api/tracking/scan/finishing-qc/",
    alias: "tracking_scan_finishing_qc_create",
    description: `Process finishing QC scan for garment`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FinishingQCScanRequest,
      },
    ],
    response: FinishingQCScanResponse,
  },
  {
    method: "post",
    path: "/api/tracking/scan/garment-issue-for-assembly/",
    alias: "tracking_scan_garment_issue_for_assembly_create",
    description: `Process garment issue for assembly scan`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ tracking_code: z.string().min(1).max(50) })
          .passthrough(),
      },
    ],
    response: AssemblyTrackingIssueScanResponse,
  },
  {
    method: "post",
    path: "/api/tracking/scan/part-receive/",
    alias: "tracking_scan_part_receive_create",
    description: `Process a part receive scan to update inventory when parts are completed and ready for assembly`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ tracking_code: z.string().min(1).max(50) })
          .passthrough(),
      },
    ],
    response: AssemblyPartReceiveScanResponse,
  },
  {
    method: "post",
    path: "/api/tracking/scan/sewing-qc/",
    alias: "tracking_scan_sewing_qc_create",
    description: `Process sewing QC scan for garment`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SewingQCScanRequest,
      },
    ],
    response: SewingQCScanResponse,
  },
  {
    method: "get",
    path: "/api/tracking/scanners/",
    alias: "tracking_scanners_list",
    description: `List all scanners (read-only).`,
    requestFormat: "json",
    parameters: [
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: PaginatedScannerListList,
  },
  {
    method: "get",
    path: "/api/tracking/seasons/",
    alias: "tracking_seasons_list",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedSeasonList,
  },
  {
    method: "post",
    path: "/api/tracking/seasons/",
    alias: "tracking_seasons_create",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(100) }).passthrough(),
      },
    ],
    response: Season,
  },
  {
    method: "get",
    path: "/api/tracking/seasons/:id/",
    alias: "tracking_seasons_retrieve",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Season,
  },
  {
    method: "put",
    path: "/api/tracking/seasons/:id/",
    alias: "tracking_seasons_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string().min(1).max(100) }).passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Season,
  },
  {
    method: "patch",
    path: "/api/tracking/seasons/:id/",
    alias: "tracking_seasons_partial_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ name: z.string().min(1).max(100) })
          .partial()
          .passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Season,
  },
  {
    method: "delete",
    path: "/api/tracking/seasons/:id/",
    alias: "tracking_seasons_destroy",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/sewing-qc/daily-summary/",
    alias: "tracking_sewing_qc_daily_summary_retrieve",
    description: `Today&#x27;s sewing-QC tally for the current user&#x27;s line: output (pass), rework, fail, total defects, DHU%, and a defect-frequency breakdown.`,
    requestFormat: "json",
    parameters: [
      {
        name: "date",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: SewingQCDailySummaryResponse,
  },
  {
    method: "get",
    path: "/api/tracking/sizes/",
    alias: "tracking_sizes_list",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "index",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedSizeList,
  },
  {
    method: "post",
    path: "/api/tracking/sizes/",
    alias: "tracking_sizes_create",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SizeRequest,
      },
    ],
    response: Size,
  },
  {
    method: "get",
    path: "/api/tracking/sizes/:id/",
    alias: "tracking_sizes_retrieve",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Size,
  },
  {
    method: "put",
    path: "/api/tracking/sizes/:id/",
    alias: "tracking_sizes_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: SizeRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Size,
  },
  {
    method: "patch",
    path: "/api/tracking/sizes/:id/",
    alias: "tracking_sizes_partial_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedSizeRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Size,
  },
  {
    method: "delete",
    path: "/api/tracking/sizes/:id/",
    alias: "tracking_sizes_destroy",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/spreads/",
    alias: "tracking_spreads_list",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: PaginatedSpreadList,
  },
  {
    method: "post",
    path: "/api/tracking/spreads/",
    alias: "tracking_spreads_create",
    description: `Base class for list/create views with common configuration.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ number: z.string().min(1).max(20) }).passthrough(),
      },
    ],
    response: Spread,
  },
  {
    method: "get",
    path: "/api/tracking/spreads/:id/",
    alias: "tracking_spreads_retrieve",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Spread,
  },
  {
    method: "put",
    path: "/api/tracking/spreads/:id/",
    alias: "tracking_spreads_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ number: z.string().min(1).max(20) }).passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Spread,
  },
  {
    method: "patch",
    path: "/api/tracking/spreads/:id/",
    alias: "tracking_spreads_partial_update",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ number: z.string().min(1).max(20) })
          .partial()
          .passthrough(),
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: Spread,
  },
  {
    method: "delete",
    path: "/api/tracking/spreads/:id/",
    alias: "tracking_spreads_destroy",
    description: `Base class for detail views.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/api/tracking/stats/overview/",
    alias: "tracking_stats_overview_retrieve",
    description: `Return aggregate counts only.

The Overview dashboard previously fetched the full &#x60;&#x60;orders&#x60;&#x60;/&#x60;&#x60;styles&#x60;&#x60;/
&#x60;&#x60;bundles&#x60;&#x60; lists just to read their &#x60;&#x60;count&#x60;&#x60;. With &#x60;&#x60;PAGE_SIZE&#x60;&#x60; set very
high those endpoints serialize the entire table (multi-MB, ~24s for
bundles), which left the dashboard stuck on &quot;Loading...&quot;. This endpoint runs
plain &#x60;&#x60;COUNT(*)&#x60;&#x60; queries instead so the page loads instantly.`,
    requestFormat: "json",
    response: OverviewStats,
  },
  {
    method: "get",
    path: "/api/tracking/styles/",
    alias: "tracking_styles_list",
    description: `List all styles or create a new style with parts.`,
    requestFormat: "json",
    parameters: [
      {
        name: "buyer",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "ordering",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "page",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "search",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "season",
        type: "Query",
        schema: z.number().int().optional(),
      },
    ],
    response: PaginatedStyleWithPartsList,
  },
  {
    method: "post",
    path: "/api/tracking/styles/",
    alias: "tracking_styles_create",
    description: `List all styles or create a new style with parts.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: StyleWithPartsRequest,
      },
    ],
    response: StyleWithParts,
  },
  {
    method: "get",
    path: "/api/tracking/styles/:id/",
    alias: "tracking_styles_retrieve",
    description: `Retrieve, update or delete a style with parts.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: StyleWithParts,
  },
  {
    method: "put",
    path: "/api/tracking/styles/:id/",
    alias: "tracking_styles_update",
    description: `Retrieve, update or delete a style with parts.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: StyleWithPartsRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: StyleWithParts,
  },
  {
    method: "patch",
    path: "/api/tracking/styles/:id/",
    alias: "tracking_styles_partial_update",
    description: `Retrieve, update or delete a style with parts.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: PatchedStyleWithPartsRequest,
      },
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: StyleWithParts,
  },
  {
    method: "delete",
    path: "/api/tracking/styles/:id/",
    alias: "tracking_styles_destroy",
    description: `Retrieve, update or delete a style with parts.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.void(),
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
