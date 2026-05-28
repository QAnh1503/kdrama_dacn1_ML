"use client"

import Image from "next/image"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Drama } from "@/components/types/drama"

interface DramaCardProps extends Drama {
  className?: string
  showInfo?: boolean
}

export function DramaCard({ 
  title, 
  year, 
  episodes, 
  rating, 
  imageUrl, 
  className,
  showInfo = true 
}: DramaCardProps) {
  return (
    <div 
      className={cn(
        "group relative aspect-[2/3] overflow-hidden rounded-xl bg-card cursor-pointer transition-transform hover:scale-105",
        className
      )}
    >
      <Image
        src={imageUrl}
        alt={title}
        fill
        className="object-cover transition-all duration-300 group-hover:brightness-75"
      />
      
      {showInfo && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-16">
          <h3 className="font-semibold text-white line-clamp-1">{title}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-300">
            <span>{year}</span>
            <span className="h-1 w-1 rounded-full bg-gray-400" />
            <span>{episodes} Eps</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">{rating}</span>
          </div>
        </div>
      )}
    </div>
  )
}
