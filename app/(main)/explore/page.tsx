// app/(main)/explore/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ContentGrid } from "@/components/content/ContentGrid"
import { Button } from "@/components/ui/Button"
import type { ContentWithStats } from "@/types"

const GENRES = [
  "Ação", "Aventura", "Animação", "Comédia", "Crime", "Drama",
  "Fantasia", "Ficção Científica", "Terror", "Thriller", "Romance",
]

export default function ExplorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [contents, setContents] = useState<ContentWithStats[]>([])
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)

  const typeFilter = searchParams.get("type") ?? ""
  const genreFilter = searchParams.get("genre") ?? ""
  const searchQuery = searchParams.get("search") ?? ""
  const page = Number(searchParams.get("page") ?? 1)

  const fetchContents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set("type", typeFilter)
    if (genreFilter) params.set("genre", genreFilter)
    if (searchQuery) params.set("search", searchQuery)
    params.set("page", String(page))

    const res = await fetch(`/api/contents?${params}`)
    const json = await res.json()
    setContents(json.data ?? [])
    setMeta(json.meta ?? { page: 1, total: 0, totalPages: 1 })
    setLoading(false)
  }, [typeFilter, genreFilter, searchQuery, page])

  useEffect(() => { fetchContents() }, [fetchContents])

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`/explore?${params}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Explorar</h1>

      {/* Filtros */}
      <div className="card p-4 space-y-4">
        {/* Busca */}
        <input
          type="search"
          defaultValue={searchQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("search", (e.target as HTMLInputElement).value)
          }}
          className="input-base"
          placeholder="Buscar por título ou sinopse… (Enter)"
        />

        <div className="flex flex-wrap gap-2">
          {/* Tipo */}
          {[
            { value: "", label: "Todos" },
            { value: "MOVIE", label: "Filmes" },
            { value: "SERIES", label: "Séries" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParam("type", opt.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                typeFilter === opt.value
                  ? "bg-brand-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Gêneros */}
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setParam("genre", genreFilter === g ? "" : g)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                genreFilter === g
                  ? "bg-brand-500/30 text-brand-300 border border-brand-500"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>{meta.total} resultado{meta.total !== 1 ? "s" : ""}</span>
            <span>Página {meta.page} de {meta.totalPages}</span>
          </div>

          <ContentGrid
            contents={contents}
            emptyMessage="Nenhum conteúdo encontrado com esses filtros."
          />

          {/* Paginação */}
          {meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setParam("page", String(page - 1))}
              >
                ← Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setParam("page", String(page + 1))}
              >
                Próxima →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
