// types/next-auth.d.ts — extensão dos tipos do NextAuth v5
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "USER" | "ADMIN"
      avatarUrl?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: "USER" | "ADMIN"
    avatarUrl?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "USER" | "ADMIN"
    avatarUrl?: string | null
  }
}
