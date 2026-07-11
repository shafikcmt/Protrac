from django.urls import path
from tracking.api import (
    LineStyleCompletionView,
    LineStyleCompletionDetailView,
    BuyerListCreateView,
    BuyerDetailView,
    SeasonListCreateView,
    SeasonDetailView,
    SizeListCreateView,
    SizeDetailView,
    ColorListCreateView,
    ColorDetailView,
    PartListCreateView,
    PartDetailView,
    DefectListCreateView,
    DefectDetailView,
    SpreadListCreateView,
    SpreadDetailView,
    ProductionLineListCreateView,
    ProductionLineDetailView,
    ScannerListView,
    StyleListCreateView,
    StyleDetailView,
    OrderListCreateView,
    OrderDetailView,
    BundleListCreateView,
    BundleDetailView,
    BulkBundlePreviewView,
    BulkBundleCreateView,
    GarmentListView,
    GarmentDetailView,
    OverviewStatsView,
    SewingDashboardView,
    FinishingDashboardView,
    DailyProductionReportView,
    SewingLineDashboardV2View,
    GarmentHeatmapView,
    bundle_issue_scan,
    bundle_issue_info,
    bundle_transfer,
    part_receive_scan,
    part_receive_info,
    assembly_tracking_issue_scan,
    assembly_tracking_issue_info,
    assembly_daily_summary,
    sewing_qc_daily_summary,
    sewing_qc_scan,
    sewing_qc_info,
    finishing_qc_scan,
    finishing_qc_info,
)
from tracking.api.fifo_reporting import fifo_violations_report
from tracking.api.line_target import LineTargetListCreateView, LineTargetDetailView, LineTargetBulkUpsertView
from tracking.api.sewing_dashboard_v2_quality_export import SewingLineDashboardV2QualityExportView

app_name = "tracking"

