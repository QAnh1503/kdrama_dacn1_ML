"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Star, Heart, Trash2, Play, X, MessageCircle } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"

// Cast member data
const castMembers = [
  { name: "Hyun Bin", role: "Ri Jeong-hyeok", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
  { name: "Son Ye-jin", role: "Yoon Se-ri", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
  { name: "Seo Ji-hye", role: "Seo Dan", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
  { name: "Kim Jung-hyun", role: "Gu Seung-jun", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
]

// User reviews data
const userReviews = [
  {
    id: 1,
    username: "DramaFan2024",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop",
    comment: "Best K-drama I have ever watched! The chemistry between the leads is amazing.",
    date: "January 15, 2024"
  },
  {
    id: 2,
    username: "SeoulWatcher",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=50&h=50&fit=crop",
    comment: "A perfect blend of romance, comedy, and political intrigue. Highly recommend!",
    date: "January 10, 2024"
  },
  {
    id: 3,
    username: "KoreanDrama",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=50&h=50&fit=crop",
    comment: "This drama made me laugh and cry. The supporting cast is also fantastic.",
    date: "January 5, 2024"
  },
]

// All dramas database
const allDramas = [
  { 
    id: 1, 
    title: "Crash Landing on You", 
    year: 2019, 
    episodes: 16, 
    rating: 9.1, 
    genre: "Romance",
    imageUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=800&fit=crop",
    description: "A South Korean heiress accidentally paraglides into North Korea and falls in love with an army officer who helps her hide. This heartwarming romance crosses political boundaries and showcases the power of love.",
    director: "Lee Jeong-hyo",
    cast: castMembers,
    trailerUrl: "https://www.youtube.com/embed/eXMjTXL2Vks",
    reviews: userReviews,
    likes: 2847
  },
  { id: 2, title: "Itaewon Class", year: 2020, episodes: 16, rating: 8.6, genre: "Drama", imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop", description: "An ex-con opens a bar in Itaewon and begins a quest to take down the family that ruined his life.", director: "Kim Sung-yoon", cast: castMembers, trailerUrl: "https://www.youtube.com/embed/NsYvP1KjNvs", reviews: userReviews, likes: 1923 },
  { id: 3, title: "Vincenzo", year: 2021, episodes: 20, rating: 8.9, genre: "Action", imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop", description: "A Korean-Italian mafia lawyer returns to Korea and uses unorthodox methods against a powerful conglomerate.", director: "Kim Hee-won", cast: castMembers, trailerUrl: "https://www.youtube.com/embed/MHb7RFNM3NQ", reviews: userReviews, likes: 2156 },
  { id: 4, title: "Hospital Playlist", year: 2020, episodes: 12, rating: 9.0, genre: "Melodrama", imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=600&fit=crop", description: "Five doctors who have been friends since medical school navigate their careers and personal lives.", director: "Shin Won-ho", cast: castMembers, trailerUrl: "https://www.youtube.com/embed/hDJCPVDTp5M", reviews: userReviews, likes: 1847 },
  { id: 5, title: "Reply 1988", year: 2015, episodes: 20, rating: 9.2, genre: "Comedy", imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop", description: "Five families living in the same neighborhood in 1988 Seoul share their stories of love and friendship.", director: "Shin Won-ho", cast: castMembers, trailerUrl: "https://www.youtube.com/embed/0g-G5hN2Hs8", reviews: userReviews, likes: 3124 },
  { id: 6, title: "Guardian", year: 2016, episodes: 16, rating: 8.7, genre: "Fantasy", imageUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop", description: "A goblin needs a human bride to end his immortal life, and finds one in a high school student.", director: "Lee Eung-bok", cast: castMembers, trailerUrl: "https://www.youtube.com/embed/yLUt_Giu4dg", reviews: userReviews, likes: 2567 },
  { id: 7, title: "Descendant of the Sun", year: 2016, episodes: 16, rating: 8.5, genre: "Romance", imageUrl: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop", description: "A love story between a soldier and a doctor set against the backdrop of a fictional war-torn country.", director: "Lee Eung-bok", cast: castMembers, trailerUrl: "https://www.youtube.com/embed/yJz8NHg7VkU", reviews: userReviews, likes: 1756 },
  { id: 8, title: "Hotel Del Luna", year: 2019, episodes: 16, rating: 8.8, genre: "Fantasy", imageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop", description: "A hotel for ghosts is run by an ill-tempered woman who is stuck there as punishment for a past sin.", director: "Oh Choong-hwan", cast: castMembers, trailerUrl: "https://www.youtube.com/embed/4gVhxJaHbEI", reviews: userReviews, likes: 2089 },
]

interface Drama {
  id: number
  title: string
  year: number
  episodes: number
  rating: number
  genre: string
  imageUrl: string
  description: string
  director: string
  cast: typeof castMembers
  trailerUrl: string
  reviews: typeof userReviews
  likes: number
}

export default function FavoritesPage() {
  const router = useRouter()
  const { user, isLoading, toggleLikeDrama, isLiked } = useAuth()
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const favoriteDramas = allDramas.filter(drama => user.likedDramas.includes(drama.id))

  const handleDramaClick = (drama: Drama) => {
    setSelectedDrama(drama)
    setIsDialogOpen(true)
  }

  const handleRemoveFavorite = (e: React.MouseEvent, dramaId: number) => {
    e.stopPropagation()
    toggleLikeDrama(dramaId)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-12 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">
          My <span className="text-primary">Favorites</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your personal collection of favorite K-Dramas
        </p>
      </div>

      <div className="container mx-auto px-6 py-8">
        {favoriteDramas.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Start building your collection by browsing our K-Drama library and clicking the heart icon on dramas you love.
              </p>
              <Button asChild>
                <Link href="/browse">Browse K-Dramas</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{favoriteDramas.length}</span> drama{favoriteDramas.length !== 1 ? 's' : ''} in your collection
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {favoriteDramas.map((drama) => (
                <Card 
                  key={drama.id} 
                  className="group relative overflow-hidden bg-card border-border cursor-pointer transition-all hover:border-primary/50"
                  onClick={() => handleDramaClick(drama)}
                >
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={drama.imageUrl}
                      alt={drama.title}
                      fill
                      className="object-cover transition-all group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Remove button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemoveFavorite(e, drama.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" className="w-full">
                        <Play className="mr-2 h-3 w-3" />
                        View Details
                      </Button>
                    </div>
                  </div>
                  
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{drama.title}</h3>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{drama.year}</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-yellow-500">{drama.rating}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-primary fill-primary" />
                        <span>{drama.likes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{drama.reviews.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Drama Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border p-0 overflow-hidden">
          {selectedDrama && (
            <ScrollArea className="max-h-[90vh]">
              {/* Banner Image */}
              <div className="relative aspect-video w-full">
                <Image
                  src={selectedDrama.imageUrl}
                  alt={selectedDrama.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Title & Info */}
                <div>
                  <h2 className="text-2xl font-bold">{selectedDrama.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold text-yellow-500">{selectedDrama.rating}</span>
                    </div>
                    <span>{selectedDrama.year}</span>
                    <span>{selectedDrama.episodes} Episodes</span>
                    <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">{selectedDrama.genre}</span>
                  </div>
                  {/* Stats: Likes & Reviews */}
                  <div className="mt-3 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Heart className="h-4 w-4 text-primary" />
                      <span><span className="font-semibold text-foreground">{selectedDrama.likes.toLocaleString()}</span> likes</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <span><span className="font-semibold text-foreground">{selectedDrama.reviews.length}</span> reviews</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {selectedDrama.description}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    variant={isLiked(selectedDrama.id) ? "default" : "outline"}
                    onClick={() => toggleLikeDrama(selectedDrama.id)}
                    className={isLiked(selectedDrama.id) ? "bg-primary" : ""}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isLiked(selectedDrama.id) ? "fill-current" : ""}`} />
                    {isLiked(selectedDrama.id) ? "Liked" : "Like"}
                  </Button>
                </div>

                {/* Trailer Section */}
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Trailer</h3>
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={selectedDrama.trailerUrl}
                      title={`${selectedDrama.title} Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>

                {/* Cast Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Cast</h3>
                  <div className="flex flex-wrap gap-6">
                    {selectedDrama.cast.map((member, index) => (
                      <div key={index} className="flex flex-col items-center text-center">
                        <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-muted">
                          <Image
                            src={member.image}
                            alt={member.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="mt-2 font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Reviews Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">User Reviews</h3>
                  <div className="space-y-4">
                    {selectedDrama.reviews.map((review) => (
                      <div key={review.id} className="flex gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                          <Image
                            src={review.avatar}
                            alt={review.username}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{review.username}</p>
                          <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                          <p className="text-xs text-primary mt-1">{review.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
