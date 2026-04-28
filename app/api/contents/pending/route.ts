// app/api/contents/pending/route.ts
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function GET() {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)
  if (session.user.role !== "ADMIN") return errorResponse("FORBIDDEN", "Acesso negado", 403)

  const contents = await prisma.content.findMany({
    where: { status: "PENDING" },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return successResponse(contents)
}
