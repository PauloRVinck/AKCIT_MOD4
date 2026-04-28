import { describe, it, expect } from "vitest"
import {
  formatDate,
  formatDateShort,
  formatContentType,
  formatContentStatus,
  formatWatchStatus,
  formatRating,
  getInitials,
} from "./format"

describe("formatDate", () => {
  it("formata uma data no estilo longo pt-BR", () => {
    const result = formatDate(new Date("2024-06-15"))
    expect(result).toMatch(/junho/)
    expect(result).toMatch(/2024/)
  })

  it("aceita string como entrada", () => {
    const result = formatDate("2024-01-15T12:00:00")
    expect(result).toMatch(/2024/)
  })
})

describe("formatDateShort", () => {
  it("formata data no padrão dd/mm/aaaa", () => {
    const result = formatDateShort(new Date(2024, 5, 15))
    expect(result).toMatch(/15\/06\/2024/)
  })
})

describe("formatContentType", () => {
  it('retorna "Filme" para MOVIE', () => {
    expect(formatContentType("MOVIE")).toBe("Filme")
  })

  it('retorna "Série" para SERIES', () => {
    expect(formatContentType("SERIES")).toBe("Série")
  })
})

describe("formatContentStatus", () => {
  it('retorna "Pendente" para PENDING', () => {
    expect(formatContentStatus("PENDING")).toBe("Pendente")
  })

  it('retorna "Aprovado" para APPROVED', () => {
    expect(formatContentStatus("APPROVED")).toBe("Aprovado")
  })

  it('retorna "Rejeitado" para REJECTED', () => {
    expect(formatContentStatus("REJECTED")).toBe("Rejeitado")
  })
})

describe("formatWatchStatus", () => {
  it('retorna "Assistindo" para WATCHING', () => {
    expect(formatWatchStatus("WATCHING")).toBe("Assistindo")
  })

  it('retorna "Assistido" para WATCHED', () => {
    expect(formatWatchStatus("WATCHED")).toBe("Assistido")
  })

  it('retorna "Quero assistir" para WANT_TO_WATCH', () => {
    expect(formatWatchStatus("WANT_TO_WATCH")).toBe("Quero assistir")
  })

  it('retorna "Abandonado" para DROPPED', () => {
    expect(formatWatchStatus("DROPPED")).toBe("Abandonado")
  })

  it("retorna o próprio valor para status desconhecido", () => {
    expect(formatWatchStatus("UNKNOWN")).toBe("UNKNOWN")
  })
})

describe("formatRating", () => {
  it("formata a nota no padrão n/5", () => {
    expect(formatRating(3)).toBe("3/5")
    expect(formatRating(5)).toBe("5/5")
    expect(formatRating(1)).toBe("1/5")
  })
})

describe("getInitials", () => {
  it("retorna as iniciais de um nome completo", () => {
    expect(getInitials("João Silva")).toBe("JS")
  })

  it("usa apenas as duas primeiras palavras", () => {
    expect(getInitials("Maria da Silva Santos")).toBe("MD")
  })

  it("funciona com nome de uma única palavra", () => {
    expect(getInitials("Paulo")).toBe("P")
  })

  it("retorna em maiúsculas", () => {
    expect(getInitials("ana paula")).toBe("AP")
  })
})
