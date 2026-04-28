// app/api/users/me/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateProfileSchema } from "@/lib/validations/user.schema"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function GET() {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true },
  })

  if (!user) return errorResponse("NOT_FOUND", "Usuário não encontrado", 404)
  return successResponse(user)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  try {
    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true },
    })

    return successResponse(user)
  } catch (err) {
    console.error("[PATCH /api/users/me]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}
