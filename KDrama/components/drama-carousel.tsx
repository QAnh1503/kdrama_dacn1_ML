"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { DramaCard } from "@/components/drama-card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Drama } from "@/components/types/drama"

// interface Drama {
//   id: number
//   title: string
//   year: number
//   episodes: number
//   rating: number
//   imageUrl: string
//   [key: string]: unknown
// }

interface DramaCarouselProps {
  title: string
  dramas: Drama[]
  onDramaClick?: (drama: Drama) => void
}

export function DramaCarousel({ title, dramas, onDramaClick }: DramaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-border"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-border"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {dramas.map((drama) => (
          <div 
            key={drama.id} 
            className="flex-shrink-0 w-40 md:w-48"
            onClick={() => onDramaClick?.(drama)}
          >
            <DramaCard {...drama} />
          </div>
        ))}
      </div>
    </div>
  )
}
