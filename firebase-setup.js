#!/usr/bin/env node

/**
 * Firebase Setup Script
 * Este script configura automaticamente todas as collections e índices necessários
 * para o Marketplace Fotográfico.
 *
 * Uso: node firebase-setup.js
 *
 * Pré-requisitos:
 * 1. Firebase CLI instalado: npm install -g firebase-tools
 * 2. Autenticado: firebase login
 * 3. Projeto selecionado: firebase use [project-id]
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configurações do Firebase (serão lidas das variáveis de ambiente)
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!serviceAccount) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY não configurada');
  console.log('Configure a variável de ambiente com sua chave de serviço do Firebase');
  process.exit(1);
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
  });
}

const db = admin.firestore();
const auth = admin.auth();

console.log('🚀 Iniciando configuração do Firebase...');

async function createCollections() {
  console.log('\n📁 Criando collections...');

  const collections = [
    'users',
    'equipments',
    'bookings',
    'availabilities',
    'reviews',
    'service_requests'
  ];

  for (const collectionName of collections) {
    try {
      // Tenta criar uma referência à collection
      const collectionRef = db.collection(collectionName);
      await collectionRef.limit(1).get(); // Query vazia para inicializar
      console.log(`✅ Collection '${collectionName}' criada/verificada`);
    } catch (error) {
      console.error(`❌ Erro ao criar collection '${collectionName}':`, error.message);
    }
  }
}

async function createIndexes() {
  console.log('\n🔍 Criando índices compostos...');

  const indexes = [
    // Users indexes
    {
      collectionGroup: 'users',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'userType', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'users',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'uid', order: 'ASCENDING' }
      ]
    },

    // Equipments indexes
    {
      collectionGroup: 'equipments',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'available', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'equipments',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'ownerId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'equipments',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'category', order: 'ASCENDING' },
        { fieldPath: 'available', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },

    // Bookings indexes
    {
      collectionGroup: 'bookings',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'clientId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'bookings',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'professionalId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'bookings',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'date', order: 'ASCENDING' }
      ]
    },

    // Availabilities indexes
    {
      collectionGroup: 'availabilities',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'professionalId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'ASCENDING' }
      ]
    },

    // Reviews indexes
    {
      collectionGroup: 'reviews',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'professionalId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },

    // Service requests indexes
    {
      collectionGroup: 'service_requests',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'clientId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'service_requests',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'professionalId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ]
    }
  ];

  // Nota: Os índices compostos devem ser criados manualmente no Firebase Console
  // ou via Firebase CLI. Este script apenas documenta quais índices são necessários.

  console.log('📋 Índices que precisam ser criados manualmente no Firebase Console:');
  indexes.forEach((index, i) => {
    console.log(`${i + 1}. Collection: ${index.collectionGroup}`);
    console.log(`   Campos: ${index.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ')}`);
    console.log('');
  });

  // Criar arquivo de configuração dos índices
  const firestoreIndexes = {
    indexes: indexes.map(index => ({
      collectionGroup: index.collectionGroup,
      queryScope: index.queryScope,
      fields: index.fields
    })),
    fieldOverrides: []
  };

  fs.writeFileSync(
    path.join(__dirname, 'firestore.indexes.json'),
    JSON.stringify(firestoreIndexes, null, 2)
  );

  console.log('📄 Arquivo firestore.indexes.json criado com a configuração dos índices');
  console.log('💡 Execute: firebase deploy --only firestore:indexes');
}

async function createSampleData() {
  console.log('\n📝 Criando dados de exemplo...');

  try {
    // Criar usuários de exemplo
    const sampleUsers = [
      {
        uid: 'sample-professional-1',
        email: 'fotografo@exemplo.com',
        displayName: 'Carlos Fotógrafo',
        userType: 'professional',
        artisticName: 'Carlos Silva',
        specialty: 'Fotografia de Casamento',
        description: 'Fotógrafo profissional com 10 anos de experiência',
        city: 'São Paulo',
        state: 'SP',
        createdAt: admin.firestore.Timestamp.now(),
        averageRating: 4.8,
        totalReviews: 25
      },
      {
        uid: 'sample-client-1',
        email: 'cliente@exemplo.com',
        displayName: 'Ana Cliente',
        userType: 'client',
        city: 'Rio de Janeiro',
        state: 'RJ',
        createdAt: admin.firestore.Timestamp.now()
      }
    ];

    for (const user of sampleUsers) {
      await db.collection('users').doc(user.uid).set(user);
      console.log(`✅ Usuário ${user.displayName} criado`);
    }

    // Criar equipamentos de exemplo
    const sampleEquipments = [
      {
        name: 'Canon EOS R5',
        category: 'Câmeras',
        negotiationType: 'rent',
        condition: 'new',
        price: 150,
        rentPeriod: 'day',
        city: 'São Paulo',
        state: 'SP',
        ownerId: 'sample-professional-1',
        ownerName: 'Carlos Fotógrafo',
        available: true,
        description: 'Câmera profissional full-frame com 45MP',
        brand: 'Canon',
        model: 'EOS R5',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      {
        name: 'Lente Canon RF 24-70mm f/2.8L',
        category: 'Lentes',
        negotiationType: 'sale',
        condition: 'used',
        price: 2500,
        city: 'São Paulo',
        state: 'SP',
        ownerId: 'sample-professional-1',
        ownerName: 'Carlos Fotógrafo',
        available: true,
        description: 'Lente profissional zoom versátil',
        brand: 'Canon',
        model: 'RF 24-70mm f/2.8L',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
    ];

    for (const equipment of sampleEquipments) {
      await db.collection('equipments').add(equipment);
      console.log(`✅ Equipamento ${equipment.name} criado`);
    }

    // Criar avaliações de exemplo
    const sampleReviews = [
      {
        clientId: 'sample-client-1',
        clientName: 'Ana Cliente',
        professionalId: 'sample-professional-1',
        professionalName: 'Carlos Fotógrafo',
        bookingId: 'sample-booking-1',
        rating: 5,
        comment: 'Excelente profissional! Superou todas as expectativas no casamento.',
        serviceType: 'Fotografia de Casamento',
        createdAt: admin.firestore.Timestamp.now()
      }
    ];

    for (const review of sampleReviews) {
      await db.collection('reviews').add(review);
      console.log(`✅ Avaliação criada`);
    }

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error.message);
  }
}

async function setupSecurityRules() {
  console.log('\n🔒 Criando regras de segurança...');

  const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
    }

    // Equipments collection
    match /equipments/{equipmentId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow update: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }

    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.professionalId);
      allow write: if request.auth != null;
      allow update: if request.auth != null &&
        (request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.professionalId);
    }

    // Availabilities collection
    match /availabilities/{availabilityId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.professionalId;
      allow update: if request.auth != null && request.auth.uid == resource.data.professionalId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.professionalId;
    }

    // Reviews collection
    match /reviews/{reviewId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.clientId;
      allow update: if request.auth != null && request.auth.uid == resource.data.clientId;
    }

    // Service requests collection
    match /service_requests/{requestId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.professionalId);
      allow write: if request.auth != null;
      allow update: if request.auth != null &&
        (request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.professionalId);
    }
  }
}
`;

  fs.writeFileSync(path.join(__dirname, 'firestore.rules'), firestoreRules);
  console.log('📄 Arquivo firestore.rules criado com as regras de segurança');
  console.log('💡 Execute: firebase deploy --only firestore:rules');
}

async function main() {
  try {
    await createCollections();
    await createIndexes();
    await createSampleData();
    await setupSecurityRules();

    console.log('\n🎉 Configuração do Firebase concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Execute: firebase deploy --only firestore:indexes');
    console.log('2. Execute: firebase deploy --only firestore:rules');
    console.log('3. Teste sua aplicação!');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error.message);
    process.exit(1);
  }
}

main();
