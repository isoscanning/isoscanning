"use client";

import { Trash2, Calendar as CalendarIcon, Loader2, Ban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
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
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type AvailabilitySlot } from "@/lib/data-service";
import { describeSlot, isAllDaySlot, parseDateKey, toDateKey } from "@/lib/availability";

interface AvailabilityManagerProps {
    selectedDates: Date[];
    handleDateSelect: (dates: Date[] | undefined) => void;
    handleDayClick: (day: Date, modifiers: any, e: React.MouseEvent) => void;
    availabilitySlots: AvailabilitySlot[];
    isAllDay: boolean;
    setIsAllDay: (val: boolean) => void;
    newSlot: { startTime: string; endTime: string };
    setNewSlot: (slot: any) => void;
    handleAddAvailability: () => void;
    loadingAvailability: boolean;
    fetchingAvailability: boolean;
    handleSelectAll: () => void;
    selectedSlotsToDelete: string[];
    toggleSlotSelection: (id: string) => void;
    showBulkDeleteConfirm: boolean;
    setShowBulkDeleteConfirm: (val: boolean) => void;
    deletingBulk: boolean;
    handleBulkDelete: () => void;
    handleDeleteAvailability: (id: string) => void;
    /**
     * Tipo do slot a criar. Opcional: a tela de perfil só cadastra
     * disponibilidade; a agenda completa também registra bloqueios manuais
     * (folga, viagem) que fecham a data no perfil público.
     */
    slotType?: "available" | "blocked";
    setSlotType?: (type: "available" | "blocked") => void;
    /** Texto do cabeçalho — a agenda completa usa outro título. */
    title?: string;
    description?: string;
}

export function AvailabilityManager({
    selectedDates,
    handleDateSelect,
    handleDayClick,
    availabilitySlots,
    isAllDay,
    setIsAllDay,
    newSlot,
    setNewSlot,
    handleAddAvailability,
    loadingAvailability,
    fetchingAvailability,
    handleSelectAll,
    selectedSlotsToDelete,
    toggleSlotSelection,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    deletingBulk,
    handleBulkDelete,
    handleDeleteAvailability,
    slotType = "available",
    setSlotType,
    title = "Minha Disponibilidade",
    description = "Gerencie os dias e horários que você está disponível para serviços",
}: AvailabilityManagerProps) {
    const isBlocking = slotType === "blocked";
    return (
        <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription className="text-base">{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
                    <div className="space-y-4">
                        <div className="border rounded-md p-4 bg-background">
                            <Calendar
                                mode="multiple"
                                selected={selectedDates}
                                onSelect={handleDateSelect}
                                onDayClick={handleDayClick}
                                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                                startMonth={new Date()}
                                modifiers={{
                                    available: (date) => availabilitySlots.some(slot =>
                                        slot.type !== "blocked" && slot.date && slot.date.slice(0, 10) === toDateKey(date)
                                    ),
                                    blocked: (date) => availabilitySlots.some(slot =>
                                        slot.type === "blocked" && slot.date && slot.date.slice(0, 10) === toDateKey(date)
                                    ),
                                }}
                                locale={ptBR}
                                className="rounded-md"
                            />
                        </div>

                        {selectedDates.length > 0 && (
                            <p className="text-sm text-muted-foreground">{selectedDates.length} data(s) selecionada(s)</p>
                        )}

                        <div className="space-y-3">
                            {setSlotType && (
                                <div className="grid grid-cols-2 gap-2 rounded-lg border p-1 bg-muted/40">
                                    <button
                                        type="button"
                                        onClick={() => setSlotType("available")}
                                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${!isBlocking ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        Disponível
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSlotType("blocked")}
                                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isBlocking ? "bg-background shadow-sm text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        Bloquear
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="isAllDay"
                                    checked={isAllDay}
                                    onCheckedChange={(checked) => setIsAllDay(!!checked)}
                                />
                                <Label htmlFor="isAllDay" className="cursor-pointer">Dia Inteiro</Label>
                            </div>

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
                                variant={isBlocking ? "destructive" : "default"}
                                onClick={handleAddAvailability}
                                disabled={loadingAvailability || selectedDates.length === 0}
                            >
                                {loadingAvailability
                                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    : isBlocking ? "Bloquear datas" : "Adicionar Disponibilidade"}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium">{setSlotType ? "Datas marcadas" : "Datas Disponíveis"}</h4>
                            {availabilitySlots.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">
                                        {selectedSlotsToDelete.length === availabilitySlots.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </Button>
                                    {selectedSlotsToDelete.length > 0 && (
                                        <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" disabled={deletingBulk} className="text-xs">
                                                    {deletingBulk ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                                                    Excluir ({selectedSlotsToDelete.length})
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Deseja excluir as {selectedSlotsToDelete.length} disponibilidades selecionadas?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                                                        Excluir
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                            {fetchingAvailability ? (
                                <div className="flex items-center gap-2 text-muted-foreground py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm italic">Carregando...</span>
                                </div>
                            ) : availabilitySlots.length === 0 ? (
                                <p className="text-muted-foreground italic">Nenhuma disponibilidade cadastrada.</p>
                            ) : (
                                [...availabilitySlots]
                                    .sort((a, b) => a.date.localeCompare(b.date))
                                    .map((slot) => (
                                        <div key={slot.id} className={`flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors ${slot.type === "blocked" ? "border-destructive/30" : ""}`}>
                                            <Checkbox
                                                checked={selectedSlotsToDelete.includes(slot.id)}
                                                onCheckedChange={() => toggleSlotSelection(slot.id)}
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                                {slot.type === "blocked"
                                                    ? <Ban className="h-5 w-5 text-destructive" />
                                                    : <CalendarIcon className="h-5 w-5 text-primary" />}
                                                <div>
                                                    <p className="font-medium">
                                                        {format(parseDateKey(slot.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {slot.type === "blocked" && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Bloqueado</span>
                                                        )}
                                                        {isAllDaySlot(slot) ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">⭐ Dia Inteiro</span>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">{describeSlot(slot)}</p>
                                                        )}
                                                        {slot.reason && slot.reason !== "Dia inteiro" && (
                                                            <span className="text-xs text-muted-foreground">· {slot.reason}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteAvailability(slot.id)}>
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
    );
}
