$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$artifactRoot = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
$stagingPath = Join-Path $artifactRoot ('stage-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stagingPath | Out-Null
Push-Location $projectRoot
try {
    $files = git ls-files --cached --others --exclude-standard
    foreach ($relativePath in $files) {
        if ($relativePath -match '(^|/)(\.env|\.git|__pycache__|node_modules|dist|artifacts|entregas|\.venv-entrega3)(/|$)' -or $relativePath -match '\.(db|pyc)$') { continue }
        $sourcePath = Join-Path $projectRoot $relativePath
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { continue }
        $destinationPath = Join-Path $stagingPath $relativePath
        New-Item -ItemType Directory -Path (Split-Path $destinationPath -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
    }
    node scripts/snapshot-dbs.cjs $stagingPath
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar snapshots SQLite; ZIP não atualizado.' }
    $zipPath = Join-Path $artifactRoot 'petshop-entrega3.zip'
    Compress-Archive -Path (Join-Path $stagingPath '*') -DestinationPath $zipPath -Force
    Write-Output $zipPath
} finally { Pop-Location }
