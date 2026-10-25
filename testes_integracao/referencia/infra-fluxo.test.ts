// Sanidade da infraestrutura (banco + mock de sessão). Não faz parte do experimento com LLM.
import { describe, it, expect, beforeEach } from "vitest"
import { POST as criarConteudo } from "@/app/api/contents/route"
import { requisicao, lerResposta } from "../helpers/requisicao"
import { logarComo } from "../helpers/sessao"
import { limparBanco, criarUsuarios, prisma, type UsuariosTeste } from "../helpers/banco"

describe("infra: POST /api/contents", () => {
  let usuarios: UsuariosTeste

  beforeEach(async () => {
    await limparBanco()
    usuarios = await criarUsuarios()
  })

  it("responde 401 sem sessão", async () => {
    const res = await criarConteudo(requisicao("/api/contents", { method: "POST", body: {} }))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(corpo.error?.code).toBe("UNAUTHORIZED")
  })

  it("persiste o conteúdo como PENDING para o usuário logado", async () => {
    logarComo(usuarios.usuario)

    const res = await criarConteudo(
      requisicao("/api/contents", {
        method: "POST",
        body: { title: "Duna", type: "MOVIE", synopsis: "Sinopse suficientemente longa.", genres: ["Ficção Científica"] },
      })
    )
    const { status, corpo } = await lerResposta<{ id: string }>(res)

    expect(status).toBe(201)
    const salvo = await prisma.content.findUniqueOrThrow({ where: { id: corpo.data!.id } })
    expect(salvo.status).toBe("PENDING")
    expect(salvo.submittedById).toBe(usuarios.usuario.id)
  })
})
