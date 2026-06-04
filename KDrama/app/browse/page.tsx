// "use client"

// import { useState, useRef, useEffect } from "react"
// import Image from "next/image"
// import { Card, CardContent } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Footer } from "@/components/footer"
// import { DramaCarousel } from "@/components/drama-carousel"
// import { Search, Play, Star, X, Heart, MessageCircle } from "lucide-react"
// import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
// import { Textarea } from "@/components/ui/textarea"
// import { useAuth } from "@/contexts/auth-context"
// import { Drama } from "@/components/types/drama"

// // Giữ nguyên các mảng filter mẫu của bạn
// const genres = ["All Genres", "Romance", "Thriller", "Melodrama", "Fantasy", "Historical", "Comedy", "Action", "Mystery"]
// const years = ["All Years", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"]
// const sortOptions = ["Highest Rated", "Latest", "Most Popular", "Alphabetical"]

// interface Review {
//   id: number
//   username: string
//   avatar: string | null 
//   comment: string
//   date: string
//   rating: number
// }

// export default function BrowsePage() {
//   // 1. Quản lý danh sách phim động từ Backend
//   const [allDramas, setAllDramas] = useState<Drama[]>([])
//   const [isLoading, setIsLoading] = useState(true)

//   const [searchQuery, setSearchQuery] = useState("")
//   const [selectedGenre, setSelectedGenre] = useState("All Genres")
//   const [selectedYear, setSelectedYear] = useState("All Years")
//   const [selectedSort, setSelectedSort] = useState("Highest Rated")
//   const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null)
//   const [isDialogOpen, setIsDialogOpen] = useState(false)

//   // Review form states
//   const [userRating, setUserRating] = useState(0)
//   const [userComment, setUserComment] = useState("")
//   const [hoverRating, setHoverRating] = useState(0)
//   const [userReviewsList, setUserReviewsList] = useState<Record<number, Review[]>>({})
  
//   const { user, toggleLikeDrama, isLiked } = useAuth()

//   // Thêm hàm helper này ở ngoài Component hoặc ngay đầu Component để biến đổi dữ liệu Backend -> Frontend
//   const mapBackendToFrontend = (backendData: any[]): Drama[] => {
//     console.log("Dữ liệu thô từ Backend gửi về:", backendData);
    
//     return backendData.map((item) => {
//       // 1. Xử lý bóc tách Cast (Diễn viên) từ main_lead1 và main_lead2 trong DB
//       const dynamicCast = [];
//       if (item.main_lead1) {
//         dynamicCast.push({
//           name: item.main_lead1.strip ? item.main_lead1.strip() : item.main_lead1,
//           role: "Main Lead (Female)",
//           image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" // Ảnh mặc định
//         });
//       }
//       if (item.main_lead2) {
//         dynamicCast.push({
//           name: item.main_lead2.strip ? item.main_lead2.strip() : item.main_lead2,
//           role: "Main Lead (Male)",
//           image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" // Ảnh mặc định
//         });
//       }

//       // 2. Xử lý chuyển đổi chuỗi số người xem '81,971' thành kiểu số (Number) cho thuộc tính likes
//       const watchersCount = item.watchers 
//         ? parseInt(item.watchers.replace(/,/g, ''), 10) 
//         : 0;

//       return {
//         id: item.drama_id, // Khớp drama_id về id
//         title: item.title || "Unknown Title",
//         year: item.start_year || 2024, // Fallback nếu DB không có cột year
//         episodes: item.episodes || 16, // Fallback nếu DB không có cột episodes
//         rating: item.rating ? parseFloat(item.rating) : 0.0,
//         genre: item.genres ? item.genres.split(',')[0].trim() : "Drama", // Lấy thể loại đầu tiên hiển thị cho đẹp
//         imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=800&fit=crop", // Fallback ảnh phim
//         description: item.content || `A fascinating story about ${item.title}. Explore the genres of ${item.genres || 'drama'} featuring elite casting.`,
//         director: item.director || "Unknown Director",
//         cast: dynamicCast.length > 0 ? dynamicCast : [], // Gán mảng diễn viên tự động
//         trailerUrl: item.trailerUrl || "https://www.youtube.com/embed/eXMjTXL2Vks", // Fallback trailer mẫu nếu DB chưa lưu url
//         reviews: item.reviews || [], // Nếu Backend chưa có hệ thống comment thì trả về mảng rỗng
//         likes: watchersCount // Lấy lượng watchers gán vào số lượng tương tác likes
//       };
//     });
//   };

