"use client"

import { useEffect, useState } from "react"
import { app, auth, db, storage, analytics, FIREBASE_ENABLED } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Header } from "@/components/header"

export default function TestFirebasePage() {
  const [status, setStatus] = useState({
    firebaseEnabled: FIREBASE_ENABLED,
    app: !!app,
    auth: !!auth,
    db: !!db,
    storage: !!storage,
    analytics: !!analytics,
  })

  useEffect(() => {
    console.log("🔍 Teste de Firebase:", status)
    console.log("📦 Firebase App:", app)
    console.log("🔐 Firebase Auth:", auth)
    console.log("💾 Firestore DB:", db)
    console.log("📁 Firebase Storage:", storage)
    console.log("📊 Firebase Analytics:", analytics)
  }, [])

  const StatusIcon = ({ isOk }: { isOk: boolean }) =>
    isOk ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto p-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.firebaseEnabled ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              )}
              Status do Firebase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Firebase Habilitado</span>
                <StatusIcon isOk={status.firebaseEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Firebase App</span>
                <StatusIcon isOk={status.app} />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Authentication</span>
                <StatusIcon isOk={status.auth} />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Firestore Database</span>
                <StatusIcon isOk={status.db} />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Storage</span>
                <StatusIcon isOk={status.storage} />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Analytics</span>
                <StatusIcon isOk={status.analytics} />
              </div>
            </div>

            {!status.firebaseEnabled && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Firebase não está habilitado.</strong>
                  <br />
                  Verifique se o arquivo .env.local existe com as variáveis corretas.
                </p>
              </div>
            )}

            {status.firebaseEnabled && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>✅ Firebase configurado corretamente!</strong>
                  <br />
                  Agora você precisa habilitar Authentication e Firestore no Firebase Console.
                  <br />
                  <br />
                  <strong>Próximos passos:</strong>
                  <br />
                  1. Acesse: https://console.firebase.google.com/
                  <br />
                  2. Selecione o projeto: isoscanner-a9cc7
                  <br />
                  3. Habilite Authentication (Email/Password e Google)
                  <br />
                  4. Crie o Firestore Database
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>📋 Variáveis de ambiente carregadas:</strong>
                <br />
                • API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅" : "❌"}
                <br />
                • Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✅" : "❌"}
                <br />
                • Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "✅" : "❌"}
                <br />
                • Storage Bucket: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "✅" : "❌"}
                <br />
                • Messaging Sender ID:{" "}
                {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "✅" : "❌"}
                <br />• App ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✅" : "❌"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


