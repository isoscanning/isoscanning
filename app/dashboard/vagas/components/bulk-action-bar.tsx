"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Loader2,
    PlayCircle,
    Pause,
    CheckCircle2,
    Trash2
} from "lucide-react";

interface BulkActionBarProps {
    selectedIds: string[];
    isProcessing: boolean;
    hasOpenJobs: boolean;
    hasNonOpenJobs: boolean;
    hasNonClosedJobs: boolean;
    onAction: (action: 'conclude' | 'pause' | 'delete' | 'open') => void;
    onCancel: () => void;
}

export function BulkActionBar({
    selectedIds,
    isProcessing,
    hasOpenJobs,
    hasNonOpenJobs,
    hasNonClosedJobs,
    onAction,
    onCancel
}: BulkActionBarProps) {
    if (selectedIds.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-2 right-2 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-50 md:w-auto md:min-w-[500px] md:max-w-2xl"
            >
                <Card className="bg-foreground text-background shadow-2xl border-none">
                    <CardContent className="p-3 md:p-4">
                        {/* Mobile: Stack layout */}
                        <div className="flex flex-col gap-3 md:hidden">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">
                                    {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCancel}
                                    className="text-background/70 hover:text-background hover:bg-background/10 h-7 text-xs"
                                >
                                    Cancelar
                                </Button>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                {hasNonOpenJobs && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onAction('open')}
                                        disabled={isProcessing}
                                        className="h-8 text-xs px-2"
                                    >
                                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3 mr-1" />}
                                        Reativar
                                    </Button>
                                )}
                                {hasOpenJobs && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onAction('pause')}
                                        disabled={isProcessing}
                                        className="h-8 text-xs px-2"
                                    >
                                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3 mr-1" />}
                                        Pausar
                                    </Button>
                                )}
                                {hasNonClosedJobs && (
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-2 border-none"
                                        onClick={() => onAction('conclude')}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                        Concluir
                                    </Button>
                                )}
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    onClick={() => onAction('delete')}
                                    disabled={isProcessing}
                                    className="h-8 w-8"
                                >
                                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                </Button>
                            </div>
                        </div>

                        {/* Desktop: Row layout */}
                        <div className="hidden md:flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <span className="font-medium text-base whitespace-nowrap">
                                    {selectedIds.length} {selectedIds.length > 1 ? 'itens selecionados' : 'item selecionado'}
                                </span>
                                <div className="h-4 w-px bg-background/20" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCancel}
                                    className="text-background/70 hover:text-background hover:bg-background/10 h-8"
                                >
                                    Cancelar
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                {hasNonOpenJobs && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onAction('open')}
                                        disabled={isProcessing}
                                        className="h-9"
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                                        Reativar
                                    </Button>
                                )}
                                {hasOpenJobs && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onAction('pause')}
                                        disabled={isProcessing}
                                        className="h-9"
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
                                        Pausar
                                    </Button>
                                )}
                                {hasNonClosedJobs && (
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white h-9 border-none"
                                        onClick={() => onAction('conclude')}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                        Concluir
                                    </Button>
                                )}
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    onClick={() => onAction('delete')}
                                    disabled={isProcessing}
                                    className="h-9 w-9"
                                >
                                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