//   // KHỞI ĐẦU: Sử dụng 1 useEffect duy nhất để lấy dữ liệu phim khi người dùng tải trang
//   useEffect(() => {
//     // Khai báo hàm bất đồng bộ fetchData phụ trách kết nối với Server FastAPI
//     async function fetchData() {
//       try {
//         // Thiết lập ID người dùng mặc định là 1 để hệ thống AI dựa vào đây tính toán sở thích
//         const userId = 15;

//         // Thực hiện gọi API lấy danh sách phim đã được AI sắp xếp điểm khuyến nghị cho User này
//         const response = await fetch(`http://localhost:8000/api/recommendations/${userId}?top_n=30`);

//         // Kiểm tra nếu kết nối tới API thành công (Status 200 OK)
//         if (response.ok) {
//           // Giải mã gói dữ liệu JSON trả về từ phía Server
//           const result = await response.json();
          
//           // Trích xuất mảng danh sách phim nằm trong trường "recommendations" (nếu null thì dùng mảng rỗng)
//           const rawRecommendedData = result.recommendations || [];

//           // Chạy qua hàm mapper để đổi tên thuộc tính (drama_id -> id, gộp diễn viên) cho giao diện hiểu được
//           const formattedDramas = mapBackendToFrontend(rawRecommendedData);
          
//           // Cập nhật toàn bộ danh sách phim đã chuẩn hóa vào State để hiển thị lên màn hình
//           setAllDramas(formattedDramas);
//         } else { // Trường hợp Server Backend phản hồi nhưng trả về mã lỗi (404 hoặc 500)
//           // Đọc nội dung thông báo lỗi chi tiết được gửi từ FastAPI
//           const errorText = await response.text();
//           // In rõ ràng mã lỗi hệ thống và nội dung lỗi ra màn hình Console (F12) để lập trình viên kiểm tra
//           console.error(`[DEBUG API] Lỗi từ Backend: Mã ${response.status} | Chi tiết: ${errorText}`);
//         } // Kết thúc block response.ok
//       } catch (error) { // Trường hợp không kết nối được đến Server (mất mạng hoặc chưa bật Server Python)
//         // In thông báo lỗi kết nối mạng ra màn hình Console của trình duyệt
//         console.error("Không thể kết nối đến hệ thống API Khuyến nghị:", error);
//       } finally { // Luôn luôn chạy block này sau khi tiến trình kết thúc (dù thành công hay thất bại)
//         // Tắt trạng thái tải trang để giao diện ẩn hiệu ứng vòng xoay Loading Spinner đi
//         setIsLoading(false);
//       } // Kết thúc block try-catch-finally
//     } // Kết thúc định nghĩa hàm fetchData

//     // Kích hoạt thực thi hàm fetchData để bắt đầu tiến trình lấy phim
//     fetchData();
//   }, []); // Mảng phụ thuộc rỗng đảm bảo logic này chỉ chạy 1 lần duy nhất khi render trang lần đầu
    
//   const handleDramaClick = (drama: Drama) => {
//     setSelectedDrama(drama)
//     setIsDialogOpen(true)
//   }

//   const handleLike = () => {
//     if (selectedDrama && user) {
//       toggleLikeDrama(selectedDrama.id)
//     }
//   }

//   const handleSubmitReview = () => {
//     if (!selectedDrama || !user || !userComment.trim() || userRating === 0) return
    
//     const newReview = {
//       id: Date.now(),
//       username: user.name,
//       avatar: user.avatar,
//       comment: userComment,
//       date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
//       rating: userRating
//     }
    
//     setUserReviewsList(prev => ({
//       ...prev,
//       [selectedDrama.id]: [...(prev[selectedDrama.id] || []), newReview]
//     }))
    
//     setUserComment("")
//     setUserRating(0)
//   }

