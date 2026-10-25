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
