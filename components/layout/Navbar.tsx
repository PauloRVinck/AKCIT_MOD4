// components/layout/Navbar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Avatar } from "@/components/user/Avatar"
import { useState } from "react"

const navLinks = [
  { href: "/home", label: "Minha Lista" },
  { href: "/explore", label: "Explorar" },
  { href: "/content/new", label: "+ Cadastrar" },
]

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = session?.user?.role === "ADMIN"

  return (
    <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/home" className="text-lg font-bold text-white shrink-0">
          🎬 Prime<span className="text-brand-500">Review</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/pending"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-brand-500/20 text-brand-400"
                  : "text-brand-400 hover:bg-brand-500/20"
              }`}
            >
              Admin
            </Link>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Avatar
              name={session?.user?.name ?? "U"}
              avatarUrl={session?.user?.avatarUrl}
              size="sm"
            />
            <span className="hidden sm:block text-sm text-gray-300 max-w-[120px] truncate">
              {session?.user?.name}
            </span>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-10 w-48 card py-1 shadow-xl"
              onBlur={() => setMenuOpen(false)}
            >
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                onClick={() => setMenuOpen(false)}
              >
                Perfil
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/pending"
                  className="block px-4 py-2 text-sm text-brand-400 hover:bg-gray-800"
                  onClick={() => setMenuOpen(false)}
                >
                  Painel Admin
                </Link>
              )}
              <hr className="border-gray-700 my-1" />
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
