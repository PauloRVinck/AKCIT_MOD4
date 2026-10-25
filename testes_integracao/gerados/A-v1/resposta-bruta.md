```ts
import { POST as sugerirConteudo } from "@/app/api/contents/route";
import { PATCH as aprovar } from "@/app/api/contents/[id]/approve/route";
import { PATCH as rejeitar } from "@/app/api/contents/[id]/reject/route";
import {
  GET as listarAvaliacoes,
  POST as avaliar,
  DELETE as removerAvaliacao,
} from "@/app/api/contents/[id]/reviews/route";
import { requisicao, params, lerResposta } from "../../helpers/requisicao";
import { logarComo, deslogar } from "../../helpers/sessao";
import {
  limparBanco,
  criarUsuarios,
  criarConteudo,
  prisma,
} from "../../helpers/banco";

type Usuarios = Awaited<ReturnType<typeof criarUsuarios>>;
type Id = Awaited<ReturnType<typeof criarConteudo>>["id"];
type UserId = Usuarios["usuario"]["id"];
type Resposta = Awaited<ReturnType<typeof lerResposta>>;

const ANO_ATUAL = new Date().getFullYear();
let u: Usuarios;

beforeEach(async () => {
  await limparBanco();
  u = await criarUsuarios();
  await deslogar();
});

// ---------------------------------------------------------------------------
// Helpers locais (chamam os handlers diretamente)
// ---------------------------------------------------------------------------

const comoUsuario = () => logarComo(u.usuario);
const comoOutro = () => logarComo(u.outroUsuario);
const comoAdmin = () => logarComo(u.admin);

function corpoValido(extra: Record<string, unknown> = {}) {
  return {
    title: "Duna",
    type: "MOVIE",
    synopsis: "Uma sinopse de teste com mais de dez caracteres.",
    genres: ["Ficção científica"],
    tmdbId: 438631,
    posterUrl: "https://image.tmdb.org/t/p/w500/duna.jpg",
    releaseYear: 2021,
    ...extra,
  };
}

const sugerir = async (body: unknown): Promise<Resposta> =>
  lerResposta(
    await sugerirConteudo(requisicao("/api/contents", { method: "POST", body })),
  );

const aprovarConteudo = async (id: Id): Promise<Resposta> =>
  lerResposta(
    await aprovar(
      requisicao(`/api/contents/${id}/approve`, { method: "PATCH" }),
      params({ id: String(id) }),
    ),
  );

const rejeitarConteudo = async (id: Id): Promise<Resposta> =>
  lerResposta(
    await rejeitar(
      requisicao(`/api/contents/${id}/reject`, { method: "PATCH" }),
      params({ id: String(id) }),
    ),
  );

const listar = async (id: Id, page?: number): Promise<Resposta> => {
  const query = page === undefined ? "" : `?page=${page}`;
  return lerResposta(
    await listarAvaliacoes(
      requisicao(`/api/contents/${id}/reviews${query}`, { method: "GET" }),
      params({ id: String(id) }),
    ),
  );
};

const avaliarConteudo = async (id: Id, body: unknown): Promise<Resposta> =>
  lerResposta(
    await avaliar(
      requisicao(`/api/contents/${id}/reviews`, { method: "POST", body }),
      params({ id: String(id) }),
    ),
  );

const removerMinhaAvaliacao = async (id: Id): Promise<Resposta> =>
  lerResposta(
    await removerAvaliacao(
      requisicao(`/api/contents/${id}/reviews`, { method: "DELETE" }),
      params({ id: String(id) }),
    ),
  );

const statusDo = async (id: Id) =>
  (await prisma.content.findUnique({ where: { id } }))?.status;

const avaliacoesDo = (id: Id, userId?: UserId) =>
  prisma.review.count({
    where: { contentId: id, userId: userId ?? u.usuario.id },
  });

async function idInexistente(): Promise<Id> {
  const c = await criarConteudo(u.usuario.id);
  await prisma.content.delete({ where: { id: c.id } });
  return c.id;
}

/**
 * Cria `quantidade` usuários extras e uma avaliação para cada um,
 * com `createdAt` escalonado (índice 0 = mais recente).
 * Corpo de cada avaliação: "comentario <i>".
 */
async function semearAvaliacoes(
  contentId: Id,
  quantidade: number,
): Promise<UserId[]> {
  const ids: UserId[] = [];
  for (let i = 0; i < quantidade; i++) {
    const extra = await prisma.user.create({
      data: {
        email: `semeado${i}@teste.com`,
        name: `Semeado ${i}`,
        role: "USER",
      },
    });
    ids.push(extra.id);
  }
  await prisma.review.createMany({
    data: ids.map((userId, i) => ({
      userId,
      contentId,
      rating: 5,
      body: `comentario ${i}`,
      hasSpoiler: false,
      createdAt: new Date(Date.now() - i * 60_000),
    })),
  });
  return ids;
}

// ---------------------------------------------------------------------------
// Tabelas de partições e valores limite
// ---------------------------------------------------------------------------

const CASOS_CONTEUDO: Array<[string, Record<string, unknown>, number]> = [
  ["title: 0 caracteres (abaixo do mínimo)", { title: "" }, 400],
  ["title: 1 caractere (mínimo)", { title: "a" }, 201],
  ["title: 255 caracteres (máximo)", { title: "a".repeat(255) }, 201],
  ["title: 256 caracteres (acima do máximo)", { title: "a".repeat(256) }, 400],
  ["title: ausente", { title: undefined }, 400],
  ["type: MOVIE", { type: "MOVIE" }, 201],
  ["type: SERIES", { type: "SERIES" }, 201],
  ["type: fora do domínio", { type: "BOOK" }, 400],
  ["type: ausente", { type: undefined }, 400],
  ["synopsis: 9 caracteres (abaixo do mínimo)", { synopsis: "x".repeat(9) }, 400],
  ["synopsis: 10 caracteres (mínimo)", { synopsis: "x".repeat(10) }, 201],
  ["synopsis: 5000 caracteres (máximo)", { synopsis: "x".repeat(5000) }, 201],
  ["synopsis: 5001 caracteres (acima do máximo)", { synopsis: "x".repeat(5001) }, 400],
  ["synopsis: ausente", { synopsis: undefined }, 400],
  ["genres: array vazio", { genres: [] }, 400],
  ["genres: string vazia", { genres: [""] }, 400],
  ["genres: ausente", { genres: undefined }, 400],
  ["genres: uma string válida", { genres: ["Drama"] }, 201],
  ["tmdbId: ausente (opcional)", { tmdbId: undefined }, 201],
  ["tmdbId: null (opcional)", { tmdbId: null }, 201],
  ["tmdbId: 1 (mínimo positivo)", { tmdbId: 1 }, 201],
  ["tmdbId: 0 (não positivo)", { tmdbId: 0 }, 400],
  ["tmdbId: -1 (negativo)", { tmdbId: -1 }, 400],
  ["tmdbId: 1.5 (não inteiro)", { tmdbId: 1.5 }, 400],
  ["posterUrl: ausente (opcional)", { posterUrl: undefined }, 201],
  ["posterUrl: null (opcional)", { posterUrl: null }, 201],
  ["posterUrl: URL inválida", { posterUrl: "nao-e-url" }, 400],
  ["releaseYear: 1887 (abaixo do mínimo)", { releaseYear: 1887 }, 400],
  ["releaseYear: 1888 (mínimo)", { releaseYear: 1888 }, 201],
  ["releaseYear: ano atual + 5 (máximo)", { releaseYear: ANO_ATUAL + 5 }, 201],
  ["releaseYear: ano atual + 6 (acima do máximo)", { releaseYear: ANO_ATUAL + 6 }, 400],
  ["releaseYear: null (opcional)", { releaseYear: null }, 201],
];

const CASOS_AVALIACAO: Array<[string, Record<string, unknown>, number]> = [
  ["rating: 0 (abaixo do mínimo)", { rating: 0 }, 400],
  ["rating: 1 (mínimo)", { rating: 1 }, 201],
  ["rating: 5 (máximo)", { rating: 5 }, 201],
  ["rating: 6 (acima do máximo)", { rating: 6 }, 400],
  ["rating: 2.5 (não inteiro)", { rating: 2.5 }, 400],
  ["rating: ausente", { rating: undefined }, 400],
  ["body: ausente (opcional)", { body: undefined }, 201],
  ["body: null (opcional)", { body: null }, 201],
  ["body: 2000 caracteres (máximo)", { body: "x".repeat(2000) }, 201],
  ["body: 2001 caracteres (acima do máximo)", { body: "x".repeat(2001) }, 400],
  ["hasSpoiler: true", { hasSpoiler: true }, 201],
  ["hasSpoiler: não booleano", { hasSpoiler: "sim" }, 400],
];

const ACOES: Array<[string, (id: Id) => Promise<Resposta>, "APPROVED" | "REJECTED"]> = [
  ["aprovar", aprovarConteudo, "APPROVED"],
  ["rejeitar", rejeitarConteudo, "REJECTED"],
];

// ---------------------------------------------------------------------------
// POST /api/contents — sugerir conteúdo
// ---------------------------------------------------------------------------

describe("POST /api/contents — sugerir conteúdo", () => {
  it("401 sem sessão e nada é persistido", async () => {
    const r = await sugerir(corpoValido());
    expect(r.status).toBe(401);
    expect(r.corpo.error.code).toBe("UNAUTHORIZED");
    expect(await prisma.content.count()).toBe(0);
  });

  it("201 para USER: conteúdo nasce PENDING e registra o autor", async () => {
    await comoUsuario();
    const r = await sugerir(corpoValido());
    expect(r.status).toBe(201);
    expect(r.corpo.data.status).toBe("PENDING");

    const noBanco = await prisma.content.findUnique({
      where: { id: r.corpo.data.id },
    });
    expect(noBanco?.status).toBe("PENDING");
    expect(noBanco?.submittedById).toBe(u.usuario.id);
  });

  it("201 para ADMIN: qualquer papel autenticado pode sugerir", async () => {
    await comoAdmin();
    const r = await sugerir(corpoValido());
    expect(r.status).toBe(201);
    expect(r.corpo.data.status).toBe("PENDING");
  });

  it.each(CASOS_CONTEUDO)("%s → %i", async (_rotulo, sobrescrita, esperado) => {
    await comoUsuario();
    const r = await sugerir(corpoValido(sobrescrita));
    expect(r.status).toBe(esperado);
    if (esperado === 400) expect(r.corpo.error.code).toBe("VALIDATION_ERROR");
    if (esperado === 201) expect(r.corpo.data.status).toBe("PENDING");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/contents/{id}/approve | reject — moderação
// ---------------------------------------------------------------------------

describe.each(ACOES)("PATCH /api/contents/{id}/%s", (_nome, acao, destino) => {
  it("401 sem sessão e o status não muda", async () => {
    const c = await criarConteudo(u.usuario.id);
    const r = await acao(c.id);
    expect(r.status).toBe(401);
    expect(r.corpo.error.code).toBe("UNAUTHORIZED");
    expect(await statusDo(c.id)).toBe("PENDING");
  });

  it("403 para USER comum e o status não muda", async () => {
    const c = await criarConteudo(u.usuario.id);
    await comoUsuario();
    const r = await acao(c.id);
    expect(r.status).toBe(403);
    expect(r.corpo.error.code).toBe("FORBIDDEN");
    expect(await statusDo(c.id)).toBe("PENDING");
  });

  it("404 para conteúdo inexistente", async () => {
    const id = await idInexistente();
    await comoAdmin();
    const r = await acao(id);
    expect(r.status).toBe(404);
    expect(r.corpo.error.code).toBe("NOT_FOUND");
  });

  it(`200 para ADMIN: PENDING → ${destino} persistido`, async () => {
    const c = await criarConteudo(u.usuario.id);
    await comoAdmin();
    const r = await acao(c.id);
    expect(r.status).toBe(200);
    expect(r.corpo.data.status).toBe(destino);
    expect(await statusDo(c.id)).toBe(destino);
  });

  it.each(["APPROVED", "REJECTED"] as const)(
    "400 INVALID_STATUS quando o conteúdo já está %s",
    async (estadoAtual) => {
      const c = await criarConteudo(u.usuario.id, estadoAtual);
      await comoAdmin();
      const r = await acao(c.id);
      expect(r.status).toBe(400);
      expect(r.corpo.error.code).toBe("INVALID_STATUS");
      expect(await statusDo(c.id)).toBe(estadoAtual);
    },
  );
});

// ---------------------------------------------------------------------------
// POST /api/contents/{id}/reviews — avaliar
// ---------------------------------------------------------------------------

describe("POST /api/contents/{id}/reviews — avaliar", () => {
  const base = { rating: 4, body: "Ótimo filme", hasSpoiler: false };

  it("401 sem sessão e nenhuma avaliação é criada", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    const r = await avaliarConteudo(c.id, base);
    expect(r.status).toBe(401);
    expect(r.corpo.error.code).toBe("UNAUTHORIZED");
    expect(await prisma.review.count()).toBe(0);
  });

  it("404 para conteúdo inexistente", async () => {
    const id = await idInexistente();
    await comoUsuario();
    const r = await avaliarConteudo(id, base);
    expect(r.status).toBe(404);
    expect(r.corpo.error.code).toBe("NOT_FOUND");
  });

  it.each(["PENDING", "REJECTED"] as const)(
    "404 para conteúdo %s (avaliação só existe para APPROVED)",
    async (estado) => {
      const c = await criarConteudo(u.usuario.id, estado);
      await comoUsuario();
      const r = await avaliarConteudo(c.id, base);
      expect(r.status).toBe(404);
      expect(await prisma.review.count({ where: { contentId: c.id } })).toBe(0);
    },
  );

  it.each(CASOS_AVALIACAO)("%s → %i", async (_rotulo, sobrescrita, esperado) => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await comoUsuario();
    const r = await avaliarConteudo(c.id, { ...base, ...sobrescrita });
    expect(r.status).toBe(esperado);
    if (esperado === 400) expect(r.corpo.error.code).toBe("VALIDATION_ERROR");
    if (esperado === 201) expect(await avaliacoesDo(c.id)).toBe(1);
  });

  it("hasSpoiler assume false quando omitido", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await comoUsuario();
    const r = await avaliarConteudo(c.id, { rating: 3 });
    expect(r.status).toBe(201);
    const av = await prisma.review.findFirst({
      where: { contentId: c.id, userId: u.usuario.id },
    });
    expect(av?.hasSpoiler).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/contents/{id}/reviews — listar (público)
// ---------------------------------------------------------------------------

describe("GET /api/contents/{id}/reviews — listar", () => {
  it("200 público (sem sessão) para conteúdo aprovado sem avaliações", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    const r = await listar(c.id);
    expect(r.status).toBe(200);
    expect(r.corpo.data).toEqual([]);
    expect(r.corpo.meta.total).toBe(0);
  });

  it("404 para conteúdo inexistente", async () => {
    const id = await idInexistente();
    const r = await listar(id);
    expect(r.status).toBe(404);
    expect(r.corpo.error.code).toBe("NOT_FOUND");
  });

  it.each(["PENDING", "REJECTED"] as const)(
    "404 para conteúdo %s (não disponível publicamente)",
    async (estado) => {
      const c = await criarConteudo(u.usuario.id, estado);
      const r = await listar(c.id);
      expect(r.status).toBe(404);
    },
  );

  it("paginação: página 1 com 10 itens; página 2 com o 11º", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await semearAvaliacoes(c.id, 11);

    const p1 = await listar(c.id, 1);
    expect(p1.status).toBe(200);
    expect(p1.corpo.data).toHaveLength(10);
    expect(p1.corpo.meta).toMatchObject({ page: 1, total: 11, totalPages: 2 });

    const p2 = await listar(c.id, 2);
    expect(p2.status).toBe(200);
    expect(p2.corpo.data).toHaveLength(1);
    expect(p2.corpo.meta).toMatchObject({ page: 2, total: 11, totalPages: 2 });
  });

  it("ordena das mais recentes para as mais antigas", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await semearAvaliacoes(c.id, 11);

    const p1 = await listar(c.id, 1);
    expect(p1.corpo.data[0].body).toBe("comentario 0");

    const p2 = await listar(c.id, 2);
    expect(p2.corpo.data[0].body).toBe("comentario 10");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/contents/{id}/reviews — remover a própria avaliação
// ---------------------------------------------------------------------------

describe("DELETE /api/contents/{id}/reviews — remover a própria avaliação", () => {
  it("401 sem sessão e a avaliação permanece", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await prisma.review.create({
      data: { userId: u.usuario.id, contentId: c.id, rating: 4, hasSpoiler: false },
    });
    const r = await removerMinhaAvaliacao(c.id);
    expect(r.status).toBe(401);
    expect(r.corpo.error.code).toBe("UNAUTHORIZED");
    expect(await avaliacoesDo(c.id)).toBe(1);
  });

  it("404 para conteúdo inexistente", async () => {
    const id = await idInexistente();
    await comoUsuario();
    const r = await removerMinhaAvaliacao(id);
    expect(r.status).toBe(404);
    expect(r.corpo.error.code).toBe("NOT_FOUND");
  });

  it("404 quando o usuário não tem avaliação neste conteúdo", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await comoUsuario();
    const r = await removerMinhaAvaliacao(c.id);
    expect(r.status).toBe(404);
    expect(r.corpo.error.code).toBe("NOT_FOUND");
  });

  it("200 remove a própria avaliação do banco", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await comoUsuario();
    await avaliarConteudo(c.id, { rating: 4 });
    expect(await avaliacoesDo(c.id)).toBe(1);

    const r = await removerMinhaAvaliacao(c.id);
    expect(r.status).toBe(200);
    expect(await avaliacoesDo(c.id)).toBe(0);
  });

  it("não remove avaliação de outro usuário (404) e a original permanece", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await comoUsuario();
    await avaliarConteudo(c.id, { rating: 4 });

    await comoOutro();
    const r = await removerMinhaAvaliacao(c.id);
    expect(r.status).toBe(404);
    expect(await avaliacoesDo(c.id, u.usuario.id)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Fluxos ponta a ponta (regras que cruzam endpoints)
// ---------------------------------------------------------------------------

describe("fluxo completo: sugerir → moderar → avaliar → listar", () => {
  it("conteúdo sugerido, aprovado, avaliado e então visível publicamente", async () => {
    await comoUsuario();
    const sug = await sugerir(corpoValido());
    expect(sug.status).toBe(201);
    const id = sug.corpo.data.id;
    expect(await statusDo(id)).toBe("PENDING");

    // Regra 3: avaliação só para APPROVED
    const antes = await avaliarConteudo(id, { rating: 4 });
    expect(antes.status).toBe(404);
    expect(await prisma.review.count({ where: { contentId: id } })).toBe(0);

    // Regra 2: apenas ADMIN aprova
    await comoUsuario();
    expect((await aprovarConteudo(id)).status).toBe(403);
    expect(await statusDo(id)).toBe("PENDING");

    await comoAdmin();
    const apr = await aprovarConteudo(id);
    expect(apr.status).toBe(200);
    expect(await statusDo(id)).toBe("APPROVED");

    await comoUsuario();
    const av = await avaliarConteudo(id, {
      rating: 4,
      body: "Muito bom",
      hasSpoiler: false,
    });
    expect(av.status).toBe(201);
    expect(await avaliacoesDo(id)).toBe(1);

    await deslogar();
    const lista = await listar(id);
    expect(lista.status).toBe(200);
    expect(lista.corpo.meta.total).toBe(1);
    expect(lista.corpo.data[0].body).toBe("Muito bom");
  });

  it("conteúdo rejeitado não aceita avaliações e não aparece publicamente", async () => {
    await comoUsuario();
    const sug = await sugerir(corpoValido());
    const id = sug.corpo.data.id;

    await comoAdmin();
    const rej = await rejeitarConteudo(id);
    expect(rej.status).toBe(200);
    expect(await statusDo(id)).toBe("REJECTED");

    await comoUsuario();
    const av = await avaliarConteudo(id, { rating: 5 });
    expect(av.status).toBe(404);
    expect(await prisma.review.count({ where: { contentId: id } })).toBe(0);

    await deslogar();
    const lista = await listar(id);
    expect(lista.status).toBe(404);
  });

  it("conteúdo aprovado não pode mais ser rejeitado nem reaprovado", async () => {
    await comoUsuario();
    const sug = await sugerir(corpoValido());
    const id = sug.corpo.data.id;

    await comoAdmin();
    expect((await aprovarConteudo(id)).status).toBe(200);

    const rej = await rejeitarConteudo(id);
    expect(rej.status).toBe(400);
    expect(rej.corpo.error.code).toBe("INVALID_STATUS");

    const reapr = await aprovarConteudo(id);
    expect(reapr.status).toBe(400);
    expect(reapr.corpo.error.code).toBe("INVALID_STATUS");

    expect(await statusDo(id)).toBe("APPROVED");
  });
});

describe("fluxo de unicidade e remoção de avaliações", () => {
  it("o mesmo usuário não avalia o mesmo título duas vezes; outro usuário pode", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");

    await comoUsuario();
    expect((await avaliarConteudo(c.id, { rating: 3 })).status).toBe(201);

    const dup = await avaliarConteudo(c.id, { rating: 5 });
    expect(dup.status).not.toBe(201);
    expect(dup.corpo.error).toBeDefined();

    // A avaliação original não foi sobrescrita
    const original = await prisma.review.findFirst({
      where: { contentId: c.id, userId: u.usuario.id },
    });
    expect(original?.rating).toBe(3);
    expect(await avaliacoesDo(c.id)).toBe(1);

    await comoOutro();
    expect((await avaliarConteudo(c.id, { rating: 2 })).status).toBe(201);
    expect(await prisma.review.count({ where: { contentId: c.id } })).toBe(2);
  });

  it("após remover a própria avaliação, o usuário pode avaliar novamente", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await comoUsuario();

    expect((await avaliarConteudo(c.id, { rating: 4 })).status).toBe(201);
    expect(await avaliacoesDo(c.id)).toBe(1);

    expect((await removerMinhaAvaliacao(c.id)).status).toBe(200);
    expect(await avaliacoesDo(c.id)).toBe(0);

    // Segunda remoção: não há mais avaliação
    expect((await removerMinhaAvaliacao(c.id)).status).toBe(404);

    const nova = await avaliarConteudo(c.id, { rating: 2 });
    expect(nova.status).toBe(201);
    expect(await avaliacoesDo(c.id)).toBe(1);
  });

  it("a listagem reflete a remoção e a nova avaliação", async () => {
    const c = await criarConteudo(u.usuario.id, "APPROVED");
    await comoUsuario();
    await avaliarConteudo(c.id, { rating: 4, body: "primeira" });

    await deslogar();
    expect((await listar(c.id)).corpo.meta.total).toBe(1);

    await comoUsuario();
    await removerMinhaAvaliacao(c.id);

    await deslogar();
    expect((await listar(c.id)).corpo.meta.total).toBe(0);
  });
});
```
