// components/content/TmdbSearch.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import type { TmdbSearchResult } from "@/lib/tmdb"

interface TmdbSearchProps {
  onSelect: (result: TmdbSearchResult) => void
}

export function TmdbSearch({ onSelect }: TmdbSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.data ?? [])
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  function handleSelect(result: TmdbSearchResult) {
    onSelect(result)
    setQuery(result.title)
    setOpen(false)
  }

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
          Buscar no TMDB{" "}
          <span className="text-gray-500 font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="input-base pr-8"
            placeholder="Digite um título para buscar automaticamente…"
          />
          {loading && (
            <div className="absolute right-2.5 top-2.5">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Selecionar preencherá os campos automaticamente com dados do TMDB.
        </p>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-10 top-full mt-1 w-full card shadow-xl max-h-80 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.tmdbId}
              type="button"
              onClick={() => handleSelect(result)}
              className="flex items-start gap-3 w-full px-3 py-2.5 hover:bg-gray-800 transition-colors text-left"
            >
              {result.posterUrl ? (
                <Image
                  src={result.posterUrl}
                  alt={result.title}
                  width={36}
                  height={54}
                  className="rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-9 h-[54px] bg-gray-700 rounded shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{result.title}</p>
                <p className="text-xs text-gray-400">
                  {result.type === "MOVIE" ? "Filme" : "Série"}
                  {result.releaseYear ? ` · ${result.releaseYear}` : ""}
                </p>
                {result.genres.length > 0 && (
                  <p className="text-xs text-gray-500 truncate">{result.genres.slice(0, 3).join(", ")}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
