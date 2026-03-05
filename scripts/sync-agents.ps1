# Sync AGENTS.md to GEMINI.md
$Source = "AGENTS.md"
$Target = "GEMINI.md"
$Target2 = "CLAUDE.md"

if (Test-Path $Source) {
    Copy-Item $Source $Target -Force
    Write-Host "✅ [SUCCESS] $Source has been copied to $Target" -ForegroundColor Green
    Copy-Item $Source $Target2 -Force
    Write-Host "✅ [SUCCESS] $Source has been copied to $Target2" -ForegroundColor Green
} else {
    Write-Host "❌ [ERROR] $Source not found!" -ForegroundColor Red
    exit 1
}
