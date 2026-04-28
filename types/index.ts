// types/index.ts — types globais customizados

import type { Content, Review, User, UserContent } from "@prisma/client"

// ── Perfil público de usuário (sem senha) ──────────────────
export type UserProfile = Omit<User, "password">

// ── Conteúdo com média de avaliações e contagem ────────────
export type ContentWithStats = Content & {
  _count: { reviews: number }
  _avg: { rating: number | null }
  submittedBy: { id: string; name: string }
}

// ── Conteúdo com reviews completas para página de detalhe ──
export type ContentWithReviews = Content & {
  _count: { reviews: number }
  _avg: { rating: number | null }
  submittedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
  reviews: ReviewWithUser[]
}

// ── Review com dados do usuário ────────────────────────────
export type ReviewWithUser = Review & {
  user: {
    id: string
    name: string
    avatarUrl: string | null
  }
}

// ── Item da lista pessoal com dados do conteúdo ────────────
export type UserContentWithContent = UserContent & {
  content: ContentWithStats
}

// ── Resposta paginada genérica ─────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    total: number
    totalPages: number
  }
}
