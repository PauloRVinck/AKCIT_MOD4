// testes_integracao/helpers/banco.ts — estado conhecido do banco antes de cada teste
import type { ContentStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { UsuarioSessao } from "./sessao"

export { prisma }

function garantirBancoDeTeste() {
  const url = process.env.DATABASE_URL ?? ""
  if (!url.includes("_test")) {
    throw new Error(`Recusando limpar banco que não é de teste: ${url || "(DATABASE_URL vazia)"}`)
  }
}

export async function limparBanco() {
  garantirBancoDeTeste()
  await prisma.review.deleteMany()
  await prisma.userContent.deleteMany()
  await prisma.content.deleteMany()
  await prisma.user.deleteMany()
}

export interface UsuariosTeste {
  usuario: UsuarioSessao
  outroUsuario: UsuarioSessao
  admin: UsuarioSessao
}

export async function criarUsuarios(): Promise<UsuariosTeste> {
  const criar = (name: string, email: string, role: "USER" | "ADMIN") =>
    prisma.user.create({
      data: { name, email, role, password: "hash-irrelevante-nos-testes" },
      select: { id: true, name: true, email: true, role: true },
    })

  const [usuario, outroUsuario, admin] = await Promise.all([
    criar("Usuária Teste", "usuaria@teste.local", "USER"),
    criar("Outro Usuário", "outro@teste.local", "USER"),
    criar("Admin Teste", "admin@teste.local", "ADMIN"),
  ])

  return { usuario, outroUsuario, admin }
}

export async function criarConteudo(submittedById: string, status: ContentStatus = "PENDING") {
  return prisma.content.create({
    data: {
      title: "Filme de Teste",
      type: "MOVIE",
      synopsis: "Sinopse com mais de dez caracteres.",
      genres: ["Drama"],
      releaseYear: 2020,
      status,
      submittedById,
    },
  })
}
