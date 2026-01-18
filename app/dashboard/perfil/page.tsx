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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Trash2, Plus, Calendar as CalendarIcon, Upload, ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  fetchPortfolio,
  createPortfolioItem,
  deletePortfolioItem,
  fetchAvailability,
  createAvailability,
  deleteAvailability,
  type PortfolioItem,
  type AvailabilitySlot
} from "@/lib/data-service"

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
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

export default function PerfilPage() {
  const router = useRouter()
  const { userProfile, loading, updateProfile } = useAuth()

  // Profile Form State
  const [formData, setFormData] = useState({
    displayName: "",
    artisticName: "",
    specialty: "",
    description: "",
    city: "",
    state: "",
    phone: "",
    portfolioLink: "",
    instagram: "", // UI only for now
    linkedin: "",  // UI only for now
  })

  // Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
    mediaUrl: "",
    mediaType: "image" as "image" | "video"
  })

  // Availability State
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [newSlot, setNewSlot] = useState({
    startTime: "09:00",
    endTime: "18:00"
  })

  // Loading States
  const [savingProfile, setSavingProfile] = useState(false)
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!loading && !userProfile) {
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
        instagram: "",
        linkedin: "",
      })

      // Load additional data
      loadPortfolio()
      loadAvailability()
    }
  }, [userProfile, loading, router])

  const loadPortfolio = async () => {
    if (!userProfile?.id) return
    setLoadingPortfolio(true)
    const items = await fetchPortfolio(userProfile.id)
    setPortfolioItems(items)
    setLoadingPortfolio(false)
  }

  const loadAvailability = async () => {
    if (!userProfile?.id) return
    setLoadingAvailability(true)
    const slots = await fetchAvailability(userProfile.id)
    setAvailabilitySlots(slots)
    setLoadingAvailability(false)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")
    setSavingProfile(true)

    try {
      await updateProfile({
        displayName: formData.displayName,
        artisticName: formData.artisticName,
        specialty: formData.specialty,
        description: formData.description,
        city: formData.city,
        state: formData.state,
        phone: formData.phone,
        portfolioLink: formData.portfolioLink,
      })
      setSuccessMsg("Perfil atualizado com sucesso!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar perfil.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddPortfolioItem = async () => {
    if (!userProfile?.id || !newPortfolioItem.title || !newPortfolioItem.mediaUrl) {
      setErrorMsg("Preencha o título e o link da imagem/vídeo.")
      return
    }

    try {
      setLoadingPortfolio(true)
      await createPortfolioItem({
        ...newPortfolioItem,
        professionalId: userProfile.id
      })
      await loadPortfolio()
      setNewPortfolioItem({ title: "", mediaUrl: "", mediaType: "image" })
      setSuccessMsg("Item adicionado ao portfólio!")
    } catch (err: any) {
      setErrorMsg("Erro ao adicionar item ao portfólio.")
    } finally {
      setLoadingPortfolio(false)
    }
  }

  const handleDeletePortfolioItem = async (id: string) => {
    try {
      setLoadingPortfolio(true)
      await deletePortfolioItem(id)
      await loadPortfolio()
    } catch (err) {
      setErrorMsg("Erro ao excluir item.")
    } finally {
      setLoadingPortfolio(false)
    }
  }

  const handleAddAvailability = async () => {
    if (!userProfile?.id || !selectedDate) {
      setErrorMsg("Selecione uma data.")
      return
    }

    try {
      setLoadingAvailability(true)
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      await createAvailability({
        date: dateStr,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        isBooked: false,
        professionalId: userProfile.id
      })
      await loadAvailability()
      setSuccessMsg("Disponibilidade adicionada!")
    } catch (err: any) {
      setErrorMsg("Erro ao adicionar disponibilidade.")
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleDeleteAvailability = async (id: string) => {
    try {
      setLoadingAvailability(true)
      await deleteAvailability(id)
      await loadAvailability()
    } catch (err) {
      setErrorMsg("Erro ao excluir disponibilidade.")
    } finally {
      setLoadingAvailability(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!userProfile) {
    return null
  }

  const isProfessional = userProfile.userType === "professional"

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground mt-2">Gerencie suas informações, portfólio e agenda</p>
          </div>

          {(successMsg || errorMsg) && (
            <div className="mb-4">
              {successMsg && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{successMsg}</AlertDescription>
                </Alert>
              )}
              {errorMsg && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>

            {/* TAB: INFO */}
            <TabsContent value="info">
              <form onSubmit={handleProfileSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                    <CardDescription>Seus dados de contato e apresentação</CardDescription>
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
                          placeholder="Como quer ser conhecido"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialty">Especialidade Principal *</Label>
                      <Select
                        value={formData.specialty}
                        onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ESPECIALIDADES.map((esp) => (
                            <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição / Bio *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Fale sobre seus serviços, equipamentos e experiência..."
                        rows={5}
                        required
                      />
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
                            {ESTADOS.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    {/* Social Media Section - UI Only for now */}
                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-medium mb-4">Redes Sociais e Portfólio Externo</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="portfolioLink">Site / Portfólio (URL)</Label>
                          <Input
                            id="portfolioLink"
                            value={formData.portfolioLink}
                            onChange={(e) => setFormData({ ...formData, portfolioLink: e.target.value })}
                            placeholder="https://seu-site.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="instagram">Instagram (URL)</Label>
                          <Input
                            id="instagram"
                            value={formData.instagram}
                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                            placeholder="https://instagram.com/..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={savingProfile}>
                        {savingProfile ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            {/* TAB: PORTFOLIO */}
            <TabsContent value="portfolio">
              <Card>
                <CardHeader>
                  <CardTitle>Meu Portfólio</CardTitle>
                  <CardDescription>Adicione fotos e vídeos dos seus trabalhos anteriores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add New Item */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-4 border">
                    <h4 className="font-medium flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Adicionar Novo Item
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={newPortfolioItem.title}
                          onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                          placeholder="Ex: Casamento na Praia"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Link da Imagem/Vídeo</Label>
                        <Input
                          value={newPortfolioItem.mediaUrl}
                          onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, mediaUrl: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddPortfolioItem} disabled={loadingPortfolio}>
                      {loadingPortfolio ? "Adicionando..." : "Adicionar Item"}
                    </Button>
                  </div>

                  {/* List Items */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {portfolioItems.map((item) => (
                      <div key={item.id} className="group relative rounded-lg border overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          <img
                            src={item.mediaUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                          />
                          <button
                            onClick={() => handleDeletePortfolioItem(item.id)}
                            className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.mediaType}</p>
                        </div>
                      </div>
                    ))}
                    {portfolioItems.length === 0 && !loadingPortfolio && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        Nenhum item no portfólio.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: AGENDA */}
            <TabsContent value="agenda">
              <Card>
                <CardHeader>
                  <CardTitle>Minha Disponibilidade</CardTitle>
                  <CardDescription>Gerencie os dias e horários que você está disponível</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
                    {/* Calendar Input */}
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          locale={ptBR}
                          className="rounded-md"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Horário</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={newSlot.startTime}
                            onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                          />
                          <span>até</span>
                          <Input
                            type="time"
                            value={newSlot.endTime}
                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                          />
                        </div>
                        <Button
                          className="w-full mt-2"
                          onClick={handleAddAvailability}
                          disabled={loadingAvailability}
                        >
                          Adicionar Disponibilidade
                        </Button>
                      </div>
                    </div>

                    {/* Slots List */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Datas Disponíveis</h4>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {availabilitySlots.length === 0 ? (
                          <p className="text-muted-foreground">Nenhuma disponibilidade cadastrada.</p>
                        ) : (
                          availabilitySlots
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map((slot) => (
                              <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <CalendarIcon className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="font-medium">
                                      {format(new Date(slot.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {slot.startTime} - {slot.endTime}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteAvailability(slot.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  )
}
