// components/content/ContentForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { TmdbSearch } from "@/components/content/TmdbSearch"
import type { TmdbSearchResult } from "@/lib/tmdb"

const GENRE_OPTIONS = [
  "Ação", "Aventura", "Animação", "Comédia", "Crime", "Documentário",
  "Drama", "Família", "Fantasia", "Ficção Científica", "História",
  "Mistério", "Romance", "Terror", "Thriller", "Guerra", "Faroeste", "Outro",
]

export function ContentForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: "",
    type: "MOVIE" as "MOVIE" | "SERIES",
    synopsis: "",
    posterUrl: "",
    releaseYear: "",
    genres: [] as string[],
    tmdbId: null as number | null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleTmdbSelect(result: TmdbSearchResult) {
    setForm({
      title: result.title,
      type: result.type,
      synopsis: result.synopsis,
      posterUrl: result.posterUrl ?? "",
      releaseYear: result.releaseYear?.toString() ?? "",
      genres: result.genres,
      tmdbId: result.tmdbId,
    })
  }

  function toggleGenre(genre: string) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.genres.length === 0) { setError("Selecione pelo menos um gênero"); return }
    setError("")
    setLoading(true)

    const res = await fetch("/api/contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        type: form.type,
        synopsis: form.synopsis,
        posterUrl: form.posterUrl || null,
        releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
        genres: form.genres,
        tmdbId: form.tmdbId,
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error?.message ?? "Erro ao cadastrar conteúdo")
      return
    }

    router.push(`/content/${json.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* TMDB Search */}
      <TmdbSearch onSelect={handleTmdbSelect} />

      <hr className="border-gray-800" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Título *"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Nome do filme ou série"
          />
        </div>

        <Select
          label="Tipo *"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as "MOVIE" | "SERIES" })}
          options={[
            { value: "MOVIE", label: "Filme" },
            { value: "SERIES", label: "Série" },
          ]}
        />

        <Input
          label="Ano de lançamento"
          type="number"
          min={1888}
          max={new Date().getFullYear() + 5}
          value={form.releaseYear}
          onChange={(e) => setForm({ ...form, releaseYear: e.target.value })}
          placeholder="Ex: 2024"
        />

        <div className="sm:col-span-2">
          <Input
            label="URL do poster"
            type="url"
            value={form.posterUrl}
            onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
            placeholder="https://image.tmdb.org/t/p/w500/..."
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-gray-300">Sinopse *</label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={form.synopsis}
            onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
            className="input-base resize-none"
            placeholder="Descrição do enredo…"
          />
        </div>

        {/* Gêneros */}
        <div className="sm:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Gêneros * <span className="text-gray-500 font-normal">({form.genres.length} selecionados)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  form.genres.includes(genre)
                    ? "bg-brand-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          Enviar para aprovação
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Após o envio, o conteúdo ficará pendente até ser aprovado por um administrador.
      </p>
    </form>
  )
}
