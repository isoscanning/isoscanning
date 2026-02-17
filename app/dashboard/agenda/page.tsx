"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AvailabilityManager } from "../perfil/components/availability-manager";
import {
  fetchAvailability,
  createAvailability,
  deleteAvailability,
  deleteAvailabilities,
  type AvailabilitySlot
} from "@/lib/data-service";
import { format } from "date-fns";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function AgendaPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();

  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // State copied from PerfilPage
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [lastClickedDate, setLastClickedDate] = useState<Date | null>(null);
  const [selectedSlotsToDelete, setSelectedSlotsToDelete] = useState<string[]>([]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [newSlot, setNewSlot] = useState({
    startTime: "09:00",
    endTime: "18:00"
  });
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (userProfile?.id) {
      loadAvailability();
    }
  }, [userProfile]);

  // Success message timeout management
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const loadAvailability = async () => {
    if (!userProfile?.id) return;
    setLoadingAvailability(true);
    try {
      const slots = await fetchAvailability(userProfile.id);
      setAvailabilitySlots(slots);
    } catch (error) {
      console.error("Error loading availability", error);
      setErrorMsg("Erro ao carregar disponibilidade.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleAddAvailability = async () => {
    if (!userProfile?.id || selectedDates.length === 0) {
      setErrorMsg("Selecione pelo menos uma data.");
      return;
    }

    try {
      setLoadingAvailability(true);
      const dates = selectedDates.map(date => format(date, "yyyy-MM-dd"));

      await createAvailability({
        dates,
        startTime: isAllDay ? undefined : newSlot.startTime,
        endTime: isAllDay ? undefined : newSlot.endTime,
        isAllDay,
        professionalId: userProfile.id
      });

      await loadAvailability();
      setSelectedDates([]);
      setLastClickedDate(null);
      setSuccessMsg(`${dates.length} disponibilidade(s) adicionada(s)!`);
    } catch (err: any) {
      setErrorMsg("Erro ao adicionar disponibilidade.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedDates([]);
      setLastClickedDate(null);
      return;
    }
    setSelectedDates(dates);
  };

  const handleDayClick = (day: Date, modifiers: any, e: React.MouseEvent) => {
    if (modifiers.disabled) return;

    if (e.shiftKey && lastClickedDate) {
      const start = lastClickedDate < day ? lastClickedDate : day;
      const end = lastClickedDate < day ? day : start === day ? lastClickedDate : day;

      const dateRange: Date[] = [];
      const current = new Date(start);
      while (current <= end) {
        dateRange.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      const newSelectedDates = [...selectedDates];
      dateRange.forEach(date => {
        const exists = newSelectedDates.some(
          selected => selected.toDateString() === date.toDateString()
        );
        if (!exists) {
          newSelectedDates.push(date);
        }
      });

      setSelectedDates(newSelectedDates);
    } else {
      const isAlreadySelected = selectedDates.some(
        selected => selected.toDateString() === day.toDateString()
      );

      if (isAlreadySelected) {
        setSelectedDates(selectedDates.filter(
          selected => selected.toDateString() !== day.toDateString()
        ));
      } else {
        setSelectedDates([...selectedDates, day]);
      }
    }

    setLastClickedDate(day);
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      setLoadingAvailability(true);
      await deleteAvailability(id);
      await loadAvailability();
      setSelectedSlotsToDelete(prev => prev.filter(slotId => slotId !== id));
    } catch (err) {
      setErrorMsg("Erro ao excluir disponibilidade.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlotsToDelete(prev =>
      prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSlotsToDelete.length === availabilitySlots.length) {
      setSelectedSlotsToDelete([]);
    } else {
      setSelectedSlotsToDelete(availabilitySlots.map(slot => slot.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSlotsToDelete.length === 0) return;

    try {
      setDeletingBulk(true);
      setLoadingAvailability(true);
      await deleteAvailabilities(selectedSlotsToDelete);

      await loadAvailability();
      setSelectedSlotsToDelete([]);
      setSuccessMsg(`${selectedSlotsToDelete.length} disponibilidade(s) excluída(s)!`);
    } catch (err) {
      setErrorMsg("Erro ao excluir disponibilidades.");
    } finally {
      setDeletingBulk(false);
      setLoadingAvailability(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-5xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Minha Agenda</h1>
            <p className="text-muted-foreground">Gerencie seus horários e datas disponíveis para contratação.</p>
          </div>
        </div>

        <ScrollReveal>
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            {errorMsg && (
              <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20">
                {successMsg}
              </div>
            )}

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
          </div>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
}
