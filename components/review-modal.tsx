"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Star, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-service";
import { toast } from "@/components/ui/use-toast";

interface ReviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    professionalId: string;
    professionalName: string;
    onSuccess: () => void;
}

const QUALITY_OPTIONS = [
    "Pontual",
    "Profissional",
    "Criativo",
    "Técnico",
    "Comunicação",
    "Agil",
    "Equipamento Top",
    "Educado",
    "Flexível",
];

export function ReviewModal({
    open,
    onOpenChange,
    professionalId,
    professionalName,
    onSuccess,
}: ReviewModalProps) {
    const { userProfile } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [qualities, setQualities] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({
                title: "Avaliação necessária",
                description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
                variant: "destructive",
            });
            return;
        }

        if (!userProfile) return;

        setLoading(true);
        try {
            await apiClient.post("/reviews", {
                professionalId,
                clientId: userProfile.id,
                clientName: userProfile.displayName || "Usuário",
                rating,
                comment,
                qualities,
            });

            toast({
                title: "Avaliação enviada!",
                description: "Obrigado por avaliar este profissional.",
            });

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            console.error("Error submitting review:", error);
            const msg = error.response?.data?.message || "Erro ao enviar avaliação.";

            if (msg.includes("already reviewed") || error.response?.status === 409) {
                toast({
                    title: "Já avaliado",
                    description: "Você já enviou uma avaliação para este profissional.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Erro",
                    description: msg,
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setRating(0);
        setComment("");
        setQualities([]);
        setHoverRating(0);
    };

    const handleQualityChange = (value: string[]) => {
        if (value.length > 3) return; // Build-in limit in ToggleGroup? No, we must generic handle it or let Shadcn handle single/multiple.
        // Shadcn ToggleGroup `onValueChange` returns string[] for type="multiple".
        // We limit to 3.
        if (value.length <= 3) {
            setQualities(value);
        } else {
            // If user tries to add 4th, ignore (or remove the oldest? better just ignore)
            // Actually `value` contains the NEW state. If we want to prevent adding, we need to check precise diff.
            // Simple approach: slice to 3. (User experience: selects 4th, it replaces one or doesn't work? Let's keep first 3)
            // Better: Just setQualities(value.slice(0, 3));
            // But this might deselect the one they just clicked if it was appended at end.
            // Let's assume standard behavior is OK, just limit.
            // If I do nothing, it allows more.
            // So:
            // The `value` array has the new selection.
            // If size > 3, I need to figure out which one was added and block it, OR simply take the first 3.
            // If I take first 3, it might seem unresponsive if the user clicks a 4th.
            // A better UX is probably visual feedback or disable remaining options.
            // For now, I will just slice to 3.
            setQualities(value.slice(0, 3));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Avaliar Profissional</DialogTitle>
                    <DialogDescription>
                        Compartilhe sua experiência com {professionalName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-2">
                        <Label>Sua nota</Label>
                        <div
                            className="flex gap-1"
                            onMouseLeave={() => setHoverRating(0)}
                        >
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className="focus:outline-none transition-transform hover:scale-110"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onClick={() => setRating(star)}
                                >
                                    <Star
                                        className={`h-8 w-8 ${star <= (hoverRating || rating)
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-gray-200"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                            {hoverRating || rating ? (hoverRating || rating) + " de 5" : "Selecione"}
                        </span>
                    </div>

                    {/* Qualities */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-semibold">Pontos Fortes</Label>
                            <span className="text-xs text-muted-foreground font-medium">{qualities.length}/3</span>
                        </div>
                        <ToggleGroup
                            type="multiple"
                            variant="outline"
                            value={qualities}
                            onValueChange={handleQualityChange}
                            className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full"
                        >
                            {QUALITY_OPTIONS.map((q) => (
                                <ToggleGroupItem
                                    key={q}
                                    value={q}
                                    className="data-[state=on]:bg-green-100 data-[state=on]:text-green-700 data-[state=on]:border-green-200 text-xs sm:text-sm whitespace-nowrap px-3 py-2 h-auto"
                                    // Disable if 3 selected and this is NOT selected
                                    disabled={qualities.length >= 3 && !qualities.includes(q)}
                                >
                                    {q}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <Label htmlFor="comment">Comentário</Label>
                        <Textarea
                            id="comment"
                            placeholder="Descreva como foi trabalhar com este profissional..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="resize-none min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || rating === 0}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Avaliação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
