$projectRoot = Get-Location

# Traverse up the directories until we find manage.py (project root)
while (-not (Test-Path "$projectRoot\manage.py")) {
    $projectRoot = $projectRoot.Parent
}

Write-Host "Project root found at: $projectRoot" -ForegroundColor Cyan

# Find all migrations
Write-Host "Finding migration files to delete..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem -Recurse -Path $projectRoot -File | Where-Object {
    $_.FullName -match '\\migrations\\' -and $_.Name -ne '__init__.py' -and $_.FullName -notmatch '\\\.venv\\'
}

# Find all migration directories (just to list them for the user)
$migrationDirs = Get-ChildItem -Recurse -Path $projectRoot -Directory | Where-Object {
    $_.FullName -match '\\migrations\\' -and $_.FullName -notmatch '\\\.venv\\'
}

# Display all files and directories to be deleted
if ($migrationFiles.Count -gt 0 -or $migrationDirs.Count -gt 0) {
    Write-Host "The following files will be deleted:" -ForegroundColor Green
    $migrationFiles | Where-Object { $_.FullName -notmatch '\\__pycache__\\' } | ForEach-Object { Write-Host $_.FullName -ForegroundColor Red }

    Write-Host "The following directories will be deleted:" -ForegroundColor Green
    $migrationDirs | Where-Object { $_.FullName -notmatch '\\__pycache__\\' } | ForEach-Object { Write-Host $_.FullName -ForegroundColor Red }

    $confirmation = Read-Host "Do you want to delete these files and directories? (y/n) [y]" 
    if ($confirmation -eq '' -or $confirmation -eq 'y') {
        # Delete the migration files (except __init__.py files)
        Write-Host "Deleting migration files..." -ForegroundColor Yellow
        foreach ($file in $migrationFiles) {
            Remove-Item $file.FullName -Force
            Write-Host "Deleted: $($file.FullName)" -ForegroundColor Green
        }

        # Delete the migration directories
        Write-Host "Deleting migration directories..." -ForegroundColor Yellow
        foreach ($dir in $migrationDirs) {
            Remove-Item $dir.FullName -Force
            Write-Host "Deleted: $($dir.FullName)" -ForegroundColor Green
        }
    } else {
        Write-Host "No files or directories were deleted." -ForegroundColor Red
    }
} else {
    Write-Host "No migration files or directories to delete." -ForegroundColor Cyan
}

# Create new migrations
Write-Host "Creating new migrations..." -ForegroundColor Yellow
# Running `makemigrations`
& "python" "manage.py" "makemigrations"

Write-Host "Migration cleanup and creation complete." -ForegroundColor Cyan