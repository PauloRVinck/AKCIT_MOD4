```typescript
// testes_integracao/gerados/C-v1/tmdb-falhas.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { GET as search } from "@/app/api/tmdb/search/route"
import { GET as byId } from "@/app/api/tmdb/[tmdbId]/route"
import { requisicao, params, lerResposta } from "../../helpers/requisicao"
import { logarComo } from "../../helpers/sessao"

// ---------------------------------------------------------------------------
// Adaptadores: isolam os testes do envelope exato de lib/utils/api-response.
// ---------------------------------------------------------------------------

function codigoDeErro(corpo: any): string | undefined {
  return corpo?.error?.code ?? corpo?.code ?? corpo?.erro?.codigo
}

function dadosDeSucesso<T = any>(corpo: any): T {
  return corpo?.data ?? corpo?.dados ?? corpo
}

// ---------------------------------------------------------------------------
// Dados sintéticos (nenhum nome real de pessoa ou dado de usuário)
// ---------------------------------------------------------------------------

const FILME_ALFA = {
  id: 100001,
  media_type: "movie",
  title: "Filme Fictício Alfa",
  overview: "Sinopse sintética do filme alfa.",
  poster_path: "/poster-alfa.jpg",
  release_date: "2010-07-16",
  genre_ids: [878, 28],
}

const SERIE_BETA = {
  id: 200002,
  media_type: "tv",
  name: "Série Teste Beta",
  overview: "Sinopse sintética da série beta.",
  poster_path: "/poster-beta.jpg",
  first_air_date: "2019-03-10",
  genre_ids: [10765, 18],
}

const PESSOA_SINTETICA = {
  id: 300003,
  media_type: "person",
  name: "Pessoa Sintética",
}

const COLECAO_SINTETICA = {
  id: 400004,
  media_type: "collection",
  name: "Coleção Sintética",
}

const filmeSintetico = (i: number) => ({
  id: 500000 + i,
  media_type: "movie",
  title: `Filme Sintético ${i}`,
  overview: `Sinopse sintética ${i}`,
  poster_path: `/p${i}.jpg`,
  release_date: "2001-07-01",
  genre_ids: [28],
})

const serieSintetica = (i: number) => ({
  id: 600000 + i,
  media_type: "tv",
  name: `Série Sintética ${i}`,
  overview: `Sinopse série ${i}`,
  poster_path: null,
  first_air_date: "2005-07-01",
  genre_ids: [],
})

const ITEM_TMDB_FILME = {
  id: 603,
  title: "Filme Fictício Matrix",
  overview: "Sinopse sintética detalhada.",
  poster_path: "/detalhe-filme.jpg",
  release_date: "1999-07-15",
  genres: [{ id: 878, name: "Gênero Sintético" }],
}

const ITEM_TMDB_SERIE = {
  id: 1399,
  name: "Série Fictícia Detalhada",
  overview: "Sinopse sintética da série.",
  poster_path: "/detalhe-serie.jpg",
  first_air_date: "2011-04-17",
  genres: [{ id: 18, name: "Drama Sintético" }],
}

// ---------------------------------------------------------------------------
// Fetch falso
// ---------------------------------------------------------------------------

function tmdbResponde(corpo: unknown, status = 200) {
  const fetchMock = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function tmdbFalhaDeRede() {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function urlChamada(fetchMock: ReturnType<typeof vi.fn>, indice = 0): URL {
  return new URL(String(fetchMock.mock.calls[indice][0]))
}

// Recarrega as rotas e a sessão com o ambiente atual (usado nos testes de env).
async function carregarRotas() {
  vi.resetModules()
  const sessao = await import("../../helpers/sessao")
  const busca = await import("@/app/api/tmdb/search/route")
  const porId = await import("@/app/api/tmdb/[tmdbId]/route")
  return {
    logarComo: sessao.logarComo,
    search: busca.GET,
    byId: porId.GET,
  }
}

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  // Logs de erro das rotas não devem poluir a saída dos testes.
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ===========================================================================
// GET /api/tmdb/search — autenticação e validação
// ===========================================================================

describe("GET /api/tmdb/search — autenticação e validação", () => {
  it("sem sessão responde 401 e não chama o TMDB", async () => {
    const tmdb = tmdbResponde({ results: [] })

    const res = await search(requisicao("/api/tmdb/search?q=duna"))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(codigoDeErro(corpo)).toBe("UNAUTHORIZED")
    expect(tmdb).not.toHaveBeenCalled()
  })

  it("sem parâmetro q responde 400 e não chama o TMDB", async () => {
    await logarComo()
    const tmdb = tmdbResponde({ results: [] })

    const res = await search(requisicao("/api/tmdb/search"))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(400)
    expect(codigoDeErro(corpo)).toBe("VALIDATION_ERROR")
    expect(tmdb).not.toHaveBeenCalled()
  })

  it.each([
    ["um caractere", "a"],
    ["somente espaços", "%20%20%20"],
    ["um caractere cercado de espaços", "%20%20a%20%20"],
  ])("q com %s responde 400 e não chama o TMDB", async (_descricao, valor) => {
    await logarComo()
    const tmdb = tmdbResponde({ results: [] })

    const res = await search(requisicao(`/api/tmdb/search?q=${valor}`))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(400)
    expect(codigoDeErro(corpo)).toBe("VALIDATION_ERROR")
    expect(tmdb).not.toHaveBeenCalled()
  })

  it("q com exatamente dois caracteres é aceito (limite inferior)", async () => {
    await logarComo()
    const tmdb = tmdbResponde({ results: [] })

    const res = await search(requisicao("/api/tmdb/search?q=ab"))
    const { status } = await lerResposta(res)

    expect(status).toBe(200)
    expect(tmdb).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
// GET /api/tmdb/search — respostas bem-sucedidas e transformação
// ===========================================================================

describe("GET /api/tmdb/search — sucesso e transformação", () => {
  it("URL e parâmetros exatos enviados ao TMDB", async () => {
    await logarComo()
    const tmdb = tmdbResponde({ results: [] })

    await search(requisicao("/api/tmdb/search?q=duna"))

    expect(tmdb).toHaveBeenCalledTimes(1)
    const url = urlChamada(tmdb)
    expect(url.origin + url.pathname).toBe("https://tmdb.teste/3/search/multi")
    expect(url.searchParams.get("api_key")).toBe("chave-de-teste")
    expect(url.searchParams.get("query")).toBe("duna")
    expect(url.searchParams.get("language")).toBe("pt-BR")
    expect(url.searchParams.get("include_adult")).toBe("false")
    expect(tmdb.mock.calls[0][1]).toEqual({ next: { revalidate: 60 } })
  })

  it("codifica corretamente caracteres especiais e remove espaços das pontas", async () => {
    await logarComo()
    const tmdb = tmdbResponde({ results: [] })

    await search(
      requisicao(`/api/tmdb/search?q=${encodeURIComponent("  Homem-Aranha & Amigos  ")}`),
    )

    const url = urlChamada(tmdb)
    expect(url.searchParams.get("query")).toBe("Homem-Aranha & Amigos")
    expect(url.searchParams.get("include_adult")).toBe("false")
  })

  it("mantém apenas filmes e séries, descartando pessoas e coleções", async () => {
    await logarComo()
    tmdbResponde({
      results: [PESSOA_SINTETICA, FILME_ALFA, COLECAO_SINTETICA, SERIE_BETA],
    })

    const res = await search(requisicao("/api/tmdb/search?q=alfa"))
    const { status, corpo } = await lerResposta(res)
    const dados = dadosDeSucesso<any[]>(corpo)

    expect(status).toBe(200)
    expect(dados).toHaveLength(2)
    expect(dados.map((d) => d.type)).toEqual(["MOVIE", "SERIES"])
    expect(dados.map((d) => d.tmdbId)).toEqual([100001, 200002])
  })

  it("mapeia filme e série completos para o formato interno", async () => {
    await logarComo()
    tmdbResponde({ results: [FILME_ALFA, SERIE_BETA] })

    const res = await search(requisicao("/api/tmdb/search?q=alfa"))
    const { corpo } = await lerResposta(res)
    const [filme, serie] = dadosDeSucesso<any[]>(corpo)

    expect(filme).toEqual({
      tmdbId: 100001,
      title: "Filme Fictício Alfa",
      type: "MOVIE",
      synopsis: "Sinopse sintética do filme alfa.",
      posterUrl: "https://image.tmdb.org/t/p/w500/poster-alfa.jpg",
      releaseYear: 2010,
      genres: ["Ficção Científica", "Ação"],
    })

    expect(serie).toEqual({
      tmdbId: 200002,
      title: "Série Teste Beta",
      type: "SERIES",
      synopsis: "Sinopse sintética da série beta.",
      posterUrl: "https://image.tmdb.org/t/p/w500/poster-beta.jpg",
      releaseYear: 2019,
      genres: ["Sci-Fi & Fantasy", "Drama"],
    })
  })

  it("resultado vazio responde 200 com lista vazia", async () => {
    await logarComo()
    tmdbResponde({ results: [] })

    const res = await search(requisicao("/api/tmdb/search?q=zzzzzz"))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(dadosDeSucesso(corpo)).toEqual([])
  })

  it("payload sem a chave results responde 200 com lista vazia", async () => {
    await logarComo()
    tmdbResponde({ page: 1, total_results: 0 })

    const res = await search(requisicao("/api/tmdb/search?q=zzzzzz"))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(dadosDeSucesso(corpo)).toEqual([])
  })

  it("somente pessoas nos resultados responde 200 com lista vazia", async () => {
    await logarComo()
    tmdbResponde({ results: [PESSOA_SINTETICA, COLECAO_SINTETICA] })

    const res = await search(requisicao("/api/tmdb/search?q=pessoa"))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(dadosDeSucesso(corpo)).toEqual([])
  })

  it("campos opcionais ausentes viram null, string vazia ou lista vazia", async () => {
    await logarComo()
    tmdbResponde({
      results: [
        { id: 700001, media_type: "movie", title: "Filme Sem Dados" },
        { id: 700002, media_type: "tv", name: "Série Sem Datas", poster_path: null, genre_ids: [] },
      ],
    })

    const res = await search(requisicao("/api/tmdb/search?q=sem"))
    const { status, corpo } = await lerResposta(res)
    const [filme, serie] = dadosDeSucesso<any[]>(corpo)

    expect(status).toBe(200)
    expect(filme).toEqual({
      tmdbId: 700001,
      title: "Filme Sem Dados",
      type: "MOVIE",
      synopsis: "",
      posterUrl: null,
      releaseYear: null,
      genres: [],
    })
    expect(serie.posterUrl).toBeNull()
    expect(serie.releaseYear).toBeNull()
    expect(serie.genres).toEqual([])
  })

  it("release_date vazia cai para null mesmo com first_air_date ausente", async () => {
    await logarComo()
    tmdbResponde({
      results: [{ id: 700003, media_type: "movie", title: "Sem Ano", release_date: "" }],
    })

    const res = await search(requisicao("/api/tmdb/search?q=sem"))
    const { corpo } = await lerResposta(res)

    expect(dadosDeSucesso<any[]>(corpo)[0].releaseYear).toBeNull()
  })

  it("série sem first_air_date usa release_date quando presente e null quando ausente", async () => {
    await logarComo()
    tmdbResponde({
      results: [
        { id: 700004, media_type: "tv", name: "Série Sem Estreia", genre_ids: [] },
      ],
    })

    const res = await search(requisicao("/api/tmdb/search?q=estreia"))
    const { corpo } = await lerResposta(res)

    expect(dadosDeSucesso<any[]>(corpo)[0].releaseYear).toBeNull()
  })

  it("gênero desconhecido vira 'Outro' e gêneros conhecidos são preservados", async () => {
    await logarComo()
    tmdbResponde({
      results: [
        { id: 700005, media_type: "movie", title: "Gênero Estranho", genre_ids: [424242] },
        { id: 700006, media_type: "tv", name: "Gênero Misto", genre_ids: [10759, 999999] },
      ],
    })

    const res = await search(requisicao("/api/tmdb/search?q=genero"))
    const { corpo } = await lerResposta(res)
    const [soDesconhecido, misto] = dadosDeSucesso<any[]>(corpo)

    expect(soDesconhecido.genres).toEqual(["Outro"])
    expect(misto.genres).toEqual(["Ação & Aventura", "Outro"])
  })

  it("retorna no máximo 10 itens, mesmo com mais resultados do TMDB", async () => {
    await logarComo()
    const filmes = Array.from({ length: 25 }, (_, i) => filmeSintetico(i + 1))
    tmdbResponde({ results: filmes })

    const res = await search(requisicao("/api/tmdb/search?q=muitos"))
    const { status, corpo } = await lerResposta(res)
    const dados = dadosDeSucesso<any[]>(corpo)

    expect(status).toBe(200)
    expect(dados).toHaveLength(10)
    expect(dados.map((d) => d.tmdbId)).toEqual(
      Array.from({ length: 10 }, (_, i) => 500001 + i),
    )
  })

  it("o limite de 10 é aplicado depois de filtrar pessoas e coleções", async () => {
    await logarComo()
    const misturado = [
      PESSOA_SINTETICA,
      COLECAO_SINTETICA,
      PESSOA_SINTETICA,
      ...Array.from({ length: 12 }, (_, i) =>
        i % 2 === 0 ? filmeSintetico(i + 1) : serieSintetica(i + 1),
      ),
    ]
    tmdbResponde({ results: misturado })

    const res = await search(requisicao("/api/tmdb/search?q=misto"))
    const { corpo } = await lerResposta(res)
    const dados = dadosDeSucesso<any[]>(corpo)

    expect(dados).toHaveLength(10)
    expect(dados.every((d) => d.type === "MOVIE" || d.type === "SERIES")).toBe(true)
    expect(dados[0].tmdbId).toBe(500001)
    expect(dados[1].tmdbId).toBe(600002)
  })

  it("com as variáveis de ambiente alternativas, usa o host e a chave configurados", async () => {
    vi.stubEnv("TMDB_BASE_URL", "https://outro.teste/v3")
    vi.stubEnv("TMDB_API_KEY", "chave-alternativa")
    const { logarComo: logar, search: buscaAlt } = await carregarRotas()
    await logar()
    const tmdb = tmdbResponde({ results: [] })

    const res = await buscaAlt(requisicao("/api/tmdb/search?q=duna"))
    const { status } = await lerResposta(res)

    expect(status).toBe(200)
    const url = urlChamada(tmdb)
    expect(url.origin + url.pathname).toBe("https://outro.teste/v3/search/multi")
    expect(url.searchParams.get("api_key")).toBe("chave-alternativa")
  })
})

// ===========================================================================
// GET /api/tmdb/search — falhas do TMDB
// ===========================================================================

describe("GET /api/tmdb/search — falhas do TMDB", () => {
  it.each([400, 401, 404, 429, 500, 503])(
    "status HTTP %i do TMDB responde 502 TMDB_ERROR",
    async (statusTmdb) => {
      await logarComo()
      tmdbResponde({ status_message: "falha sintética" }, statusTmdb)

      const res = await search(requisicao("/api/tmdb/search?q=duna"))
      const { status, corpo } = await lerResposta(res)

      expect(status).toBe(502)
      expect(codigoDeErro(corpo)).toBe("TMDB_ERROR")
    },
  )

  it("falha de rede (fetch rejeitado) responde 502 TMDB_ERROR", async () => {
    await logarComo()
    const tmdb = tmdbFalhaDeRede()

    const res = await search(requisicao("/api/tmdb/search?q=duna"))
    const { status, corpo } = await lerResposta(res)

    expect(tmdb).toHaveBeenCalledTimes(1)
    expect(status).toBe(502)
    expect(codigoDeErro(corpo)).toBe("TMDB_ERROR")
  })

  it("sem TMDB_API_KEY não chama o TMDB e responde 502 TMDB_ERROR", async () => {
    // Uma chave vazia é tratada pelo módulo como ausente (guarda `if (!TMDB_API_KEY)`).
    vi.stubEnv("TMDB_API_KEY", "")
    const { logarComo: logar, search: buscaSemChave } = await carregarRotas()
    await logar()
    const tmdb = tmdbResponde({ results: [FILME_ALFA] })

    const res = await buscaSemChave(requisicao("/api/tmdb/search?q=duna"))
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(502)
    expect(codigoDeErro(corpo)).toBe("TMDB_ERROR")
    expect(tmdb).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// GET /api/tmdb/[tmdbId] — autenticação e validação
// ===========================================================================

describe("GET /api/tmdb/[tmdbId] — autenticação e validação", () => {
  it("sem sessão responde 401 e não chama o TMDB", async () => {
    const tmdb = tmdbResponde(ITEM_TMDB_FILME)

    const res = await byId(
      requisicao("/api/tmdb/603?type=movie"),
      params({ tmdbId: "603" }),
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(401)
    expect(codigoDeErro(corpo)).toBe("UNAUTHORIZED")
    expect(tmdb).not.toHaveBeenCalled()
  })

  it.each([
    ["texto", "abc"],
    ["número seguido de letras", "12abc"],
    ["letras seguidas de número", "abc12"],
  ])("tmdbId com %s responde 400 e não chama o TMDB", async (_descricao, id) => {
    await logarComo()
    const tmdb = tmdbResponde(ITEM_TMDB_FILME)

    const res = await byId(
      requisicao(`/api/tmdb/${id}?type=movie`),
      params({ tmdbId: id }),
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(400)
    expect(codigoDeErro(corpo)).toBe("VALIDATION_ERROR")
    expect(tmdb).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// GET /api/tmdb/[tmdbId] — URL, parâmetros e sucesso
// ===========================================================================

describe("GET /api/tmdb/[tmdbId] — URL e sucesso", () => {
  it("filme: URL e parâmetros exatos enviados ao TMDB", async () => {
    await logarComo()
    const tmdb = tmdbResponde(ITEM_TMDB_FILME)

    await byId(requisicao("/api/tmdb/603?type=movie"), params({ tmdbId: "603" }))

    expect(tmdb).toHaveBeenCalledTimes(1)
    const url = urlChamada(tmdb)
    expect(url.origin + url.pathname).toBe("https://tmdb.teste/3/movie/603")
    expect(url.searchParams.get("api_key")).toBe("chave-de-teste")
    expect(url.searchParams.get("language")).toBe("pt-BR")
    expect(url.searchParams.has("query")).toBe(false)
    expect(tmdb.mock.calls[0][1]).toEqual({ next: { revalidate: 3600 } })
  })

  it("série: usa o caminho /tv/{id} quando type=tv", async () => {
    await logarComo()
    const tmdb = tmdbResponde(ITEM_TMDB_SERIE)

    await byId(requisicao("/api/tmdb/1399?type=tv"), params({ tmdbId: "1399" }))

    const url = urlChamada(tmdb)
    expect(url.origin + url.pathname).toBe("https://tmdb.teste/3/tv/1399")
    expect(url.searchParams.get("api_key")).toBe("chave-de-teste")
    expect(url.searchParams.get("language")).toBe("pt-BR")
  })

  it.each([
    ["sem parâmetro type", "/api/tmdb/603"],
    ["type=movie", "/api/tmdb/603?type=movie"],
    ["type desconhecido", "/api/tmdb/603?type=foo"],
    ["type vazio", "/api/tmdb/603?type="],
  ])("%s cai no caminho /movie/{id}", async (_descricao, caminho) => {
    await logarComo()
    const tmdb = tmdbResponde(ITEM_TMDB_FILME)

    await byId(requisicao(caminho), params({ tmdbId: "603" }))

    const url = urlChamada(tmdb)
    expect(url.pathname).toBe("/3/movie/603")
  })

  it("filme completo é mapeado para o formato interno", async () => {
    await logarComo()
    tmdbResponde(ITEM_TMDB_FILME)

    const res = await byId(
      requisicao("/api/tmdb/603?type=movie"),
      params({ tmdbId: "603" }),
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(dadosDeSucesso(corpo)).toEqual({
      tmdbId: 603,
      title: "Filme Fictício Matrix",
      type: "MOVIE",
      synopsis: "Sinopse sintética detalhada.",
      posterUrl: "https://image.tmdb.org/t/p/w500/detalhe-filme.jpg",
      releaseYear: 1999,
      genres: ["Gênero Sintético"],
    })
  })

  it("série completa usa name e first_air_date e tipo SERIES", async () => {
    await logarComo()
    tmdbResponde(ITEM_TMDB_SERIE)

    const res = await byId(
      requisicao("/api/tmdb/1399?type=tv"),
      params({ tmdbId: "1399" }),
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(200)
    expect(dadosDeSucesso(corpo)).toEqual({
      tmdbId: 1399,
      title: "Série Fictícia Detalhada",
      type: "SERIES",
      synopsis: "Sinopse sintética da série.",
      posterUrl: "https://image.tmdb.org/t/p/w500/detalhe-serie.jpg",
      releaseYear: 2011,
      genres: ["Drama Sintético"],
    })
  })

  it("campos opcionais ausentes viram null, string vazia ou lista vazia", async () => {
    await logarComo()
    tmdbResponde({ id: 800001, title: "Sem Poster Nem Datas" })

    const res = await byId(
      requisicao("/api/tmdb/800001?type=movie"),
      params({ tmdbId: "800001" }),
    )
    const { status, corpo } = await lerResposta(res)
    const dados = dadosDeSucesso(corpo)

    expect(status).toBe(200)
    expect(dados.posterUrl).toBeNull()
    expect(dados.releaseYear).toBeNull()
    expect(dados.synopsis).toBe("")
    expect(dados.genres).toEqual([])
  })

  it("série sem first_air_date responde releaseYear null", async () => {
    await logarComo()
    tmdbResponde({ id: 800002, name: "Série Sem Estreia", poster_path: null, genres: [] })

    const res = await byId(
      requisicao("/api/tmdb/800002?type=tv"),
      params({ tmdbId: "800002" }),
    )
    const { corpo } = await lerResposta(res)

    expect(dadosDeSucesso(corpo).releaseYear).toBeNull()
  })

  it("com TMDB_BASE_URL alternativa, usa o host configurado", async () => {
    vi.stubEnv("TMDB_BASE_URL", "https://outro.teste/v3")
    vi.stubEnv("TMDB_API_KEY", "chave-alternativa")
    const { logarComo: logar, byId: buscaAlt } = await carregarRotas()
    await logar()
    const tmdb = tmdbResponde(ITEM_TMDB_FILME)

    await buscaAlt(requisicao("/api/tmdb/603?type=movie"), params({ tmdbId: "603" }))

    const url = urlChamada(tmdb)
    expect(url.origin + url.pathname).toBe("https://outro.teste/v3/movie/603")
    expect(url.searchParams.get("api_key")).toBe("chave-alternativa")
  })
})

// ===========================================================================
// GET /api/tmdb/[tmdbId] — falhas do TMDB
// ===========================================================================

describe("GET /api/tmdb/[tmdbId] — falhas do TMDB", () => {
  it.each([401, 404, 429, 500, 503])(
    "status HTTP %i do TMDB responde 404 NOT_FOUND (getTmdbById devolve null)",
    async (statusTmdb) => {
      await logarComo()
      tmdbResponde({ status_message: "falha sintética" }, statusTmdb)

      const res = await byId(
        requisicao("/api/tmdb/999999?type=movie"),
        params({ tmdbId: "999999" }),
      )
      const { status, corpo } = await lerResposta(res)

      expect(status).toBe(404)
      expect(codigoDeErro(corpo)).toBe("NOT_FOUND")
    },
  )

  it("falha de rede (fetch rejeitado) responde 502 TMDB_ERROR", async () => {
    await logarComo()
    const tmdb = tmdbFalhaDeRede()

    const res = await byId(
      requisicao("/api/tmdb/603?type=movie"),
      params({ tmdbId: "603" }),
    )
    const { status, corpo } = await lerResposta(res)

    expect(tmdb).toHaveBeenCalledTimes(1)
    expect(status).toBe(502)
    expect(codigoDeErro(corpo)).toBe("TMDB_ERROR")
  })

  it("sem TMDB_API_KEY não chama o TMDB e responde 502 TMDB_ERROR", async () => {
    vi.stubEnv("TMDB_API_KEY", "")
    const { logarComo: logar, byId: buscaSemChave } = await carregarRotas()
    await logar()
    const tmdb = tmdbResponde(ITEM_TMDB_FILME)

    const res = await buscaSemChave(
      requisicao("/api/tmdb/603?type=movie"),
      params({ tmdbId: "603" }),
    )
    const { status, corpo } = await lerResposta(res)

    expect(status).toBe(502)
    expect(codigoDeErro(corpo)).toBe("TMDB_ERROR")
    expect(tmdb).not.toHaveBeenCalled()
  })
})
```
