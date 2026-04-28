// prisma/seed.ts
import { PrismaClient, ContentType, ContentStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed...")

  // ── Usuários ────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12)
  const userPassword = await bcrypt.hash("user123", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@primereview.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@primereview.com",
      password: adminPassword,
      role: "ADMIN",
    },
  })

  const user = await prisma.user.upsert({
    where: { email: "user@primereview.com" },
    update: {},
    create: {
      name: "Usuário Demo",
      email: "user@primereview.com",
      password: userPassword,
      role: "USER",
    },
  })

  console.log("✅ Usuários criados:", admin.email, user.email)

  // ── Conteúdos aprovados ─────────────────────────────────
  const contents = [
    {
      title: "Interstellar",
      type: ContentType.MOVIE,
      tmdbId: 157336,
      synopsis:
        "Com a Terra ameaçada por uma catástrofe alimentar, um ex-piloto da NASA lidera uma missão interestelar em busca de um novo lar para a humanidade, enfrentando buracos negros e paradoxos temporais.",
      posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      releaseYear: 2014,
      genres: ["Ficção Científica", "Drama", "Aventura"],
      status: ContentStatus.APPROVED,
    },
    {
      title: "Breaking Bad",
      type: ContentType.SERIES,
      tmdbId: 1396,
      synopsis:
        "Um professor de química do ensino médio diagnosticado com câncer terminal transforma-se em produtor de metanfetamina para garantir o futuro financeiro de sua família, mergulhando progressivamente no crime.",
      posterUrl: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      releaseYear: 2008,
      genres: ["Drama", "Crime", "Thriller"],
      status: ContentStatus.APPROVED,
    },
    {
      title: "Oppenheimer",
      type: ContentType.MOVIE,
      tmdbId: 872585,
      synopsis:
        "A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da bomba atômica durante a Segunda Guerra Mundial, que mudaria o mundo para sempre.",
      posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      releaseYear: 2023,
      genres: ["Drama", "História", "Thriller"],
      status: ContentStatus.APPROVED,
    },
    {
      title: "Succession",
      type: ContentType.SERIES,
      tmdbId: 76331,
      synopsis:
        "A disfuncional família Roy compete pelo controle de um conglomerado global de mídia, em uma batalha implacável de poder, ambição e traição.",
      posterUrl: "https://image.tmdb.org/t/p/w500/e2X8NMlQFqOBU6I4J9nFMPqMgO9.jpg",
      releaseYear: 2018,
      genres: ["Drama", "Comédia"],
      status: ContentStatus.APPROVED,
    },
    {
      title: "Dune",
      type: ContentType.MOVIE,
      tmdbId: 438631,
      synopsis:
        "Paul Atreides, um jovem brilhante e talentoso, viaja para o planeta mais perigoso do universo para garantir o futuro de sua família e de seu povo, no meio de conflitos por recursos preciosos.",
      posterUrl: "https://image.tmdb.org/t/p/w500/d5NXSklpcvwE3HP2SmweEvLyt3D.jpg",
      releaseYear: 2021,
      genres: ["Ficção Científica", "Aventura", "Drama"],
      status: ContentStatus.APPROVED,
    },
    {
      title: "The Last of Us",
      type: ContentType.SERIES,
      tmdbId: 100088,
      synopsis:
        "Vinte anos após a destruição da civilização moderna, Joel, um sobrevivente endurecido, é contratado para tirar Ellie, de 14 anos, de uma zona de quarentena opressiva. O que começa como uma tarefa difícil torna-se uma jornada brutal.",
      posterUrl: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
      releaseYear: 2023,
      genres: ["Drama", "Ação", "Ficção Científica"],
      status: ContentStatus.APPROVED,
    },
    {
      title: "Blade Runner 2049",
      type: ContentType.MOVIE,
      tmdbId: 335984,
      synopsis:
        "Um jovem blade runner descobre um segredo enterrado há muito tempo que tem o potencial de mergulhar o que resta da sociedade no caos, e decide rastrear Rick Deckard, um ex-blade runner desaparecido há trinta anos.",
      posterUrl: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
      releaseYear: 2017,
      genres: ["Ficção Científica", "Drama", "Mistério"],
      status: ContentStatus.APPROVED,
    },
  ]

  for (const content of contents) {
    const existing = await prisma.content.findFirst({
      where: { title: content.title, type: content.type },
    })

    if (!existing) {
      await prisma.content.create({
        data: {
          ...content,
          submittedById: admin.id,
          approvedById: admin.id,
        },
      })
    }
  }

  console.log("✅ Conteúdos de demonstração criados")

  // ── Conteúdo pendente de aprovação ──────────────────────
  const pending = await prisma.content.findFirst({
    where: { title: "Exemplo Pendente", submittedById: user.id },
  })

  if (!pending) {
    await prisma.content.create({
      data: {
        title: "Exemplo Pendente",
        type: ContentType.MOVIE,
        synopsis: "Um filme submetido pelo usuário demo aguardando aprovação do administrador.",
        genres: ["Drama"],
        status: ContentStatus.PENDING,
        submittedById: user.id,
      },
    })
    console.log("✅ Conteúdo pendente criado")
  }

  // ── Reviews de demonstração ─────────────────────────────
  const interstellar = await prisma.content.findFirst({
    where: { title: "Interstellar" },
  })

  if (interstellar) {
    await prisma.review.upsert({
      where: { userId_contentId: { userId: user.id, contentId: interstellar.id } },
      update: {},
      create: {
        userId: user.id,
        contentId: interstellar.id,
        rating: 5,
        body: "Uma obra-prima absoluta. A trilha sonora de Hans Zimmer combinada com as cenas do buraco negro deixam qualquer pessoa sem fôlego. Nolan superou a si mesmo.",
        hasSpoiler: false,
      },
    })

    await prisma.userContent.upsert({
      where: { userId_contentId: { userId: user.id, contentId: interstellar.id } },
      update: {},
      create: {
        userId: user.id,
        contentId: interstellar.id,
        status: "WATCHED",
      },
    })
  }

  console.log("✅ Reviews de demonstração criadas")
  console.log("\n🎬 Seed concluído com sucesso!")
  console.log("   Admin: admin@primereview.com / admin123")
  console.log("   User:  user@primereview.com  / user123")
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
