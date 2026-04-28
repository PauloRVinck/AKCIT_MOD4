// app/api/contents/route.ts
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createContentSchema, contentQuerySchema } from "@/lib/validations/content.schema"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = contentQuerySchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Parâmetros inválidos", 400, parsed.error.issues)
  }

  const { type, genre, search, page, limit } = parsed.data

  const where: Prisma.ContentWhereInput = {
    status: "APPROVED",
    ...(type && { type }),
    ...(genre && { genres: { has: genre } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { synopsis: { contains: search, mode: "insensitive" } },
      ],
    }),
  }

  const [total, contents] = await Promise.all([
    prisma.content.count({ where }),
    prisma.content.findMany({
      where,
      include: {
        _count: { select: { reviews: true } },
        submittedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const contentsWithAvg = await Promise.all(
    contents.map(async (c) => {
      const avg = await prisma.review.aggregate({
        where: { contentId: c.id },
        _avg: { rating: true },
      })
      return { ...c, _avg: avg._avg }
    })
  )

  return successResponse(contentsWithAvg, {
    page,
    total,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return errorResponse("UNAUTHORIZED", "Não autenticado", 401)

  try {
    const body = await req.json()
    const parsed = createContentSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues)
    }

    const content = await prisma.content.create({
      data: {
        ...parsed.data,
        submittedById: session.user.id,
        status: "PENDING",
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
      },
    })

    return successResponse(content, undefined, 201)
  } catch (err) {
    console.error("[POST /api/contents]", err)
    return errorResponse("INTERNAL_ERROR", "Erro interno do servidor", 500)
  }
}
