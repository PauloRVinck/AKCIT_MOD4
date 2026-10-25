// Sanidade da infraestrutura (fetch do TMDB mockado). Não faz parte do experimento com LLM.
import { describe, it, expect, vi, afterEach } from "vitest"
import { GET as buscarTmdb } from "@/app/api/tmdb/search/route"
import { requisicao, lerResposta } from "../helpers/requisicao"
import { logarComo } from "../helpers/sessao"

const usuario = { id: "u1", name: "Usuária", email: "u@teste.local", role: "USER" as const }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("infra: GET /api/tmdb/search", () => {
  it("chama o TMDB e descarta resultados que não são filme ou série", async () => {
    const fetchMock = vi.fn(async (_url: string | URL) =>
      Response.json({
        results: [
          { id: 1, media_type: "movie", title: "Duna", overview: "", release_date: "2021-09-15", genre_ids: [878] },
          { id: 2, media_type: "person", name: "Denis Villeneuve" },
        ],
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    logarComo(usuario)

    const res = await buscarTmdb(requisicao("/api/tmdb/search?q=duna"))
    const { status, corpo } = await lerResposta<{ tmdbId: number }[]>(res)

    expect(status).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain("https://tmdb.teste/3/search/multi")
    expect(corpo.data?.map((r) => r.tmdbId)).toEqual([1])
  })
})
