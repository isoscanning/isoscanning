# Script para iniciar o ISOScanner Backend
# Execute este script para configurar e rodar o backend localmente

Write-Host '' -ForegroundColor Cyan
Write-Host '    ISOScanner Backend - Setup Local        ' -ForegroundColor Cyan
Write-Host '' -ForegroundColor Cyan
Write-Host ''

# 1. Verificar Node.js
Write-Host ' Verificando Node.js...' -ForegroundColor Yellow
node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host ' Node.js não está instalado!' -ForegroundColor Red
    exit 1
}

# 2. Navegar para backend
Write-Host ''
Write-Host ' Navegando para backend...' -ForegroundColor Yellow
cd backend

# 3. Verificar .env
Write-Host ''
Write-Host ' Verificando arquivo .env...' -ForegroundColor Yellow
if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
        Write-Host '  Arquivo .env não encontrado. Criando a partir de .env.example...' -ForegroundColor Yellow
        Copy-Item '.env.example' '.env'
        Write-Host ' Arquivo .env criado! Editeu com suas credenciais Supabase.' -ForegroundColor Green
        Write-Host ''
        Write-Host ' Abra o arquivo backend/.env e preencha:' -ForegroundColor Cyan
        Write-Host '   - SUPABASE_URL' -ForegroundColor White
        Write-Host '   - SUPABASE_SERVICE_ROLE_KEY' -ForegroundColor White
        Write-Host '   - SUPABASE_ANON_KEY' -ForegroundColor White
        Write-Host ''
        Write-Host 'Depois execute novamente este script.' -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host ' Arquivo .env encontrado!' -ForegroundColor Green
}

# 4. Instalar dependências
Write-Host ''
Write-Host ' Instalando dependências...' -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ' Erro ao instalar dependências!' -ForegroundColor Red
    exit 1
}

# 5. Compilar
Write-Host ''
Write-Host ' Compilando TypeScript...' -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ' Erro ao compilar!' -ForegroundColor Red
    exit 1
}

# 6. Iniciar servidor
Write-Host ''
Write-Host ' Iniciando servidor em desenvolvimento...' -ForegroundColor Cyan
Write-Host ' API disponível em: http://localhost:4000/api' -ForegroundColor Green
Write-Host ''
npm run start:dev
