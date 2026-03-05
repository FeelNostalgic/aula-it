# Sync AGENTS.md to multiple targets
$Source = "AGENTS.md"
$Targets = @("GEMINI.md", "CLAUDE.md")

if (Test-Path $Source) {
    foreach ($Target in $Targets) {
        Copy-Item $Source $Target -Force
        Write-Host "✅ [SUCCESS] $Source has been copied to $Target" -ForegroundColor Green
    }
}
else {
    Write-Host "❌ [ERROR] $Source not found!" -ForegroundColor Red
    exit 1
}
