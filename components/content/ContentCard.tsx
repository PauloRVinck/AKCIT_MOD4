// components/content/ContentCard.tsx
import Image from "next/image"
import Link from "next/link"
import { StarRating } from "@/components/review/StarRating"
import { ContentStatusBadge, ContentTypeBadge } from "@/components/ui/Badge"
import type { ContentWithStats } from "@/types"

interface ContentCardProps {
  content: ContentWithStats
  showStatus?: boolean
}

export function ContentCard({ content, showStatus = false }: ContentCardProps) {
  const avgRating = content._avg?.rating ?? null

  return (
    <Link href={`/content/${content.id}`} className="group block">
      <div className="card overflow-hidden transition-all duration-200 hover:border-gray-600 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5">
        {/* Poster */}
        <div className="relative aspect-[2/3] bg-gray-800">
          {content.posterUrl ? (
            <Image
              src={content.posterUrl}
              alt={content.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
          )}

          {/* Type badge overlay */}
          <div className="absolute top-2 left-2">
            <ContentTypeBadge type={content.type} />
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
            {content.title}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {avgRating !== null ? (
                <>
                  <StarRating value={Math.round(avgRating)} mode="display" size="sm" />
                  <span className="text-xs text-gray-400">({content._count.reviews})</span>
                </>
              ) : (
                <span className="text-xs text-gray-500">Sem avaliações</span>
              )}
            </div>
            {content.releaseYear && (
              <span className="text-xs text-gray-500">{content.releaseYear}</span>
            )}
          </div>
          {showStatus && <ContentStatusBadge status={content.status} />}
        </div>
      </div>
    </Link>
  )
}
