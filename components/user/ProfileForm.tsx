// components/user/ProfileForm.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Avatar } from "@/components/user/Avatar"

interface ProfileFormProps {
  initialName: string
  initialAvatarUrl: string | null | undefined
  email: string
  onSave: (data: { name: string; avatarUrl: string | null }) => Promise<void>
}

export function ProfileForm({ initialName, initialAvatarUrl, email, onSave }: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      await onSave({ name, avatarUrl: avatarUrl || null })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={name} avatarUrl={avatarUrl || null} size="lg" />
        <div className="flex-1">
          <Input
            label="URL do avatar"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
            hint="URL de uma imagem pública"
          />
        </div>
      </div>

      <Input
        label="Nome"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        minLength={2}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Email</label>
        <input value={email} disabled className="input-base opacity-50 cursor-not-allowed" />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-400">Perfil atualizado com sucesso!</p>
      )}

      <Button type="submit" loading={loading}>
        Salvar alterações
      </Button>
    </form>
  )
}
