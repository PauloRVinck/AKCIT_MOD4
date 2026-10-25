1. Write a single TypeScript test file for Vitest (globals enabled). Save it as `testes_integracao/gerados/{{RUN}}/{{ARQUIVO}}`.
2. Import route handlers directly from the Next.js App Router files, e.g. `import { POST } from "@/app/api/contents/route"` or `import { PATCH as approve } from "@/app/api/contents/[id]/approve/route"`. Call them as functions: `await POST(requisicao("/api/contents", { method: "POST", body }))` and, for dynamic routes, `await approve(requisicao(url, { method: "PATCH" }), params({ id }))`. Do not start an HTTP server and do not use supertest.
3. Use these existing helpers (do not reimplement them):
   - `import { requisicao, params, lerResposta } from "../../helpers/requisicao"` — `lerResposta(res)` returns `{ status, corpo }` where `corpo` is the JSON envelope.
   - `import { logarComo, deslogar } from "../../helpers/sessao"` — authentication is already mocked; `logarComo(user)` sets the session, every test starts logged out.
   - `import { limparBanco, criarUsuarios, criarConteudo, prisma } from "../../helpers/banco"` — `criarUsuarios()` returns `{ usuario, outroUsuario, admin }`; `criarConteudo(submittedById, status?)` creates a content (`PENDING` by default); `prisma` is a real PostgreSQL client.
4. Call `await limparBanco()` and `await criarUsuarios()` in `beforeEach` so every test starts from a known state.
5. Respond only with the TypeScript code of the test file.
