$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runtimePath = Join-Path $projectPath 'artifacts/runtime'
New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
$manifestPath = Join-Path $runtimePath 'services.json'
$pythonPath = Join-Path $projectPath '.venv-entrega3/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Crie .venv-entrega3 e instale as dependencias Python conforme o README.' }
if (Test-Path -LiteralPath $manifestPath) { throw 'Ja existe um registro de processos. Execute services:stop antes de services:start.' }
$nodePath = (Get-Command node -ErrorAction Stop).Source
$script:serviceRecords = @()
function Start-ServiceProcess($name, $executable, $arguments, $relativeDirectory) {
    $serviceProcess = Start-Process -FilePath $executable -ArgumentList $arguments -WorkingDirectory (Join-Path $projectPath $relativeDirectory) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath "$name.out.log") -RedirectStandardError (Join-Path $runtimePath "$name.err.log") -PassThru
    $script:serviceRecords += [pscustomobject]@{name=$name; pid=$serviceProcess.Id; started=$serviceProcess.StartTime.ToUniversalTime().ToString('o')}
    ConvertTo-Json -InputObject @($script:serviceRecords) | Set-Content -LiteralPath $manifestPath
    Write-Output "$name iniciado (PID $($serviceProcess.Id))"
}
function Wait-Api($url) {
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        try {
            $result = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($result.StatusCode -eq 200) { Write-Output "$url -> HTTP 200"; return }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    throw "API nao respondeu: $url. Consulte artifacts/runtime."
}
Push-Location $projectPath
try {
    docker compose up -d --wait
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel iniciar RabbitMQ. Inicie Docker Desktop.' }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Build da Loja falhou.' }
    npm.cmd run rabbit:setup
    if ($LASTEXITCODE -ne 0) { throw 'Configuracao da topologia RabbitMQ falhou.' }
    Start-ServiceProcess 'cadastros' $pythonPath @('-m','uvicorn','main:app','--host','127.0.0.1','--port','8081') 'microsservicos/cadastros'
    $env:PORT='8082'
    Start-ServiceProcess 'loja' $nodePath @('dist/server.js') 'microsservicos/loja'
    Start-ServiceProcess 'agendamentos' $pythonPath @('-m','uvicorn','main:app','--host','127.0.0.1','--port','8083') 'microsservicos/agendamentos'
    Start-ServiceProcess 'gateway' $pythonPath @('-m','uvicorn','main:app','--host','127.0.0.1','--port','8080') 'api-gateway'
    Start-ServiceProcess 'consumer' $nodePath @('--import','tsx','src/consumer.ts') 'microsservicos/loja'
    Start-ServiceProcess 'outbox' $pythonPath @('-u','outbox_worker.py') 'microsservicos/cadastros'
    Wait-Api 'http://127.0.0.1:8081/clientes/'
    Wait-Api 'http://127.0.0.1:8082/health'
    Wait-Api 'http://127.0.0.1:8083/agendamentos'
    Wait-Api 'http://127.0.0.1:8080/'
    Wait-Api 'http://127.0.0.1:8080/cadastros/clientes/'
    Wait-Api 'http://127.0.0.1:8080/loja/produtos'
    Wait-Api 'http://127.0.0.1:8080/agendamento/agendamentos'
} finally { Pop-Location }
