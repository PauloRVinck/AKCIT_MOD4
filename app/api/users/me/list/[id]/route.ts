// app/api/users/me/list/[id]/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { z } from "zod"

const updateListSchema = z.object({
  status: z.enum(["WATCHING", "WATCHED", "WANT_TO_WATCH", "DROPPED"]),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  try {
    const body = await req.json()
    const parsed = updateListSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const item = await prisma.userContent.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!item) return errorResponse("NOT_FOUND", "Item não encontrado na sua lista", 404)

    const updated = await prisma.userContent.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    })

    return successResponse(updated)
  } catch (err) {
    console.error("[PATCH /api/users/me/list/[id]]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const item = await prisma.userContent.findFirst({
    where: { id: params.id, userId: session.user.id },
  })

  if (!item) return errorResponse("NOT_FOUND", "Item não encontrado na sua lista", 404)

  await prisma.userContent.delete({ where: { id: params.id } })
  return successResponse({ message: "Item removido da lista" })
}
