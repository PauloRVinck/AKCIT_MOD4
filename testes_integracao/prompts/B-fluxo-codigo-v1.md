---
run: B-v1
arquivo: fluxo-codigo.test.ts
---

# Prompt B — Cenários de fluxo a partir do código (caixa-branca)

- **Tipo:** estrutural / caixa-branca (base: Figuras 29 e 31 do material).
- **Critério:** cobertura de decisões (branches) das rotas envolvidas.
- **Contexto enviado:** código-fonte das rotas, schema Prisma, schemas Zod e
  as mesmas instruções de execução do Prompt A. **O contrato não é enviado**,
  para que a comparação A × B isole o efeito do tipo de contexto.
- **Cenário:** o mesmo do Prompt A.

<!-- PROMPT -->
You are an experienced test engineer specializing in code coverage, REST API testing, and integration testing.

Create a white box integration test set in TypeScript using Vitest for the Next.js route handlers delimited by *****. Use the Prisma schema and the validation schemas delimited by ##### as complementary information about the application. The test set must exercise the integration between the route handlers, the authentication session, and the PostgreSQL database, following the full flow: a user submits content, an admin approves or rejects it, and users review it.

The test set should be created to maximize coverage (decision coverage) of every route handler and to cover all possible responses (status codes). When a decision depends on state created by another endpoint, write a test that chains the calls and checks the resulting state in the database.

Follow these five instructions for the generated test code:
{{instrucoes}}

*****
{{arquivo:app/api/contents/route.ts}}
{{arquivo:app/api/contents/[id]/approve/route.ts}}
{{arquivo:app/api/contents/[id]/reject/route.ts}}
{{arquivo:app/api/contents/[id]/reviews/route.ts}}
{{arquivo:lib/utils/api-response.ts}}
*****

#####
{{arquivo:prisma/schema.prisma}}
{{arquivo:lib/validations/content.schema.ts}}
{{arquivo:lib/validations/review.schema.ts}}
#####
<!-- /PROMPT -->