//   const getReviewsForDrama = (dramaId: number) => {
//     const drama = allDramas.find(d => d.id === dramaId)
//     const baseReviews = drama?.reviews || []
//     const userAddedReviews = userReviewsList[dramaId] || []
//     return [...baseReviews, ...userAddedReviews]
//   }

//   // 3. Phân chia danh mục phim động dựa trên mảng phim vừa lấy về từ DB
//   const featuredDrama = allDramas[0]
//   const trendingDramas = allDramas.slice(1, 8)
//   const topRatedDramas = allDramas.filter(d => d.rating >= 8.5)
//   const romanceDramas = allDramas.filter(d => d.genre?.toLowerCase().includes("romance") || d.genre?.toLowerCase().includes("melodrama"))
//   const thrillerDramas = allDramas.filter(d => d.genre?.toLowerCase().includes("action") || d.genre?.toLowerCase().includes("fantasy"))

//   // Trạng thái hiển thị khi đang đợi kết nối backend tải phim
//   if (isLoading) {
//     return (
//       <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
//         <div className="text-center space-y-2">
//           <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
//           <p className="text-sm font-medium">Connecting to Backend & Fetching Movies...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <div className="border-b border-border bg-card/50 px-6 py-12 text-center">
//         <h1 className="text-3xl font-bold md:text-4xl">Browse K-Dramas</h1>
//         <p className="mt-3 text-muted-foreground">
//           Discover popular Korean dramas with our recommendation system
//         </p>
//       </div>

//       {/* Search & Filters */}
//       <div className="container mx-auto px-6 py-6">
//         <Card className="bg-card border-border">
//           <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//               <Input
//                 placeholder="Search dramas, actors, directors..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="bg-input pl-10"
//               />
//             </div>
//             <div className="flex flex-wrap gap-2">
//               <Select value={selectedGenre} onValueChange={setSelectedGenre}>
//                 <SelectTrigger className="w-32 bg-input">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {genres.map((genre) => (
//                     <SelectItem key={genre} value={genre}>{genre}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//               <Select value={selectedYear} onValueChange={setSelectedYear}>
//                 <SelectTrigger className="w-28 bg-input">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {years.map((year) => (
//                     <SelectItem key={year} value={year}>{year}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//               <Select value={selectedSort} onValueChange={setSelectedSort}>
//                 <SelectTrigger className="w-36 bg-input">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {sortOptions.map((option) => (
//                     <SelectItem key={option} value={option}>{option}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Featured Drama */}
//       {featuredDrama && (
//         <div className="container mx-auto px-6 pb-8">
//           <Card 
//             className="group relative overflow-hidden rounded-2xl border-border bg-card cursor-pointer"
//             onClick={() => handleDramaClick(featuredDrama)}
//           >
//             <div className="relative aspect-[21/9] w-full">
//               <Image
//                 src={featuredDrama.imageUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=800&fit=crop"}
//                 alt={featuredDrama.title}
//                 fill
//                 className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
//               />
//               <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              
//               <div className="absolute bottom-0 left-0 p-8 md:p-12">
//                 <span className="inline-block rounded bg-primary px-3 py-1 text-xs font-semibold uppercase text-primary-foreground">
//                   Featured
//                 </span>
//                 <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
//                   {featuredDrama.title}
//                 </h2>
//                 <p className="mt-3 max-w-lg text-gray-300 line-clamp-2">
//                   {featuredDrama.description}
//                 </p>
//                 <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-300">
//                   <div className="flex items-center gap-1">
//                     <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
//                     <span className="font-semibold text-yellow-500">{featuredDrama.rating}</span>
//                   </div>
//                   <span>{featuredDrama.year}</span>
//                   <span>{featuredDrama.episodes} Episodes</span>
//                   <span>{featuredDrama.genre}</span>
//                 </div>
//                 <Button className="mt-6 bg-primary hover:bg-primary/90">
//                   <Play className="mr-2 h-4 w-4" />
//                   View Details
//                 </Button>
//               </div>
//             </div>
//           </Card>
//         </div>
//       )}

