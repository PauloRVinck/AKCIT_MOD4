import { describe, it, expect } from "vitest"
import { createContentSchema, updateContentSchema, contentQuerySchema } from "./content.schema"

const validContent = {
  title: "Inception",
  type: "MOVIE" as const,
  synopsis: "Um ladrão que rouba segredos por meio de sonhos compartilhados.",
  genres: ["Ação", "Ficção Científica"],
}

describe("createContentSchema", () => {
  it("aceita dados válidos", () => {
    expect(createContentSchema.safeParse(validContent).success).toBe(true)
  })

  it("aceita campos opcionais preenchidos", () => {
    const result = createContentSchema.safeParse({
      ...validContent,
      tmdbId: 27205,
      posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
      releaseYear: 2010,
    })
    expect(result.success).toBe(true)
  })

  it("rejeita título vazio", () => {
    const result = createContentSchema.safeParse({ ...validContent, title: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Título é obrigatório")
    }
  })

  it("rejeita tipo inválido", () => {
    const result = createContentSchema.safeParse({ ...validContent, type: "BOOK" })
    expect(result.success).toBe(false)
  })

  it("rejeita sinopse com menos de 10 caracteres", () => {
    const result = createContentSchema.safeParse({ ...validContent, synopsis: "Curta" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Sinopse deve ter pelo menos 10 caracteres")
    }
  })

  it("rejeita posterUrl inválida", () => {
    const result = createContentSchema.safeParse({ ...validContent, posterUrl: "nao-é-url" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("URL do poster inválida")
    }
  })

  it("rejeita ano de lançamento antes de 1888", () => {
    const result = createContentSchema.safeParse({ ...validContent, releaseYear: 1800 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Ano inválido")
    }
  })

  it("rejeita lista de gêneros vazia", () => {
    const result = createContentSchema.safeParse({ ...validContent, genres: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Pelo menos um gênero é obrigatório")
    }
  })
})

describe("updateContentSchema", () => {
  it("aceita objeto vazio (atualização parcial)", () => {
    expect(updateContentSchema.safeParse({}).success).toBe(true)
  })

  it("aceita apenas o título", () => {
    expect(updateContentSchema.safeParse({ title: "Novo Título" }).success).toBe(true)
  })
})

describe("contentQuerySchema", () => {
  it("aplica valores default para page e limit", () => {
    const result = contentQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(12)
    }
  })

  it("converte page e limit de string para número", () => {
    const result = contentQuerySchema.safeParse({ page: "2", limit: "20" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(20)
    }
  })

  it("rejeita limit acima de 50", () => {
    const result = contentQuerySchema.safeParse({ limit: "100" })
    expect(result.success).toBe(false)
  })

  it("filtra por tipo válido", () => {
    const result = contentQuerySchema.safeParse({ type: "SERIES" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe("SERIES")
    }
  })
})
