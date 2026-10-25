---
run: A-v1
arquivo: fluxo-contrato.test.ts
---

# Prompt A — Contrato da API (caixa-preta)

- **Tipo:** funcional / caixa-preta (base: Figura 28 do material).
- **Critério:** particionamento de equivalência e análise do valor-limite,
  cobrindo todas as respostas (status) descritas no contrato.
- **Contexto enviado:** apenas o contrato (`contrato-api.md`) e as instruções
  de execução. **Nenhum código-fonte das rotas.**
- **Cenário:** fluxo sugerir → moderar → avaliar entre rotas, sessão e banco.

<!-- PROMPT -->
You are an experienced test engineer specializing in functional testing, REST API testing, and integration testing.

Create a black box integration test set in TypeScript using Vitest for the Prime Review API endpoints described in the specification delimited by #####. The test set must exercise the integration between the route handlers, the authentication session, and the PostgreSQL database, following the full flow: a user submits content, an admin approves or rejects it, and users review it.

Use Equivalence Partitioning and Boundary Value Analysis as the test criteria. The test set should cover the specification and all possible responses (status codes) of every endpoint. When a business rule spans more than one endpoint, write a test that chains the calls and checks the resulting state in the database.

Follow these five instructions for the generated test code:
{{instrucoes}}

#####
{{arquivo:testes_integracao/prompts/contrato-api.md}}
#####
<!-- /PROMPT -->