//       {/* Drama Carousels */}
//       <div className="container mx-auto space-y-10 px-6 pb-12">
//         {trendingDramas.length > 0 && <DramaCarousel title="Trending Now" dramas={trendingDramas} onDramaClick={handleDramaClick} />}
//         {topRatedDramas.length > 0 && <DramaCarousel title="Top Rated" dramas={topRatedDramas} onDramaClick={handleDramaClick} />}
//         {romanceDramas.length > 0 && <DramaCarousel title="Romance" dramas={romanceDramas} onDramaClick={handleDramaClick} />}
//         {thrillerDramas.length > 0 && <DramaCarousel title="Thriller & Mystery" dramas={thrillerDramas} onDramaClick={handleDramaClick} />}
//       </div>

//       {/* Drama Detail Dialog */}
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogContent className="max-w-4xl w-[95vw] h-[90vh] bg-card border-border p-0 overflow-hidden flex flex-col">
//           <DialogTitle className="sr-only">
//             {selectedDrama?.title}
//           </DialogTitle>
          
//           {selectedDrama && (
//             <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
//               <div className="relative w-full">
//                 {/* Banner Image */}
//                 <div className="relative aspect-video w-full">
//                   <Image
//                     src={selectedDrama.imageUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=800&fit=crop"}
//                     alt={selectedDrama.title}
//                     fill
//                     className="object-cover"
//                     priority
//                   />
//                   <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     className="absolute right-4 top-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
//                     onClick={() => setIsDialogOpen(false)}
//                   >
//                     <X className="h-4 w-4" />
//                   </Button>
//                 </div>
                
//                 {/* Nội dung chi tiết */}
//                 <div className="p-6 space-y-8 pb-12">
//                   {/* Title & Info */}
//                   <div className="space-y-4">
//                     <h2 className="text-3xl font-bold">{selectedDrama.title}</h2>
//                     <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
//                       <div className="flex items-center gap-1">
//                         <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
//                         <span className="font-semibold text-yellow-500">{selectedDrama.rating}</span>
//                       </div>
//                       <span>{selectedDrama.year}</span>
//                       <span>{selectedDrama.episodes} Episodes</span>
//                       <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">{selectedDrama.genre}</span>
//                     </div>

//                     <div className="flex items-center gap-6 text-sm">
//                       <div className="flex items-center gap-2 text-muted-foreground">
//                         <Heart className="h-4 w-4 text-primary" />
//                         <span><span className="font-semibold text-foreground">{selectedDrama.likes?.toLocaleString() || 0}</span> likes</span>
//                       </div>
//                       <div className="flex items-center gap-2 text-muted-foreground">
//                         <MessageCircle className="h-4 w-4 text-primary" />
//                         <span><span className="font-semibold text-foreground">{getReviewsForDrama(selectedDrama.id).length}</span> reviews</span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="space-y-6">
//                     {/* Description */}
//                     <section>
//                       <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
//                       <p className="text-muted-foreground leading-relaxed">
//                         {selectedDrama.description}
//                       </p>
//                     </section>

//                     {/* Action Buttons */}
//                     <div className="flex gap-3">
//                       <Button 
//                         variant={user && isLiked(selectedDrama.id) ? "default" : "outline"}
//                         onClick={handleLike}
//                         disabled={!user}
//                         className={user && isLiked(selectedDrama.id) ? "bg-primary" : ""}
//                       >
//                         <Heart className={`mr-2 h-4 w-4 ${user && isLiked(selectedDrama.id) ? "fill-current" : ""}`} />
//                         {user && isLiked(selectedDrama.id) ? "Liked" : "Like"}
//                       </Button>
//                       {!user && (
//                         <span className="text-sm text-muted-foreground self-center">
//                           Login to like dramas
//                         </span>
//                       )}
//                     </div>

//                     {/* Trailer Section */}
//                     {selectedDrama.trailerUrl && (
//                       <section>
//                         <h3 className="text-lg font-semibold text-primary mb-3">Trailer</h3>
//                         <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black shadow-lg">
//                           <iframe
//                             src={selectedDrama.trailerUrl}
//                             title={`${selectedDrama.title} Trailer`}
//                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                             allowFullScreen
//                             className="absolute inset-0 w-full h-full"
//                           />
//                         </div>
//                       </section>
//                     )}

