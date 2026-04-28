// components/content/ContentGrid.tsx
import { ContentCard } from "@/components/content/ContentCard"
import type { ContentWithStats } from "@/types"

interface ContentGridProps {
  contents: ContentWithStats[]
  showStatus?: boolean
  emptyMessage?: string
}

export function ContentGrid({
  contents,
  showStatus = false,
  emptyMessage = "Nenhum conteúdo encontrado.",
}: ContentGridProps) {
  if (contents.length === 0) {
    return (
      <div className="py-20 text-center space-y-2">
        <p className="text-4xl">🎬</p>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {contents.map((content) => (
        <ContentCard key={content.id} content={content} showStatus={showStatus} />
      ))}
    </div>
  )
}
