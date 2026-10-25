#!/bin/sh
# Executado dentro do container "tests". Argumentos extras viram filtro do vitest.
set -e

apk add --no-cache openssl >/dev/null
npm ci --no-audit --no-fund --loglevel=error
npx prisma migrate deploy
npx vitest run --config testes_integracao/vitest.config.ts --coverage "$@"
