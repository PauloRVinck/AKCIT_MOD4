# Relatório — Testes de integração gerados por LLM

> Uma linha por execução (`run`). Números extraídos de
> `gerados/<run>/execucao.txt` e `gerados/<run>/metadados.json`.

## Configuração

| Item | Valor |
|---|---|
| Plataforma | Claude Code CLI em modo não interativo (`claude -p`) via [executar-llm.mjs](prompts/executar-llm.mjs) |
| Modelo | `claude-haiku-5-5` |
| Data das execuções | 2026-10-25 |
| Isolamento | sem ferramentas, `--safe-mode` (sem CLAUDE.md/plugins), system prompt neutro, diretório temporário vazio — o modelo só vê `prompt-final.md` |
| Interação | uma chamada por prompt, sem conversa de correção (v1) |

## Resultados por execução

Cobertura medida apenas nos arquivos do escopo de cada prompt.

| Run | Casos executados¹ | Passaram | Taxa de sucesso | Typecheck estrito² | Tokens (in → out) | Custo |
|---|---|---|---|---|---|---|
| A-v1 | 81 | 78 | 96,3% | 31 erros | 3.294 → 25.916 | US$ 0,0140 |
| B-v1 | 60 | 60 | 100% | 55 erros | 6.979 → 22.520 | US$ 0,0134 |
| C-v1 | 50 | 2 | 4,0% | 32 erros | 4.368 → 19.855 | US$ 0,0113 |

¹ Inclui as expansões de `it.each`.
² `tsc --strict`. Em A e B, 85 dos 86 erros vêm do tipo de retorno do helper
`lerResposta` (`data: unknown`, `error` opcional), uma limitação da
infraestrutura e não da LLM. O vitest remove os tipos e executa normalmente.
O único erro semântico de A é o `password` ausente (ver falhas). Em C, os 32
erros são a chamada `logarComo()` sem argumento.

### Cobertura por arquivo (statements / branches)

| Arquivo | A-v1 | B-v1 | C-v1 |
|---|---|---|---|
| `app/api/contents/route.ts` | 43% / 33% ³ | 100% / 100% | — |
| `app/api/contents/[id]/approve/route.ts` | 100% / 100% | 100% / 100% | — |
| `app/api/contents/[id]/reject/route.ts` | 100% / 100% | 100% / 100% | — |
| `app/api/contents/[id]/reviews/route.ts` | 94% / 100% ⁴ | 100% / 100% | — |
| `app/api/tmdb/search/route.ts` | — | — | 33% / 13% |
| `app/api/tmdb/[tmdbId]/route.ts` | — | — | 33% / 50% |
| `lib/tmdb.ts` | — | — | 16% / 2% |

³ O contrato do Prompt A não descreve `GET /api/contents` (listagem do
catálogo), mas o código enviado no Prompt B inclui esse handler. Parte da
diferença de cobertura nesse arquivo vem do escopo do contexto, não só do tipo
de prompt.
⁴ Linhas 60–61: o `catch` que responde 500. Uma especificação caixa-preta não
tem como provocar essa falha; B a provocou com `vi.spyOn(prisma.review, "upsert").mockRejectedValueOnce(...)`.

## Classificação das falhas

| Run | Teste | Esperado pelo teste | Obtido | Causa | Erro do teste ou do sistema? |
|---|---|---|---|---|---|
| A-v1 | paginação: página 1 com 10 itens; página 2 com o 11º | — | `PrismaClientValidationError` | O teste cria usuários extras com `prisma.user.create` sem `password`; o contrato não mostra o schema do banco | Teste |
| A-v1 | ordena das mais recentes para as mais antigas | — | `PrismaClientValidationError` | Mesma causa (helper `semearAvaliacoes` compartilhado) | Teste |
| A-v1 | o mesmo usuário não avalia o mesmo título duas vezes | 2ª avaliação ≠ 201 | 201 | A rota faz `upsert`: a 2ª avaliação sobrescreve a 1ª. O contrato (regra 4, vinda de `docs/discovery`) diz que não deve ser possível avaliar duas vezes | **Divergência especificação × implementação** |
| C-v1 | 46 testes | — | `TypeError: Cannot read properties of undefined (reading 'id')` | `logarComo()` chamado sem argumento. O prompt C cita o helper mas não diz que ele recebe um usuário, e não há `criarUsuarios` porque não há banco | Teste (prompt incompleto) |
| C-v1 | 2 testes "sem TMDB_API_KEY" | — | mesmo `TypeError` | Usam `carregarRotas()`, que reimporta `sessao` e chama `logarComo()` sem argumento | Teste (prompt incompleto) |

