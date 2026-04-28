import { describe, it, expect } from "vitest"
import { registerSchema, loginSchema, updateProfileSchema, updatePasswordSchema } from "./user.schema"

describe("registerSchema", () => {
  const valid = { name: "Paulo Vinck", email: "paulo@example.com", password: "senha123" }

  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it("rejeita nome com menos de 2 caracteres", () => {
    const result = registerSchema.safeParse({ ...valid, name: "A" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome deve ter pelo menos 2 caracteres")
    }
  })

  it("rejeita email inválido", () => {
    const result = registerSchema.safeParse({ ...valid, email: "nao-é-email" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email inválido")
    }
  })

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = registerSchema.safeParse({ ...valid, password: "abc" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Senha deve ter pelo menos 8 caracteres")
    }
  })
})

describe("loginSchema", () => {
  const valid = { email: "paulo@example.com", password: "qualquercoisa" }

  it("aceita dados válidos", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true)
  })

  it("rejeita email inválido", () => {
    const result = loginSchema.safeParse({ ...valid, email: "inválido" })
    expect(result.success).toBe(false)
  })

  it("rejeita senha vazia", () => {
    const result = loginSchema.safeParse({ ...valid, password: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Senha é obrigatória")
    }
  })
})

describe("updateProfileSchema", () => {
  it("aceita objeto vazio (todos os campos são opcionais)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true)
  })

  it("aceita nome válido", () => {
    expect(updateProfileSchema.safeParse({ name: "Novo Nome" }).success).toBe(true)
  })

  it("rejeita URL de avatar inválida", () => {
    const result = updateProfileSchema.safeParse({ avatarUrl: "nao-é-url" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("URL inválida")
    }
  })

  it("aceita avatarUrl nulo", () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: null }).success).toBe(true)
  })
})

describe("updatePasswordSchema", () => {
  const valid = { currentPassword: "senhaAtual1", newPassword: "novaSenha1" }

  it("aceita dados válidos", () => {
    expect(updatePasswordSchema.safeParse(valid).success).toBe(true)
  })

  it("rejeita nova senha com menos de 8 caracteres", () => {
    const result = updatePasswordSchema.safeParse({ ...valid, newPassword: "curta" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nova senha deve ter pelo menos 8 caracteres")
    }
  })

  it("rejeita senha atual vazia", () => {
    const result = updatePasswordSchema.safeParse({ ...valid, currentPassword: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Senha atual é obrigatória")
    }
  })
})
