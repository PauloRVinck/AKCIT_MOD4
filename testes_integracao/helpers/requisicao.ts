// testes_integracao/helpers/requisicao.ts — monta NextRequest e lê o envelope { data, error, meta }
import { NextRequest } from "next/server"
import type { ApiResponse } from "@/lib/utils/api"

const BASE_URL = "http://localhost:3000"

export function requisicao(caminho: string, opcoes: { method?: string; body?: unknown } = {}) {
  const { method = "GET", body } = opcoes
  return new NextRequest(new URL(caminho, BASE_URL), {
    method,
    ...(body !== undefined && {
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  })
}

// Segundo argumento dos handlers de rotas dinâmicas (app/api/.../[id]/route.ts)
export function params<T extends Record<string, string>>(valores: T) {
  return { params: valores }
}

export async function lerResposta<T = unknown>(res: Response) {
  return { status: res.status, corpo: (await res.json()) as ApiResponse<T> }
}
