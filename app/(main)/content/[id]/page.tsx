// app/(main)/content/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { StarRating } from "@/components/review/StarRating"
import { ReviewCard } from "@/components/review/ReviewCard"
import { ReviewForm } from "@/components/review/ReviewForm"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Badge, ContentStatusBadge, ContentTypeBadge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { formatDate, formatWatchStatus } from "@/lib/utils/format"
import type { ContentWithReviews } from "@/types"

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()

  const [content, setContent] = useState<ContentWithReviews | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [listStatus, setListStatus] = useState("")
  const [listItemId, setListItemId] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)

  async function loadContent() {
    const res = await fetch(`/api/contents/${id}`)
    const json = await res.json()
    if (json.data) setContent(json.data)
    setLoading(false)
  }

  async function loadListStatus() {
    const res = await fetch("/api/users/me/list")
    const json = await res.json()
    const found = (json.data ?? []).find((item: { contentId: string; id: string; status: string }) => item.contentId === id)
    if (found) {
      setListStatus(found.status)
      setListItemId(found.id)
    }
  }

  useEffect(() => {
    loadContent()
    loadListStatus()
  }, [id])

  async function handleListChange(status: string) {
    setListLoading(true)
    if (listItemId && !status) {
      await fetch(`/api/users/me/list/${listItemId}`, { method: "DELETE" })
      setListStatus("")
      setListItemId(null)
    } else if (listItemId) {
      await fetch(`/api/users/me/list/${listItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      setListStatus(status)
    } else {
      const res = await fetch("/api/users/me/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: id, status }),
      })
      const json = await res.json()
      if (json.data) { setListStatus(status); setListItemId(json.data.id) }
    }
    setListLoading(false)
  }

  async function handleApprove(action: "approve" | "reject") {
    setApproveLoading(true)
    await fetch(`/api/contents/${id}/${action}`, { method: "PATCH" })
    await loadContent()
    setApproveLoading(false)
  }

  async function handleDeleteReview() {
    await fetch(`/api/contents/${id}/reviews`, { method: "DELETE" })
    loadContent()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!content) {
    return <div className="py-20 text-center text-gray-400">Conteúdo não encontrado.</div>
  }

  const avgRating = content._avg?.rating ?? null
  const myReview = content.reviews.find((r) => r.userId === session?.user?.id)
  const isAdmin = session?.user?.role === "ADMIN"
  const isOwner = session?.user?.id === content.submittedById

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Poster */}
        <div className="shrink-0">
          <div className="relative w-full sm:w-48 aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 ring-1 ring-gray-700">
            {content.posterUrl ? (
              <Image src={content.posterUrl} alt={content.title} fill className="object-cover" sizes="192px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-5xl">🎬</div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ContentTypeBadge type={content.type} />
              {content.status !== "APPROVED" && <ContentStatusBadge status={content.status} />}
              {content.releaseYear && (
                <span className="text-sm text-gray-400">{content.releaseYear}</span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white">{content.title}</h1>

            {/* Rating */}
            {avgRating !== null ? (
              <div className="flex items-center gap-2">
                <StarRating value={Math.round(avgRating)} mode="display" size="md" />
                <span className="text-gray-300 font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({content._count.reviews} avaliações)</span>
              </div>
            ) : (
              <span className="text-gray-500 text-sm">Sem avaliações ainda</span>
            )}
          </div>

          {/* Gêneros */}
          <div className="flex flex-wrap gap-1.5">
            {content.genres.map((g) => (
              <Badge key={g}>{g}</Badge>
            ))}
          </div>

          {/* Sinopse */}
          <p className="text-gray-300 leading-relaxed">{content.synopsis}</p>

          <p className="text-xs text-gray-500">
            Enviado por {content.submittedBy.name} · {formatDate(content.createdAt)}
          </p>

          {/* Ações */}
          <div className="flex flex-wrap gap-3 pt-2">
            {/* Adicionar à lista */}
            {content.status === "APPROVED" && (
              <Select
                options={[
                  { value: "WANT_TO_WATCH", label: "🔖 Quero assistir" },
                  { value: "WATCHING", label: "▶️ Assistindo" },
                  { value: "WATCHED", label: "✅ Assistido" },
                  { value: "DROPPED", label: "❌ Abandonado" },
                ]}
                placeholder="+ Adicionar à lista"
                value={listStatus}
                onChange={(e) => handleListChange(e.target.value)}
                disabled={listLoading}
                className="w-auto"
              />
            )}

            {/* Review */}
            {content.status === "APPROVED" && (
              <Button onClick={() => setReviewModalOpen(true)} variant="secondary">
                {myReview ? "✏️ Editar review" : "⭐ Avaliar"}
              </Button>
            )}

            {/* Admin: aprovar/rejeitar */}
            {isAdmin && content.status === "PENDING" && (
              <>
                <Button onClick={() => handleApprove("approve")} loading={approveLoading}>
                  ✅ Aprovar
                </Button>
                <Button onClick={() => handleApprove("reject")} variant="danger" loading={approveLoading}>
                  ❌ Rejeitar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      {content.status === "APPROVED" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Reviews{" "}
            <span className="text-gray-400 font-normal text-base">({content._count.reviews})</span>
          </h2>

          {content.reviews.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              Nenhuma review ainda. Seja o primeiro a avaliar!
            </div>
          ) : (
            <div className="space-y-3">
              {content.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={session?.user?.id}
                  onDelete={handleDeleteReview}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de review */}
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={myReview ? "Editar review" : "Avaliar"}
      >
        <ReviewForm
          contentId={id}
          initialRating={myReview?.rating}
          initialBody={myReview?.body ?? ""}
          initialHasSpoiler={myReview?.hasSpoiler}
          onSuccess={() => {
            setReviewModalOpen(false)
            loadContent()
          }}
        />
      </Modal>
    </div>
  )
}
