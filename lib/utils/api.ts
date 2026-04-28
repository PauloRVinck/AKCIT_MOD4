// lib/utils/api.ts — helper de fetch client-side tipado

export interface ApiMeta {
  page: number
  total: number
  totalPages: number
}

export interface ApiError {
  code: string
  message: string
  details?: unknown[]
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  const json: ApiResponse<T> = await res.json()
  return json
}
