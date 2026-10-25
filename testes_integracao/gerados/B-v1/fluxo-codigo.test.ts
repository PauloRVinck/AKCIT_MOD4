// testes_integracao/gerados/B-v1/fluxo-codigo.test.ts
import type { ContentStatus, Prisma } from "@prisma/client"

import { GET as listarConteudos, POST as submeterConteudo } from "@/app/api/contents/route"
import { PATCH as aprovar } from "@/app/api/contents/[id]/approve/route"
import { PATCH as rejeitar } from "@/app/api/contents/[id]/reject/route"
import {
  GET as listarReviews,
  POST as enviarReview,
  DELETE as removerReview,
} from "@/app/api/contents/[id]/reviews/route"

import { requisicao, params, lerResposta } from "../../helpers/requisicao"
import { logarComo, deslogar } from "../../helpers/sessao"
import { limparBanco, criarUsuarios, criarConteudo, prisma } from "../../helpers/banco"

// ─── Constantes e fábricas ────────────────────────────────

const URL_CONTEUDOS = "/api/contents"
const urlAprovar = (id: string) => `/api/contents/${id}/approve`
const urlRejeitar = (id: string) => `/api/contents/${id}/reject`
const urlReviews = (id: string) => `/api/contents/${id}/reviews`
const ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000"

const conteudoValido = (sobrescrever: Record<string, unknown> = {}) => ({
  title: "Filme de Teste",
  type: "MOVIE",
  synopsis: "Uma sinopse suficientemente longa para validar o cadastro.",
  genres: ["Drama"],
  releaseYear: 2020,
  posterUrl: "https://exemplo.com/poster.jpg",
  tmdbId: 1234,
  ...sobrescrever,
})

/** Cria conteúdo via helper e ajusta campos específicos diretamente no banco. */
async function conteudoComCampos(
  submittedById: string,
  status: ContentStatus,
  campos: Prisma.ContentUpdateInput
) {
  const conteudo = await criarConteudo(submittedById, status)
  return prisma.content.update({ where: { id: conteudo.id }, data: campos })
}

// ─── Ciclo de vida ────────────────────────────────────────

let usuario: any
let outroUsuario: any
let admin: any

