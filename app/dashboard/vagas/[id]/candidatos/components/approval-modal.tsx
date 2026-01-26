"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, DollarSign } from "lucide-react";

interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: number) => void;
    candidateName: string;
    initialValue: number;
}

export function ApprovalModal({
    isOpen,
    onClose,
    onConfirm,
    candidateName,
    initialValue,
}: ApprovalModalProps) {
    const [value, setValue] = useState(initialValue.toString());

    useEffect(() => {
        setValue(initialValue.toString());
    }, [initialValue, isOpen]);

    const handleConfirm = () => {
        const numValue = parseFloat(value.replace(",", "."));
        if (!isNaN(numValue) && numValue >= 0) {
            onConfirm(numValue);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirmar Aprovação</DialogTitle>
                    <DialogDescription>
                        Defina o valor final acordado para a contratação de <strong>{candidateName}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="value" className="text-right">
                            Valor (R$)
                        </Label>
                        <div className="col-span-3 relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="value"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="pl-9"
                                type="number"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700">
                        <Check className="mr-2 h-4 w-4" />
                        Confirmar e Aprovar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
