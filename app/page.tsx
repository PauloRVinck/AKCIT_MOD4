// app/page.tsx — landing pública
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function LandingPage() {
  const session = await auth()
  if (session?.user) redirect("/home")

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto space-y-8">
        {/* Logo */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl">🎬</span>
            <h1 className="text-5xl font-bold text-white">
              Prime<span className="text-brand-500">Review</span>
            </h1>
          </div>
          <p className="text-gray-400 text-xl">
            Cadastre, descubra e avalie filmes e séries.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: "📋", title: "Sua lista", desc: "Organize o que assistiu e o que quer assistir" },
            { icon: "⭐", title: "Avaliações", desc: "Dê notas e escreva reviews detalhadas" },
            { icon: "🔍", title: "Descubra", desc: "Explore o catálogo com metadados do TMDB" },
          ].map((f) => (
            <div key={f.title} className="card p-4 space-y-1">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="btn-primary text-center py-3 px-8 text-lg rounded-xl">
            Criar conta grátis
          </Link>
          <Link
            href="/login"
            className="btn-secondary text-center py-3 px-8 text-lg rounded-xl"
          >
            Entrar
          </Link>
        </div>

        <p className="text-gray-600 text-sm">
          Demo:{" "}
          <code className="text-gray-400">admin@primereview.com</code> /{" "}
          <code className="text-gray-400">admin123</code>
        </p>
      </div>
    </main>
  )
}