## Diversidade dos casos gerados

| Classe de cenário | A-v1 | B-v1 | C-v1 |
|---|---|---|---|
| Caminho feliz encadeado (sugerir → aprovar → avaliar → listar) | sim | sim | — |
| Autenticação (401) | sim | sim | sim |
| Autorização por papel (403) | sim | sim | — |
| Transição de estado inválida (`INVALID_STATUS`) | sim | sim | — |
| Recurso inexistente / não disponível (404) | sim | sim | sim |
| Valores-limite de validação (rating, body, synopsis, releaseYear) | sim (`it.each` com limites) | sim | — |
| Unicidade da avaliação (2ª review do mesmo usuário) | sim — **espera rejeição** | sim — **espera upsert (201)** | — |
| Isolamento entre usuários (`outroUsuario`) | pouco (1 uso) | amplo (17 usos) | — |
| Paginação de reviews | sim (falhou por setup) | sim | — |
| Falha de persistência (500 `INTERNAL_ERROR`) | não | sim (mock de Prisma) | — |
| Verificação do estado persistido no banco | 11 consultas | 27 consultas | — |
| Payload externo incompleto / mídia fora do domínio | — | — | sim (person, coleções, campos ausentes, gênero desconhecido) |
| Falha do serviço externo (HTTP 400–503, rede, credencial) | — | — | sim (projetado, mas não executou) |

## Ajustes de prompt

| De → para | O que mudar no prompt | Falha observada | Efeito |
|---|---|---|---|
| A-v1 → A-v2 | Informar que usuários adicionais devem ser criados com `password` (ou expor um helper `criarUsuario`) | 2 falhas de setup com Prisma | *a executar* |
| A-v1 → A-v2 | **Não** mudar a regra 4 do contrato: a falha é uma divergência real e deve ser decidida pelo time, não "corrigida" no prompt | — | — |
| B-v1 → B-v2 | Enviar também a especificação (regras de negócio) junto do código, para que o modelo não tome a implementação como oráculo | Suíte 100% verde que confirma o upsert | *a executar* |
| C-v1 → C-v2 | Documentar a assinatura `logarComo({ id, name, email, role })` com um exemplo de usuário | 46 de 48 falhas | *a executar* |

## Observações da execução v1

- **Contexto define o oráculo.** A e B testaram o mesmo fluxo. A, só com o
  contrato, esperou que a segunda avaliação fosse rejeitada e falhou. B, com o
  código, viu o `upsert` e escreveu um teste que confirma esse comportamento.
  B passou 100%, mas é o caso descrito na seção 3.3 do material: testes
  "essencialmente regressivos", que verificam o comportamento atual em vez do
  esperado.
- **Caixa-branca alcança o que a especificação não descreve.** B cobriu o
  `catch` de erro 500 com mock do Prisma e a listagem do catálogo. A não tinha
  como chegar a esses ramos.
- **Uma omissão no prompt derruba uma suíte inteira.** C desenhou bem as
  partições do serviço externo (status 400, 401, 404, 429, 500 e 503, falha de
  rede, credencial ausente, campos opcionais, limite de 10 itens), mas uma única
  suposição errada sobre a assinatura de um helper derrubou 48 de 50 casos. É o
  mesmo padrão da seção 3.7: a falha está na interface com o ambiente, não no
  raciocínio de teste.
- **Custo.** As três execuções custaram US$ 0,039 no total. A maior parte dos
  tokens de saída é raciocínio interno do modelo (≈20 mil por execução para
  arquivos de 600 a 950 linhas).

## Comentários para o fórum

### Como cada tipo de prompt influenciou a qualidade e a diversidade

<!-- Escreva com suas palavras a partir das observações acima. -->

### Quais ajustes de prompt foram necessários

<!-- Preencha após as execuções v2. -->

### Divergências entre especificação e implementação reveladas

<!-- Avaliação duplicada: upsert × "não deve ser possível avaliar duas vezes".
     Decida: corrigir a rota (409) ou atualizar a especificação. -->

### Link do repositório

<!-- URL do GitHub -->
