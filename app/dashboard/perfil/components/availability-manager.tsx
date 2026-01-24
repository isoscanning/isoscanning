"use client";

import { Trash2, Calendar as CalendarIcon, Loader2 } from "lucide-react";
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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type AvailabilitySlot } from "@/lib/data-service";

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
    handleSelectAll: () => void;
    selectedSlotsToDelete: string[];
    toggleSlotSelection: (id: string) => void;
    showBulkDeleteConfirm: boolean;
    setShowBulkDeleteConfirm: (val: boolean) => void;
    deletingBulk: boolean;
    handleBulkDelete: () => void;
    handleDeleteAvailability: (id: string) => void;
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
    handleSelectAll,
    selectedSlotsToDelete,
    toggleSlotSelection,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    deletingBulk,
    handleBulkDelete,
    handleDeleteAvailability
}: AvailabilityManagerProps) {
    return (
        <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl">Minha Disponibilidade</CardTitle>
                <CardDescription className="text-base">Gerencie os dias e horários que você está disponível para serviços</CardDescription>
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
                                modifiers={{
                                    available: (date) => availabilitySlots.some(slot =>
                                        slot.date === format(date, 'yyyy-MM-dd')
                                    )
                                }}
                                locale={ptBR}
                                className="rounded-md"
                            />
                        </div>

                        {selectedDates.length > 0 && (
                            <p className="text-sm text-muted-foreground">{selectedDates.length} data(s) selecionada(s)</p>
                        )}

                        <div className="space-y-3">
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
                                onClick={handleAddAvailability}
                                disabled={loadingAvailability || selectedDates.length === 0}
                            >
                                {loadingAvailability ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Adicionar Disponibilidade"}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium">Datas Disponíveis</h4>
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
                            {availabilitySlots.length === 0 ? (
                                <p className="text-muted-foreground italic">Nenhuma disponibilidade cadastrada.</p>
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
                                                        {format(parseISO(slot.date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                    </p>
                                                    {slot.startTime === "00:00" && slot.endTime === "23:59" ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">⭐ Dia Inteiro</span>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                                                    )}
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
