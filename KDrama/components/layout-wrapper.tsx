"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  return (
    <>
      <Sidebar />
      <main className={isAuthPage ? "min-h-screen" : "ml-16 min-h-screen"}>
        {children}
      </main>
    </>
  )
}
