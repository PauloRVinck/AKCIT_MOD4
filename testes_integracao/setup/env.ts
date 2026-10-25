// lib/tmdb.ts lê TMDB_API_KEY e TMDB_BASE_URL no momento do import,
// então os valores precisam existir antes de qualquer rota ser carregada.
process.env.TMDB_API_KEY ??= "chave-de-teste"
process.env.TMDB_BASE_URL ??= "https://tmdb.teste/3"
