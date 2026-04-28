// app/(main)/content/new/page.tsx
import type { Metadata } from "next"
import { ContentForm } from "@/components/content/ContentForm"

export const metadata: Metadata = { title: "Cadastrar Conteúdo" }

export default function NewContentPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cadastrar conteúdo</h1>
        <p className="text-gray-400 text-sm mt-1">
          Use a busca do TMDB para preencher automaticamente ou preencha manualmente.
          Após envio, aguarde a aprovação de um administrador.
        </p>
      </div>
      <div className="card p-6">
        <ContentForm />
      </div>
    </div>
  )
}
