# Apply All Migrations to Aurora PostgreSQL

$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$DB_HOST = "mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
$DB_NAME = "mentalspaceehr"
$DB_USER = "postgres"
$DB_PASSWORD = "ROInARVcjyQQZvqMqNgJ1835qzenNNxQ"

Write-Host "Applying all database migrations..." -ForegroundColor Cyan

$env:PGPASSWORD = $DB_PASSWORD

$migrations = Get-ChildItem -Path "supabase\migrations\*.sql" | Sort-Object Name

$applied = 0
$skipped = 0
$failed = 0

foreach ($migration in $migrations) {
    Write-Host "Applying: $($migration.Name)"

    $result = & $PSQL -h $DB_HOST -U $DB_USER -d $DB_NAME -f $migration.FullName 2>&1 | Out-String

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SUCCESS" -ForegroundColor Green
        $applied++
    }
    elseif ($result -match "already exists|duplicate") {
        Write-Host "  SKIPPED" -ForegroundColor Yellow
        $skipped++
    }
    else {
        Write-Host "  FAILED: $result" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Summary: Applied=$applied, Skipped=$skipped, Failed=$failed"
