// components/review/ReviewCard.tsx
"use client"

import { useState } from "react"
import { StarRating } from "@/components/review/StarRating"
import { Avatar } from "@/components/user/Avatar"
import { formatDate } from "@/lib/utils/format"
import type { ReviewWithUser } from "@/types"

interface ReviewCardProps {
  review: ReviewWithUser
  currentUserId?: string
  onDelete?: () => void
}

export function ReviewCard({ review, currentUserId, onDelete }: ReviewCardProps) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const isOwn = currentUserId === review.userId

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={review.user.name} avatarUrl={review.user.avatarUrl} size="sm" />
          <div>
            <p className="text-sm font-medium text-white">{review.user.name}</p>
            <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={review.rating} mode="display" size="sm" />
          {isOwn && onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Excluir
            </button>
          )}
        </div>
      </div>

      {review.body && (
        <div>
          {review.hasSpoiler && !spoilerRevealed ? (
            <button
              onClick={() => setSpoilerRevealed(true)}
              className="text-sm text-yellow-400 hover:text-yellow-300 underline"
            >
              ⚠️ Contém spoiler — clique para ver
            </button>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {review.body}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