//                     {/* Cast Section */}
//                     {selectedDrama.cast && selectedDrama.cast.length > 0 && (
//                       <section>
//                         <h3 className="text-lg font-semibold mb-4">Cast</h3>
//                         <div className="flex flex-wrap gap-6">
//                           {selectedDrama.cast.map((member, index) => (
//                             <div key={index} className="flex flex-col items-center text-center">
//                               <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-muted">
//                                 <Image
//                                   src={member.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"}
//                                   alt={member.name}
//                                   width={64}
//                                   height={64}
//                                   className="h-full w-full object-cover"
//                                 />
//                               </div>
//                               <p className="mt-2 font-medium text-sm">{member.name}</p>
//                               <p className="text-xs text-muted-foreground">{member.role}</p>
//                             </div>
//                           ))}
//                         </div>
//                       </section>
//                     )}

//                     {/* User Reviews Section */}
//                     <section className="space-y-4">
//                       <h3 className="text-lg font-semibold">User Reviews</h3>
                      
//                       {user ? (
//                         <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
//                           <p className="font-medium mb-3">Write a Review</p>
//                           <div className="flex items-center gap-2 mb-3">
//                             <div className="flex gap-1">
//                               {[1, 2, 3, 4, 5].map((star) => (
//                                 <button key={star} type="button" onClick={() => setUserRating(star)} className="transition-transform hover:scale-110">
//                                   <Star className={`h-6 w-6 ${(hoverRating || userRating) >= star ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
//                                 </button>
//                               ))}
//                             </div>
//                           </div>
//                           <Textarea
//                             placeholder="Share your thoughts..."
//                             value={userComment}
//                             onChange={(e) => setUserComment(e.target.value)}
//                             className="mb-3 bg-input resize-none"
//                             rows={3}
//                           />
//                           <Button onClick={handleSubmitReview} disabled={!userComment.trim() || userRating === 0}>
//                             Submit Review
//                           </Button>
//                         </div>
//                       ) : (
//                         <div className="text-sm text-muted-foreground py-2 italic text-center border rounded-md">
//                           Login to write a review
//                         </div>
//                       )}

//                       {/* Reviews List */}
//                       <div className="space-y-4">
//                         {getReviewsForDrama(selectedDrama.id).map((review) => (
//                           <div key={review.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
//                             <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
//                               <Image src={review.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop"} alt={review.username} width={40} height={40} className="h-full w-full object-cover" />
//                             </div>
//                             <div className="flex-1">
//                               <div className="flex items-center gap-2">
//                                 <p className="font-medium text-sm">{review.username}</p>
//                                 <div className="flex items-center gap-1">
//                                   <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
//                                   <span className="text-xs text-yellow-500">{review.rating}/5</span>
//                                 </div>
//                               </div>
//                               <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </section>
                    
//                     {/* Recommendation Section */}
//                     <section className="pt-6 border-t">
//                       <DramaCarousel
//                         title="Recommended Similar Dramas"
//                         dramas={allDramas.filter(d => d.id !== selectedDrama?.id).slice(0, 8)}
//                         onDramaClick={handleDramaClick}
//                       />
//                     </section>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       <Footer />
//     </div>
//   )
// }


"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Footer } from "@/components/footer"
import { DramaCarousel } from "@/components/drama-carousel"
import { Search, Play, Star, X, Heart, MessageCircle } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Drama } from "@/components/types/drama"
import { useAuth } from "@/contexts/auth-context"