beforeEach(async () => {
  await limparBanco()
  const usuarios = await criarUsuarios()
  usuario = usuarios.usuario
  outroUsuario = usuarios.outroUsuario
  admin = usuarios.admin
  deslogar()
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ═══════════════════════════════════════════════════════════
// POST /api/contents
// ═══════════════════════════════════════════════════════════

describe("POST /api/contents", () => {
  it("retorna 401 quando não autenticado e não grava nada", async () => {
    const res = await submeterConteudo(
      requisicao(URL_CONTEUDOS, { method: "POST", body: conteudoValido() })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(corpo.error.code).toBe("UNAUTHORIZED")
    expect(await prisma.content.count()).toBe(0)
  })

  it.each([
    ["título vazio", { title: "" }],
    ["título ausente", { title: undefined }],
    ["tipo inválido", { type: "BOOK" }],
    ["sinopse curta", { synopsis: "curta" }],
    ["gêneros vazios", { genres: [] }],
    ["poster com URL inválida", { posterUrl: "nao-e-url" }],
    ["ano de lançamento fora do intervalo", { releaseYear: 1800 }],
    ["tmdbId negativo", { tmdbId: -1 }],
  ])("retorna 400 para payload inválido: %s", async (_descricao, sobrescrever) => {
    logarComo(usuario)
    const res = await submeterConteudo(
      requisicao(URL_CONTEUDOS, { method: "POST", body: conteudoValido(sobrescrever) })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(400)
    expect(corpo.error.code).toBe("VALIDATION_ERROR")
    expect(Array.isArray(corpo.error.details)).toBe(true)
    expect(corpo.error.details.length).toBeGreaterThan(0)
    expect(await prisma.content.count()).toBe(0)
  })

  it("retorna 201 com status PENDING e grava o autor da sessão", async () => {
    logarComo(usuario)
    const res = await submeterConteudo(
      requisicao(URL_CONTEUDOS, { method: "POST", body: conteudoValido() })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(201)
    expect(corpo.data.status).toBe("PENDING")
    expect(corpo.data.submittedBy).toEqual({ id: usuario.id, name: usuario.name })

    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: corpo.data.id } })
    expect(noBanco.status).toBe("PENDING")
    expect(noBanco.submittedById).toBe(usuario.id)
    expect(noBanco.approvedById).toBeNull()
  })

  it("retorna 500 quando a persistência falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(prisma.content, "create").mockRejectedValueOnce(new Error("falha simulada"))

    logarComo(usuario)
    const res = await submeterConteudo(
      requisicao(URL_CONTEUDOS, { method: "POST", body: conteudoValido() })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(500)
    expect(corpo.error.code).toBe("INTERNAL_ERROR")
    expect(await prisma.content.count()).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════
// GET /api/contents
// ═══════════════════════════════════════════════════════════

describe("GET /api/contents", () => {
  it.each([
    ["tipo inválido", "?type=BOOK"],
    ["limit acima do máximo", "?limit=51"],
    ["page zero", "?page=0"],
    ["page não numérica", "?page=abc"],
  ])("retorna 400 para query inválida: %s", async (_descricao, query) => {
    const res = await listarConteudos(requisicao(`${URL_CONTEUDOS}${query}`))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(400)
    expect(corpo.error.code).toBe("VALIDATION_ERROR")
    expect(corpo.error.details.length).toBeGreaterThan(0)
  })

  it("retorna 200 com lista vazia e meta zerada quando não há conteúdos", async () => {
    const res = await listarConteudos(requisicao(URL_CONTEUDOS))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data).toEqual([])
    expect(corpo.meta).toEqual({ page: 1, total: 0, totalPages: 0 })
  })

  it("lista somente conteúdos APPROVED", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")
    const rejeitado = await criarConteudo(usuario.id, "REJECTED")
    const aprovado = await criarConteudo(usuario.id, "APPROVED")

    const res = await listarConteudos(requisicao(URL_CONTEUDOS))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    const ids = corpo.data.map((c: any) => c.id)
    expect(ids).toEqual([aprovado.id])
    expect(ids).not.toContain(pendente.id)
    expect(ids).not.toContain(rejeitado.id)
  })

  it("filtra por tipo", async () => {
    await conteudoComCampos(usuario.id, "APPROVED", { type: "MOVIE" })
    const serie = await conteudoComCampos(usuario.id, "APPROVED", { type: "SERIES" })

    const res = await listarConteudos(requisicao(`${URL_CONTEUDOS}?type=SERIES`))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data.map((c: any) => c.id)).toEqual([serie.id])
  })

  it("filtra por gênero", async () => {
    const acao = await conteudoComCampos(usuario.id, "APPROVED", { genres: ["Ação", "Drama"] })
    await conteudoComCampos(usuario.id, "APPROVED", { genres: ["Comédia"] })

    const res = await listarConteudos(requisicao(`${URL_CONTEUDOS}?genre=Ação`))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data.map((c: any) => c.id)).toEqual([acao.id])
  })

  it("busca por título ou sinopse sem diferenciar maiúsculas", async () => {
    const porTitulo = await conteudoComCampos(usuario.id, "APPROVED", { title: "The Matrix" })
    const porSinopse = await conteudoComCampos(usuario.id, "APPROVED", {
      title: "Outro Filme",
      synopsis: "Um mundo de sonhos compartilhados por todos.",
    })
    await conteudoComCampos(usuario.id, "APPROVED", {
      title: "Sem Relação",
      synopsis: "Uma história completamente diferente aqui.",
    })

    const porTituloRes = await lerResposta(
      await listarConteudos(requisicao(`${URL_CONTEUDOS}?search=matrix`))
    )
    expect(porTituloRes.status).toBe(200)
    expect(porTituloRes.corpo.data.map((c: any) => c.id)).toEqual([porTitulo.id])

    const porSinopseRes = await lerResposta(
      await listarConteudos(requisicao(`${URL_CONTEUDOS}?search=SONHOS`))
    )
    expect(porSinopseRes.corpo.data.map((c: any) => c.id)).toEqual([porSinopse.id])

    const semResultado = await lerResposta(
      await listarConteudos(requisicao(`${URL_CONTEUDOS}?search=inexistente-xyz`))
    )
    expect(semResultado.status).toBe(200)
    expect(semResultado.corpo.data).toEqual([])
    expect(semResultado.corpo.meta.total).toBe(0)
  })

  it("pagina os resultados com meta consistente", async () => {
    for (let i = 0; i < 3; i++) {
      await criarConteudo(usuario.id, "APPROVED")
    }

    const pagina1 = await lerResposta(
      await listarConteudos(requisicao(`${URL_CONTEUDOS}?limit=2&page=1`))
    )
    expect(pagina1.status).toBe(200)
    expect(pagina1.corpo.data).toHaveLength(2)
    expect(pagina1.corpo.meta).toEqual({ page: 1, total: 3, totalPages: 2 })

    const pagina2 = await lerResposta(
      await listarConteudos(requisicao(`${URL_CONTEUDOS}?limit=2&page=2`))
    )
    expect(pagina2.corpo.data).toHaveLength(1)
    expect(pagina2.corpo.meta).toEqual({ page: 2, total: 3, totalPages: 2 })
  })

  it("inclui contagem de reviews e média de notas", async () => {
    const comAvaliacoes = await criarConteudo(usuario.id, "APPROVED")
    const semAvaliacoes = await criarConteudo(usuario.id, "APPROVED")

    await prisma.review.create({
      data: { userId: usuario.id, contentId: comAvaliacoes.id, rating: 4 },
    })
    await prisma.review.create({
      data: { userId: outroUsuario.id, contentId: comAvaliacoes.id, rating: 2 },
    })

    const res = await listarConteudos(requisicao(URL_CONTEUDOS))
    const { corpo } = await lerResposta(res)

    const item = corpo.data.find((c: any) => c.id === comAvaliacoes.id)
    expect(item._count.reviews).toBe(2)
    expect(item._avg.rating).toBe(3)

    const vazio = corpo.data.find((c: any) => c.id === semAvaliacoes.id)
    expect(vazio._count.reviews).toBe(0)
    expect(vazio._avg.rating).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════
// PATCH /api/contents/[id]/approve
// ═══════════════════════════════════════════════════════════

describe("PATCH /api/contents/[id]/approve", () => {
  it("retorna 401 quando não autenticado e mantém o status", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")

    const res = await aprovar(
      requisicao(urlAprovar(pendente.id), { method: "PATCH" }),
      params({ id: pendente.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(corpo.error.code).toBe("UNAUTHORIZED")
    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: pendente.id } })
    expect(noBanco.status).toBe("PENDING")
  })

  it("retorna 403 para usuário comum e mantém o status", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")
    logarComo(outroUsuario)

    const res = await aprovar(
      requisicao(urlAprovar(pendente.id), { method: "PATCH" }),
      params({ id: pendente.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(403)
    expect(corpo.error.code).toBe("FORBIDDEN")
    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: pendente.id } })
    expect(noBanco.status).toBe("PENDING")
    expect(noBanco.approvedById).toBeNull()
  })

  it("retorna 404 quando o conteúdo não existe", async () => {
    logarComo(admin)

    const res = await aprovar(
      requisicao(urlAprovar(ID_INEXISTENTE), { method: "PATCH" }),
      params({ id: ID_INEXISTENTE })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(404)
    expect(corpo.error.code).toBe("NOT_FOUND")
  })

  it.each(["APPROVED", "REJECTED"] as const)(
    "retorna 400 quando o conteúdo já está %s",
    async (statusAtual) => {
      const conteudo = await criarConteudo(usuario.id, statusAtual)
      logarComo(admin)

      const res = await aprovar(
        requisicao(urlAprovar(conteudo.id), { method: "PATCH" }),
        params({ id: conteudo.id })
      )
      const { status, corpo } = await lerResposta(res)

      expect(status).toBe(400)
      expect(corpo.error.code).toBe("INVALID_STATUS")
      const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: conteudo.id } })
      expect(noBanco.status).toBe(statusAtual)
    }
  )

  it("retorna 200, aprova o conteúdo e registra o admin", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")
    logarComo(admin)

    const res = await aprovar(
      requisicao(urlAprovar(pendente.id), { method: "PATCH" }),
      params({ id: pendente.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data.status).toBe("APPROVED")
    expect(corpo.data.submittedBy).toEqual({ id: usuario.id, name: usuario.name })

    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: pendente.id } })
    expect(noBanco.status).toBe("APPROVED")
    expect(noBanco.approvedById).toBe(admin.id)
  })
})

