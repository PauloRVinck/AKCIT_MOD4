// app/api/users/me/password/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updatePasswordSchema } from "@/lib/validations/user.schema"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import bcrypt from "bcryptjs"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  try {
    const body = await req.json()
    const parsed = updatePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user) return errorResponse("NOT_FOUND", "Usuário não encontrado", 404)

    const passwordMatch = await bcrypt.compare(parsed.data.currentPassword, user.password)
    if (!passwordMatch) {
      return errorResponse("INVALID_PASSWORD", "Senha atual incorreta", 400)
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return successResponse({ message: "Senha atualizada com sucesso" })
  } catch (err) {
    console.error("[PATCH /api/users/me/password]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}
