# Prime Review

Plataforma web para avaliação e acompanhamento de filmes e séries, desenvolvida com Next.js 14, TypeScript e PostgreSQL. O projeto permite que usuários registrem o que estão assistindo, escrevam avaliações e descubram conteúdos avaliados pela comunidade.
<img width="1901" height="876" alt="primereview" src="https://github.com/user-attachments/assets/35e488c5-89fa-4a3b-82e2-e1459cd77510" />



---

## Funcionalidades

- **Autenticação** — cadastro e login com email e senha
- **Catálogo** — exploração de filmes e séries aprovados pela moderação
- **Avaliações** — nota de 1 a 5, texto livre e marcação de spoiler
- **Lista pessoal** — organização por status: *Assistindo*, *Assistido*, *Quero assistir* e *Abandonei*
- **Submissão de conteúdo** — usuários podem sugerir novos títulos com busca integrada ao TMDB
- **Painel administrativo** — aprovação ou rejeição de conteúdos pendentes
- **Perfil** — histórico de avaliações e gerenciamento da lista pessoal

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS |
| Banco de dados | PostgreSQL |
| ORM | Prisma |
| Autenticação | NextAuth v5 |
| Validação | Zod |
| Infra | Docker + Docker Compose |

---

## Estrutura do projeto

```
├── app/
│   ├── (auth)/          # Páginas de login e cadastro
│   ├── (main)/          # Páginas autenticadas (home, explorar, perfil, admin)
│   └── api/             # Rotas REST da API
├── components/          # Componentes de UI reutilizáveis
├── lib/                 # Utilitários, validações e clientes (Prisma, TMDB)
├── prisma/              # Schema, migrations e seed
└── types/               # Definições de tipos TypeScript
```

---

## Como executar

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose

### 1. Clone o repositório

```bash
git clone https://github.com/PauloRVinck/AKCIT_MOD4.git
cd AKCIT_MOD4
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite o `.env.local` com suas credenciais:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/prime_review"
NEXTAUTH_SECRET="seu-secret"
NEXTAUTH_URL="http://localhost:3000"
TMDB_API_KEY="sua-chave-tmdb"
```

### 3. Suba o banco de dados

```bash
docker-compose up -d
```

### 4. Execute as migrations e o seed

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Testes

O projeto utiliza [Vitest](https://vitest.dev/) para testes unitários. Os testes cobrem as camadas de lógica pura — utilitários e schemas de validação — que não dependem de banco de dados ou chamadas externas.

### Executar os testes

```bash
npm test              # Executa todos os testes uma vez
npm run test:watch    # Modo interativo (re-executa ao salvar)
```

### Cobertura atual

| Arquivo | O que é testado |
|---|---|
| `lib/utils/format.ts` | Formatação de datas, tipos, status e iniciais |
| `lib/validations/user.schema.ts` | Registro, login, atualização de perfil e senha |
| `lib/validations/content.schema.ts` | Criação, atualização parcial e filtros de conteúdo |
| `lib/validations/review.schema.ts` | Nota, corpo da review e flag de spoiler |

---

## Scripts disponíveis

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm test                 # Executa os testes unitários
npm run test:watch       # Testes em modo interativo
npm run db:migrate       # Executa as migrations
npm run db:seed          # Popula o banco com dados iniciais
npm run db:studio        # Abre o Prisma Studio
npm run docker:up        # Sobe os containers
npm run docker:down      # Derruba os containers
```

---

## Modelo de dados

O banco possui quatro entidades principais:

- **User** — usuário com papel `USER` ou `ADMIN`
- **Content** — filme ou série com status `PENDING`, `APPROVED` ou `REJECTED`
- **Review** — avaliação com nota, texto e flag de spoiler (única por usuário/conteúdo)
- **UserContent** — lista pessoal com status de acompanhamento

---

## Desenvolvimento assistido por IA

Este projeto foi desenvolvido como parte de um curso de desenvolvimento assistido por Inteligência Artificial, utilizando o **Claude Code** como ferramenta principal de apoio.

A IA participou ativamente em diversas etapas do ciclo de desenvolvimento:

**Arquitetura e modelagem**
O schema do banco de dados, a estrutura de rotas da API e a organização das camadas do projeto foram definidos em conjunto com a IA, que sugeriu boas práticas como a separação entre rotas autenticadas e públicas e o uso de Zod para validação nas bordas do sistema.

**Implementação de funcionalidades**
Componentes de UI, rotas de API, lógica de autenticação e integração com a API do TMDB foram escritos com auxílio direto da IA, que gerou código funcional, tipado e alinhado com os padrões do projeto.

**Revisão e qualidade**
A IA auxiliou na identificação de inconsistências, sugestões de refatoração e garantia de que convenções de nomenclatura e estrutura fossem mantidas ao longo do projeto.

**Controle de versão**
As mensagens de commit seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/), geradas com auxílio da IA a partir das alterações realizadas em cada etapa — tornando o histórico do repositório legível e rastreável.

> O uso da IA não substituiu o entendimento técnico, mas amplificou a capacidade de entrega ao reduzir o tempo gasto em tarefas repetitivas e acelerar a tomada de decisões de design.

---

## Licença

Projeto desenvolvido para fins educacionais.
