// middleware.ts — proteção de rotas via NextAuth v5
// Node.js runtime necessário: next-auth/jose usa APIs não disponíveis na Edge
export const runtime = "nodejs"

import { auth } from "@/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/login", "/register"])
const AUTH_PATHS = new Set(["/login", "/register"])

export default auth(function middleware(req) {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session?.user

  // API routes têm proteção própria em cada handler
  if (nextUrl.pathname.startsWith("/api")) return NextResponse.next()

  // Usuário já autenticado tenta acessar login/register → redireciona
  if (AUTH_PATHS.has(nextUrl.pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/home", nextUrl))
  }

  // Rota protegida sem autenticação → redireciona para login
  if (!PUBLIC_PATHS.has(nextUrl.pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
}
