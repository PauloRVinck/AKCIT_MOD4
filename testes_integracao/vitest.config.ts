// testes_integracao/vitest.config.ts — suíte de integração (rotas + Prisma + TMDB mockado)
import { defineConfig } from "vitest/config"
import path from "path"

const raiz = path.resolve(__dirname, "..")

export default defineConfig({
  test: {
    root: raiz,
    environment: "node",
    globals: true,
    include: ["testes_integracao/**/*.test.ts"],
    setupFiles: ["testes_integracao/setup/env.ts", "testes_integracao/setup/auth-mock.ts"],
    // Todos os arquivos compartilham o mesmo banco de teste
    fileParallelism: false,
    coverage: {
      provider: "v8",
      // Só os arquivos que entram no escopo dos prompts A, B e C
      include: [
        "app/api/contents/route.ts",
        "app/api/contents/[[]id]/approve/route.ts",
        "app/api/contents/[[]id]/reject/route.ts",
        "app/api/contents/[[]id]/reviews/route.ts",
        "app/api/tmdb/**/*.ts",
        "lib/tmdb.ts",
      ],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "testes_integracao/coverage",
      // Testes gerados por LLM costumam ter falhas; a cobertura ainda precisa ser medida
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      "@": raiz,
    },
  },
})
