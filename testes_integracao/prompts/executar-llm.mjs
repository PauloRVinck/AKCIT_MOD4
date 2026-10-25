// testes_integracao/prompts/executar-llm.mjs — executa um prompt na LLM e registra a resposta
// Uso: node testes_integracao/prompts/executar-llm.mjs A-contrato-v1 [modelo]
//
// Roda o Claude Code em modo não interativo, isolado: sem ferramentas, sem
// CLAUDE.md/plugins (--safe-mode), system prompt neutro e diretório temporário
// vazio — o modelo só vê o texto de prompt-final.md.
// Grava em gerados/<run>/: resposta-bruta.md, metadados.json e o arquivo de teste.
import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const pastaPrompts = dirname(fileURLToPath(import.meta.url))
const raiz = resolve(pastaPrompts, "../..")

const [nome, modelo = "claude-haiku-5-5"] = process.argv.slice(2)
if (!nome) {
  console.error("Informe o prompt, ex.: node testes_integracao/prompts/executar-llm.mjs A-contrato-v1")
  process.exit(1)
}

execFileSync(process.execPath, [join(pastaPrompts, "montar.mjs"), nome], { stdio: "inherit" })

const fonte = readFileSync(join(pastaPrompts, `${nome.replace(/\.md$/, "")}.md`), "utf8")
const run = fonte.match(/^run:\s*(.+)$/m)[1].trim()
const arquivo = fonte.match(/^arquivo:\s*(.+)$/m)[1].trim()
const pastaRun = join(raiz, "testes_integracao", "gerados", run)
const prompt = readFileSync(join(pastaRun, "prompt-final.md"), "utf8")

// No Windows o cmd pode não ter o bin global do npm no PATH
const cliNpmWindows = join(process.env.APPDATA ?? "", "npm", "claude.cmd")
const cli = process.env.CLAUDE_CLI ?? (process.platform === "win32" && existsSync(cliNpmWindows) ? `"${cliNpmWindows}"` : "claude")

const isolado = mkdtempSync(join(tmpdir(), "llm-run-"))
const inicio = new Date()
const exec = spawnSync(
  cli,
  ["-p", "--safe-mode", "--tools", '""', "--model", modelo, "--system-prompt", '"You are a helpful assistant."', "--output-format", "json"],
  { cwd: isolado, input: prompt, encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 }
)
rmSync(isolado, { recursive: true, force: true })

if (exec.status !== 0) {
  console.error(exec.stderr || exec.stdout)
  process.exit(exec.status ?? 1)
}

const saida = JSON.parse(exec.stdout)
const resposta = saida.result ?? ""
const uso = saida.usage ?? {}

writeFileSync(join(pastaRun, "resposta-bruta.md"), resposta.endsWith("\n") ? resposta : resposta + "\n")

const metadados = {
  run,
  prompt: nome,
  modelo: Object.keys(saida.modelUsage ?? {})[0] ?? modelo,
  plataforma: "Claude Code CLI (modo -p, --safe-mode, sem ferramentas)",
  executadoEm: inicio.toISOString(),
  duracaoMs: saida.duration_ms,
  tokensEntrada: (uso.input_tokens ?? 0) + (uso.cache_creation_input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0),
  tokensSaida: uso.output_tokens,
  custoUsd: saida.total_cost_usd,
  sessionId: saida.session_id,
}
writeFileSync(join(pastaRun, "metadados.json"), JSON.stringify(metadados, null, 2) + "\n")

// Extrai o maior bloco de código TypeScript; sem bloco cercado, usa a resposta inteira
const blocos = [...resposta.matchAll(/```(?:typescript|ts)?\s*\n([\s\S]*?)```/g)].map((m) => m[1])
const codigo = blocos.length ? blocos.sort((a, b) => b.length - a.length)[0] : resposta
writeFileSync(join(pastaRun, arquivo), codigo.trimEnd() + "\n")

console.log(
  `${run}: ${metadados.modelo}, ${metadados.tokensEntrada} → ${metadados.tokensSaida} tokens, ` +
    `US$ ${metadados.custoUsd?.toFixed(4)} — salvo em testes_integracao/gerados/${run}/${arquivo}`
)
