"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FirebaseWarning() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if Firebase is configured
    const isConfigured =
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

    setIsVisible(!isConfigured && !isDismissed)
  }, [isDismissed])

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <Alert variant="destructive" className="max-w-4xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Firebase não configurado
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-2">Para usar a aplicação, você precisa configurar as variáveis de ambiente do Firebase.</p>
          <p className="text-sm">
            Acesse a seção <strong>"Vars"</strong> na barra lateral do chat e adicione as seguintes variáveis:
          </p>
          <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
            <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
            <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
            <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
            <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
            <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
            <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
