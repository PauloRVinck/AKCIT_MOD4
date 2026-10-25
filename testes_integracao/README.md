# Testes de integração com GenAI — Prime Review

Exercício do fórum da Unidade III (C13 — Testes de Software Automatizados com
IA Generativa): definir tipos de prompt para apoiar testes de integração,
executá-los em uma LLM, registrar os testes gerados e comparar os resultados.

## Cenários de integração

| # | Cenário | Componentes integrados | Prompts |
|---|---|---|---|
| 1 | Sugerir → moderar → avaliar | rotas `app/api/contents/**` + sessão (NextAuth) + PostgreSQL (Prisma) + validação (Zod) | A, B |
| 2 | Busca de metadados externos | rotas `app/api/tmdb/**` + `lib/tmdb.ts` + API do TMDB (simulada) | C |

## Tipos de prompt

| Prompt | Tipo | Contexto enviado à LLM | Critério pedido | Base no material |
|---|---|---|---|---|
| [A](prompts/A-contrato-v1.md) | Contrato de API (caixa-preta) | só o [contrato](prompts/contrato-api.md) | partição de equivalência + valor-limite, todos os status | Fig. 28 |
| [B](prompts/B-fluxo-codigo-v1.md) | Cenários de fluxo (caixa-branca) | código das rotas + schemas | cobertura de decisões, todos os status | Fig. 29/31 |
| [C](prompts/C-tmdb-falhas-v1.md) | Dados sintéticos + falhas do serviço externo | `lib/tmdb.ts` + rotas TMDB | partição do comportamento do serviço externo | Seções 3.5 e 4.2 |

A e B miram o **mesmo cenário** e usam as **mesmas instruções de execução**
([instrucoes-harness.md](prompts/instrucoes-harness.md)). A única diferença é o
contexto (contrato × código), o que permite comparar o efeito do tipo de prompt.

## Estrutura

```
testes_integracao/
├── prompts/             # prompts versionados (v1, v2...) + contrato + montador
├── gerados/<run>/       # uma pasta por execução (A-v1, A-v2, B-v1...)
│   ├── prompt-final.md  #   prompt exato enviado (gerado pelo montador)
│   ├── resposta-bruta.md#   resposta da LLM, sem edição
│   ├── *.test.ts        #   arquivo de teste extraído da resposta
│   └── execucao.txt     #   saída do vitest + cobertura
├── referencia/          # 3 testes de sanidade da infraestrutura (fora do experimento)
├── helpers/             # sessão simulada, requisições, banco de teste
├── setup/               # env do TMDB e mock de "@/auth"
├── relatorio.md         # métricas e comentários para o fórum
└── docker-compose.test.yml + run.sh
```

## Como executar o experimento

**0. Validar a infraestrutura** (Docker Desktop precisa estar rodando):

```bash
npm run test:integration -- testes_integracao/referencia
```

**1. Montar o prompt** com o contexto atual do código:

```bash
node testes_integracao/prompts/montar.mjs A-contrato-v1
```

**2. Executar na LLM** (OpenRouter, Claude.ai, Copilot...) colando
`gerados/A-v1/prompt-final.md`. Anote o modelo, a data, os tokens e o custo.

**3. Registrar a resposta**: salve o texto completo em
`gerados/A-v1/resposta-bruta.md` e o código em
`gerados/A-v1/fluxo-contrato.test.ts`, **sem corrigir nada à mão**.

Os passos 1 a 3 também podem ser feitos de uma vez com o Claude Code CLI, em
uma execução isolada (sem ferramentas, sem CLAUDE.md, em diretório vazio),
que grava também `metadados.json` com modelo, tokens e custo:

```bash
node testes_integracao/prompts/executar-llm.mjs A-contrato-v1 [modelo]
```

**4. Rodar só aquela execução** e salvar a saída:

```bash
npm run test:integration -- testes_integracao/gerados/A-v1 > testes_integracao/gerados/A-v1/execucao.txt 2>&1
```

O relatório de cobertura fica em `testes_integracao/coverage/` (HTML) e o
resumo vai para o fim de `execucao.txt`.

**5. Iterar**: se houver falhas, classifique-as (erro do teste × defeito ou
divergência real do sistema), crie `prompts/A-contrato-v2.md` com o ajuste,
mude o `run` no frontmatter para `A-v2` e repita. Registre tudo em
[relatorio.md](relatorio.md).

**6. Encerrar**: `npm run test:integration:down`.

## Como a infraestrutura funciona

- **Banco real e descartável:** `db-test` é um PostgreSQL em `tmpfs`; o
  `run.sh` aplica as migrations antes da suíte. `limparBanco()` se recusa a
  rodar se a `DATABASE_URL` não contiver `_test`.
- **Sessão simulada:** `setup/auth-mock.ts` troca `@/auth` por uma função que
  devolve a sessão definida com `logarComo(usuario)`. Todo teste começa deslogado.
- **Handlers chamados diretamente:** sem servidor HTTP. A integração exercitada
  é rota ↔ sessão ↔ validação ↔ Prisma ↔ banco (cenário 1) e rota ↔ módulo
  TMDB ↔ `fetch` (cenário 2).
- **Isolamento do build:** a pasta fica fora do `tsconfig` raiz, do
  `.dockerignore` da imagem e do `npm run test` unitário, então testes gerados
  com erro não quebram o build nem a suíte existente.

## Cuidados (Unidade IV)

- Os prompts levam só código e dados sintéticos: nenhum dado de usuário real,
  `.env` ou chave do TMDB.
- Toda resposta da LLM fica versionada em `gerados/`, com o prompt exato que a
  originou, para manter a rastreabilidade da origem dos artefatos de teste.
- Um teste gerado que falha **não** é corrigido para "passar": primeiro decide-se
  se o teste está errado ou se o sistema diverge da especificação.
