import { describe, it, expect } from "vitest"
import { createReviewSchema } from "./review.schema"

describe("createReviewSchema", () => {
  it("aceita review válida com nota e corpo", () => {
    const result = createReviewSchema.safeParse({
      rating: 4,
      body: "Excelente filme, recomendo muito!",
      hasSpoiler: false,
    })
    expect(result.success).toBe(true)
  })

  it("aceita review apenas com nota (body é opcional)", () => {
    expect(createReviewSchema.safeParse({ rating: 3 }).success).toBe(true)
  })

  it("usa hasSpoiler = false como default", () => {
    const result = createReviewSchema.safeParse({ rating: 5 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hasSpoiler).toBe(false)
    }
  })

  it("rejeita nota 0 (abaixo do mínimo)", () => {
    const result = createReviewSchema.safeParse({ rating: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nota mínima é 1")
    }
  })

  it("rejeita nota 6 (acima do máximo)", () => {
    const result = createReviewSchema.safeParse({ rating: 6 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nota máxima é 5")
    }
  })

  it("rejeita nota ausente", () => {
    const result = createReviewSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nota é obrigatória")
    }
  })

  it("rejeita body com mais de 2000 caracteres", () => {
    const result = createReviewSchema.safeParse({
      rating: 3,
      body: "x".repeat(2001),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Review deve ter no máximo 2000 caracteres")
    }
  })

  it("aceita body nulo", () => {
    expect(createReviewSchema.safeParse({ rating: 2, body: null }).success).toBe(true)
  })

  it("aceita nota decimal (inteiro)", () => {
    expect(createReviewSchema.safeParse({ rating: 5 }).success).toBe(true)
  })

  it("rejeita nota decimal não-inteira", () => {
    const result = createReviewSchema.safeParse({ rating: 3.5 })
    expect(result.success).toBe(false)
  })
})
