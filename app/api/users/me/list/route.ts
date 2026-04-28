// app/api/users/me/list/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { z } from "zod"

const addToListSchema = z.object({
  contentId: z.string().uuid(),
  status: z.enum(["WATCHING", "WATCHED", "WANT_TO_WATCH", "DROPPED"]),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") as string | null

  const items = await prisma.userContent.findMany({
    where: {
      userId: session.user.id,
      ...(status && { status: status as "WATCHING" | "WATCHED" | "WANT_TO_WATCH" | "DROPPED" }),
    },
    include: {
      content: {
        include: {
          _count: { select: { reviews: true } },
          submittedBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  })

  // Busca médias de rating separadamente
  const itemsWithAvg = await Promise.all(
    items.map(async (item) => {
      const avg = await prisma.review.aggregate({
        where: { contentId: item.contentId },
        _avg: { rating: true },
      })
      return { ...item, content: { ...item.content, _avg: avg._avg } }
    })
  )

  return successResponse(itemsWithAvg)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  try {
    const body = await req.json()
    const parsed = addToListSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const { contentId, status } = parsed.data

    const content = await prisma.content.findUnique({ where: { id: contentId } })
    if (!content) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)

    const item = await prisma.userContent.upsert({
      where: { userId_contentId: { userId: session.user.id, contentId } },
      update: { status },
      create: { userId: session.user.id, contentId, status },
    })

    return successResponse(item, undefined, 201)
  } catch (err) {
    console.error("[POST /api/users/me/list]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}
