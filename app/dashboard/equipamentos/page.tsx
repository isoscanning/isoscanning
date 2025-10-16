"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import Link from "next/link";
import { fetchUserEquipments, deleteEquipment, deleteEquipmentImages } from "@/lib/data-service";

interface Equipment {
  id: string;
  name: string;
  category: string;
  negotiationType: string;
  price?: number;
  available: boolean;
  imageUrl?: string;
}

export default function MeusEquipamentosPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(true);

  const fetchEquipments = useCallback(async () => {
    if (!user) return;

    setLoadingEquipments(true);
    try {
      const equipmentsData = await fetchUserEquipments(user.uid);
      setEquipments(
        equipmentsData.map((equip) => ({
          id: equip.id,
          name: equip.name,
          category: equip.category,
          negotiationType: equip.negotiationType,
          price: equip.price,
          available: equip.available,
          imageUrl: equip.imageUrl,
        }))
      );
    } catch (error) {
      console.error("[v0] Error fetching equipments:", error);
    } finally {
      setLoadingEquipments(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }

    if (user) {
      fetchEquipments();
    }
  }, [user, loading, fetchEquipments]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;

    try {
      // Find equipment to get image URLs
      const equipment = equipments.find(e => e.id === id);
      if (equipment?.imageUrls && equipment.imageUrls.length > 0) {
        await deleteEquipmentImages(equipment.imageUrls);
      }

      await deleteEquipment(id);
      setEquipments(equipments.filter((e) => e.id !== id));
    } catch (error) {
      console.error("[v0] Error deleting equipment:", error);
      alert("Erro ao excluir equipamento");
    }
  };

  if (loading || loadingEquipments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Meus Equipamentos</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seus equipamentos para venda ou aluguel
              </p>
            </div>
            <Link href="/dashboard/equipamentos/novo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Equipamento
              </Button>
            </Link>
          </div>

          {equipments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não cadastrou nenhum equipamento
                </p>
                <Link href="/dashboard/equipamentos/novo">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Equipamento
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equipments.map((equip) => (
                <Card key={equip.id}>
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {equip.imageUrls && equip.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 h-full">
                        {equip.imageUrls.slice(0, 4).map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`${equip.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ))}
                        {equip.imageUrls.length > 4 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            +{equip.imageUrls.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">
                        {equip.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {equip.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={equip.available ? "default" : "secondary"}
                      >
                        {equip.available ? "Disponível" : "Indisponível"}
                      </Badge>
                      <Badge variant="outline">{equip.negotiationType}</Badge>
                    </div>

                    {equip.price && (
                      <p className="font-bold text-primary">
                        R$ {equip.price.toFixed(2)}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/equipamentos/editar/${equip.id}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(equip.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
