// app/(main)/profile/page.tsx
"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { ProfileForm } from "@/components/user/ProfileForm"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [tab, setTab] = useState<"profile" | "password">("profile")
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)

  if (!session?.user) return null

  async function handleSaveProfile(data: { name: string; avatarUrl: string | null }) {
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error?.message ?? "Erro ao salvar")
    await update({ name: data.name })
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError("")
    setPwSuccess(false)
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("As senhas não coincidem")
      return
    }
    setPwLoading(true)
    const res = await fetch("/api/users/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    })
    const json = await res.json()
    setPwLoading(false)
    if (!res.ok) { setPwError(json.error?.message ?? "Erro ao alterar senha"); return }
    setPwSuccess(true)
    setPwForm({ currentPassword: "", newPassword: "", confirm: "" })
    setTimeout(() => setPwSuccess(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Perfil</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
        {(["profile", "password"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "profile" ? "Dados do perfil" : "Alterar senha"}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === "profile" && (
          <ProfileForm
            initialName={session.user.name ?? ""}
            initialAvatarUrl={session.user.avatarUrl}
            email={session.user.email ?? ""}
            onSave={handleSaveProfile}
          />
        )}

        {tab === "password" && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Senha atual"
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
            <Input
              label="Nova senha"
              type="password"
              required
              minLength={8}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              hint="Mínimo 8 caracteres"
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              required
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            />
            {pwError && <p className="text-sm text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-green-400">Senha alterada com sucesso!</p>}
            <Button type="submit" loading={pwLoading}>
              Alterar senha
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
