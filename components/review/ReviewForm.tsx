// components/review/ReviewForm.tsx
"use client"

import { useState } from "react"
import { StarRating } from "@/components/review/StarRating"
import { Button } from "@/components/ui/Button"

interface ReviewFormProps {
  contentId: string
  initialRating?: number
  initialBody?: string
  initialHasSpoiler?: boolean
  onSuccess?: () => void
}

export function ReviewForm({
  contentId,
  initialRating = 0,
  initialBody = "",
  initialHasSpoiler = false,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating)
  const [body, setBody] = useState(initialBody)
  const [hasSpoiler, setHasSpoiler] = useState(initialHasSpoiler)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError("Selecione uma nota"); return }
    setError("")
    setLoading(true)

    const res = await fetch(`/api/contents/${contentId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, body: body || null, hasSpoiler }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      setError(json.error?.message ?? "Erro ao salvar review")
      return
    }

    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-300">Sua nota</label>
        <StarRating value={rating} onChange={setRating} mode="input" size="lg" />
        {error && rating === 0 && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
          Review <span className="text-gray-500">(opcional)</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          className="input-base resize-none"
          placeholder="Escreva o que achou…"
        />
        <p className="text-xs text-gray-500 text-right">{body.length}/2000</p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={hasSpoiler}
          onChange={(e) => setHasSpoiler(e.target.checked)}
          className="w-4 h-4 accent-brand-500"
        />
        <span className="text-sm text-gray-300">Contém spoiler</span>
      </label>

      {error && rating > 0 && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" loading={loading} className="w-full">
        {initialRating ? "Atualizar review" : "Publicar review"}
      </Button>
    </form>
  )
}
