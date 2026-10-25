You are an experienced test engineer specializing in code coverage, REST API testing, and integration testing.

Create a white box integration test set in TypeScript using Vitest for the Next.js route handlers delimited by *****. Use the Prisma schema and the validation schemas delimited by ##### as complementary information about the application. The test set must exercise the integration between the route handlers, the authentication session, and the PostgreSQL database, following the full flow: a user submits content, an admin approves or rejects it, and users review it.

The test set should be created to maximize coverage (decision coverage) of every route handler and to cover all possible responses (status codes). When a decision depends on state created by another endpoint, write a test that chains the calls and checks the resulting state in the database.

Follow these five instructions for the generated test code:
1. Write a single TypeScript test file for Vitest (globals enabled). Save it as `testes_integracao/gerados/B-v1/fluxo-codigo.test.ts`.
2. Import route handlers directly from the Next.js App Router files, e.g. `import { POST } from "@/app/api/contents/route"` or `import { PATCH as approve } from "@/app/api/contents/[id]/approve/route"`. Call them as functions: `await POST(requisicao("/api/contents", { method: "POST", body }))` and, for dynamic routes, `await approve(requisicao(url, { method: "PATCH" }), params({ id }))`. Do not start an HTTP server and do not use supertest.
3. Use these existing helpers (do not reimplement them):
   - `import { requisicao, params, lerResposta } from "../../helpers/requisicao"` — `lerResposta(res)` returns `{ status, corpo }` where `corpo` is the JSON envelope.
   - `import { logarComo, deslogar } from "../../helpers/sessao"` — authentication is already mocked; `logarComo(user)` sets the session, every test starts logged out.
   - `import { limparBanco, criarUsuarios, criarConteudo, prisma } from "../../helpers/banco"` — `criarUsuarios()` returns `{ usuario, outroUsuario, admin }`; `criarConteudo(submittedById, status?)` creates a content (`PENDING` by default); `prisma` is a real PostgreSQL client.
4. Call `await limparBanco()` and `await criarUsuarios()` in `beforeEach` so every test starts from a known state.
5. Respond only with the TypeScript code of the test file.

*****
// app/api/contents/route.ts
```typescript
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
```
// app/api/contents/[id]/approve/route.ts
```typescript
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
```
// app/api/contents/[id]/reject/route.ts
```typescript
// app/api/contents/[id]/reject/route.ts
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
    return errorResponse("INVALID_STATUS", "Apenas conteúdos pendentes podem ser rejeitados", 400)
  }

  const updated = await prisma.content.update({
    where: { id: params.id },
    data: { status: "REJECTED", approvedById: session.user.id },
    include: { submittedBy: { select: { id: true, name: true } } },
  })

  return successResponse(updated)
}
```
// app/api/contents/[id]/reviews/route.ts
```typescript
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
```
// lib/utils/api-response.ts
```typescript
// lib/utils/api-response.ts — helpers server-side para respostas padronizadas
import { NextResponse } from "next/server"
import type { ZodIssue } from "zod"

export function successResponse<T>(
  data: T,
  meta?: { page: number; total: number; totalPages: number },
  status = 200
) {
  return NextResponse.json({ data, ...(meta && { meta }) }, { status })
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: ZodIssue[]
) {
  return NextResponse.json(
    { error: { code, message, ...(details && { details }) } },
    { status }
  )
}
```
*****

#####
// prisma/schema.prisma
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────

enum Role {
  USER
  ADMIN
}

enum ContentType {
  MOVIE
  SERIES
}

enum ContentStatus {
  PENDING
  APPROVED
  REJECTED
}

enum WatchStatus {
  WATCHING
  WATCHED
  WANT_TO_WATCH
  DROPPED
}

// ─── Models ───────────────────────────────────────────────

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  avatarUrl String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  submittedContents Content[]     @relation("SubmittedContents")
  approvedContents  Content[]     @relation("ApprovedContents")
  reviews           Review[]
  userContents      UserContent[]
}

model Content {
  id            String        @id @default(uuid())
  title         String
  type          ContentType
  tmdbId        Int?
  synopsis      String        @db.Text
  posterUrl     String?
  releaseYear   Int?
  genres        String[]
  status        ContentStatus @default(PENDING)
  submittedById String
  approvedById  String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  submittedBy  User          @relation("SubmittedContents", fields: [submittedById], references: [id])
  approvedBy   User?         @relation("ApprovedContents", fields: [approvedById], references: [id])
  reviews      Review[]
  userContents UserContent[]
}

model Review {
  id         String   @id @default(uuid())
  userId     String
  contentId  String
  rating     Int
  body       String?  @db.Text
  hasSpoiler Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@unique([userId, contentId])
}

model UserContent {
  id        String      @id @default(uuid())
  userId    String
  contentId String
  status    WatchStatus
  addedAt   DateTime    @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@unique([userId, contentId])
}
```
// lib/validations/content.schema.ts
```typescript
// lib/validations/content.schema.ts
import { z } from "zod"

const currentYear = new Date().getFullYear()

export const createContentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(255),
  type: z.enum(["MOVIE", "SERIES"], { required_error: "Tipo é obrigatório" }),
  tmdbId: z.number().int().positive().nullable().optional(),
  synopsis: z.string().min(10, "Sinopse deve ter pelo menos 10 caracteres").max(5000),
  posterUrl: z.string().url("URL do poster inválida").nullable().optional(),
  releaseYear: z
    .number()
    .int()
    .min(1888, "Ano inválido")
    .max(currentYear + 5, "Ano inválido")
    .nullable()
    .optional(),
  genres: z.array(z.string().min(1)).min(1, "Pelo menos um gênero é obrigatório"),
})

export const updateContentSchema = createContentSchema.partial()

export const contentQuerySchema = z.object({
  type: z.enum(["MOVIE", "SERIES"]).optional(),
  genre: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
})
```
// lib/validations/review.schema.ts
```typescript
// lib/validations/review.schema.ts
import { z } from "zod"

export const createReviewSchema = z.object({
  rating: z
    .number({ required_error: "Nota é obrigatória" })
    .int()
    .min(1, "Nota mínima é 1")
    .max(5, "Nota máxima é 5"),
  body: z.string().max(2000, "Review deve ter no máximo 2000 caracteres").nullable().optional(),
  hasSpoiler: z.boolean().default(false),
})
```
#####