const genres = ["All Genres", "Romance", "Thriller", "Melodrama", "Fantasy", "Historical", "Comedy", "Action", "Mystery"]
const years = ["All Years", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"]
const sortOptions = ["Highest Rated", "Latest", "Most Popular", "Alphabetical"]

interface Review {
  id: number
  username: string
  avatar: string | null 
  comment: string
  date: string
  rating: number
}

export default function BrowsePage() {
  const [allDramas, setAllDramas] = useState<Drama[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Quản lý thông tin phiên đăng nhập cục bộ để tránh lỗi đồng bộ của Context
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string>("Guest")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("All Genres")
  const [selectedYear, setSelectedYear] = useState("All Years")
  const [selectedSort, setSelectedSort] = useState("Highest Rated")
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Review form states
  const [userRating, setUserRating] = useState(0)
  const [userComment, setUserComment] = useState("")
  const [hoverRating, setHoverRating] = useState(0)
  const [userReviewsList, setUserReviewsList] = useState<Record<number, Review[]>>({})
  
  // Trạng thái mảng lưu trữ danh sách các ID phim đã thích của User này
  const [likedDramaIds, setLikedDramaIds] = useState<number[]>([])
  const { user, toggleLikeDrama, isLiked } = useAuth()

  // Hàm biến đổi dữ liệu Backend -> cấu trúc Frontend hiển thị
  const mapBackendToFrontend = (backendData: any[]): Drama[] => {
    return backendData.map((item) => {
      const dynamicCast = [];
      if (item.main_lead1) {
        dynamicCast.push({
          name: item.main_lead1,
          role: "Main Lead",
          image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
        });
      }
      if (item.main_lead2) {
        dynamicCast.push({
          name: item.main_lead2,
          role: "Main Lead",
          image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
        });
      }

      const watchersCount = item.watchers 
        ? parseInt(item.watchers.toString().replace(/,/g, ''), 10) 
        : 0;

      return {
        id: item.drama_id,
        title: item.title || "Unknown Title",
        year: item.start_year || 2024,
        episodes: item.episodes || 16,
        rating: item.rating ? parseFloat(item.rating) : 0.0,
        genre: item.genres ? item.genres.split(',')[0].trim() : "Drama",
        imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=800&fit=crop",
        description: item.content || `Explore the fascinating world of ${item.title}.`,
        director: item.director || "Unknown Director",
        cast: dynamicCast,
        trailerUrl: item.trailerUrl || "https://www.youtube.com/embed/eXMjTXL2Vks",
        reviews: item.reviews || [],
        likes: watchersCount
      };
    });
  };

  // 1. useEffect: Kiểm tra trạng thái đăng nhập từ localStorage & Tải phim
  useEffect(() => {
    // Lấy thông tin user đăng nhập thực tế
    const storedUid = localStorage.getItem("user_id");
    const storedUsername = localStorage.getItem("username");
    
    if (storedUid) {
      setCurrentUserId(storedUid);
      if (storedUsername) setCurrentUsername(storedUsername);
    }

    async function fetchData() {
      try {
        // Nếu có user_id đăng nhập thực tế thì dùng, không thì mặc định là 15 như cũ
        const activeUserId = storedUid || "15";
        const response = await fetch(`http://localhost:8000/api/recommendations/${activeUserId}?top_n=30`);

        if (response.ok) {
          const result = await response.json();
          const formattedDramas = mapBackendToFrontend(result.recommendations || []);
          setAllDramas(formattedDramas);
        } else {
          console.error(`[API ERROR] Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Không thể kết nối đến hệ thống API Khuyến nghị:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDramaClick = (drama: Drama) => {
    setSelectedDrama(drama)
    setIsDialogOpen(true)
  }

  // 2. XỬ LÝ NHẤN NÚT YÊU THÍCH (Gửi dữ liệu lên FastAPI)
  const handleLike = async () => {
    if (!selectedDrama || !currentUserId) return;

    const dramaId = selectedDrama.id;
    const isAlreadyLiked = likedDramaIds.includes(dramaId);

    // Nếu đã thích rồi thì không gửi trùng (hoặc bạn có thể mở rộng API Delete tùy ý)
    if (isAlreadyLiked) return;

    try {
      const response = await fetch("http://localhost:8000/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: parseInt(currentUserId, 10),
          drama_id: dramaId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
          // Thêm ID phim vào danh sách đã tương tác ở giao diện
          setLikedDramaIds((prev) => [...prev, dramaId]);
          
          // Cập nhật tăng số lượt thích hiển thị tức thời của phim lên +1
          setAllDramas((prevDramas) =>
            prevDramas.map((d) =>
              d.id === dramaId ? { ...d, likes: (d.likes || 0) + 1 } : d
            )
          );
          if (selectedDrama.id === dramaId) {
            setSelectedDrama(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
          }
        }
      } else {
        alert("Failed to save favorite action to backend.");
      }
    } catch (err) {
      console.error("Error liking drama:", err);
    }
  };

  // 3. XỬ LÝ VIẾT BÌNH LUẬN & ĐÁNH GIÁ (Gửi dữ liệu lên FastAPI)
  const handleSubmitReview = async () => {
    if (!selectedDrama || !currentUserId || !userComment.trim() || userRating === 0) return;

    const dramaId = selectedDrama.id;

    try {
      const response = await fetch("http://localhost:8000/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: parseInt(currentUserId, 10),
          drama_id: dramaId,
          rating: userRating,
          content: userComment.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
          // Khởi tạo bình luận mới hiển thị ngay lên UI
          const newReview: Review = {
            id: Date.now(),
            username: currentUsername,
            avatar: null,
            comment: userComment.trim(),
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            rating: userRating
          };
          
          setUserReviewsList(prev => ({
            ...prev,
            [dramaId]: [...(prev[dramaId] || []), newReview]
          }));
          
          // Xóa trắng form nhập
          setUserComment("");
          setUserRating(0);
        }
      } else {
        alert("Failed to save your review to backend.");
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    }
  };

  const getReviewsForDrama = (dramaId: number) => {
    const drama = allDramas.find(d => d.id === dramaId)
    const baseReviews = drama?.reviews || []
    const userAddedReviews = userReviewsList[dramaId] || []
    return [...baseReviews, ...userAddedReviews]
  }

  // Phân chia danh mục phim động
  const featuredDrama = allDramas[0]
  const trendingDramas = allDramas.slice(1, 8)
  const topRatedDramas = allDramas.filter(d => d.rating >= 8.5)
  const romanceDramas = allDramas.filter(d => d.genre?.toLowerCase().includes("romance") || d.genre?.toLowerCase().includes("melodrama"))
  const thrillerDramas = allDramas.filter(d => d.genre?.toLowerCase().includes("action") || d.genre?.toLowerCase().includes("fantasy"))

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-sm font-medium">Connecting to Backend & Fetching Movies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-12 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Browse K-Dramas</h1>
        <p className="mt-3 text-muted-foreground">Welcome, <span className="text-primary font-semibold">{currentUsername}</span>! Discover popular Korean dramas</p>
      </div>

      {/* Search & Filters */}
      <div className="container mx-auto px-6 py-6">
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search dramas, actors, directors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-input pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Drama */}
      {featuredDrama && (
        <div className="container mx-auto px-6 pb-8">
          <Card className="group relative overflow-hidden rounded-2xl border-border bg-card cursor-pointer" onClick={() => handleDramaClick(featuredDrama)}>
            <div className="relative aspect-[21/9] w-full">
              <Image src={featuredDrama.imageUrl} alt={featuredDrama.title} fill className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 md:p-12">
                <span className="inline-block rounded bg-primary px-3 py-1 text-xs font-semibold uppercase text-primary-foreground">Featured</span>
                <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">{featuredDrama.title}</h2>
                <p className="mt-3 max-w-lg text-gray-300 line-clamp-2">{featuredDrama.description}</p>
                <Button className="mt-6 bg-primary hover:bg-primary/90"><Play className="mr-2 h-4 w-4" /> View Details</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Carousels */}
      <div className="container mx-auto space-y-10 px-6 pb-12">
        {trendingDramas.length > 0 && <DramaCarousel title="Trending Now" dramas={trendingDramas} onDramaClick={handleDramaClick} />}
        {topRatedDramas.length > 0 && <DramaCarousel title="Top Rated" dramas={topRatedDramas} onDramaClick={handleDramaClick} />}
        {romanceDramas.length > 0 && <DramaCarousel title="Romance" dramas={romanceDramas} onDramaClick={handleDramaClick} />}
        {thrillerDramas.length > 0 && <DramaCarousel title="Thriller & Mystery" dramas={thrillerDramas} onDramaClick={handleDramaClick} />}
      </div>

      {/* Drama Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] bg-card border-border p-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">{selectedDrama?.title}</DialogTitle>
          
          {selectedDrama && (
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
              <div className="relative w-full">
                <div className="relative aspect-video w-full">
                  <Image src={selectedDrama.imageUrl} alt={selectedDrama.title} fill className="object-cover" priority />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  <Button variant="ghost" size="icon" className="absolute right-4 top-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full" onClick={() => setIsDialogOpen(false)}><X className="h-4 w-4" /></Button>
                </div>
                
                <div className="p-6 space-y-8 pb-12">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold">{selectedDrama.title}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-semibold text-yellow-500">{selectedDrama.rating}</span>
                      </div>
                      <span>{selectedDrama.year}</span>
                      <span>{selectedDrama.episodes} Episodes</span>
                      <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">{selectedDrama.genre}</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Heart className="h-4 w-4 text-primary" />
                        <span><span className="font-semibold text-foreground">{selectedDrama.likes?.toLocaleString() || 0}</span> likes</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span><span className="font-semibold text-foreground">{getReviewsForDrama(selectedDrama.id).length}</span> reviews</span>
                      </div>
                    </div>
                  </div>

                  <section>
                    <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">{selectedDrama.description}</p>
                  </section>

                  {/* Nút Like kết nối Backend */}
                  {/* <div className="flex gap-3">
                    <Button 
                      variant={likedDramaIds.includes(selectedDrama.id) ? "default" : "outline"}
                      onClick={handleLike}
                      disabled={!currentUserId}
                      className={likedDramaIds.includes(selectedDrama.id) ? "bg-primary" : ""}
                    >
                      <Heart className={`mr-2 h-4 w-4 ${likedDramaIds.includes(selectedDrama.id) ? "fill-current" : ""}`} />
                      {likedDramaIds.includes(selectedDrama.id) ? "Liked" : "Like"}
                    </Button>
                    {!currentUserId && (
                      <span className="text-sm text-destructive self-center font-medium">⚠️ Please login to like this drama</span>
                    )}
                  </div> */}
                  {/* Nút Like kết nối đồng bộ qua AuthContext */}
                  <div className="flex gap-3">
                    <Button 
                      variant={isLiked(selectedDrama.id) ? "default" : "outline"}
                      // onClick={() => toggleLikeDrama(selectedDrama.id)}
                      onClick={() => toggleLikeDrama(selectedDrama)}
                      disabled={!user} // Dùng trực tiếp object user từ Context
                      className={isLiked(selectedDrama.id) ? "bg-primary" : ""}
                    >
                      <Heart className={`mr-2 h-4 w-4 ${isLiked(selectedDrama.id) ? "fill-current" : ""}`} />
                      {isLiked(selectedDrama.id) ? "Liked" : "Like"}
                    </Button>
                    
                    {!user && (
                      <span className="text-sm text-destructive self-center font-medium">
                        ⚠️ Please login to like this drama
                      </span>
                    )}
                  </div>

                  {/* Trailer */}
                  {selectedDrama.trailerUrl && (
                    <section>
                      <h3 className="text-lg font-semibold text-primary mb-3">Trailer</h3>
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black shadow-lg">
                        <iframe src={selectedDrama.trailerUrl} title={`${selectedDrama.title} Trailer`} allowFullScreen className="absolute inset-0 w-full h-full" />
                      </div>
                    </section>
                  )}

                  {/* Comment section */}
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold">User Reviews</h3>
                    
                    {currentUserId ? (
                      <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
                        <p className="font-medium mb-3">Write a Review</p>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} type="button" onClick={() => setUserRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="transition-transform hover:scale-110">
                                <Star className={`h-6 w-6 ${(hoverRating || userRating) >= star ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <Textarea placeholder="Share your thoughts..." value={userComment} onChange={(e) => setUserComment(e.target.value)} className="mb-3 bg-input resize-none" rows={3} />
                        <Button onClick={handleSubmitReview} disabled={!userComment.trim() || userRating === 0}>Submit Review</Button>
                      </div>
                    ) : (
                      <div className="text-sm text-destructive py-3 font-medium text-center border border-dashed rounded-md bg-destructive/5">
                        ⚠️ You must login to write a review for this drama.
                      </div>
                    )}

                    {/* Hiển thị danh sách Review */}
                    <div className="space-y-4">
                      {getReviewsForDrama(selectedDrama.id).map((review) => (
                        <div key={review.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                            <Image src={review.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop"} alt={review.username} width={40} height={40} className="h-full w-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{review.username}</p>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                <span className="text-xs text-yellow-500">{review.rating}/5</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  )
}