// components/ui/Badge.tsx

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info"

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-700 text-gray-300",
  success: "bg-green-900/50 text-green-400 border border-green-700",
  warning: "bg-yellow-900/50 text-yellow-400 border border-yellow-700",
  danger: "bg-red-900/50 text-red-400 border border-red-700",
  info: "bg-blue-900/50 text-blue-400 border border-blue-700",
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export function ContentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: "Pendente", variant: "warning" },
    APPROVED: { label: "Aprovado", variant: "success" },
    REJECTED: { label: "Rejeitado", variant: "danger" },
  }
  const { label, variant } = map[status] ?? { label: status, variant: "default" }
  return <Badge variant={variant}>{label}</Badge>
}

export function ContentTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="info">{type === "MOVIE" ? "Filme" : "Série"}</Badge>
  )
}
