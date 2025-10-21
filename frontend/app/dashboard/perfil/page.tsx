"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const ESPECIALIDADES = [
  "Fotógrafo",
  "Videomaker",
  "Editor de Vídeo",
  "Editor de Fotos",
  "Produtor Audiovisual",
  "Drone Pilot",
  "Fotógrafo de Eventos",
  "Fotógrafo de Produtos",
  "Fotógrafo de Retratos",
  "Cinegrafista",
]

const ESTADOS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]

export default function PerfilPage() {
  const router = useRouter()
  const { user, userProfile, loading, updateUserProfile } = useAuth()

  const [formData, setFormData] = useState({
    displayName: "",
    artisticName: "",
    specialty: "",
    description: "",
    city: "",
    state: "",
    phone: "",
    portfolioLink: "",
  })

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        artisticName: userProfile.artisticName || "",
        specialty: userProfile.specialty || "",
        description: userProfile.description || "",
        city: userProfile.city || "",
        state: userProfile.state || "",
        phone: userProfile.phone || "",
        portfolioLink: userProfile.portfolioLink || "",
      })
    }
  }, [user, userProfile, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setSaving(true)

    try {
      await updateUserProfile(formData)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Erro ao salvar perfil.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground mt-2">Complete suas informações para aparecer nas buscas</p>
          </div>

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Perfil atualizado com sucesso!</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Dados básicos do seu perfil profissional</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Nome Completo *</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="artisticName">Nome Artístico / Estúdio</Label>
                    <Input
                      id="artisticName"
                      value={formData.artisticName}
                      onChange={(e) => setFormData({ ...formData, artisticName: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade *</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione sua especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESPECIALIDADES.map((esp) => (
                        <SelectItem key={esp} value={esp}>
                          {esp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Profissional *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Conte sobre sua experiência, estilo de trabalho e diferenciais..."
                    rows={5}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 50 caracteres ({formData.description.length}/50)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({ ...formData, state: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolioLink">Link do Portfólio Externo</Label>
                    <Input
                      id="portfolioLink"
                      type="url"
                      value={formData.portfolioLink}
                      onChange={(e) => setFormData({ ...formData, portfolioLink: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar Perfil"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}
