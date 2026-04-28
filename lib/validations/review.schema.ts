// lib/validations/review.schema.ts
import { z } from "zod"

export const createReviewSchema = z.object({
  rating: z
    .number({ required_error: "Nota é obrigatória" })
    .int()
    .min(1, "Nota mínima é 1")
    .max(5, "Nota máxima é 5"),
  body: z.string().max(2000, "Review deve ter no máximo 2000 caracteres").nullable().optional(),
  hasSpoiler: z.boolean().default(false),
})
