# Apply All Remaining Migrations to Aurora PostgreSQL
# Run from project root: powershell .\scripts\apply-all-migrations.ps1

$DB_HOST = "mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com"
$DB_NAME = "mentalspaceehr"
$DB_USER = "postgres"
$DB_PASSWORD = "ROInARVcjyQQZvqMqNgJ1835qzenNNxQ"

Write-Host "🚀 Applying All Database Migrations" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Set password environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Get all migration files
$migrations = Get-ChildItem -Path "supabase\migrations\*.sql" | Sort-Object Name

$total = $migrations.Count
Write-Host "📊 Total migrations found: $total" -ForegroundColor Yellow
Write-Host ""

$applied = 0
$failed = 0
$skipped = 0

# Apply each migration
foreach ($migration in $migrations) {
    Write-Host "📦 Applying: $($migration.Name)" -ForegroundColor White

    # Execute psql command
    $output = & psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $migration.FullName 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ SUCCESS" -ForegroundColor Green
        $applied++
    } else {
        # Check if error is about already existing objects
        $errorText = $output | Out-String
        if ($errorText -match "already exists|duplicate") {
            Write-Host "   ⏭️  SKIPPED (already applied)" -ForegroundColor Yellow
            $skipped++
        } else {
            Write-Host "   ❌ FAILED: $errorText" -ForegroundColor Red
            $failed++
        }
    }

    Write-Host ""
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "📊 Migration Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Applied: $applied" -ForegroundColor Green
Write-Host "   ⏭️  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "   ❌ Failed: $failed" -ForegroundColor Red
Write-Host "   📊 Total: $total" -ForegroundColor White
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All migrations completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some migrations failed. Check errors above." -ForegroundColor Red
    exit 1
}