// ═══════════════════════════════════════════════════════════
// PATCH /api/contents/[id]/reject
// ═══════════════════════════════════════════════════════════

describe("PATCH /api/contents/[id]/reject", () => {
  it("retorna 401 quando não autenticado e mantém o status", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")

    const res = await rejeitar(
      requisicao(urlRejeitar(pendente.id), { method: "PATCH" }),
      params({ id: pendente.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(corpo.error.code).toBe("UNAUTHORIZED")
    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: pendente.id } })
    expect(noBanco.status).toBe("PENDING")
  })

  it("retorna 403 para usuário comum e mantém o status", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")
    logarComo(usuario)

    const res = await rejeitar(
      requisicao(urlRejeitar(pendente.id), { method: "PATCH" }),
      params({ id: pendente.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(403)
    expect(corpo.error.code).toBe("FORBIDDEN")
    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: pendente.id } })
    expect(noBanco.status).toBe("PENDING")
  })

  it("retorna 404 quando o conteúdo não existe", async () => {
    logarComo(admin)

    const res = await rejeitar(
      requisicao(urlRejeitar(ID_INEXISTENTE), { method: "PATCH" }),
      params({ id: ID_INEXISTENTE })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(404)
    expect(corpo.error.code).toBe("NOT_FOUND")
  })

  it.each(["APPROVED", "REJECTED"] as const)(
    "retorna 400 quando o conteúdo já está %s",
    async (statusAtual) => {
      const conteudo = await criarConteudo(usuario.id, statusAtual)
      logarComo(admin)

      const res = await rejeitar(
        requisicao(urlRejeitar(conteudo.id), { method: "PATCH" }),
        params({ id: conteudo.id })
      )
      const { status, corpo } = await lerResposta(res)

      expect(status).toBe(400)
      expect(corpo.error.code).toBe("INVALID_STATUS")
      const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: conteudo.id } })
      expect(noBanco.status).toBe(statusAtual)
    }
  )

  it("retorna 200, rejeita o conteúdo e registra o admin", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")
    logarComo(admin)

    const res = await rejeitar(
      requisicao(urlRejeitar(pendente.id), { method: "PATCH" }),
      params({ id: pendente.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data.status).toBe("REJECTED")

    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id: pendente.id } })
    expect(noBanco.status).toBe("REJECTED")
    expect(noBanco.approvedById).toBe(admin.id)
  })
})

