// testes_integracao/helpers/sessao.ts — sessão simulada consumida pelo mock de "@/auth"

export type Papel = "USER" | "ADMIN"

export interface UsuarioSessao {
  id: string
  name: string
  email: string
  role: Papel
}

let atual: { user: UsuarioSessao } | null = null

export function logarComo(usuario: UsuarioSessao) {
  atual = { user: { id: usuario.id, name: usuario.name, email: usuario.email, role: usuario.role } }
}

export function deslogar() {
  atual = null
}

export function sessaoAtual() {
  return atual
}
