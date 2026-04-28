// app/api/auth/register/route.ts
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations/user.schema"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return errorResponse("EMAIL_TAKEN", "Este email já está em uso", 409)
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return successResponse(user, undefined, 201)
  } catch (err) {
    console.error("[POST /api/auth/register]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}
