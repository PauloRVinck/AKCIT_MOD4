// components/review/StarRating.tsx
"use client"

import { useState } from "react"

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  mode?: "input" | "display"
  size?: "sm" | "md" | "lg"
}

const sizes = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" }

function StarIcon({ filled, half, className }: { filled: boolean; half?: boolean; className: string }) {
  return (
    <svg className={`${className} transition-colors`} fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  )
}

export function StarRating({ value, onChange, mode = "display", size = "md" }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = mode === "input" ? (hovered ?? value) : value
  const cls = sizes[size]

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={mode === "display"}
          onClick={() => mode === "input" && onChange?.(star)}
          onMouseEnter={() => mode === "input" && setHovered(star)}
          onMouseLeave={() => mode === "input" && setHovered(null)}
          className={`${mode === "input" ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
        >
          <StarIcon
            filled={star <= display}
            className={`${cls} ${star <= display ? "text-yellow-400" : "text-gray-600"}`}
          />
        </button>
      ))}
    </div>
  )
}
