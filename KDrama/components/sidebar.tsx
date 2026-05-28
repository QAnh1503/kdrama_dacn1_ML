"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Layers, BarChart3, Film, Info, Settings, LogIn, User, Heart } from "lucide-react"

const navItems = [
  { icon: Layers, label: "Predict", href: "/" },
  { icon: BarChart3, label: "Charts", href: "/charts" },
  { icon: Film, label: "Browse", href: "/browse" },
  { icon: Heart, label: "Favorites", href: "/favorites", requiresAuth: true },
  { icon: Info, label: "About", href: "/about" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  // Don't show sidebar on login/signup pages
  if (pathname === "/login" || pathname === "/signup") {
    return null
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed left-0 top-0 z-50 flex h-full w-16 flex-col items-center bg-sidebar border-r border-sidebar-border py-4">
        {/* Logo */}
        {/* <Link href="/" className="mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            KD
          </div>
        </Link> */}
        {/* Logo */}
        <Link href="/" className="mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
            <Image
              src="/logoKD.png" // Đường dẫn tính từ thư mục public
              alt="K-Drama AI Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const requiresAuth = 'requiresAuth' in item && item.requiresAuth
            
            // Hide auth-required items when not logged in
            if (requiresAuth && !user) {
              return null
            }
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Auth Section */}
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          {isLoading ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full overflow-hidden border-2 transition-all",
                    pathname === "/profile"
                      ? "border-primary"
                      : "border-transparent hover:border-primary/50"
                  )}
                >
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/20">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {user.name}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/login"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="sr-only">Login</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                Login
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