urlpatterns = [
    # Buyer endpoints
    path("buyers/", BuyerListCreateView.as_view(), name="buyer-list-create"),
    path("buyers/<int:pk>/", BuyerDetailView.as_view(), name="buyer-detail"),
    # Season endpoints
    path("seasons/", SeasonListCreateView.as_view(), name="season-list-create"),
    path("seasons/<int:pk>/", SeasonDetailView.as_view(), name="season-detail"),
    # Size endpoints
    path("sizes/", SizeListCreateView.as_view(), name="size-list-create"),
    path("sizes/<int:pk>/", SizeDetailView.as_view(), name="size-detail"),
    # Color endpoints
    path("colors/", ColorListCreateView.as_view(), name="color-list-create"),
    path("colors/<int:pk>/", ColorDetailView.as_view(), name="color-detail"),
    # Part endpoints
    path("parts/", PartListCreateView.as_view(), name="part-list-create"),
    path(
        "parts/<int:pk>/", PartDetailView.as_view(), name="part-detail"
    ),  # Defect endpoints
    path("defects/", DefectListCreateView.as_view(), name="defect-list-create"),
    path("defects/<int:pk>/", DefectDetailView.as_view(), name="defect-detail"),
    # Spread endpoints
    path("spreads/", SpreadListCreateView.as_view(), name="spread-list-create"),
    path("spreads/<int:pk>/", SpreadDetailView.as_view(), name="spread-detail"),
    # Production Line endpoints
    path(
        "productionlines/",
        ProductionLineListCreateView.as_view(),
        name="productionline-list-create",
    ),
    path(
        "productionlines/<int:pk>/",
        ProductionLineDetailView.as_view(),
        name="productionline-detail",
    ),
    # Scanner endpoints
    path("scanners/", ScannerListView.as_view(), name="scanner-list"),
    # Line Target endpoints
    path(
        "line-targets/",
        LineTargetListCreateView.as_view(),
        name="linetarget-list-create",
    ),
    path(
        "line-targets/<int:pk>/",
        LineTargetDetailView.as_view(),
        name="linetarget-detail",
    ),
    path(
        "line-targets/bulk/",
        LineTargetBulkUpsertView.as_view(),
        name="linetarget-bulk-upsert",
    ),
    # Style endpoints
    path("styles/", StyleListCreateView.as_view(), name="style-list-create"),
    path("styles/<int:pk>/", StyleDetailView.as_view(), name="style-detail"),
    # Order endpoints
    path("orders/", OrderListCreateView.as_view(), name="order-list-create"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    # Bundle endpoints
    path("bundles/", BundleListCreateView.as_view(), name="bundle-list-create"),
    path("bundles/transfer/", bundle_transfer, name="bundle-transfer"),
    path("bundles/<int:pk>/", BundleDetailView.as_view(), name="bundle-detail"),
    path(
        "bundles/bulk-preview/",
        BulkBundlePreviewView.as_view(),
        name="bundle-bulk-preview",
    ),
    path(
        "bundles/bulk-create/",
        BulkBundleCreateView.as_view(),
        name="bundle-bulk-create",
    ),
    # Garment endpoints
    path("garments/", GarmentListView.as_view(), name="garment-list-create"),
    path("garments/<int:pk>/", GarmentDetailView.as_view(), name="garment-detail"),
    # Dashboard stats endpoint (lightweight counts)
    path("stats/overview/", OverviewStatsView.as_view(), name="stats-overview"),
    # Scan endpoints
    path("scan/bundle-issue/", bundle_issue_scan, name="scan-bundle-issue"),
    path(
        "scan/part-receive/",
        part_receive_scan,
        name="scan-part-receive",
    ),
    path(
        "scan/garment-issue-for-assembly/",
        assembly_tracking_issue_scan,
        name="scan-garment-issue-for-assembly",
    ),
    path("scan/sewing-qc/", sewing_qc_scan, name="scan-sewing-qc"),
    path("scan/finishing-qc/", finishing_qc_scan, name="scan-finishing-qc"),
    # Scan Info endpoints
    path("info/bundle-issue/", bundle_issue_info, name="scan-bundle-issue-info"),
    path(
        "info/part-receive/",
        part_receive_info,
        name="scan-part-receive-info",
    ),
    path(
        "info/garment-issue-for-assembly/",
        assembly_tracking_issue_info,
        name="scan-garment-issue-for-assembly-info",
    ),
    # Assembly daily summary endpoint
    path(
        "assembly/daily-summary/",
        assembly_daily_summary,
        name="assembly-daily-summary",
    ),
    path(
        "sewing-qc/daily-summary/",
        sewing_qc_daily_summary,
        name="sewing-qc-daily-summary",
    ),
    path("info/sewing-qc/", sewing_qc_info, name="scan-sewing-qc-info"),
    path(
        "info/finishing-qc/", finishing_qc_info, name="scan-finishing-qc-info"
    ),  # Report endpoints
    path(
        "reports/sewing-dashboard/",
        SewingDashboardView.as_view(),
        name="sewing-dashboard",
    ),
    path(
        "reports/sewing-line-dashboard-v2/",
        SewingLineDashboardV2View.as_view(),
        name="sewing-line-dashboard-v2",
    ),
    path(
        "reports/finishing-dashboard/",
        FinishingDashboardView.as_view(),
        name="finishing-dashboard",
    ),
    path(
        "reports/daily-production/",
        DailyProductionReportView.as_view(),
        name="daily-production-report",
    ),
    path(
        "reports/garment-heatmap/",
        GarmentHeatmapView.as_view(),
        name="garment-heatmap",
    ),
    path(
        "reports/fifo-violations/",
        fifo_violations_report,
        name="fifo-violations-report",
    ),
    path(
        "reports/line-style-completion/",
        LineStyleCompletionView.as_view(),
        name="line-style-completion-list-create",
    ),
    path(
        "reports/line-style-completion/<int:pk>/",
        LineStyleCompletionDetailView.as_view(),
        name="line-style-completion-detail",
    ),
    path(
    "reports/sewing-line-dashboard-v2/quality-export/",
    SewingLineDashboardV2QualityExportView.as_view(),
    name="sewing-line-dashboard-v2-quality-export",
    )
]
