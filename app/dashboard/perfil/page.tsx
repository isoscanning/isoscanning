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
import { AlertCircle, CheckCircle2, Trash2, Plus, Calendar as CalendarIcon, Upload, ImageIcon, Eye, EyeOff, X, Globe, Camera, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
  uploadPortfolioItemImage,
  fetchAvailability,
  createAvailability,
  deleteAvailability,
  deleteAvailabilities,
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
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null)
  const [portfolioPreview, setPortfolioPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Availability State
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [lastClickedDate, setLastClickedDate] = useState<Date | null>(null)
  const [selectedSlotsToDelete, setSelectedSlotsToDelete] = useState<string[]>([]) // For bulk deletion
  const [isAllDay, setIsAllDay] = useState(false)
  const [newSlot, setNewSlot] = useState({
    startTime: "09:00",
    endTime: "18:00"
  })

  // Loading States and Modals
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false) // Specific loader for bulk delete
  const [savingProfile, setSavingProfile] = useState(false)
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Country Selector State
  interface Country {
    name: { common: string };
    flags: { svg: string };
    idd: { root: string; suffixes: string[] };
    cca2: string;
    flag: string; // Emoji
  }
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountryCode, setSelectedCountryCode] = useState("+55")

  useEffect(() => {
    // Fetch countries
    fetch("https://restcountries.com/v3.1/all?fields=name,flags,idd,cca2,flag")
      .then(res => res.json())
      .then((data: Country[]) => {
        // Filter out countries without IDD
        const validCountries = data
          .filter(c => c.idd?.root);

        // Remove duplicates by calling code
        // We prefer specific countries if possible, but for now just taking the first one is simpler
        // or sorting by population/relevance if we had that data.
        // Let's at least prefer the exact formatted calling code.

        const uniqueDialCodes = new Map();

        validCountries.forEach(country => {
          const code = `${country.idd.root}${country.idd.suffixes?.[0] || ''}`;
          if (!uniqueDialCodes.has(code)) {
            uniqueDialCodes.set(code, country);
          } else {
            // Optional: If we want to prioritize certain countries for shared codes
            // e.g., US for +1 instead of CA/others, or AU for +61
            // For now, let's look for "specific" codes.
            // Actually, +1 is shared by US and CA. RestCountries returns +1 for US and +1 for CA.
            // Ideally we want both? No, the selector is just for the prefix.
            // If we want to show multiple countries with same prefix, we MUST use a unique value for SelectItem
            // but we are using the prefix as the value.
            // So we MUST dedup by prefix.

            // Hardcoded preferences for common shared codes
            const current = uniqueDialCodes.get(code);
            if (code === "+1" && country.cca2 === "US") uniqueDialCodes.set(code, country);
            else if (code === "+7" && country.cca2 === "RU") uniqueDialCodes.set(code, country);
            else if (code === "+44" && country.cca2 === "GB") uniqueDialCodes.set(code, country);
            else if (code === "+61" && country.cca2 === "AU") uniqueDialCodes.set(code, country);
            // Keep existing otherwise
          }
        });

        const dedupedCountries = Array.from(uniqueDialCodes.values())
          .sort((a, b) => {
            // Brazil first
            if (a.cca2 === "BR") return -1;
            if (b.cca2 === "BR") return 1;
            // Then ascending by code
            const codeA = Number.parseInt(`${a.idd.root}${a.idd.suffixes?.[0] || ''}`.replace('+', ''));
            const codeB = Number.parseInt(`${b.idd.root}${b.idd.suffixes?.[0] || ''}`.replace('+', ''));
            return codeA - codeB;
          });

        setCountries(dedupedCountries);
      })
      .catch(err => console.error("Error fetching countries:", err));
  }, []);

  // Initialize selectedCountryCode from profile or default
  useEffect(() => {
    if (formData.phone) {
      // Simple check: if starts with +, try to extract code
      // This is tricky because codes have variable length.
      // Heuristic: If starts with +55, it's Brazil.
      // If not, maybe use default +55 and treat whole string as number?
      // Or try to match against loaded countries?
      if (formData.phone.startsWith("+")) {
        // Try to find matching code
        const match = countries.find(c => {
          const code = `${c.idd.root}${c.idd.suffixes?.[0] || ''}`;
          return formData.phone.startsWith(code + " "); // Expect space separator
        });
        if (match) {
          const code = `${match.idd.root}${match.idd.suffixes?.[0] || ''}`;
          setSelectedCountryCode(code);
        }
      }
    }
  }, [formData.phone, countries]);

  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const [hasFetchedProfile, setHasFetchedProfile] = useState(false)

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

    if (userProfile && !hasFetchedProfile) {
      // Fetch fresh profile data from API only ONCE on mount
      const fetchFreshProfile = async () => {
        try {
          console.log("[perfil] Fetching initial fresh profile for user:", userProfile.id)
          const response = await apiClient.get(`/profiles/${userProfile.id}`)
          const freshProfile = response.data
          console.log("[perfil] Fresh profile data received:", freshProfile)


          let initialPhone = freshProfile.phone || "";
          let codeToSet = "+55"; // Default if nothing found

          if (freshProfile.phoneCountryCode) {
            // Case 1: Database has separate code (New / Migrated)
            codeToSet = freshProfile.phoneCountryCode;

            // Cleanup: remove code from phone body if present
            const rawCode = codeToSet.replace(/\D/g, '');
            if (initialPhone.startsWith(codeToSet)) {
              initialPhone = initialPhone.substring(codeToSet.length);
            } else if (initialPhone.startsWith(rawCode)) {
              initialPhone = initialPhone.substring(rawCode.length);
            }
          } else if (initialPhone && initialPhone.startsWith("+")) {
            // Case 2: Legacy data (Code inside Phone)
            // Try to extract known code or default to Brazil if starts with +55
            if (initialPhone.startsWith("+55")) {
              codeToSet = "+55";
              initialPhone = initialPhone.substring(3);
            } else {
              // Try to match other codes? For now let's stick to simple logic
              // or just leave it as is.
              // If we can't guess, we default to +55 but user sees weird number.
              // Let's at least try to match the first 2-3 digits against our list? 
              // Too heavy. Let's assume most are +55.
            }
          }

          setSelectedCountryCode(codeToSet);

          setFormData({
            displayName: freshProfile.displayName || userProfile.displayName || "",
            artisticName: freshProfile.artisticName || "",
            specialties: freshProfile.specialties || [],
            description: freshProfile.description || "",
            city: freshProfile.city || "",
            state: freshProfile.state || "",
            phone: initialPhone, // Use cleaned phone
            portfolioLink: freshProfile.portfolioLink || "",
            instagram: "",
            linkedin: "",
            isPublished: freshProfile.isPublished || false,
            avatarUrl: freshProfile.avatarUrl || userProfile.avatarUrl || "",
          })

          if (freshProfile.avatarUrl) {
            setAvatarPreview(freshProfile.avatarUrl)
          }

          // Load other data based on fresh profile and wait
          await Promise.all([
            loadPortfolio(),
            loadAvailability()
          ])

          setHasFetchedProfile(true)
        } catch (error: any) {
          console.error("[perfil] Error fetching fresh profile:", error?.response?.status, error?.response?.data || error.message)
          // Fallback to cached userProfile data
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


          if (userProfile.avatarUrl) {
            setAvatarPreview(userProfile.avatarUrl)
          }

          await Promise.all([
            loadPortfolio(),
            loadAvailability()
          ])

          setHasFetchedProfile(true)
        } finally {
          setIsInitialLoading(false)
        }
      }
      fetchFreshProfile()
    }
  }, [loading, userProfile, router, hasFetchedProfile])

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

  const loadAvailability = async (preselectDates: boolean = true) => {
    if (!userProfile?.id) return
    setLoadingAvailability(true)
    const slots = await fetchAvailability(userProfile.id)
    setAvailabilitySlots(slots)

    // Only pre-select dates on initial load, not after adding new availabilities
    if (preselectDates) {
      const existingDates = slots.map(slot => new Date(slot.date))
      setSelectedDates(existingDates)
    }

    setLoadingAvailability(false)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")
    setSavingProfile(true)

    try {
      // Clean phone number: remove all non-digits
      let cleanPhone = formData.phone.replace(/\D/g, "");

      // Get numeric country code (e.g., 55 from +55)
      const countryCodeDigits = selectedCountryCode.replace(/\D/g, '');

      // If the clean phone starts with the country code digits, likely the user pasted full number.
      // We want to store ONLY the national number (area code + number).
      // Example: Code +55, Phone 5532999... -> Store 32999...
      if (cleanPhone.startsWith(countryCodeDigits)) {
        cleanPhone = cleanPhone.substring(countryCodeDigits.length);
      }

      // If the user pasted +55..., the \D replaced the +, so we have 55... which is handled above.
      // This ensures we don't double store the country code.

      await updateProfile({
        displayName: formData.displayName,
        artisticName: formData.artisticName,
        specialties: formData.specialties,
        description: formData.description,
        city: formData.city,
        state: formData.state,
        phone: cleanPhone,
        phoneCountryCode: selectedCountryCode,
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

  const validateVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handlePortfolioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('[Portfolio] handlePortfolioFileChange called, file:', file)
    if (!file) return

    setFileError(null)

    // Auto-detect media type from file MIME type
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    console.log('[Portfolio] File type:', file.type, 'isImage:', isImage, 'isVideo:', isVideo)

    if (!isImage && !isVideo) {
      setFileError("Por favor, selecione uma imagem ou vídeo.")
      return
    }

    // Validate based on detected type
    if (isImage) {
      if (file.size > 5 * 1024 * 1024) {
        setFileError("Fotos devem ter no máximo 5MB.")
        return
      }
      console.log('[Portfolio] Setting mediaType to image')
      setNewPortfolioItem(prev => ({ ...prev, mediaType: 'image' }))
    } else if (isVideo) {
      if (file.size > 50 * 1024 * 1024) {
        setFileError("Vídeos devem ter no máximo 50MB.")
        return
      }

      const duration = await validateVideoDuration(file)
      console.log('[Portfolio] Video duration:', duration)
      if (duration > 90) { // 1m30s
        setFileError("Vídeos devem ter no máximo 1 minuto e 30 segundos.")
        return
      }
      console.log('[Portfolio] Setting mediaType to video')
      setNewPortfolioItem(prev => ({ ...prev, mediaType: 'video' }))
    }

    const previewUrl = URL.createObjectURL(file)
    console.log('[Portfolio] Created preview URL:', previewUrl)

    setPortfolioFile(file)
    setPortfolioPreview(previewUrl)

    console.log('[Portfolio] States updated - file set, preview set')
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
    if (!userProfile?.id || !newPortfolioItem.title || !portfolioFile) {
      setErrorMsg("Preencha o título e selecione um arquivo.")
      return
    }

    if (portfolioItems.length >= 9) {
      setErrorMsg("Você já atingiu o limite de 9 itens no portfólio.")
      return
    }

    try {
      setLoadingPortfolio(true)
      setErrorMsg("")

      // Upload file to Supabase Storage
      const mediaUrl = await uploadPortfolioItemImage(portfolioFile, userProfile.id)

      // Create portfolio item with the uploaded URL
      await createPortfolioItem({
        title: newPortfolioItem.title,
        mediaUrl: mediaUrl,
        mediaType: newPortfolioItem.mediaType,
        professionalId: userProfile.id
      })

      await loadPortfolio()

      // Reset form
      setNewPortfolioItem({ title: "", mediaUrl: "", mediaType: "image" })
      setPortfolioFile(null)
      setPortfolioPreview(null)
      setFileError(null)

      setSuccessMsg("Item adicionado ao portfólio!")
    } catch (err: any) {
      console.error("[perfil] Error adding portfolio item:", err)
      setErrorMsg(err.message || "Erro ao adicionar item ao portfólio.")
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
    if (!userProfile?.id || selectedDates.length === 0) {
      setErrorMsg("Selecione pelo menos uma data.")
      return
    }

    try {
      setLoadingAvailability(true)
      const dates = selectedDates.map(date => format(date, "yyyy-MM-dd"))

      await createAvailability({
        dates,
        startTime: isAllDay ? undefined : newSlot.startTime,
        endTime: isAllDay ? undefined : newSlot.endTime,
        isAllDay,
        professionalId: userProfile.id
      })

      // Reload availability without pre-selecting dates to avoid duplication
      await loadAvailability(false)
      setSelectedDates([])
      setLastClickedDate(null)
      setSuccessMsg(`${dates.length} disponibilidade(s) adicionada(s)!`)
    } catch (err: any) {
      setErrorMsg("Erro ao adicionar disponibilidade.")
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Custom handler for date selection with Shift-click support
  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedDates([])
      setLastClickedDate(null)
      return
    }
    setSelectedDates(dates)
  }

  // Handler for individual day clicks with Shift support
  const handleDayClick = (day: Date, modifiers: any, e: React.MouseEvent) => {
    if (modifiers.disabled) return

    // If Shift is pressed and we have a last clicked date
    if (e.shiftKey && lastClickedDate) {
      const start = lastClickedDate < day ? lastClickedDate : day
      const end = lastClickedDate < day ? day : start === day ? lastClickedDate : day

      // Generate all dates in range
      const dateRange: Date[] = []
      const current = new Date(start)
      while (current <= end) {
        dateRange.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }

      // Merge with existing selected dates
      const newSelectedDates = [...selectedDates]
      dateRange.forEach(date => {
        const exists = newSelectedDates.some(
          selected => selected.toDateString() === date.toDateString()
        )
        if (!exists) {
          newSelectedDates.push(date)
        }
      })

      setSelectedDates(newSelectedDates)
    } else {
      // Normal click behavior - toggle selection
      const isAlreadySelected = selectedDates.some(
        selected => selected.toDateString() === day.toDateString()
      )

      if (isAlreadySelected) {
        setSelectedDates(selectedDates.filter(
          selected => selected.toDateString() !== day.toDateString()
        ))
      } else {
        setSelectedDates([...selectedDates, day])
      }
    }

    setLastClickedDate(day)
  }

  const handleDeleteAvailability = async (id: string) => {
    try {
      setLoadingAvailability(true)
      await deleteAvailability(id)
      await loadAvailability(false) // Don't pre-select after delete
      setSelectedSlotsToDelete(prev => prev.filter(slotId => slotId !== id)) // Remove from selection if deleted
    } catch (err) {
      setErrorMsg("Erro ao excluir disponibilidade.")
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Toggle slot selection for bulk deletion
  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlotsToDelete(prev =>
      prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    )
  }

  // Select all slots
  const handleSelectAll = () => {
    if (selectedSlotsToDelete.length === availabilitySlots.length) {
      setSelectedSlotsToDelete([])
    } else {
      setSelectedSlotsToDelete(availabilitySlots.map(slot => slot.id))
    }
  }

  // Bulk delete selected slots
  const handleBulkDelete = async () => {
    if (selectedSlotsToDelete.length === 0) return

    if (!confirm(`Tem certeza que deseja excluir ${selectedSlotsToDelete.length} disponibilidade(s)?`)) {
      return
    }

    try {
      setDeletingBulk(true) // Show loader on button
      setLoadingAvailability(true) // Also set general loading

      // Delete all selected slots using bulk endpoint
      await deleteAvailabilities(selectedSlotsToDelete)

      await loadAvailability(false) // Don't pre-select after delete
      setSelectedSlotsToDelete([])
      setSuccessMsg(`${selectedSlotsToDelete.length} disponibilidade(s) excluída(s)!`)
    } catch (err) {
      setErrorMsg("Erro ao excluir disponibilidades.")
    } finally {
      setDeletingBulk(false)
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

      <main className="flex-1 py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Meu Perfil</h1>
              <p className="text-muted-foreground text-base">Gerencie suas informações, portfólio e agenda</p>
            </div>

            <div className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 shadow-sm",
              formData.isPublished
                ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-300 dark:border-green-700"
                : "bg-muted/30 dark:bg-muted/10 border-border hover:border-muted-foreground/20"
            )}>
              <div className="flex flex-col min-w-[180px]">
                <span className="font-semibold text-sm flex items-center gap-2">
                  {formData.isPublished ? (
                    <><Globe className="h-4 w-4 text-green-600 dark:text-green-400" /> Perfil Público</>
                  ) : (
                    <><EyeOff className="h-4 w-4 text-muted-foreground" /> Perfil Privado</>
                  )}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {formData.isPublished ? "Visível na busca" : "Apenas para você"}
                </span>
              </div>
              <Switch
                checked={formData.isPublished}
                onCheckedChange={handlePublishToggle}
                className="data-[state=checked]:bg-green-600 dark:data-[state=checked]:bg-green-500"
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
            <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 dark:bg-muted/30 p-1">
              <TabsTrigger value="info" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="portfolio" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Portfólio</TabsTrigger>
              <TabsTrigger value="agenda" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Agenda</TabsTrigger>
            </TabsList>

            {/* TAB: INFO */}
            <TabsContent value="info" className="mt-6">
              <form onSubmit={handleProfileSubmit}>
                <Card className="border-2 shadow-sm">
                  <CardHeader className="space-y-1 pb-6">
                    <CardTitle className="text-2xl">Informações Básicas</CardTitle>
                    <CardDescription className="text-base">Seus dados de contato e apresentação</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4 pb-6 border-b">
                      <div className="relative group">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-muted to-muted/50 border-4 border-background shadow-lg overflow-hidden flex items-center justify-center ring-2 ring-border/50">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                        <label
                          htmlFor="avatar-upload"
                          className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          {uploadingAvatar ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Camera className="w-6 h-6 text-white" />
                              <span className="text-xs text-white font-medium">Editar</span>
                            </div>
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
                      <div className="text-center">
                        <p className="font-medium">Foto de Perfil</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Clique para alterar (máx 5MB)</p>
                      </div>
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

                    <div className="space-y-3">
                      <Label className={cn(
                        "text-base font-semibold",
                        validationErrors.includes("specialties") && "text-destructive"
                      )}>Especialidades *</Label>
                      <p className="text-sm text-muted-foreground -mt-1">Selecione suas áreas de atuação</p>

                      {/* Selected Specialties */}
                      <div className={cn(
                        "flex flex-wrap gap-2 p-3 min-h-[56px] border-2 rounded-lg bg-background transition-colors",
                        validationErrors.includes("specialties")
                          ? "border-destructive ring-2 ring-destructive/20"
                          : "border-border hover:border-muted-foreground/30"
                      )}>
                        {formData.specialties.length === 0 && <span className="text-muted-foreground text-sm self-center px-1">Nenhuma especialidade selecionada</span>}
                        {formData.specialties.map(spec => (
                          <Badge key={spec} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
                            {spec}
                            <button type="button" onClick={() => removeSpecialty(spec)} className="hover:text-destructive transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>

                      {/* Available Specialties */}
                      <div className="border-2 rounded-lg max-h-[240px] overflow-y-auto p-2 bg-muted/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {availableSpecialties.map(spec => {
                            const isSelected = formData.specialties.includes(spec.name)
                            return (
                              <div
                                key={spec.id}
                                onClick={() => toggleSpecialty(spec.name)}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all",
                                  "hover:bg-accent hover:shadow-sm",
                                  isSelected && "bg-primary/10 dark:bg-primary/20 border border-primary/30"
                                )}
                              >
                                <div className={cn(
                                  "w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all",
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground scale-110"
                                    : "border-input hover:border-primary/50"
                                )}>
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-sm font-medium">{spec.name}</span>
                              </div>
                            )
                          })}
                        </div>
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
                      <div className="flex gap-2">
                        <Select
                          value={selectedCountryCode}
                          onValueChange={(value) => {
                            setSelectedCountryCode(value)
                            // Do NOT update formData.phone here. Keep them separate.
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="País" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => {
                              const code = `${country.idd.root}${country.idd.suffixes?.[0] || ''}`;
                              return (
                                <SelectItem key={code} value={code}>
                                  <span className="flex items-center gap-2">
                                    <span>{country.flag}</span>
                                    <span>{code}</span>
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => {
                            // Just update the phone field directly
                            setFormData({ ...formData, phone: e.target.value })
                          }}
                          placeholder="00 00000-0000"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selecione o país e digite o número com DDD (ex: 32 99999-9999)
                      </p>
                    </div>

                    {/* Social Media Section - UI Only for now */}
                    <div className="border-t-2 pt-6 mt-2 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">Redes Sociais e Portfólio Externo</h3>
                        <p className="text-sm text-muted-foreground mt-1">Links adicionais para seus trabalhos</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="portfolioLink" className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Site / Portfólio (URL)
                          </Label>
                          <Input
                            id="portfolioLink"
                            value={formData.portfolioLink}
                            onChange={(e) => setFormData({ ...formData, portfolioLink: e.target.value })}
                            placeholder="https://seu-site.com"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="instagram" className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Instagram (URL)
                          </Label>
                          <Input
                            id="instagram"
                            value={formData.instagram}
                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                            placeholder="https://instagram.com/..."
                            className="h-11"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button type="submit" disabled={savingProfile} size="lg" className="min-w-[200px]">
                        {savingProfile ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>

            {/* TAB: PORTFOLIO */}
            <TabsContent value="portfolio" className="mt-6">
              <Card className="border-2 shadow-sm">
                <CardHeader className="space-y-1 pb-6">
                  <CardTitle className="text-2xl">Meu Portfólio</CardTitle>
                  <CardDescription className="text-base">Adicione fotos e vídeos dos seus trabalhos anteriores (máx 9 itens)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add New Item */}
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 dark:from-muted/30 dark:to-muted/10 p-6 rounded-xl space-y-4 border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <Plus className="h-5 w-5 text-primary" /> Adicionar Novo Item
                    </h4>

                    {portfolioItems.length >= 9 && (
                      <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                          Você atingiu o limite de 9 itens no portfólio. Exclua um item para adicionar outro.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={newPortfolioItem.title}
                          onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                          placeholder="Ex: Casamento na Praia"
                          disabled={portfolioItems.length >= 9}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Arquivo (Imagem ou Vídeo)</Label>
                        <div className="flex flex-col gap-2">
                          <Input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handlePortfolioFileChange}
                            disabled={portfolioItems.length >= 9 || loadingPortfolio}
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-muted-foreground">
                            Imagens: máx 5MB • Vídeos: máx 50MB e 1min30s
                          </p>
                        </div>
                        {fileError && (
                          <p className="text-xs text-destructive">{fileError}</p>
                        )}

                        {portfolioPreview && (
                          <div className="relative rounded-lg overflow-hidden border bg-muted">
                            {newPortfolioItem.mediaType === 'video' ? (
                              <video
                                src={portfolioPreview}
                                controls
                                className="w-full max-h-48 object-contain bg-black"
                              />
                            ) : (
                              <img
                                src={portfolioPreview}
                                alt="Preview"
                                className="w-full max-h-48 object-contain"
                                onError={(e) => {
                                  console.error('[Portfolio] Image preview failed to load')
                                }}
                              />
                            )}
                            <button
                              onClick={() => {
                                setPortfolioFile(null)
                                setPortfolioPreview(null)
                                setFileError(null)
                              }}
                              className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full hover:bg-destructive/90"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleAddPortfolioItem}
                        disabled={loadingPortfolio || !newPortfolioItem.title || !portfolioFile || portfolioItems.length >= 9}
                        className="w-full"
                      >
                        {loadingPortfolio ? "Enviando..." : "Adicionar Item"}
                      </Button>
                    </div>
                  </div>

                  {/* List Items */}
                  <div>
                    <h4 className="font-semibold text-lg mb-4">Seus Trabalhos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {portfolioItems.map((item) => (
                        <div key={item.id} className="group relative rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
                          <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative">
                            {item.mediaType === 'video' ? (
                              <video
                                src={item.mediaUrl}
                                className="w-full h-full object-cover"
                                controls
                              />
                            ) : (
                              <img
                                src={item.mediaUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                              />
                            )}
                            <button
                              onClick={() => handleDeletePortfolioItem(item.id)}
                              className="absolute top-2 right-2 p-2 bg-destructive/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:scale-110 shadow-lg"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="p-4 bg-card">
                            <p className="font-semibold truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground capitalize flex items-center gap-1.5 mt-1">
                              {item.mediaType === 'video' ? (
                                <>
                                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                  Vídeo
                                </>
                              ) : (
                                <>
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                  Imagem
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                      {portfolioItems.length === 0 && !loadingPortfolio && (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">Nenhum item no portfólio.</p>
                          <p className="text-sm">Adicione fotos ou vídeos dos seus trabalhos acima.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: AGENDA */}
            <TabsContent value="agenda" className="mt-6">
              <Card className="border-2 shadow-sm">
                <CardHeader className="space-y-1 pb-6">
                  <CardTitle className="text-2xl">Minha Disponibilidade</CardTitle>
                  <CardDescription className="text-base">Gerencie os dias e horários que você está disponível para serviços</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
                    {/* Calendar Input */}
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <Calendar
                          mode="multiple"
                          selected={selectedDates}
                          onSelect={handleDateSelect}
                          onDayClick={handleDayClick}
                          locale={ptBR}
                          className="rounded-md"
                        />
                      </div>

                      {selectedDates.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {selectedDates.length} data(s) selecionada(s)
                        </p>
                      )}

                      <div className="space-y-3">
                        {/* All Day Toggle */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isAllDay"
                            checked={isAllDay}
                            onChange={(e) => setIsAllDay(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <Label htmlFor="isAllDay" className="cursor-pointer">
                            Dia Inteiro
                          </Label>
                        </div>

                        {/* Time Inputs - hidden when all day */}
                        {!isAllDay && (
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
                          </div>
                        )}

                        <Button
                          className="w-full"
                          onClick={handleAddAvailability}
                          disabled={loadingAvailability || selectedDates.length === 0}
                        >
                          Adicionar Disponibilidade
                        </Button>
                      </div>
                    </div>

                    {/* Slots List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Datas Disponíveis</h4>
                        {availabilitySlots.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAll}
                              className="text-xs"
                            >
                              {selectedSlotsToDelete.length === availabilitySlots.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </Button>
                            {selectedSlotsToDelete.length > 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                disabled={deletingBulk}
                                className="text-xs"
                              >
                                {deletingBulk ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Excluindo...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Excluir ({selectedSlotsToDelete.length})
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {availabilitySlots.length === 0 ? (
                          <p className="text-muted-foreground">Nenhuma disponibilidade cadastrada.</p>
                        ) : (
                          availabilitySlots
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map((slot) => (
                              <div key={slot.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                <Checkbox
                                  checked={selectedSlotsToDelete.includes(slot.id)}
                                  onCheckedChange={() => toggleSlotSelection(slot.id)}
                                />
                                <div className="flex items-center gap-3 flex-1">
                                  <CalendarIcon className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="font-medium">
                                      {format(new Date(slot.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                    </p>
                                    {slot.startTime === "00:00" && slot.endTime === "23:59" ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                        ⭐ Dia Inteiro
                                      </span>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        {slot.startTime} - {slot.endTime}
                                      </p>
                                    )}
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
      </main >

      <Footer />

      {
        isInitialLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse"></div>
              </div>
            </div>
            <p className="mt-4 font-medium text-muted-foreground animate-pulse">
              Carregando seu perfil...
            </p>
          </div>
        )
      }
    </div >
  )
}
