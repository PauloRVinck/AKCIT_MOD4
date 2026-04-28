// components/user/Avatar.tsx
import Image from "next/image"
import { getInitials } from "@/lib/utils/format"

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: "sm" | "md" | "lg"
}

const sizes = { sm: 32, md: 40, lg: 64 }
const classes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-lg" }

export function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  const px = sizes[size]
  const cls = classes[size]

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={px}
        height={px}
        className={`${cls} rounded-full object-cover ring-1 ring-gray-700`}
      />
    )
  }

  return (
    <div
      className={`${cls} rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold ring-1 ring-gray-700 shrink-0`}
    >
      {getInitials(name)}
    </div>
  )
}
