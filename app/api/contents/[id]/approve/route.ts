// app/api/contents/[id]/approve/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "Acesso negado", 403)

  const content = await prisma.content.findUnique({ where: { id: params.id } })
  if (!content) return errorResponse("NOT_FOUND", "Conteúdo não encontrado", 404)
  if (content.status !== "PENDING") {
    return errorResponse("INVALID_STATUS", "Apenas conteúdos pendentes podem ser aprovados", 400)
  }

  const updated = await prisma.content.update({
    where: { id: params.id },
    data: { status: "APPROVED", approvedById: session.user.id },
    include: { submittedBy: { select: { id: true, name: true } } },
  })

  return successResponse(updated)
}
