"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PortfolioPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [portfolioItems, setPortfolioItems] = useState([
    {
      id: "1",
      title: "Casamento na Praia",
      description: "Ensaio fotográfico de casamento ao pôr do sol",
      images: ["/beach-wedding-photography.jpg"],
      category: "Casamentos",
    },
  ]);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    category: "",
  });

  const handleAddItem = () => {
    if (newItem.title && newItem.description) {
      setPortfolioItems([
        ...portfolioItems,
        {
          id: Date.now().toString(),
          ...newItem,
          images: ["/portfolio-photography.jpg"],
        },
      ]);
      setNewItem({ title: "", description: "", category: "" });
    }
  };

  const handleDeleteItem = (id: string) => {
    setPortfolioItems(portfolioItems.filter((item) => item.id !== id));
  };

  if (!userProfile) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Meu Portfólio</h1>
        <p className="text-muted-foreground">
          Adicione seus melhores trabalhos para atrair mais clientes
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Adicionar novo item */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar ao Portfólio
            </CardTitle>
            <CardDescription>
              Compartilhe seus melhores trabalhos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Trabalho</Label>
              <Input
                id="title"
                placeholder="Ex: Casamento na Praia"
                value={newItem.title}
                onChange={(e) =>
                  setNewItem({ ...newItem, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                placeholder="Ex: Casamentos, Eventos, Retratos"
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o projeto, técnicas utilizadas, etc."
                rows={4}
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Imagens</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para fazer upload ou arraste as imagens
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG até 10MB
                </p>
              </div>
            </div>

            <Button onClick={handleAddItem} className="w-full">
              Adicionar ao Portfólio
            </Button>
          </CardContent>
        </Card>

        {/* Lista de itens do portfólio */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Trabalhos Publicados</h2>
          {portfolioItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum trabalho adicionado ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            portfolioItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={item.images[0] || "/placeholder.svg"}
                      alt={item.title}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.category}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
