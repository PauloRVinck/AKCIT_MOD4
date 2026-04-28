// lib/validations/content.schema.ts
import { z } from "zod"

const currentYear = new Date().getFullYear()

export const createContentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(255),
  type: z.enum(["MOVIE", "SERIES"], { required_error: "Tipo é obrigatório" }),
  tmdbId: z.number().int().positive().nullable().optional(),
  synopsis: z.string().min(10, "Sinopse deve ter pelo menos 10 caracteres").max(5000),
  posterUrl: z.string().url("URL do poster inválida").nullable().optional(),
  releaseYear: z
    .number()
    .int()
    .min(1888, "Ano inválido")
    .max(currentYear + 5, "Ano inválido")
    .nullable()
    .optional(),
  genres: z.array(z.string().min(1)).min(1, "Pelo menos um gênero é obrigatório"),
})

export const updateContentSchema = createContentSchema.partial()

export const contentQuerySchema = z.object({
  type: z.enum(["MOVIE", "SERIES"]).optional(),
  genre: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
})
