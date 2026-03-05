# Script para crear enlaces simbólicos (Junctions) en Windows
# De .agents a múltiples destinos (.claude, .gemini, etc.)

$Source = ".agents"
$Targets = @(".claude", ".agent")

# 1. Verificar que la carpeta origen existe
if (-not (Test-Path $Source)) {
    Write-Host "❌ [ERROR] La carpeta origen '$Source' no existe." -ForegroundColor Red
    exit 1
}

foreach ($Target in $Targets) {
    Write-Host "--- Procesando: $Target ---" -ForegroundColor Cyan
    
    # 2. Si el destino ya existe, manejarlo
    if (Test-Path $Target) {
        $Item = Get-Item $Target
        if ($Item.Attributes -match "ReparsePoint") {
            Write-Host "⚠️  El enlace simbólico '$Target' ya existe. Recreando..." -ForegroundColor Yellow
            Remove-Item $Target -Force
        }
        else {
            Write-Host "❌ [ERROR] '$Target' ya existe y es una carpeta real. Saltando..." -ForegroundColor Red
            continue
        }
    }

    # 3. Crear el enlace simbólico (Junction)
    try {
        # Usamos cmd /c mklink para asegurar compatibilidad absoluta con junctions en Windows
        cmd /c mklink /J $Target $Source
        Write-Host "✅ [SUCCESS] Enlace simbólico creado: $Target -> $Source" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ [ERROR] No se pudo crear el enlace simbólico para '$Target'." -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}
