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
