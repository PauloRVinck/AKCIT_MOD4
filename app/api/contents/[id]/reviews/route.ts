// app/api/contents/[id]/reviews/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createReviewSchema } from "@/lib/validations/review.schema"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = 10

  const content = await prisma.content.findUnique({
    where: { id: params.id, status: "APPROVED" },
  })

  if (!content) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where: { contentId: params.id } }),
    prisma.review.findMany({
      where: { contentId: params.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return successResponse(reviews, { page, total, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const content = await prisma.content.findUnique({
    where: { id: params.id, status: "APPROVED" },
  })

  if (!content) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)

  try {
    const body = await req.json()
    const parsed = createReviewSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const review = await prisma.review.upsert({
      where: { userId_contentId: { userId: session.user.id, contentId: params.id } },
      update: parsed.data,
      create: { ...parsed.data, userId: session.user.id, contentId: params.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })

    return successResponse(review, undefined, 201)
  } catch (err) {
    console.error("[POST /api/contents/[id]/reviews]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const review = await prisma.review.findUnique({
    where: { userId_contentId: { userId: session.user.id, contentId: params.id } },
  })

  if (!review) return errorResponse("NOT_FOUND", "Review não encontrada", 404)

  await prisma.review.delete({
    where: { userId_contentId: { userId: session.user.id, contentId: params.id } },
  })

  return successResponse({ message: "Review removida" })
}
