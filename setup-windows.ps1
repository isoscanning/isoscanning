# 🚀 SETUP COMPLETO - MARKETPLACE FOTOGRÁFICO (Windows)
# Este script configura automaticamente tudo necessário

Write-Host "🎬 Iniciando configuração completa do Marketplace Fotográfico..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Firebase CLI está instalado
try {
    $firebaseVersion = firebase --version 2>$null
    Write-Host "✅ Firebase CLI encontrado: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g firebase-tools
    Write-Host "✅ Firebase CLI instalado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔐 Passo 1: Login no Firebase" -ForegroundColor Yellow
Write-Host "Execute o comando abaixo e faça login no navegador:" -ForegroundColor White
Write-Host "firebase login" -ForegroundColor Cyan
Write-Host ""
Read-Host "Após fazer login, pressione Enter para continuar"

Write-Host ""
Write-Host "📁 Passo 2: Selecionar projeto Firebase" -ForegroundColor Yellow
Write-Host "Certifique-se de ter um projeto chamado 'marketplace-fotografos'" -ForegroundColor White
Write-Host "Se não tiver, crie um em: https://console.firebase.google.com" -ForegroundColor White
Write-Host ""
Write-Host "Execute: firebase use marketplace-fotografos" -ForegroundColor Cyan
Write-Host "(ou crie um novo projeto se necessário)" -ForegroundColor Gray
Read-Host "Projeto selecionado? Pressione Enter para continuar"

Write-Host ""
Write-Host "🗄️ Passo 3: Deploy das regras e índices" -ForegroundColor Yellow
Write-Host "Executando: firebase deploy --only firestore" -ForegroundColor Cyan

try {
    firebase deploy --only firestore
    Write-Host "✅ Regras e índices do Firestore deployados com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no deploy do Firestore. Verifique sua configuração Firebase." -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🖼️ Passo 3.1: Deploy das regras do Storage" -ForegroundColor Yellow
Write-Host "Executando: firebase deploy --only storage" -ForegroundColor Cyan

try {
    firebase deploy --only storage
    Write-Host "✅ Regras do Storage deployadas com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no deploy do Storage. Verifique sua configuração Firebase." -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Nota: O sistema funcionará, mas uploads de imagem podem falhar." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌱 Passo 4: Popular banco com dados de exemplo" -ForegroundColor Yellow
Write-Host "Executando: node scripts/seed-database.js" -ForegroundColor Cyan

try {
    node scripts/seed-database.js
    Write-Host "✅ Banco populado com dados de exemplo!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao popular banco. Verifique as configurações." -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Configure o arquivo .env.local com suas chaves Firebase" -ForegroundColor White
Write-Host "2. Execute: npm run dev" -ForegroundColor White
Write-Host "3. Acesse: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🗂️ Collections criadas:" -ForegroundColor Yellow
Write-Host "   • users (usuários)" -ForegroundColor White
Write-Host "   • equipments (equipamentos)" -ForegroundColor White
Write-Host "   • bookings (agendamentos)" -ForegroundColor White
Write-Host "   • availabilities (disponibilidades)" -ForegroundColor White
Write-Host "   • reviews (avaliações)" -ForegroundColor White
Write-Host "   • service_requests (solicitações)" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Sistema pronto para uso!" -ForegroundColor Green