// ═══════════════════════════════════════════════════════════
// GET /api/contents/[id]/reviews
// ═══════════════════════════════════════════════════════════

describe("GET /api/contents/[id]/reviews", () => {
  it.each([
    ["conteúdo PENDING", "PENDING"],
    ["conteúdo REJECTED", "REJECTED"],
  ] as const)("retorna 404 para %s", async (_descricao, statusConteudo) => {
    const conteudo = await criarConteudo(usuario.id, statusConteudo)

    const res = await listarReviews(
      requisicao(urlReviews(conteudo.id)),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(404)
    expect(corpo.error.code).toBe("NOT_FOUND")
  })

  it("retorna 404 quando o conteúdo não existe", async () => {
    const res = await listarReviews(
      requisicao(urlReviews(ID_INEXISTENTE)),
      params({ id: ID_INEXISTENTE })
    )
    const { status } = await lerResposta(res)

    expect(status).toBe(404)
  })

  it("retorna 200 com lista vazia quando não há reviews", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")

    const res = await listarReviews(
      requisicao(urlReviews(conteudo.id)),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data).toEqual([])
    expect(corpo.meta).toEqual({ page: 1, total: 0, totalPages: 0 })
  })

  it("lista reviews com dados do usuário e pagina em blocos de 10", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    const leitores = await Promise.all(
      Array.from({ length: 11 }, (_, i) =>
        prisma.user.create({
          data: { name: `Leitor ${i}`, email: `leitor${i}@teste.com`, password: "x" },
        })
      )
    )
    await prisma.review.createMany({
      data: leitores.map((l, i) => ({
        userId: l.id,
        contentId: conteudo.id,
        rating: 3,
        body: `review ${i}`,
      })),
    })

    const pagina1 = await lerResposta(
      await listarReviews(
        requisicao(`${urlReviews(conteudo.id)}?page=1`),
        params({ id: conteudo.id })
      )
    )
    expect(pagina1.status).toBe(200)
    expect(pagina1.corpo.data).toHaveLength(10)
    expect(pagina1.corpo.meta).toEqual({ page: 1, total: 11, totalPages: 2 })
    expect(pagina1.corpo.data[0].user).toEqual(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String) })
    )

    const pagina2 = await lerResposta(
      await listarReviews(
        requisicao(`${urlReviews(conteudo.id)}?page=2`),
        params({ id: conteudo.id })
      )
    )
    expect(pagina2.corpo.data).toHaveLength(1)
    expect(pagina2.corpo.meta).toEqual({ page: 2, total: 11, totalPages: 2 })
  })

  it("normaliza page zero para a página 1", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")

    const res = await listarReviews(
      requisicao(`${urlReviews(conteudo.id)}?page=0`),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.meta.page).toBe(1)
  })

  it("retorna lista vazia para página além do total", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    await prisma.review.create({
      data: { userId: usuario.id, contentId: conteudo.id, rating: 5 },
    })

    const res = await listarReviews(
      requisicao(`${urlReviews(conteudo.id)}?page=5`),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data).toEqual([])
    expect(corpo.meta).toEqual({ page: 5, total: 1, totalPages: 1 })
  })
})

