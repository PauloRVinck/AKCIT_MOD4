// app/(auth)/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirm) {
      setError("As senhas não coincidem.")
      return
    }

    if (form.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      return
    }

    setLoading(true)

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error?.message ?? "Erro ao criar conta.")
      return
    }

    // Faz login automático após o cadastro
    const loginRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    if (loginRes?.error) {
      router.push("/login")
      return
    }

    router.push("/home")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block text-2xl font-bold text-white">
            🎬 Prime<span className="text-brand-500">Review</span>
          </Link>
          <p className="text-gray-400">Crie sua conta gratuita</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Nome
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-base"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-base"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-base"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300">
              Confirmar senha
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="input-base"
              placeholder="Repita a senha"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="text-brand-500 hover:text-brand-400 font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
