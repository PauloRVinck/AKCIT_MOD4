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
