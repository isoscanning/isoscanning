#!/bin/bash

# 🚀 SETUP COMPLETO - MARKETPLACE FOTOGRÁFICO
# Este script configura automaticamente tudo necessário

echo "🎬 Iniciando configuração completa do Marketplace Fotográfico..."
echo ""

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
    echo "✅ Firebase CLI instalado!"
fi

echo ""
echo "🔐 Passo 1: Login no Firebase"
echo "Execute: firebase login"
echo "Após fazer login, pressione Enter para continuar..."
read -p ""

echo ""
echo "📁 Passo 2: Selecionar projeto Firebase"
echo "Execute: firebase use marketplace-fotografos"
echo "(ou crie um novo projeto se necessário)"
echo "Projeto selecionado? Pressione Enter para continuar..."
read -p ""

echo ""
echo "🗄️ Passo 3: Deploy das regras e índices"
echo "Executando: firebase deploy --only firestore"
firebase deploy --only firestore

echo ""
echo "🖼️ Passo 3.1: Deploy das regras do Storage"
echo "Executando: firebase deploy --only storage"
firebase deploy --only storage

if [ $? -eq 0 ]; then
    echo "✅ Regras e índices deployados com sucesso!"
else
    echo "❌ Erro no deploy. Verifique sua configuração Firebase."
    exit 1
fi

echo ""
echo "🌱 Passo 4: Popular banco com dados de exemplo"
echo "Executando: node scripts/seed-database.js"
node scripts/seed-database.js

if [ $? -eq 0 ]; then
    echo "✅ Banco populado com dados de exemplo!"
else
    echo "❌ Erro ao popular banco. Verifique as configurações."
    exit 1
fi

echo ""
echo "🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env.local com suas chaves Firebase"
echo "2. Execute: npm run dev"
echo "3. Acesse: http://localhost:3000"
echo ""
echo "🗂️ Collections criadas:"
echo "   • users (usuários)"
echo "   • equipments (equipamentos)"
echo "   • bookings (agendamentos)"
echo "   • availabilities (disponibilidades)"
echo "   • reviews (avaliações)"
echo "   • service_requests (solicitações)"
echo ""
echo "🎯 Sistema pronto para uso!"
