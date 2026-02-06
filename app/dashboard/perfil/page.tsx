"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, EyeOff, Globe, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format, parseISO } from "date-fns"
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
import { PersonalDataForm } from "./components/personal-data-form"
import { PortfolioGallery } from "./components/portfolio-gallery"
import { AvailabilityManager } from "./components/availability-manager"


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

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

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

    // We no longer pre-select dates automatically as the calendar now has a separate "available" state
    /*
    if (preselectDates) {
      const existingDates = slots.map(slot => new Date(slot.date))
      setSelectedDates(existingDates)
    }
    */

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
      if (file.size > 15 * 1024 * 1024) {
        setFileError("Fotos devem ter no máximo 15MB.")
        return
      }
      console.log('[Portfolio] Setting mediaType to image')
      setNewPortfolioItem(prev => ({ ...prev, mediaType: 'image' }))
    } else if (isVideo) {
      if (file.size > 100 * 1024 * 1024) {
        setFileError("Vídeos devem ter no máximo 100MB.")
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

      // Reload availability and synchronize selected dates to update calendar colors
      await loadAvailability(true)
      setSelectedDates([]) // Clear selection after successful add
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
      await loadAvailability(true) // Synchronize selected dates to update calendar colors
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

    try {
      setDeletingBulk(true) // Show loader on button
      setLoadingAvailability(true) // Also set general loading

      // Delete all selected slots using bulk endpoint
      await deleteAvailabilities(selectedSlotsToDelete)

      await loadAvailability(true) // Synchronize selected dates to update calendar colors
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
                <PersonalDataForm
                  formData={formData}
                  setFormData={setFormData}
                  avatarPreview={avatarPreview}
                  uploadingAvatar={uploadingAvatar}
                  handleAvatarChange={handleAvatarChange}
                  availableSpecialties={availableSpecialties}
                  validationErrors={validationErrors}
                  setValidationErrors={setValidationErrors}
                  removeSpecialty={removeSpecialty}
                  toggleSpecialty={toggleSpecialty}
                  countries={countries}
                  selectedCountryCode={selectedCountryCode}
                  setSelectedCountryCode={setSelectedCountryCode}
                  ESTADOS={ESTADOS}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={savingProfile} size="lg" className="min-w-[200px]">
                    {savingProfile ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB: PORTFOLIO */}
            <TabsContent value="portfolio" className="mt-6">
              <PortfolioGallery
                portfolioItems={portfolioItems}
                loadingPortfolio={loadingPortfolio}
                handleDeletePortfolioItem={handleDeletePortfolioItem}
                newPortfolioItem={newPortfolioItem}
                setNewPortfolioItem={setNewPortfolioItem}
                handlePortfolioFileChange={handlePortfolioFileChange}
                handleAddPortfolioItem={handleAddPortfolioItem}
                portfolioPreview={portfolioPreview}
                fileError={fileError}
              />
            </TabsContent>

            {/* TAB: AGENDA */}
            <TabsContent value="agenda" className="mt-6">
              <AvailabilityManager
                selectedDates={selectedDates}
                handleDateSelect={handleDateSelect}
                handleDayClick={handleDayClick}
                availabilitySlots={availabilitySlots}
                isAllDay={isAllDay}
                setIsAllDay={setIsAllDay}
                newSlot={newSlot}
                setNewSlot={setNewSlot}
                handleAddAvailability={handleAddAvailability}
                loadingAvailability={loadingAvailability}
                handleSelectAll={handleSelectAll}
                selectedSlotsToDelete={selectedSlotsToDelete}
                toggleSlotSelection={toggleSlotSelection}
                showBulkDeleteConfirm={showBulkDeleteConfirm}
                setShowBulkDeleteConfirm={setShowBulkDeleteConfirm}
                deletingBulk={deletingBulk}
                handleBulkDelete={handleBulkDelete}
                handleDeleteAvailability={handleDeleteAvailability}
              />
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
