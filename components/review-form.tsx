"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

interface ReviewFormProps {
  professionalId: string
  bookingId: string
  onSubmit?: (review: { rating: number; comment: string }) => void
}

export function ReviewForm({ professionalId, bookingId, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    setIsSubmitting(true)

    // Aqui você integraria com o Firebase
    const review = { rating, comment }

    if (onSubmit) {
      onSubmit(review)
    }

    trackEvent({
      action: 'review_professional',
      category: 'Professional',
      label: `Rating: ${rating}`,
      value: rating
    })

    // Simular envio
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setRating(0)
    setComment("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Sua Avaliação</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-muted-foreground">
            {rating === 1 && "Muito insatisfeito"}
            {rating === 2 && "Insatisfeito"}
            {rating === 3 && "Regular"}
            {rating === 4 && "Satisfeito"}
            {rating === 5 && "Muito satisfeito"}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Comentário (opcional)</Label>
        <Textarea
          id="comment"
          placeholder="Conte-nos sobre sua experiência com este profissional..."
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={rating === 0 || isSubmitting} className="w-full">
        {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
      </Button>
    </form>
  )
}
