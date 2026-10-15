$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$manifestPath = Join-Path $projectPath 'artifacts/runtime/services.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { Write-Output 'Nenhum processo registrado pelo start-local.'; exit 0 }
$serviceRecords = @(Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json)
$failed = $false
foreach ($record in $serviceRecords) {
    $serviceProcess = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if (-not $serviceProcess) { continue }
    if ($serviceProcess.StartTime.ToUniversalTime().ToString('o') -ne $record.started) {
        Write-Warning "PID reutilizado: $($record.name). Processo preservado."
        continue
    }
    taskkill /PID $record.pid /T /F | Out-Null
    if ($LASTEXITCODE -ne 0) { $failed = $true } else { Write-Output "$($record.name) encerrado" }
}
if ($failed) { throw 'Alguns processos nao puderam ser parados; registro mantido.' }
Remove-Item -LiteralPath $manifestPath
Write-Output 'APIs e workers parados. RabbitMQ permanece ligado para preservar a fila.'
