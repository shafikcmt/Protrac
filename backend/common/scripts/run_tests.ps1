param(
    [Parameter(Position=0)]
    [ValidateSet("all", "accounts", "common", "tracking", "coverage", "help")]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "ProTrac Backend Test Runner" -ForegroundColor Green
    Write-Host "Usage: .\test.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host "  all          - Run all tests (default)" -ForegroundColor White
    Write-Host "  accounts     - Run only accounts module tests" -ForegroundColor White
    Write-Host "  common       - Run only common module tests" -ForegroundColor White
    Write-Host "  tracking     - Run only tracking module tests" -ForegroundColor White
    Write-Host "  coverage     - Run all tests with coverage report" -ForegroundColor White
    Write-Host "  help         - Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\test.ps1 all       # Run all tests (clean output)"
    Write-Host "  .\test.ps1 coverage  # Run with coverage report"
    Write-Host "  .\test.ps1 accounts  # Run only accounts tests"
}

function Run-Tests {
    param([string]$TestType)
    
    Write-Host "Running $TestType tests..." -ForegroundColor Green
    
    switch ($TestType) {
        "all" {
            python -m pytest -v
        }
        "accounts" {
            python -m pytest -v accounts/tests/
        }
        "common" {
            python -m pytest -v common/tests/
        }
        "tracking" {
            python -m pytest -v tracking/tests/
        }
        "coverage" {
            python -m pytest -v --cov=accounts --cov=common --cov=tracking --cov-report=term-missing --cov-report=html:htmlcov
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tests completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Some tests failed. Check the output above." -ForegroundColor Red
    }
}

# Set Django settings
$env:DJANGO_SETTINGS_MODULE = "core.settings"

switch ($Command) {
    "help" { Show-Help }
    default { Run-Tests -TestType $Command }
}
