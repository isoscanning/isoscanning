import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { type Professional } from "@/lib/data-service";
import { trackEvent } from "@/lib/analytics";

interface ProfessionalCardProps {
    professional: Professional;
    index: number;
}

export function ProfessionalCard({ professional, index }: ProfessionalCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-2 hover:border-primary/30 overflow-hidden bg-card h-full">
                <CardContent className="p-0">
                    <Link
                        href={`/profissionais/${professional.id}`}
                        onClick={() => trackEvent({
                            action: 'view_professional',
                            category: 'Professional',
                            label: professional.displayName,
                            value: 1
                        })}
                    >
                        {/* Image Area */}
                        <div className="relative h-72 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                            <Avatar className="h-full w-full rounded-none">
                                <AvatarImage
                                    src={professional.avatarUrl || undefined}
                                    alt={professional.displayName}
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary rounded-none h-full w-full flex items-center justify-center">
                                    {professional.displayName?.charAt(0).toUpperCase() || "P"}
                                </AvatarFallback>
                            </Avatar>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Availability Badge */}
                            <div className="absolute top-4 right-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase tracking-wide shadow-lg">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    Disponível
                                </span>
                            </div>

                            {/* View Profile Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <span className="inline-flex items-center gap-2 text-white font-medium">
                                    Ver Perfil Completo
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="mb-3">
                                <h3 className="font-bold text-xl text-foreground mb-1 group-hover:text-primary transition-colors">
                                    {professional.artisticName || professional.displayName}
                                </h3>
                                <p className="text-sm font-medium text-primary">
                                    {professional.specialty || "Profissional"}
                                </p>
                            </div>

                            {professional.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                    {professional.description}
                                </p>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    {professional.city && (
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            {professional.city}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span className="text-sm font-medium text-foreground">5.0</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </CardContent>
            </Card>
        </motion.div>
    );
}
