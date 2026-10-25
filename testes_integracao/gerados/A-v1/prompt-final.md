You are an experienced test engineer specializing in functional testing, REST API testing, and integration testing.

Create a black box integration test set in TypeScript using Vitest for the Prime Review API endpoints described in the specification delimited by #####. The test set must exercise the integration between the route handlers, the authentication session, and the PostgreSQL database, following the full flow: a user submits content, an admin approves or rejects it, and users review it.

Use Equivalence Partitioning and Boundary Value Analysis as the test criteria. The test set should cover the specification and all possible responses (status codes) of every endpoint. When a business rule spans more than one endpoint, write a test that chains the calls and checks the resulting state in the database.

Follow these five instructions for the generated test code:
1. Write a single TypeScript test file for Vitest (globals enabled). Save it as `testes_integracao/gerados/A-v1/fluxo-contrato.test.ts`.
2. Import route handlers directly from the Next.js App Router files, e.g. `import { POST } from "@/app/api/contents/route"` or `import { PATCH as approve } from "@/app/api/contents/[id]/approve/route"`. Call them as functions: `await POST(requisicao("/api/contents", { method: "POST", body }))` and, for dynamic routes, `await approve(requisicao(url, { method: "PATCH" }), params({ id }))`. Do not start an HTTP server and do not use supertest.
3. Use these existing helpers (do not reimplement them):
   - `import { requisicao, params, lerResposta } from "../../helpers/requisicao"` — `lerResposta(res)` returns `{ status, corpo }` where `corpo` is the JSON envelope.
   - `import { logarComo, deslogar } from "../../helpers/sessao"` — authentication is already mocked; `logarComo(user)` sets the session, every test starts logged out.
   - `import { limparBanco, criarUsuarios, criarConteudo, prisma } from "../../helpers/banco"` — `criarUsuarios()` returns `{ usuario, outroUsuario, admin }`; `criarConteudo(submittedById, status?)` creates a content (`PENDING` by default); `prisma` is a real PostgreSQL client.
4. Call `await limparBanco()` and `await criarUsuarios()` in `beforeEach` so every test starts from a known state.
5. Respond only with the TypeScript code of the test file.

#####
# Prime Review — Contrato das rotas de conteúdo e avaliação

> Especificação caixa-preta usada pelo Prompt A. Foi escrita a partir dos
> requisitos (`docs/discovery/01-descricao-sistema.md`) e das regras de
> validação, **sem** consultar o código das rotas. Ela faz o papel da
> especificação OpenAPI usada na seção 3.5 do material.

## Convenções

- Toda resposta é JSON com o envelope:
  - sucesso: `{ "data": <payload>, "meta"?: { "page", "total", "totalPages" } }`
  - erro: `{ "error": { "code": <string>, "message": <string>, "details"?: [...] } }`
- Códigos de erro (`error.code`): `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
  `VALIDATION_ERROR`, `INVALID_STATUS`, `INTERNAL_ERROR`.
- Autenticação por sessão. Papéis: `USER` e `ADMIN`.
- Ciclo de vida de um conteúdo: `PENDING` → `APPROVED` ou `REJECTED`.
  Só conteúdo `APPROVED` é visível publicamente.

## Regras de negócio

1. Qualquer usuário autenticado pode sugerir conteúdo; ele nasce `PENDING`.
2. Apenas `ADMIN` aprova ou rejeita, e apenas conteúdos `PENDING`.
3. Avaliações só existem para conteúdo `APPROVED`.
4. Uma avaliação é única por usuário/conteúdo — o mesmo usuário não deve
   conseguir avaliar o mesmo título duas vezes.
5. Um usuário só remove a própria avaliação.

## Endpoints

### `POST /api/contents` — sugerir conteúdo
- Autenticado (`USER` ou `ADMIN`).
- Corpo:
  | Campo | Regra |
  |---|---|
  | `title` | string, 1–255 caracteres, obrigatório |
  | `type` | `MOVIE` ou `SERIES`, obrigatório |
  | `synopsis` | string, 10–5000 caracteres, obrigatório |
  | `genres` | array com pelo menos 1 string não vazia |
  | `tmdbId` | inteiro positivo, opcional, aceita `null` |
  | `posterUrl` | URL válida, opcional, aceita `null` |
  | `releaseYear` | inteiro entre 1888 e (ano atual + 5), opcional, aceita `null` |
- Respostas: `201` (conteúdo criado, `status = PENDING`), `400`, `401`.

### `PATCH /api/contents/{id}/approve` — aprovar
- Apenas `ADMIN`.
- Respostas: `200` (conteúdo `APPROVED`), `400` (`INVALID_STATUS`), `401`, `403`, `404`.

### `PATCH /api/contents/{id}/reject` — rejeitar
- Apenas `ADMIN`.
- Respostas: `200` (conteúdo `REJECTED`), `400` (`INVALID_STATUS`), `401`, `403`, `404`.

### `GET /api/contents/{id}/reviews?page={n}` — listar avaliações
- Público.
- 10 avaliações por página, mais recentes primeiro, com `meta` de paginação.
- Respostas: `200`, `404` (conteúdo inexistente ou não disponível).

### `POST /api/contents/{id}/reviews` — avaliar
- Autenticado.
- Corpo:
  | Campo | Regra |
  |---|---|
  | `rating` | inteiro de 1 a 5, obrigatório |
  | `body` | string até 2000 caracteres, opcional, aceita `null` |
  | `hasSpoiler` | boolean, padrão `false` |
- Respostas: `201`, `400`, `401`, `404`.

### `DELETE /api/contents/{id}/reviews` — remover a própria avaliação
- Autenticado.
- Respostas: `200`, `401`, `404` (usuário não tem avaliação neste conteúdo).
#####
