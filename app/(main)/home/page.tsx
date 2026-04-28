// app/(main)/home/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ContentCard } from "@/components/content/ContentCard"
import { Badge } from "@/components/ui/Badge"
import { formatWatchStatus } from "@/lib/utils/format"
import type { UserContentWithContent } from "@/types"

const STATUS_ORDER = ["WATCHING", "WANT_TO_WATCH", "WATCHED", "DROPPED"]
const STATUS_ICONS: Record<string, string> = {
  WATCHING: "▶️",
  WANT_TO_WATCH: "🔖",
  WATCHED: "✅",
  DROPPED: "❌",
}

export default function HomePage() {
  const [items, setItems] = useState<UserContentWithContent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("ALL")

  useEffect(() => {
    fetch("/api/users/me/list")
      .then((r) => r.json())
      .then((json) => {
        setItems(json.data ?? [])
        setLoading(false)
      })
  }, [])

  const grouped = STATUS_ORDER.reduce<Record<string, UserContentWithContent[]>>((acc, status) => {
    acc[status] = items.filter((i) => i.status === status)
    return acc
  }, {})

  const filtered = activeTab === "ALL" ? items : items.filter((i) => i.status === activeTab)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Minha Lista</h1>
        <Link href="/explore" className="text-sm text-brand-400 hover:text-brand-300">
          Explorar catálogo →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <p className="text-5xl">🎬</p>
          <p className="text-gray-400">Sua lista está vazia.</p>
          <Link href="/explore" className="btn-primary inline-block">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <>
          {/* Tabs de filtro */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "ALL" ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              Todos ({items.length})
            </button>
            {STATUS_ORDER.map((s) => (
              grouped[s].length > 0 && (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === s ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  {STATUS_ICONS[s]} {formatWatchStatus(s)} ({grouped[s].length})
                </button>
              )
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="relative">
                <ContentCard content={item.content as any} />
                <div className="absolute top-2 right-2">
                  <span className="text-base" title={formatWatchStatus(item.status)}>
                    {STATUS_ICONS[item.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
