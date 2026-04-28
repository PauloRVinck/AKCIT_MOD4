// app/(main)/layout.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
