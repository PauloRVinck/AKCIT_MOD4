// Substitui o NextAuth por uma sessão controlada pelo teste (ver helpers/sessao.ts)
import { vi, beforeEach } from "vitest"
import { deslogar } from "../helpers/sessao"

vi.mock("@/auth", async () => {
  const { sessaoAtual } = await import("../helpers/sessao")
  return { auth: vi.fn(async () => sessaoAtual()) }
})

beforeEach(() => {
  deslogar()
})
