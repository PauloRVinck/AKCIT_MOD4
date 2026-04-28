// app/(main)/admin/pending/page.tsx
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ContentTypeBadge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils/format"
import type { Content } from "@prisma/client"

type PendingContent = Content & {
  submittedBy: { id: string; name: string; email: string }
  _count: { reviews: number }
}

export default function AdminPendingPage() {
  const [items, setItems] = useState<PendingContent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/contents/pending")
    const json = await res.json()
    setItems(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(id + action)
    await fetch(`/api/contents/${id}/${action}`, { method: "PATCH" })
    setActionLoading(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fila de aprovação</h1>
          <p className="text-gray-400 text-sm mt-1">Conteúdos pendentes de revisão</p>
        </div>
        <Badge variant="warning">{items.length} pendente{items.length !== 1 ? "s" : ""}</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-16 text-center space-y-3">
          <p className="text-4xl">✅</p>
          <p className="text-gray-400">Nenhum conteúdo aguardando aprovação.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card p-4 flex flex-col sm:flex-row gap-4">
              {/* Poster */}
              <div className="relative w-20 aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shrink-0">
                {item.posterUrl ? (
                  <Image src={item.posterUrl} alt={item.title} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-2xl">🎬</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  <Link
                    href={`/content/${item.id}`}
                    className="text-lg font-semibold text-white hover:text-brand-400 transition-colors"
                  >
                    {item.title}
                  </Link>
                  <ContentTypeBadge type={item.type} />
                  {item.releaseYear && (
                    <span className="text-sm text-gray-400">{item.releaseYear}</span>
                  )}
                </div>

                <p className="text-sm text-gray-400 line-clamp-2">{item.synopsis}</p>

                <div className="flex flex-wrap gap-1">
                  {item.genres.map((g) => (
                    <Badge key={g}>{g}</Badge>
                  ))}
                </div>

                <p className="text-xs text-gray-500">
                  Enviado por{" "}
                  <span className="text-gray-300">{item.submittedBy.name}</span>{" "}
                  ({item.submittedBy.email}) · {formatDate(item.createdAt)}
                </p>
              </div>

              {/* Ações */}
              <div className="flex sm:flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleAction(item.id, "approve")}
                  loading={actionLoading === item.id + "approve"}
                  disabled={!!actionLoading}
                >
                  ✅ Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleAction(item.id, "reject")}
                  loading={actionLoading === item.id + "reject"}
                  disabled={!!actionLoading}
                >
                  ❌ Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
