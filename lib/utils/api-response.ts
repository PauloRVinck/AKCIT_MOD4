// lib/utils/api-response.ts — helpers server-side para respostas padronizadas
import { NextResponse } from "next/server"
import type { ZodIssue } from "zod"

export function successResponse<T>(
  data: T,
  meta?: { page: number; total: number; totalPages: number },
  status = 200
) {
  return NextResponse.json({ data, ...(meta && { meta }) }, { status })
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: ZodIssue[]
) {
  return NextResponse.json(
    { error: { code, message, ...(details && { details }) } },
    { status }
  )
}