// ═══════════════════════════════════════════════════════════
// POST /api/contents/[id]/reviews
// ═══════════════════════════════════════════════════════════

describe("POST /api/contents/[id]/reviews", () => {
  it("retorna 401 quando não autenticado, mesmo com conteúdo aprovado", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")

    const res = await enviarReview(
      requisicao(urlReviews(conteudo.id), {
        method: "POST",
        body: { rating: 5 },
      }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(corpo.error.code).toBe("UNAUTHORIZED")
    expect(await prisma.review.count()).toBe(0)
  })

  it("retorna 404 para conteúdo PENDING e não grava review", async () => {
    const pendente = await criarConteudo(usuario.id, "PENDING")
    logarComo(outroUsuario)

    const res = await enviarReview(
      requisicao(urlReviews(pendente.id), {
        method: "POST",
        body: { rating: 4 },
      }),
      params({ id: pendente.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(404)
    expect(corpo.error.code).toBe("NOT_FOUND")
    expect(await prisma.review.count()).toBe(0)
  })

  it("retorna 404 para conteúdo inexistente", async () => {
    logarComo(usuario)

    const res = await enviarReview(
      requisicao(urlReviews(ID_INEXISTENTE), {
        method: "POST",
        body: { rating: 4 },
      }),
      params({ id: ID_INEXISTENTE })
    )
    const { status } = await lerResposta(res)

    expect(status).toBe(404)
  })

  it.each([
    ["nota ausente", {}],
    ["nota zero", { rating: 0 }],
    ["nota acima de 5", { rating: 6 }],
    ["nota não inteira", { rating: 3.5 }],
    ["nota como string", { rating: "5" }],
    ["body acima de 2000 caracteres", { rating: 3, body: "a".repeat(2001) }],
    ["hasSpoiler não booleano", { rating: 3, hasSpoiler: "sim" }],
  ])("retorna 400 para payload inválido: %s", async (_descricao, body) => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    logarComo(outroUsuario)

    const res = await enviarReview(
      requisicao(urlReviews(conteudo.id), { method: "POST", body }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(400)
    expect(corpo.error.code).toBe("VALIDATION_ERROR")
    expect(await prisma.review.count()).toBe(0)
  })

  it("retorna 201 e cria a review com hasSpoiler padrão false", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    logarComo(outroUsuario)

    const res = await enviarReview(
      requisicao(urlReviews(conteudo.id), {
        method: "POST",
        body: { rating: 4, body: "Muito bom" },
      }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(201)
    expect(corpo.data.rating).toBe(4)
    expect(corpo.data.hasSpoiler).toBe(false)
    expect(corpo.data.user.id).toBe(outroUsuario.id)

    const noBanco = await prisma.review.findUniqueOrThrow({
      where: { userId_contentId: { userId: outroUsuario.id, contentId: conteudo.id } },
    })
    expect(noBanco.rating).toBe(4)
    expect(noBanco.body).toBe("Muito bom")
  })

  it("retorna 201 aceitando body nulo e hasSpoiler verdadeiro", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    logarComo(usuario)

    const res = await enviarReview(
      requisicao(urlReviews(conteudo.id), {
        method: "POST",
        body: { rating: 2, body: null, hasSpoiler: true },
      }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(201)
    expect(corpo.data.body).toBeNull()
    expect(corpo.data.hasSpoiler).toBe(true)
  })

  it("atualiza a review existente (upsert) sem duplicar", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    logarComo(usuario)

    await enviarReview(
      requisicao(urlReviews(conteudo.id), { method: "POST", body: { rating: 3 } }),
      params({ id: conteudo.id })
    )
    const segunda = await enviarReview(
      requisicao(urlReviews(conteudo.id), {
        method: "POST",
        body: { rating: 5, body: "Mudei de ideia", hasSpoiler: true },
      }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(segunda)

    expect(status).toBe(201)
    expect(corpo.data.rating).toBe(5)

    expect(await prisma.review.count({ where: { contentId: conteudo.id } })).toBe(1)
    const noBanco = await prisma.review.findUniqueOrThrow({
      where: { userId_contentId: { userId: usuario.id, contentId: conteudo.id } },
    })
    expect(noBanco.rating).toBe(5)
    expect(noBanco.hasSpoiler).toBe(true)
  })

  it("retorna 500 quando a persistência falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(prisma.review, "upsert").mockRejectedValueOnce(new Error("falha simulada"))

    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    logarComo(usuario)

    const res = await enviarReview(
      requisicao(urlReviews(conteudo.id), { method: "POST", body: { rating: 4 } }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(500)
    expect(corpo.error.code).toBe("INTERNAL_ERROR")
    expect(await prisma.review.count()).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════
// DELETE /api/contents/[id]/reviews
// ═══════════════════════════════════════════════════════════

describe("DELETE /api/contents/[id]/reviews", () => {
  it("retorna 401 quando não autenticado e mantém a review", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    await prisma.review.create({
      data: { userId: usuario.id, contentId: conteudo.id, rating: 4 },
    })

    const res = await removerReview(
      requisicao(urlReviews(conteudo.id), { method: "DELETE" }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(corpo.error.code).toBe("UNAUTHORIZED")
    expect(await prisma.review.count()).toBe(1)
  })

  it("retorna 404 quando o usuário não possui review, sem afetar a de outros", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    await prisma.review.create({
      data: { userId: usuario.id, contentId: conteudo.id, rating: 4 },
    })
    logarComo(outroUsuario)

    const res = await removerReview(
      requisicao(urlReviews(conteudo.id), { method: "DELETE" }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(404)
    expect(corpo.error.code).toBe("NOT_FOUND")
    expect(await prisma.review.count({ where: { userId: usuario.id } })).toBe(1)
  })

  it("retorna 200 e remove apenas a review do próprio usuário", async () => {
    const conteudo = await criarConteudo(usuario.id, "APPROVED")
    await prisma.review.create({
      data: { userId: usuario.id, contentId: conteudo.id, rating: 4 },
    })
    await prisma.review.create({
      data: { userId: outroUsuario.id, contentId: conteudo.id, rating: 2 },
    })
    logarComo(usuario)

    const res = await removerReview(
      requisicao(urlReviews(conteudo.id), { method: "DELETE" }),
      params({ id: conteudo.id })
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(corpo.data.message).toBe("Review removida")

    const removida = await prisma.review.findUnique({
      where: { userId_contentId: { userId: usuario.id, contentId: conteudo.id } },
    })
    expect(removida).toBeNull()

    const mantida = await prisma.review.findUnique({
      where: { userId_contentId: { userId: outroUsuario.id, contentId: conteudo.id } },
    })
    expect(mantida).not.toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════
// FLUXOS ENCADEADOS
// ═══════════════════════════════════════════════════════════

describe("fluxo completo: envio → aprovação → revisão", () => {
  it("usuário submete, admin aprova, usuário revisa e remove a review", async () => {
    // 1. Usuário submete o conteúdo
    logarComo(usuario)
    const submissao = await lerResposta(
      await submeterConteudo(requisicao(URL_CONTEUDOS, { method: "POST", body: conteudoValido() }))
    )
    expect(submissao.status).toBe(201)
    const id: string = submissao.corpo.data.id

    // 2. Enquanto PENDING: não aparece na listagem pública e não aceita review
    deslogar()
    const listagemAntes = await lerResposta(await listarConteudos(requisicao(URL_CONTEUDOS)))
    expect(listagemAntes.corpo.data).toEqual([])

    logarComo(outroUsuario)
    const reviewAntes = await lerResposta(
      await enviarReview(
        requisicao(urlReviews(id), { method: "POST", body: { rating: 5 } }),
        params({ id })
      )
    )
    expect(reviewAntes.status).toBe(404)

    // 3. Usuário comum não pode aprovar
    const tentativaUsuario = await lerResposta(
      await aprovar(requisicao(urlAprovar(id), { method: "PATCH" }), params({ id }))
    )
    expect(tentativaUsuario.status).toBe(403)

    // 4. Admin aprova
    logarComo(admin)
    const aprovacao = await lerResposta(
      await aprovar(requisicao(urlAprovar(id), { method: "PATCH" }), params({ id }))
    )
    expect(aprovacao.status).toBe(200)

    const aposAprovacao = await prisma.content.findUniqueOrThrow({ where: { id } })
    expect(aposAprovacao.status).toBe("APPROVED")
    expect(aposAprovacao.approvedById).toBe(admin.id)

    // 5. Agora aparece publicamente
    deslogar()
    const listagemDepois = await lerResposta(await listarConteudos(requisicao(URL_CONTEUDOS)))
    expect(listagemDepois.corpo.data.map((c: any) => c.id)).toEqual([id])

    // 6. Outro usuário avalia
    logarComo(outroUsuario)
    const review = await lerResposta(
      await enviarReview(
        requisicao(urlReviews(id), { method: "POST", body: { rating: 5, body: "Excelente" } }),
        params({ id })
      )
    )
    expect(review.status).toBe(201)

    // 7. Revisões são exibidas
    deslogar()
    const revisoes = await lerResposta(
      await listarReviews(requisicao(urlReviews(id)), params({ id }))
    )
    expect(revisoes.status).toBe(200)
    expect(revisoes.corpo.data).toHaveLength(1)
    expect(revisoes.corpo.data[0].user.id).toBe(outroUsuario.id)

    // 8. Admin não pode rejeitar conteúdo já aprovado
    logarComo(admin)
    const rejeicaoTardia = await lerResposta(
      await rejeitar(requisicao(urlRejeitar(id), { method: "PATCH" }), params({ id }))
    )
    expect(rejeicaoTardia.status).toBe(400)
    expect(rejeicaoTardia.corpo.error.code).toBe("INVALID_STATUS")
    expect((await prisma.content.findUniqueOrThrow({ where: { id } })).status).toBe("APPROVED")

    // 9. Usuário remove a própria review e a listagem fica vazia
    logarComo(outroUsuario)
    const remocao = await lerResposta(
      await removerReview(requisicao(urlReviews(id), { method: "DELETE" }), params({ id }))
    )
    expect(remocao.status).toBe(200)

    deslogar()
    const revisoesFinais = await lerResposta(
      await listarReviews(requisicao(urlReviews(id)), params({ id }))
    )
    expect(revisoesFinais.corpo.data).toEqual([])
    expect(revisoesFinais.corpo.meta.total).toBe(0)
  })
})

describe("fluxo completo: envio → rejeição → indisponibilidade", () => {
  it("conteúdo rejeitado some da listagem e não recebe reviews", async () => {
    // 1. Usuário submete
    logarComo(usuario)
    const submissao = await lerResposta(
      await submeterConteudo(requisicao(URL_CONTEUDOS, { method: "POST", body: conteudoValido() }))
    )
    expect(submissao.status).toBe(201)
    const id: string = submissao.corpo.data.id

    // 2. Admin rejeita
    logarComo(admin)
    const rejeicao = await lerResposta(
      await rejeitar(requisicao(urlRejeitar(id), { method: "PATCH" }), params({ id }))
    )
    expect(rejeicao.status).toBe(200)
    expect(rejeicao.corpo.data.status).toBe("REJECTED")

    const noBanco = await prisma.content.findUniqueOrThrow({ where: { id } })
    expect(noBanco.status).toBe("REJECTED")
    expect(noBanco.approvedById).toBe(admin.id)

    // 3. Rejeitar novamente é inválido
    const segunda = await lerResposta(
      await aprovar(requisicao(urlAprovar(id), { method: "PATCH" }), params({ id }))
    )
    expect(segunda.status).toBe(400)
    expect(segunda.corpo.error.code).toBe("INVALID_STATUS")

    // 4. Público não vê o conteúdo
    deslogar()
    const listagem = await lerResposta(await listarConteudos(requisicao(URL_CONTEUDOS)))
    expect(listagem.corpo.data).toEqual([])

    // 5. Usuário não consegue avaliar nem listar revisões
    logarComo(outroUsuario)
    const review = await lerResposta(
      await enviarReview(
        requisicao(urlReviews(id), { method: "POST", body: { rating: 3 } }),
        params({ id })
      )
    )
    expect(review.status).toBe(404)
    expect(await prisma.review.count()).toBe(0)

    deslogar()
    const revisoes = await lerResposta(
      await listarReviews(requisicao(urlReviews(id)), params({ id }))
    )
    expect(revisoes.status).toBe(404)
  })
})
