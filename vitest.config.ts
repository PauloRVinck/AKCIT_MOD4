import { defineConfig, configDefaults } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Suíte de integração tem config própria (testes_integracao/vitest.config.ts)
    exclude: [...configDefaults.exclude, "testes_integracao/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
