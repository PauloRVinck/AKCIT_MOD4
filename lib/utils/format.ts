// lib/utils/format.ts

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function formatContentType(type: "MOVIE" | "SERIES"): string {
  return type === "MOVIE" ? "Filme" : "Série"
}

export function formatContentStatus(status: "PENDING" | "APPROVED" | "REJECTED"): string {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
  }
  return map[status] ?? status
}

export function formatWatchStatus(status: string): string {
  const map: Record<string, string> = {
    WATCHING: "Assistindo",
    WATCHED: "Assistido",
    WANT_TO_WATCH: "Quero assistir",
    DROPPED: "Abandonado",
  }
  return map[status] ?? status
}

export function formatRating(rating: number): string {
  return `${rating}/5`
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}
