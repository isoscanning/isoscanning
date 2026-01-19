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
import { AlertCircle, CheckCircle2, Trash2, Plus, Calendar as CalendarIcon, Upload, ImageIcon, Eye, EyeOff, X, Globe, Camera } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import apiClient from "@/lib/api-service"
import {
  fetchPortfolio,
  createPortfolioItem,
  deletePortfolioItem,
  fetchAvailability,
  createAvailability,
  deleteAvailability,
  fetchSpecialties,
  type PortfolioItem,
  type AvailabilitySlot,
  type Specialty
} from "@/lib/data-service"


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
    specialties: [] as string[],
    description: "",
    city: "",
    state: "",
    phone: "",
    portfolioLink: "",
    instagram: "", // UI only for now
    linkedin: "",  // UI only for now
    isPublished: false,
    avatarUrl: "",
  })

  const [availableSpecialties, setAvailableSpecialties] = useState<Specialty[]>([])

  // Avatar Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

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

  // Loading States and Modals
  const [savingProfile, setSavingProfile] = useState(false)
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    const loadSpecialties = async () => {
      const data = await fetchSpecialties()
      setAvailableSpecialties(data)
    }
    loadSpecialties()
  }, [])

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login")
      return
    }

    if (userProfile) {
      // Fetch fresh profile data from API to ensure we have latest from DB
      const fetchFreshProfile = async () => {
        try {
          console.log("[perfil] Fetching fresh profile for user:", userProfile.id)
          const response = await apiClient.get(`/profiles/${userProfile.id}`)
          const freshProfile = response.data
          console.log("[perfil] Fresh profile data received:", freshProfile)

          setFormData({
            displayName: freshProfile.displayName || userProfile.displayName || "",
            artisticName: freshProfile.artisticName || "",
            specialties: freshProfile.specialties || [],
            description: freshProfile.description || "",
            city: freshProfile.city || "",
            state: freshProfile.state || "",
            phone: freshProfile.phone || "",
            portfolioLink: freshProfile.portfolioLink || "",
            instagram: "",
            linkedin: "",
            isPublished: freshProfile.isPublished || false,
            avatarUrl: freshProfile.avatarUrl || userProfile.avatarUrl || "",
          })
          // Set avatar preview if exists
          if (freshProfile.avatarUrl) {
            setAvatarPreview(freshProfile.avatarUrl)
          }
        } catch (error: any) {
          console.error("[perfil] Error fetching fresh profile:", error?.response?.status, error?.response?.data || error.message)
          // Fallback to cached userProfile data
          console.log("[perfil] Falling back to cached userProfile data:", userProfile)
          setFormData({
            displayName: userProfile.displayName || "",
            artisticName: userProfile.artisticName || "",
            specialties: userProfile.specialties || [],
            description: userProfile.description || "",
            city: userProfile.city || "",
            state: userProfile.state || "",
            phone: userProfile.phone || "",
            portfolioLink: userProfile.portfolioLink || "",
            instagram: "",
            linkedin: "",
            isPublished: userProfile.isPublished || false,
            avatarUrl: userProfile.avatarUrl || "",
          })
          // Set avatar preview if exists
          if (userProfile.avatarUrl) {
            setAvatarPreview(userProfile.avatarUrl)
          }
        }
      }

      fetchFreshProfile()

      // Load additional data
      loadPortfolio()
      loadAvailability()
    }
  }, [userProfile, loading, router])

  // Success message timeout management
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

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
        specialties: formData.specialties,
        description: formData.description,
        city: formData.city,
        state: formData.state,
        phone: formData.phone,
        portfolioLink: formData.portfolioLink,
        isPublished: formData.isPublished,
      })
      setShowSaveSuccessModal(true)
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar perfil.")
    } finally {
      setSavingProfile(false)
    }
  }

  const validateProfile = () => {
    const errors: string[] = []
    const missingFieldNames: string[] = []

    if (!formData.displayName) {
      errors.push("displayName")
      missingFieldNames.push("Nome Completo")
    }
    if (formData.specialties.length === 0) {
      errors.push("specialties")
      missingFieldNames.push("Especialidades")
    }
    if (!formData.description) {
      errors.push("description")
      missingFieldNames.push("Descrição")
    }
    if (!formData.city) {
      errors.push("city")
      missingFieldNames.push("Cidade")
    }
    if (!formData.state) {
      errors.push("state")
      missingFieldNames.push("Estado")
    }

    setValidationErrors(errors)

    if (errors.length > 0) {
      setErrorMsg(`Para publicar, preencha: ${missingFieldNames.join(", ")}`)
      return false
    }

    return true
  }

  const handlePublishToggle = async (checked: boolean) => {
    // If trying to publish (toggle ON), validate first
    if (checked) {
      if (!validateProfile()) {
        // Validation failed, do not update state
        return
      }
    }

    // Update state and save
    setFormData(prev => ({ ...prev, isPublished: checked }))

    try {
      setSavingProfile(true)
      await updateProfile({
        isPublished: checked
      })

      if (checked) {
        setShowPublishModal(true)
      } else {
        setSuccessMsg("Perfil ocultado.")
      }

    } catch (err: any) {
      setErrorMsg("Erro ao atualizar status do perfil.")
      // Revert in case of error
      setFormData(prev => ({ ...prev, isPublished: !checked }))
    } finally {
      setSavingProfile(false)
    }
  }

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => {
      const exists = prev.specialties.includes(specialty)
      if (exists) {
        return { ...prev, specialties: prev.specialties.filter(s => s !== specialty) }
      } else {
        return { ...prev, specialties: [...prev.specialties, specialty] }
      }
    })
  }

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== specialty) }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userProfile?.id) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMsg("Por favor, selecione um arquivo de imagem.")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("A imagem deve ter no máximo 5MB.")
      return
    }

    setUploadingAvatar(true)
    setErrorMsg("")

    try {
      // Create a preview and base64 using FileReader
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        setAvatarPreview(base64)
        setFormData(prev => ({ ...prev, avatarUrl: base64 }))

        // Auto-save to database
        try {
          await apiClient.put(`/profiles/${userProfile.id}`, { avatarUrl: base64 })
          setSuccessMsg("Foto de perfil atualizada!")
        } catch (err: any) {
          console.error("[perfil] Error saving avatar:", err)
          setErrorMsg("Erro ao salvar foto de perfil.")
        } finally {
          setUploadingAvatar(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setErrorMsg("Erro ao processar imagem.")
      setUploadingAvatar(false)
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Meu Perfil</h1>
              <p className="text-muted-foreground mt-2">Gerencie suas informações, portfólio e agenda</p>
            </div>

            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
              <div className="flex flex-col">
                <span className="font-medium text-sm">Visibilidade do Perfil</span>
                <span className="text-xs text-muted-foreground">
                  {formData.isPublished ? "Público e visível na busca" : "Privado, visível apenas para você"}
                </span>
              </div>
              <Switch
                checked={formData.isPublished}
                onCheckedChange={handlePublishToggle}
              />
            </div>
          </div>

          {(successMsg || errorMsg) && (
            <div className="mb-4">
              {successMsg && (
                <Alert className="bg-green-50 border-green-200 text-green-800 animate-in fade-in duration-500">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
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
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4 mb-6">
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <label
                          htmlFor="avatar-upload"
                          className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                        >
                          {uploadingAvatar ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 text-primary-foreground" />
                          )}
                        </label>
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">Foto de Perfil</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Nome Completo *</Label>
                        <Input
                          id="displayName"
                          value={formData.displayName}
                          onChange={(e) => {
                            setFormData({ ...formData, displayName: e.target.value })
                            if (validationErrors.includes("displayName")) {
                              setValidationErrors(prev => prev.filter(f => f !== "displayName"))
                            }
                          }}
                          className={cn(validationErrors.includes("displayName") && "border-destructive focus-visible:ring-destructive")}
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
                      <Label className={cn(validationErrors.includes("specialties") && "text-destructive")}>Especialidades (Selecione quantas precisar) *</Label>
                      <div className={cn(
                        "flex flex-wrap gap-2 mb-2 p-2 min-h-[40px] border rounded-md bg-background",
                        validationErrors.includes("specialties") && "border-destructive ring-1 ring-destructive"
                      )}>
                        {formData.specialties.length === 0 && <span className="text-muted-foreground text-sm self-center px-1">Nenhuma selecionada</span>}
                        {formData.specialties.map(spec => (
                          <Badge key={spec} variant="secondary" className="flex items-center gap-1">
                            {spec}
                            <button type="button" onClick={() => removeSpecialty(spec)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="border rounded-md max-h-[200px] overflow-y-auto p-1">
                        {availableSpecialties.map(spec => {
                          const isSelected = formData.specialties.includes(spec.name)
                          return (
                            <div
                              key={spec.id}
                              onClick={() => toggleSpecialty(spec.name)}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-sm cursor-pointer hover:bg-accent text-sm",
                                isSelected && "bg-accent/50"
                              )}
                            >
                              <div className={cn("w-4 h-4 border rounded flex items-center justify-center", isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                              {spec.name}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição / Bio *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value })
                          if (validationErrors.includes("description")) {
                            setValidationErrors(prev => prev.filter(f => f !== "description"))
                          }
                        }}
                        placeholder="Fale sobre seus serviços, equipamentos e experiência..."
                        rows={5}
                        className={cn(validationErrors.includes("description") && "border-destructive focus-visible:ring-destructive")}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => {
                            setFormData({ ...formData, city: e.target.value })
                            if (validationErrors.includes("city")) {
                              setValidationErrors(prev => prev.filter(f => f !== "city"))
                            }
                          }}
                          className={cn(validationErrors.includes("city") && "border-destructive focus-visible:ring-destructive")}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado *</Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) => {
                            setFormData({ ...formData, state: value })
                            if (validationErrors.includes("state")) {
                              setValidationErrors(prev => prev.filter(f => f !== "state"))
                            }
                          }}
                        >
                          <SelectTrigger className={cn(validationErrors.includes("state") && "border-destructive focus:ring-destructive")}>
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

          <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Perfil Publicado com Sucesso!
                </DialogTitle>
                <DialogDescription className="pt-2">
                  Seu perfil agora está visível para todos os usuários na busca de profissionais.
                  <br /><br />
                  Você pode ocultá-lo a qualquer momento usando o botão de visibilidade no topo da página.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setShowPublishModal(false)}>
                  Entendi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showSaveSuccessModal} onOpenChange={setShowSaveSuccessModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Dados Salvos com Sucesso!
                </DialogTitle>
                <DialogDescription className="pt-2">
                  Suas alterações no perfil foram salvas com sucesso.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setShowSaveSuccessModal(false)}>
                  Ok, entendi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <Footer />
    </div>
  )
}
