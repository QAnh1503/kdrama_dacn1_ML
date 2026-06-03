"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Film, User, Hash, Check } from "lucide-react"

// 🌟 Danh sách dữ liệu mẫu hiển thị (Bạn có thể thay đổi cho đúng tệp data K-Drama của bạn)
const AVAILABLE_GENRES = ["Romance", "Comedy", "Thriller", "Action", "Drama", "Fantasy", "Mystery", "Historical", "Sci-Fi", "Melodrama"]
const AVAILABLE_ACTORS = ["Lee Min-ho", "IU (Lee Ji-eun)", "Park Seo-joon", "Son Ye-jin", "Hyun Bin", "Song Joong-ki", "Gong Yoo", "Park Shin-hye", "Han Hyo-joo", "Kim Soo-hyun"]
const AVAILABLE_TAGS = ["Slow Burn", "Fake Relationship", "Strong Female Lead", "Revenge", "Bromance", "Tragic Past", "First Love", "Office Romance", "Supernatural"]

export default function OnboardingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<number | null>(null)
  
  // Trạng thái lưu danh sách lựa chọn của người dùng
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedActors, setSelectedActors] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Lấy user_id từ localStorage sau khi sign up thành công
  useEffect(() => {
    const savedUserId = localStorage.getItem("registered_user_id")
    if (savedUserId) {
      setUserId(parseInt(savedUserId, 10))
    } else {
      // Nếu không tìm thấy thông tin user, gán tạm id = 1 để dev test hoặc đẩy về trang signup
      setUserId(1) 
    }
  }, [])

  // Hàm toggle (Thêm/Xóa) item trong mảng chọn
  const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item))
    } else {
      setList([...list, item])
    }
  }

  const handleSubmit = async () => {
    if (!userId) {
      setError("User session not found. Please log in again.")
      return
    }

    if (selectedGenres.length === 0 && selectedActors.length === 0 && selectedTags.length === 0) {
      setError("Please select at least one preference to help personalize your feed!")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("http://localhost:8000/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          fav_genres: selectedGenres,
          fav_actors: selectedActors,
          fav_tags: selectedTags,
        }),
      })

      const data = await response.json()

      if (response.ok && data.status === "success") {
        // Hoàn thành khảo sát -> Xóa id tạm và đẩy thẳng vào trang chủ Dashboard hệ thống
        localStorage.removeItem("registered_user_id")
        router.push("/")
      } else {
        setError(data.detail || "Failed to update your preferences.")
      }
    } catch (err) {
      console.error(err)
      setError("Cannot connect to backend server. Please make sure FastAPI is active.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-12 bg-background">
      {/* Hiệu ứng nền mờ gradient giống trang Sign up */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <Card className="relative z-10 w-full max-w-2xl mx-4 bg-card/95 backdrop-blur-sm border-border shadow-2xl">
        <CardHeader className="text-center pb-4 border-b border-border/50">
          <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to K-Drama Predictor!
          </CardTitle>
          <CardDescription className="text-base pt-1">
            Customize your taste. We will build a personalized AI profile just for you.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {/* SECTION 1: THỂ LOẠI (GENRES) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Film className="h-4 w-4 text-primary" /> Favorite Genres
            </h3>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre)
                return (
                  <button
                    key={genre}
                    onClick={() => toggleSelection(genre, selectedGenres, setSelectedGenres)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 border flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                        : "bg-secondary/40 hover:bg-secondary text-foreground border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {genre}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SECTION 2: DIỄN VIÊN (ACTORS) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <User className="h-4 w-4 text-primary" /> Star Actors / Actresses
            </h3>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ACTORS.map((actor) => {
                const isSelected = selectedActors.includes(actor)
                return (
                  <button
                    key={actor}
                    onClick={() => toggleSelection(actor, selectedActors, setSelectedActors)}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 border flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                        : "bg-secondary/40 hover:bg-secondary text-foreground border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {actor}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SECTION 3: MÔ-TÍP PHIM (TAGS) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Hash className="h-4 w-4 text-primary" /> Drama Tropes & Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleSelection(tag, selectedTags, setSelectedTags)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 border flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                        : "bg-secondary/20 hover:bg-secondary/60 text-muted-foreground hover:text-foreground border-border/60"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    #{tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* BUTTON TIẾP TỤC */}
          <div className="pt-4 border-t border-border/50 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Selected: {selectedGenres.length} genres, {selectedActors.length} actors, {selectedTags.length} tags
            </p>
            
            <Button
              onClick={handleSubmit}
              className="px-8 bg-primary hover:bg-primary/90 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                "Finish & Explore"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}