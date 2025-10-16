"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, TrendingUp, Users, Award } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AvaliacoesPage() {
  const { user } = useAuth()
  const router = useRouter()

  const reviews = [
    {
      id: "1",
      clientName: "Maria Silva",
      rating: 5,
      comment: "Excelente profissional! Superou todas as expectativas no casamento.",
      service: "Fotografia de Casamento",
      date: "2024-01-15",
    },
    {
      id: "2",
      clientName: "João Santos",
      rating: 5,
      comment: "Muito atencioso e criativo. As fotos ficaram incríveis!",
      service: "Ensaio Fotográfico",
      date: "2024-01-10",
    },
    {
      id: "3",
      clientName: "Ana Costa",
      rating: 4,
      comment: "Ótimo trabalho, entregou no prazo e com qualidade.",
      service: "Cobertura de Evento",
      date: "2024-01-05",
    },
  ]

  const stats = {
    averageRating: 4.8,
    totalReviews: 24,
    fiveStars: 20,
    fourStars: 3,
    threeStars: 1,
    twoStars: 0,
    oneStars: 0,
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Minhas Avaliações</h1>
        <p className="text-muted-foreground">Veja o que seus clientes estão dizendo sobre você</p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}</div>
            <div className="flex items-center mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(stats.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground">Clientes satisfeitos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">5 Estrelas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fiveStars}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.fiveStars / stats.totalReviews) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12%</div>
            <p className="text-xs text-muted-foreground">Último mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de estrelas */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Distribuição de Avaliações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count =
              stars === 5
                ? stats.fiveStars
                : stars === 4
                  ? stats.fourStars
                  : stars === 3
                    ? stats.threeStars
                    : stars === 2
                      ? stats.twoStars
                      : stats.oneStars
            const percentage = (count / stats.totalReviews) * 100

            return (
              <div key={stars} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm font-medium">{stars}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Lista de avaliações */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Avaliações Recentes</h2>
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{review.clientName}</CardTitle>
                  <CardDescription>{review.service}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
              <p className="text-xs text-muted-foreground">{new Date(review.date).toLocaleDateString("pt-BR")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
