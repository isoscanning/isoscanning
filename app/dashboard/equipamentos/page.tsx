"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, ImageIcon, MoreHorizontal, Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  fetchUserEquipments,
  deleteEquipment,
  deleteEquipmentImages,
} from "@/lib/data-service";
import { ScrollReveal } from "@/components/scroll-reveal";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Equipment {
  id: string;
  name: string;
  category: string;
  negotiationType: string;
  price?: number;
  isAvailable: boolean;
  imageUrl?: string;
  imageUrls?: string[];
}

export default function MeusEquipamentosPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);

  const fetchEquipments = useCallback(async () => {
    if (!userProfile) return;

    setLoadingEquipments(true);
    try {
      const equipmentsData = await fetchUserEquipments(userProfile.id);
      setEquipments(
        equipmentsData.map((equip) => ({
          id: equip.id,
          name: equip.name,
          category: equip.category,
          negotiationType: equip.negotiationType,
          price: equip.price,
          isAvailable: equip.isAvailable,
          imageUrl: equip.imageUrls?.[0], // simple fallback
          imageUrls: equip.imageUrls,
        }))
      );
    } catch (error) {
      console.error("[v0] Error fetching equipments:", error);
    } finally {
      setLoadingEquipments(false);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }

    if (userProfile) {
      fetchEquipments();
    }
  }, [userProfile, loading, fetchEquipments]);

  const handleDeleteClick = (id: string) => {
    setEquipmentToDelete(id);
  };

  const confirmDelete = async () => {
    if (!equipmentToDelete) return;

    setIsDeleting(true);
    try {
      // Find equipment to get image URLs
      const equipment = equipments.find((e) => e.id === equipmentToDelete);
      if (equipment?.imageUrls && equipment.imageUrls.length > 0) {
        await deleteEquipmentImages(equipment.imageUrls);
      }

      await deleteEquipment(equipmentToDelete);
      setEquipments(equipments.filter((e) => e.id !== equipmentToDelete));
      setEquipmentToDelete(null);
    } catch (error) {
      console.error("[v0] Error deleting equipment:", error);
      alert("Erro ao excluir equipamento");
    } finally {
      setIsDeleting(false);
    }
  };

  const getNegotiationLabel = (type: string) => {
    switch (type) {
      case "sale": return "Venda";
      case "rent": return "Aluguel";
      case "free": return "Gratuito";
      default: return type;
    }
  };

  const getNegotiationColor = (type: string) => {
    switch (type) {
      case "sale": return "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20";
      case "rent": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20";
      case "free": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  if (loading || loadingEquipments) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Carregando seus equipamentos...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">

          {/* Header Section */}
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b">
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                  Meus Equipamentos
                </h1>
                <p className="text-muted-foreground mt-2">
                  Gerencie seu inventário de equipamentos para venda ou aluguel
                </p>
              </div>
              <Link href="/dashboard/equipamentos/novo">
                <Button className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                  <Plus className="h-4 w-4 mr-2" />
                  Anunciar Equipamento
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {equipments.length === 0 ? (
            <ScrollReveal delay={0.2}>
              <Card className="border-2 border-dashed">
                <CardContent className="py-20 text-center flex flex-col items-center">
                  <div className="h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                    <Camera className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Seu catálogo está vazio</h3>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    Você ainda não cadastrou nenhum equipamento. Comece agora para alcançar milhares de profissionais.
                  </p>
                  <Link href="/dashboard/equipamentos/novo">
                    <Button size="lg" className="rounded-full">
                      <Plus className="h-5 w-5 mr-2" />
                      Adicionar Primeiro Equipamento
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipments.map((equip, index) => (
                <ScrollReveal key={equip.id} delay={index * 0.1}>
                  <div className="group relative bg-card rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1">
                    {/* Image Area */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {equip.imageUrls && equip.imageUrls.length > 0 ? (
                        <>
                          <img
                            src={equip.imageUrls[0]}
                            alt={equip.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          {/* Overlay Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {/* Gallery Badge */}
                          {equip.imageUrls.length > 1 && (
                            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              <span>+{equip.imageUrls.length - 1}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-muted">
                          <Package className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}

                      {/* Status Pills */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2 scale-95 group-hover:scale-100 transition-transform">
                        <Badge variant={equip.isAvailable ? "default" : "destructive"}>
                          {equip.isAvailable ? "Disponível" : "Indisponível"}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 p-5 space-y-4 flex flex-col">
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <Badge variant="outline" className={`${getNegotiationColor(equip.negotiationType)} border-0 font-medium`}>
                            {getNegotiationLabel(equip.negotiationType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold pt-1">
                            {equip.category}
                          </span>
                        </div>

                        <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {equip.name}
                        </h3>

                        {equip.price !== undefined && (
                          <p className="text-xl font-bold text-foreground">
                            R$ {equip.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>

                      {/* Actions Footer */}
                      <div className="flex gap-2 pt-4 border-t mt-auto">
                        <Link href={`/dashboard/equipamentos/editar/${equip.id}`} className="flex-1">
                          <Button variant="outline" className="w-full hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors group/edit">
                            <Edit className="h-4 w-4 mr-2 group-hover/edit:text-primary" />
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                          onClick={() => handleDeleteClick(equip.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <AlertDialog open={equipmentToDelete !== null} onOpenChange={(open) => !open && !isDeleting && setEquipmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o equipamento e todas as suas fotos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
