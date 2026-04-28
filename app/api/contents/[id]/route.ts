// app/api/contents/[id]/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateContentSchema } from "@/lib/validations/content.schema"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()

  const content = await prisma.content.findUnique({
    where: { id: params.id },
    include: {
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      _count: { select: { reviews: true } },
      reviews: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  if (!content) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)

  // Conteúdo pendente/rejeitado visível só pro dono e admins
  if (content.status !== "APPROVED") {
    if (!session?.user) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)
    if (session.user.role !== "ADMIN" && session.user.id !== content.submittedById) {
      return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)
    }
  }

  const avg = await prisma.review.aggregate({
    where: { contentId: content.id },
    _avg: { rating: true },
  })

  return successResponse({ ...content, _avg: avg._avg })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const content = await prisma.content.findUnique({ where: { id: params.id } })
  if (!content) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)

  const isAdmin = session.user.role === "ADMIN"
  const isOwnerPending = session.user.id === content.submittedById && content.status === "PENDING"

  if (!isAdmin && !isOwnerPending) {
    return errorResponse("FORBIDDEN", "Sem permissão para editar este conteúdo", 403)
  }

  try {
    const body = await req.json()
    const parsed = updateContentSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const updated = await prisma.content.update({
      where: { id: params.id },
      data: parsed.data,
      include: { submittedBy: { select: { id: true, name: true } } },
    })

    return successResponse(updated)
  } catch (err) {
    console.error("[PATCH /api/contents/[id]]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "Acesso negado", 403)

  const content = await prisma.content.findUnique({ where: { id: params.id } })
  if (!content) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)

  await prisma.content.delete({ where: { id: params.id } })
  return successResponse({ message: "Conteúdo removido" })
}
