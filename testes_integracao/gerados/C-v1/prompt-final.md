You are an experienced test engineer specializing in integration testing with external services and in test data design.

Create an integration test set in TypeScript using Vitest for the Next.js route handlers that expose the TMDB integration module. The module and the routes are delimited by *****. The real TMDB API must never be called: replace the global `fetch` with `vi.stubGlobal("fetch", vi.fn(...))` and return synthetic TMDB payloads built by you. Do not use real people's names or any real user data in the payloads.

Design the synthetic payloads and failures by partitioning the possible behaviors of the external service:
- successful responses with movies, TV series and other media types mixed;
- empty results and results with optional fields missing (no poster, no dates, unknown genre ids);
- more results than the module returns;
- HTTP error statuses from TMDB and network failures (rejected fetch);
- missing API key.

Also cover the validation and authentication rules of the routes themselves, and assert the exact URL and query parameters sent to TMDB.

Follow these five instructions for the generated test code:
1. Write a single TypeScript test file for Vitest (globals enabled). Save it as `testes_integracao/gerados/C-v1/tmdb-falhas.test.ts`.
2. Import the route handlers directly, e.g. `import { GET as search } from "@/app/api/tmdb/search/route"`, and call them as functions: `await search(requisicao("/api/tmdb/search?q=duna"))` or `await byId(requisicao("/api/tmdb/603?type=movie"), params({ tmdbId: "603" }))`. Do not start an HTTP server.
3. Use the existing helpers: `import { requisicao, params, lerResposta } from "../../helpers/requisicao"` (`lerResposta(res)` returns `{ status, corpo }`) and `import { logarComo } from "../../helpers/sessao"` (authentication is mocked; every test starts logged out). No database is needed.
4. The environment already defines `TMDB_API_KEY="chave-de-teste"` and `TMDB_BASE_URL="https://tmdb.teste/3"`. These are read when `lib/tmdb.ts` is imported, so a test that needs a different value must use `vi.resetModules()`, `vi.stubEnv(...)` and a dynamic `await import(...)` of the route. Restore stubs in `afterEach`.
5. Respond only with the TypeScript code of the test file.

*****
// lib/tmdb.ts
```typescript
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
```
// app/api/tmdb/search/route.ts
```typescript
// app/api/tmdb/search/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { searchTmdb } from "@/lib/tmdb"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return errorResponse("VALIDATION_ERROR", "Query deve ter pelo menos 2 caracteres", 400)
  }

  try {
    const results = await searchTmdb(q)
    return successResponse(results)
  } catch (err) {
    console.error("[GET /api/tmdb/search]", err)
    return errorResponse("TMDB_ERROR", "Erro ao buscar no TMDB", 502)
  }
}
```
// app/api/tmdb/[tmdbId]/route.ts
```typescript
// app/api/tmdb/[tmdbId]/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { getTmdbById } from "@/lib/tmdb"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest, { params }: { params: { tmdbId: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const id = Number(params.tmdbId)
  if (isNaN(id)) return errorResponse("VALIDATION_ERROR", "ID inválido", 400)

  const { searchParams } = new URL(req.url)
  const mediaType = searchParams.get("type") === "tv" ? "tv" : "movie"

  try {
    const result = await getTmdbById(id, mediaType)
    if (!result) return errorResponse("NOT_FOUND", "Item não encontrado no TMDB", 404)
    return successResponse(result)
  } catch (err) {
    console.error("[GET /api/tmdb/[tmdbId]]", err)
    return errorResponse("TMDB_ERROR", "Erro ao buscar no TMDB", 502)
  }
}
```
*****
