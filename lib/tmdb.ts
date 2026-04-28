// lib/tmdb.ts — chamadas ao TMDB feitas exclusivamente no servidor
const TMDB_BASE_URL = process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3"
const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

export interface TmdbSearchResult {
  tmdbId: number
  title: string
  type: "MOVIE" | "SERIES"
  synopsis: string
  posterUrl: string | null
  releaseYear: number | null
  genres: string[]
}

// Mapa de IDs de gênero TMDB → nomes em português
const GENRE_MAP: Record<number, string> = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção Científica",
  10770: "Telefilme",
  53: "Thriller",
  10752: "Guerra",
  37: "Faroeste",
  // Séries
  10759: "Ação & Aventura",
  10762: "Kids",
  10763: "Notícias",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "Guerra & Política",
}

function resolveGenres(genreIds: number[]): string[] {
  return genreIds.map((id) => GENRE_MAP[id] ?? "Outro").filter(Boolean)
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY não configurada")

  const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR&include_adult=false`

  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`TMDB search falhou: ${res.status}`)

  const data = await res.json()

  return (data.results ?? [])
    .filter((item: { media_type: string }) => item.media_type === "movie" || item.media_type === "tv")
    .slice(0, 10)
    .map(
      (item: {
        id: number
        media_type: string
        title?: string
        name?: string
        overview: string
        poster_path?: string
        release_date?: string
        first_air_date?: string
        genre_ids?: number[]
      }) => ({
        tmdbId: item.id,
        title: item.media_type === "movie" ? item.title ?? "" : item.name ?? "",
        type: item.media_type === "movie" ? "MOVIE" : "SERIES",
        synopsis: item.overview ?? "",
        posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
        releaseYear: item.release_date
          ? new Date(item.release_date).getFullYear()
          : item.first_air_date
            ? new Date(item.first_air_date).getFullYear()
            : null,
        genres: resolveGenres(item.genre_ids ?? []),
      })
    )
}

export async function getTmdbById(tmdbId: number, type: "movie" | "tv"): Promise<TmdbSearchResult | null> {
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY não configurada")

  const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null

  const item = await res.json()

  return {
    tmdbId: item.id,
    title: type === "movie" ? item.title : item.name,
    type: type === "movie" ? "MOVIE" : "SERIES",
    synopsis: item.overview ?? "",
    posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
    releaseYear: item.release_date
      ? new Date(item.release_date).getFullYear()
      : item.first_air_date
        ? new Date(item.first_air_date).getFullYear()
        : null,
    genres: (item.genres ?? []).map((g: { name: string }) => g.name),
  }
}
