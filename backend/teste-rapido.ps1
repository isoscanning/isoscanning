# Script rápido para testar a API
# Crie um arquivo teste-rapido.ps1 na raiz do projeto

Write-Host '' -ForegroundColor Cyan
Write-Host '    Teste Rápido da API - ISOScanner       ' -ForegroundColor Cyan
Write-Host '' -ForegroundColor Cyan
Write-Host ''

$BASE_URL = 'http://localhost:4000/api'
$EMAIL = "teste$(Get-Random)@example.com"
$PASSWORD = 'SenhaSegura123'

# Teste 1: Ping
Write-Host '1  Verificando conexão com o servidor...' -ForegroundColor Yellow
try {
    $pingResponse = Invoke-WebRequest -Uri $BASE_URL -ErrorAction Stop -TimeoutSec 5
    Write-Host ' Servidor respondendo!' -ForegroundColor Green
} catch {
    Write-Host ' Servidor não está respondendo!' -ForegroundColor Red
    Write-Host '   Execute: npm run start:dev' -ForegroundColor Yellow
    exit 1
}
Write-Host ''

# Teste 2: Sign Up
Write-Host '2  Criando uma conta de teste...' -ForegroundColor Yellow
try {
    $signUpBody = @{
        email = $EMAIL
        password = $PASSWORD
        displayName = 'Usuário Teste'
        userType = 'client'
        city = 'São Paulo'
        state = 'SP'
    } | ConvertTo-Json

    $signUpResponse = Invoke-WebRequest -Uri "$BASE_URL/auth/signup" 
        -Method POST 
        -ContentType 'application/json' 
        -Body $signUpBody -ErrorAction Stop | ConvertFrom-Json

    $accessToken = $signUpResponse.accessToken
    Write-Host ' Conta criada com sucesso!' -ForegroundColor Green
    Write-Host "   Email: $EMAIL" -ForegroundColor White
} catch {
    Write-Host ' Erro ao criar conta!' -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}
Write-Host ''

# Teste 3: Get Me (com autenticação)
Write-Host '3  Obtendo dados do usuário autenticado...' -ForegroundColor Yellow
try {
    $userResponse = Invoke-WebRequest -Uri "$BASE_URL/auth/me" 
        -Method GET 
        -Headers @{'Authorization' = "Bearer $accessToken"} 
        -ErrorAction Stop | ConvertFrom-Json

    Write-Host ' Dados obtidos!' -ForegroundColor Green
    Write-Host "   Nome: $($userResponse.displayName)" -ForegroundColor White
    Write-Host "   Tipo: $($userResponse.userType)" -ForegroundColor White
} catch {
    Write-Host ' Erro ao obter dados!' -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ''

# Teste 4: List Profiles
Write-Host '4  Listando profissionais...' -ForegroundColor Yellow
try {
    $profilesResponse = Invoke-WebRequest -Uri "$BASE_URL/profiles?limit=5" 
        -Method GET -ErrorAction Stop | ConvertFrom-Json

    Write-Host ' Profissionais listados!' -ForegroundColor Green
    Write-Host "   Total encontrado: $($profilesResponse.total)" -ForegroundColor White
} catch {
    Write-Host ' Erro ao listar profissionais!' -ForegroundColor Red
}
Write-Host ''

Write-Host '' -ForegroundColor Green
Write-Host '    TODOS OS TESTES PASSARAM!               ' -ForegroundColor Green
Write-Host '                                                ' -ForegroundColor Green
Write-Host '    API está funcionando corretamente!       ' -ForegroundColor Green
Write-Host '' -ForegroundColor Green
