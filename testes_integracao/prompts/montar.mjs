// testes_integracao/prompts/montar.mjs — gera o prompt pronto para colar na LLM
// Uso: node testes_integracao/prompts/montar.mjs A-contrato-v1
// Saída: testes_integracao/gerados/<run>/prompt-final.md
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const pastaPrompts = dirname(fileURLToPath(import.meta.url))
const raiz = resolve(pastaPrompts, "../..")

const nome = process.argv[2]
if (!nome) {
  console.error("Informe o prompt, ex.: node testes_integracao/prompts/montar.mjs A-contrato-v1")
  process.exit(1)
}

const fonte = readFileSync(join(pastaPrompts, `${nome.replace(/\.md$/, "")}.md`), "utf8").replace(/\r\n/g, "\n")

const frontmatter = Object.fromEntries(
  (fonte.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
    .split("\n")
    .map((linha) => linha.split(/:\s*/, 2))
    .filter(([chave, valor]) => chave && valor)
)
const { run, arquivo } = frontmatter
if (!run || !arquivo) throw new Error(`Frontmatter de ${nome} precisa de "run" e "arquivo"`)

const corpo = fonte.match(/<!-- PROMPT -->\n([\s\S]*?)\n<!-- \/PROMPT -->/)?.[1]
if (!corpo) throw new Error(`Bloco <!-- PROMPT --> não encontrado em ${nome}`)

const instrucoes = readFileSync(join(pastaPrompts, "instrucoes-harness.md"), "utf8").trim()

const linguagem = { ts: "typescript", prisma: "prisma", md: "markdown" }

const final = corpo
  .replaceAll("{{instrucoes}}", instrucoes)
  .replace(/\{\{arquivo:([^}]+)\}\}/g, (_, caminho) => {
    const conteudo = readFileSync(join(raiz, caminho), "utf8").replace(/\r\n/g, "\n").trimEnd()
    if (caminho.endsWith(".md")) return conteudo
    const ext = caminho.split(".").pop()
    return `// ${caminho}\n\`\`\`${linguagem[ext] ?? ""}\n${conteudo}\n\`\`\``
  })
  .replaceAll("{{RUN}}", run)
  .replaceAll("{{ARQUIVO}}", arquivo)

const pastaRun = join(raiz, "testes_integracao", "gerados", run)
mkdirSync(pastaRun, { recursive: true })
writeFileSync(join(pastaRun, "prompt-final.md"), final + "\n")

console.log(`Prompt montado: testes_integracao/gerados/${run}/prompt-final.md (${final.length} caracteres)`)
