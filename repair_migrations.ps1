# Repair all migrations - mark as applied
$migrations = @(
    "20251203123655",
    "20251203135852",
    "20251204130851",
    "20251205151156",
    "20251205171630",
    "20251206085825",
    "20251214112443",
    "20251214115555",
    "20251218064648",
    "20251224081538",
    "20251224083431",
    "20251227141654",
    "20260102093913",
    "20260102122614",
    "20260106190141",
    "20260106190351",
    "20260110140000",
    "20260110150000"
)

$count = 0
foreach ($migration in $migrations) {
    Write-Host "Repairing $migration... ($($count+1)/$($migrations.Count))"
    supabase migration repair --status applied $migration *>&1 | Out-Null
    $count++
}

Write-Host "✅ All migrations repaired and marked as applied!"
