param([switch]$SemSubir)
$ErrorActionPreference = 'Stop'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $raiz
$log = Join-Path $raiz 'artifacts/teste-entrega4/resultado.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
Start-Transcript -Path $log -Force | Out-Null

$envVars = @{}
Get-Content (Join-Path $raiz '.env') | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)\s*$') { $envVars[$matches[1]] = $matches[2] }
}
$porta = if ($envVars['GATEWAY_PORT']) { $envVars['GATEWAY_PORT'] } else { '80' }
$base = "http://localhost:$porta"
$script:ok = 0; $script:falhas = 0

function Titulo($texto) { Write-Host ""; Write-Host "=== $texto ===" -ForegroundColor Cyan }
function Confere($descricao, $condicao, $detalhe) {
    if ($condicao) { $script:ok++; Write-Host "  [OK]    $descricao $detalhe" -ForegroundColor Green }
    else { $script:falhas++; Write-Host "  [FALHA] $descricao $detalhe" -ForegroundColor Red }
}
function Req($metodo, $caminho, $token, $corpo) {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    $params = @{ Uri = "$base$caminho"; Method = $metodo; Headers = $headers; UseBasicParsing = $true; TimeoutSec = 20 }
    if ($corpo) { $params['Body'] = $corpo; $params['ContentType'] = 'application/json' }
    try {
        $r = Invoke-WebRequest @params
        return [pscustomobject]@{ Status = [int]$r.StatusCode; Instancia = "$($r.Headers['X-Instance'])"; Upstream = "$($r.Headers['X-Upstream'])"; Corpo = $r.Content }
    } catch {
        $resp = $_.Exception.Response
        if ($null -eq $resp) { return [pscustomobject]@{ Status = 0; Instancia = ''; Upstream = ''; Corpo = $_.Exception.Message } }
        return [pscustomobject]@{ Status = [int]$resp.StatusCode; Instancia = ''; Upstream = ''; Corpo = '' }
    }
}
function B64UrlDecode($s) {
    $s = $s.Replace('-', '+').Replace('_', '/')
    switch ($s.Length % 4) { 2 { $s += '==' } 3 { $s += '=' } }
    [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s))
}
function B64UrlEncode($texto) {
    [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($texto)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
function Login($usuario, $senha) {
    $r = Req 'POST' '/api/auth/login' $null (@{ username = $usuario; password = $senha } | ConvertTo-Json)
    if ($r.Status -ne 200) { return $null }
    return ($r.Corpo | ConvertFrom-Json).access_token
}

if (-not $SemSubir) {
    Titulo 'Subindo a infraestrutura (docker compose up --build)'
    docker compose up -d --build --wait
    if ($LASTEXITCODE -ne 0) { Stop-Transcript | Out-Null; throw 'docker compose up falhou. O Docker Desktop está aberto?' }
}

Titulo 'Infraestrutura'
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
$publicados = docker ps --filter 'label=com.docker.compose.project=lojapet' --format '{{.Names}} {{.Ports}}' | Where-Object { $_ -match '->' }
$soNginx = @($publicados | Where-Object { $_ -notmatch '^lojapet-nginx' }).Count -eq 0
Confere 'Somente o Nginx publica porta no host' $soNginx "($(@($publicados) -join '; '))"
$direto = $true
try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', 8082); $c.Close() } catch { $direto = $false }
Confere 'Loja NÃO acessível diretamente em localhost:8082' (-not $direto) ''

Titulo 'Segurança 1: rota protegida sem token'
foreach ($rota in '/api/loja/produtos', '/api/cadastros/clientes/', '/api/agendamentos/agendamentos') {
    $r = Req 'GET' $rota $null $null
    Confere "GET $rota sem token -> 401" ($r.Status -eq 401) "(recebido $($r.Status))"
}

Titulo 'Segurança 2: login no Authorization Server'
$tokenUser = Login 'usuario' $envVars['AUTH_USER_PASSWORD']
$tokenAdmin = Login 'admin' $envVars['AUTH_ADMIN_PASSWORD']
Confere 'Login do usuario (role USER) emitiu JWT' ([bool]$tokenUser) ''
Confere 'Login do admin (role ADMIN) emitiu JWT' ([bool]$tokenAdmin) ''
$senhaErrada = Req 'POST' '/api/auth/login' $null '{"username":"usuario","password":"errada"}'
Confere 'Senha errada -> 401' ($senhaErrada.Status -eq 401) "(recebido $($senhaErrada.Status))"
if (-not $tokenUser) { throw 'Sem token não dá para continuar. Confira AUTH_USER_PASSWORD no .env.' }
$partes = $tokenUser.Split('.')
$payload = B64UrlDecode $partes[1]
Write-Host "  Payload do token: $payload"
Confere 'Payload sem dados sensíveis' ($payload -notmatch 'senha|password|email|cpf') ''

Titulo 'Segurança 3: token adulterado (role USER -> ADMIN, assinatura original)'
$payloadAdulterado = $payload -replace '"role"\s*:\s*"USER"', '"role":"ADMIN"'
$tokenAdulterado = "$($partes[0]).$(B64UrlEncode $payloadAdulterado).$($partes[2])"
Write-Host "  Payload adulterado: $payloadAdulterado"
foreach ($rota in '/api/loja/produtos', '/api/cadastros/clientes/', '/api/agendamentos/agendamentos') {
    $r = Req 'GET' $rota $tokenAdulterado $null
    Confere "GET $rota com token adulterado -> 401" ($r.Status -eq 401) "(recebido $($r.Status))"
}
$r = Req 'POST' '/api/loja/produtos' $tokenAdulterado '{"nome":"Hack","preco":1,"estoque":1}'
Confere 'POST /api/loja/produtos (rota ADMIN) com token adulterado -> 401' ($r.Status -eq 401) "(recebido $($r.Status))"

Titulo 'Segurança 4: tokens legítimos e papéis'
$r = Req 'GET' '/api/loja/produtos' $tokenUser $null
Confere 'USER lê produtos -> 200' ($r.Status -eq 200) "(recebido $($r.Status))"
$r = Req 'POST' '/api/loja/produtos' $tokenUser '{"nome":"Racao Teste","preco":10.5,"estoque":5}'
Confere 'USER tenta criar produto (rota ADMIN) -> 403' ($r.Status -eq 403) "(recebido $($r.Status))"
$r = Req 'POST' '/api/loja/produtos' $tokenAdmin '{"nome":"Racao Premium 10kg","preco":189.9,"estoque":20}'
Confere 'ADMIN cria produto -> 201' ($r.Status -eq 201) "(recebido $($r.Status))"
$r = Req 'GET' '/api/cadastros/clientes/' $tokenUser $null
Confere 'USER lista clientes -> 200' ($r.Status -eq 200) "(recebido $($r.Status))"
$r = Req 'GET' '/api/agendamentos/agendamentos' $tokenUser $null
Confere 'USER lista agendamentos -> 200' ($r.Status -eq 200) "(recebido $($r.Status))"

Titulo 'Escalabilidade 1: 9 requisições seguidas ao Nginx'
$instancias = @()
for ($i = 1; $i -le 9; $i++) {
    $r = Req 'GET' '/api/loja/produtos' $tokenUser $null
    Write-Host ("  #{0} status={1} instancia={2} upstream={3}" -f $i, $r.Status, $r.Instancia, $r.Upstream)
    if ($r.Status -eq 200) { $instancias += $r.Instancia }
}
$distintas = @($instancias | Sort-Object -Unique)
$instancias | Group-Object | ForEach-Object { Write-Host ("  {0}: {1} requisições" -f $_.Name, $_.Count) }
Confere 'Tráfego distribuído entre as 3 réplicas' ($distintas.Count -eq 3) "($($distintas.Count) instâncias distintas)"

Titulo 'Escalabilidade 2: derrubando uma réplica em tempo real'
$vitima = 'lojapet-loja-2'
docker stop $vitima | Out-Null
Write-Host "  Contêiner $vitima parado."
$status = @(); $instancias = @()
for ($i = 1; $i -le 9; $i++) {
    $inicio = Get-Date
    $r = Req 'GET' '/api/loja/produtos' $tokenUser $null
    $ms = [int]((Get-Date) - $inicio).TotalMilliseconds
    Write-Host ("  #{0} status={1} instancia={2} upstream={3} ({4} ms)" -f $i, $r.Status, $r.Instancia, $r.Upstream, $ms)
    $status += $r.Status; if ($r.Status -eq 200) { $instancias += $r.Instancia }
}
$todas200 = @($status | Where-Object { $_ -ne 200 }).Count -eq 0
$sobreviventes = @($instancias | Sort-Object -Unique)
Confere 'Todas as requisições continuaram com 200 OK' $todas200 "($($status -join ','))"
Confere 'Tráfego redirecionado para as 2 réplicas sobreviventes' ($sobreviventes.Count -eq 2) "($($sobreviventes -join ', '))"
docker start $vitima | Out-Null
Write-Host "  Contêiner $vitima religado."

Titulo 'Logs do Nginx (upstream = réplica que atendeu)'
docker compose logs nginx --tail 12 --no-log-prefix
Titulo 'Logs das réplicas da Loja'
docker compose logs loja --tail 12

Titulo 'Resultado'
$cor = if ($script:falhas -eq 0) { 'Green' } else { 'Red' }
Write-Host "  $($script:ok) verificações OK, $($script:falhas) falhas" -ForegroundColor $cor
Stop-Transcript | Out-Null
if ($script:falhas -gt 0) { exit 1 }
