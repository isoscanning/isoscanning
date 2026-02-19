"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export interface TourStep {
    target: string; // CSS selector of the target element
    title: string;
    description: string;
}

interface OnboardingTourProps {
    steps: TourStep[];
    onComplete: () => void;
    onSkip: () => void;
}

export function OnboardingTour({ steps, onComplete, onSkip }: OnboardingTourProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const currentStep = steps[currentStepIndex];

    useEffect(() => {
        // This effect handles finding the target element and updating its position
        // whenever the step changes or window resizes.
        const updateTargetPosition = () => {
            if (!currentStep) return;

            const element = document.querySelector(currentStep.target);
            if (element) {
                // Scroll to the element smoothly
                element.scrollIntoView({ behavior: "smooth", block: "center" });

                // Get position but delay slightly to allow scroll to settle (or use interval if needed)
                // Using requestAnimationFrame for better timing or a small timeout
                setTimeout(() => {
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);
                }, 500);
            } else {
                // If element not found, maybe skip this step or target center of screen?
                // Fallback to center if target is invalid/missing
                setTargetRect(null);
            }
        };

        updateTargetPosition();
        window.addEventListener("resize", updateTargetPosition);
        return () => window.removeEventListener("resize", updateTargetPosition);
    }, [currentStepIndex, currentStep, steps]);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    // Determine popover position based on target rect
    // Simple logic: prefer right, then bottom, then left, then top.
    // Or simpler: fixed overlay with centered card if no target, 
    // and card near target if target exists.

    const getPopoverStyle = () => {
        if (!targetRect) {
            // Center screen if no target (e.g., welcome step aimed at nothing specific?)
            return {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        // Basic heuristic: try to place to the right if space permits, else bottom
        // Padding from target
        const padding = 20;
        const popoverWidth = 320; // Approx max width
        const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1000;

        // Default: Bottom centered
        let top = targetRect.bottom + padding + window.scrollY; // Absolute from top of doc? 
        // Wait, fixed position is easier for overlay.
        // targetRect is relative to viewport.

        // Let's use Fixed positioning
        let finalTop = targetRect.bottom + padding;
        let finalLeft = targetRect.left + (targetRect.width / 2) - (popoverWidth / 2);

        // Adjust if off screen
        if (finalLeft < 20) finalLeft = 20;
        if (finalLeft + popoverWidth > windowWidth - 20) finalLeft = windowWidth - popoverWidth - 20;
        if (finalTop + 200 > window.innerHeight) {
            // Flip to top if not enough space below
            finalTop = targetRect.top - padding - 200; // approximation
        }

        return {
            top: finalTop,
            left: finalLeft,
            position: "fixed" as const,
        };
    };

    return (
        <>
            {/* Searchlight Overlay */}
            <div className="fixed inset-0 z-50 pointer-events-none">
                {/* We use a path to create a hole in the overlay */}
                {/* This is complex to implement robustly with just CSS/Divs. 
             Easier alternative: use a semi-transparent border on a massive div around the target? 
             Or SVG mask? SVG mask is best. 
         */}
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <mask id="tour-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (
                                <rect
                                    x={targetRect.left - 5}
                                    y={targetRect.top - 5}
                                    width={targetRect.width + 10}
                                    height={targetRect.height + 10}
                                    fill="black"
                                    rx="8"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.7)"
                        mask="url(#tour-mask)"
                        style={{ pointerEvents: 'auto' }} // Blocks clicks outside
                    />
                </svg>
            </div>

            {/* Popover Card */}
            <div
                className="fixed z-50 w-full max-w-sm"
                style={getPopoverStyle()}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStepIndex}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className="shadow-2xl border-primary/20">
                            <div className="absolute top-2 right-2">
                                <Button variant="ghost" size="icon" onClick={onSkip} className="h-6 w-6 rounded-full hover:bg-muted">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl text-primary">{currentStep?.title}</CardTitle>
                                <CardDescription className="text-sm">
                                    Passo {currentStepIndex + 1} de {steps.length}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                    {currentStep?.description}
                                </p>
                            </CardContent>
                            <CardFooter className="flex justify-between pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrev}
                                    disabled={currentStepIndex === 0}
                                >
                                    <ArrowLeft className="mr-2 h-3 w-3" />
                                    Voltar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleNext}
                                >
                                    {currentStepIndex === steps.length - 1 ? "Concluir" : "Próximo"}
                                    {currentStepIndex !== steps.length - 1 && <ArrowRight className="ml-2 h-3 w-3" />}
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>
        </>
    );
}
