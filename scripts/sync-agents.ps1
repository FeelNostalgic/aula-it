# Sync AGENTS.md to GEMINI.md
$Source = "AGENTS.md"
$Target = "GEMINI.md"

if (Test-Path $Source) {
    Copy-Item $Source $Target -Force
    Write-Host "✅ [SUCCESS] $Source has been copied to $Target" -ForegroundColor Green
} else {
    Write-Host "❌ [ERROR] $Source not found!" -ForegroundColor Red
    exit 1
}
