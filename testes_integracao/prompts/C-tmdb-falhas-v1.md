---
run: C-v1
arquivo: tmdb-falhas.test.ts
---

# Prompt C — Dados sintéticos e falhas do serviço externo (TMDB)

- **Tipo:** geração de dados de teste e casos de erro na fronteira com um
  serviço externo (seções 3.5 e 4.2 — síntese de dados sem dados reais).
- **Critério:** particionamento das respostas do serviço externo (sucesso,
  vazio, campos ausentes, tipos de mídia fora do domínio, erro HTTP, falha de
  rede, credencial ausente).
- **Contexto enviado:** módulo de integração (`lib/tmdb.ts`) e as duas rotas
  que o expõem. O TMDB real nunca é chamado: o `fetch` é substituído.
- **Cenário:** integração aplicação ↔ TMDB.

<!-- PROMPT -->
You are an experienced test engineer specializing in integration testing with external services and in test data design.

Create an integration test set in TypeScript using Vitest for the Next.js route handlers that expose the TMDB integration module. The module and the routes are delimited by *****. The real TMDB API must never be called: replace the global `fetch` with `vi.stubGlobal("fetch", vi.fn(...))` and return synthetic TMDB payloads built by you. Do not use real people's names or any real user data in the payloads.

Design the synthetic payloads and failures by partitioning the possible behaviors of the external service:
- successful responses with movies, TV series and other media types mixed;
- empty results and results with optional fields missing (no poster, no dates, unknown genre ids);
- more results than the module returns;
- HTTP error statuses from TMDB and network failures (rejected fetch);
- missing API key.

Also cover the validation and authentication rules of the routes themselves, and assert the exact URL and query parameters sent to TMDB.

Follow these five instructions for the generated test code:
1. Write a single TypeScript test file for Vitest (globals enabled). Save it as `testes_integracao/gerados/{{RUN}}/{{ARQUIVO}}`.
2. Import the route handlers directly, e.g. `import { GET as search } from "@/app/api/tmdb/search/route"`, and call them as functions: `await search(requisicao("/api/tmdb/search?q=duna"))` or `await byId(requisicao("/api/tmdb/603?type=movie"), params({ tmdbId: "603" }))`. Do not start an HTTP server.
3. Use the existing helpers: `import { requisicao, params, lerResposta } from "../../helpers/requisicao"` (`lerResposta(res)` returns `{ status, corpo }`) and `import { logarComo } from "../../helpers/sessao"` (authentication is mocked; every test starts logged out). No database is needed.
4. The environment already defines `TMDB_API_KEY="chave-de-teste"` and `TMDB_BASE_URL="https://tmdb.teste/3"`. These are read when `lib/tmdb.ts` is imported, so a test that needs a different value must use `vi.resetModules()`, `vi.stubEnv(...)` and a dynamic `await import(...)` of the route. Restore stubs in `afterEach`.
5. Respond only with the TypeScript code of the test file.

*****
{{arquivo:lib/tmdb.ts}}
{{arquivo:app/api/tmdb/search/route.ts}}
{{arquivo:app/api/tmdb/[tmdbId]/route.ts}}
*****
<!-- /PROMPT -->
