"use client"

import { useState, useEffect} from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Footer } from "@/components/footer"
import { Layers, Star, TrendingUp, HelpCircle } from "lucide-react"

const genres = [
  "Romance", "Thriller", "Melodrama", "Fantasy", "Historical", 
  "Comedy", "Action", "Mystery", "Horror", "Slice of Life", "Drama", "Supernatural","Music"
]

const platforms = [
  "Netflix", "tvN", "jTBC", "SBS", "KBS2", "MBC", "Disney+", "Viki", "SBN", "Naver TV Cast", "OCN"
]

// interface PredictionResult {
//   rating: number;
//   trend: "HIGH" | "MEDIUM" | "LOW";
//   factors: { 
//     name: string; 
//     value: string | number; // Giá trị hiển thị (VD: "10,000" hoặc "95%")
//     rawImpact: number;      // Giá trị % để chạy thanh progress bar (0-100)
//   }[];
// }

interface AlgoPrediction {
  rating: number;
  watchers: number;
  popularity_rank: number;
}
interface BackendResponse {
  title: string;
  predictions: {
    SVR: AlgoPrediction;
    Ridge: AlgoPrediction;
    KNN: AlgoPrediction;
  };
}

export default function PredictPage() {

  // Recommend actors, diretors, screenwriters for user when inputing to predict
  const [suggestions, setSuggestions] = useState({
    actors: [],
    directors: [],
    screenwriters: []
  });

  // State quản lý mô hình đang được chọn (Mặc định ban đầu là Ridge)
  const [selectedAlgo, setSelectedAlgo] = useState<"SVR" | "Ridge" | "KNN">("Ridge");
  const [backendData, setBackendData] = useState<BackendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    dramaName: "",
    genre: [] as string[],
    platform: "",
    actors: "",
    directors: "",
    screenwriters: "",
    tags: "",
    content: "",
    episodes: "1",
    duration: "60",
    year: new Date().getFullYear().toString(),
    month: "1",
    ageRating: "15+"
  });


  // Gọi API lấy dữ liệu khi trang vừa load
    useEffect(() => {
      const fetchMetadata = async () => {
        try {
          const response = await fetch("http://localhost:8000/metadata");
          const data = await response.json();
          
          // Gán dữ liệu từ API vào state suggestions
          setSuggestions({
            actors: data.actors || [],
            directors: data.directors || [],
            screenwriters: data.screenwriters || []
          });
        } catch (error) {
          console.error("Error to get data from metadata:", error);
        }
      };

      fetchMetadata();
    }, []);
  
      

  // SẴN DỮ LIỆU MẪU ĐỂ BẠN TEST NHANH
  // const [formData, setFormData] = useState({
  //   dramaName: "The Moonlight Sonata",
  //   genre: ["Romance"],
  //   platform: "Netflix",
  //   actors: "Kim Soo Hyun, Jun Ji Hyun", 
  //   directors: "Park Shin Woo",
  //   screenwriters: "Park Ji Eun",      
  //   tags: "Contract Relationship, Rich Male Lead, Emotional",        
  //   content: "A beautiful story about a pianist who loses his hearing and a violinist who helps him find his music again through a secret contract.", 
  //   episodes: "16",
  //   duration: "70",  
  //   year: "2026",
  //   month: "12",      
  //   ageRating: "15+" 
  // })

  // const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  // const [isLoading, setIsLoading] = useState(false)
  
  const handlePredict = async () => {
    if (!formData.dramaName || !formData.content) {
      alert("Vui lòng nhập tên phim và nội dung tóm tắt!");
      return;
    }

    setIsLoading(true);
    try {
      // Tách tên diễn viên từ chuỗi nhập vào
      const actorList = formData.actors.split(",").map(a => a.trim()).filter(a => a !== ""); // Sau đó gửi actorList[0] || "Unknown"
      
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.dramaName,
          main_lead1: actorList[0] || "Unknown",
          main_lead2: actorList[1] || "Unknown",
          directors: formData.directors,
          screenwriters: formData.screenwriters || "Unknown",
          genres: formData.genre.join(", "),
          tags: formData.tags,
          content: formData.content,
          episodes: parseInt(formData.episodes),
          duration_mins: parseInt(formData.duration),
          start_year: parseInt(formData.year),
          start_month: parseInt(formData.month),
          age_rating: formData.ageRating
        }),
      });

      if (!response.ok) throw new Error("Không thể kết nối đến Server AI");

      const result = await response.json();

      // Cập nhật kết quả từ AI thật vào giao diện
      // setPrediction({
      //   rating: result.predicted_rating,
      //   trend: result.popularity_rank <= 500 ? "HIGH" : (result.popularity_rank <= 1500 ? "MEDIUM" : "LOW"),
      //   factors: [
      //     { 
      //       name: "Predict expected viewership", 
      //       value: result.predicted_watchers.toLocaleString() + " viewers",
      //       rawImpact: Math.min(Math.round((result.predicted_watchers / 50000) * 100), 100) 
      //     },
      //     { 
      //       name: "Predict popularity", 
      //       value: result.popularity_level, 
      //       rawImpact: result.popularity_level.includes("HOT") ? 95 : 60
      //     },
      //     { 
      //       name: "Popularity score", 
      //       value: Math.max(100 - Math.round(result.popularity_rank / 50), 5), // Giữ giá trị % như cũ
      //       rawImpact: Math.max(100 - Math.round(result.popularity_rank / 50), 5) 
      //     }
      //   ]
      // });
      setBackendData(result);
    } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to Backend!");
      } finally {
        setIsLoading(false);
      }
    };

  const getActivePrediction = () => {
    if (!backendData || !backendData.predictions[selectedAlgo]) return null;
    
    const current = backendData.predictions[selectedAlgo];
    const popularityScore = Math.max(100 - Math.round(current.popularity_rank / 50), 5);
    let trend: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    let popularityLevel = "Thấp (Niche Group)";

    if (current.popularity_rank <= 500) {
      trend = "HIGH";
      popularityLevel = "HOT (Highly Popular)";
    } else if (current.popularity_rank <= 1500) {
      trend = "MEDIUM";
      popularityLevel = "Medium (Ổn định)";
    }

    return {
      rating: current.rating,
      trend: trend,
      factors: [
        { 
          name: "Predict expected viewership", 
          value: current.watchers.toLocaleString() + " viewers",
          rawImpact: Math.min(Math.round((current.watchers / 50000) * 100), 100) 
        },
        { 
          name: "Predict popularity level", 
          value: popularityLevel, 
          rawImpact: trend === "HIGH" ? 95 : (trend === "MEDIUM" ? 65 : 30)
        },
        { 
          name: "Popularity ranking score", 
          value: `${popularityScore}%`, 
          rawImpact: popularityScore 
        }
      ]
    };
  };
  
  const currentPredict = getActivePrediction();

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "HIGH": return "text-green-500"
      case "MEDIUM": return "text-yellow-500"
      case "LOW": return "text-red-500"
      default: return "text-muted-foreground"
    }
  }
  const getRatingColor = (rating: number) => {
    if (rating >= 8.5) return "text-green-500"
    if (rating >= 7.5) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-12 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">
          Predict <span className="text-primary">K-Drama Ratings</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Enter drama details to get AI-powered rating predictions and trend analysis
        </p>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Form Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Drama Information</CardTitle>
              <CardDescription>Fill in the details of the Korean drama</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drama Name */}
              <div className="space-y-2">
                <Label htmlFor="dramaName">Drama Name</Label>
                <Input
                  id="dramaName"
                  placeholder="Enter drama name..."
                  value={formData.dramaName}
                  onChange={(e) => setFormData({ ...formData, dramaName: e.target.value })}
                  className="bg-input"
                />
              </div>

              {/* Genre & Platform */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {formData.genre.length > 0 ? (
                      formData.genre.map((g) => (
                        <span key={g} className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No genre selected</span>
                    )}
                  </div>

                  {/* Danh sách Checkbox để chọn nhiều */}
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-input max-h-[150px] overflow-y-auto">
                    {genres.map((g) => (
                      <div key={g} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`genre-${g}`}
                          checked={formData.genre.includes(g)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData((prev) => ({ // Mở ngoặc ( cho function và { cho object
                              ...prev,
                              genre: isChecked
                                ? [...prev.genre, g]
                                : prev.genre.filter((item) => item !== g),
                            })); // Đóng } cho object và ) cho function setFormData
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                        />
                        <label htmlFor={`genre-${g}`} className="text-sm cursor-pointer select-none">
                          {g}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((platform) => (
                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Main Actors */}
              <div className="space-y-2">
                <Label htmlFor="actors">Main Actors</Label>
                <Input
                  id="actors"
                  list="actors-list" // Connect to datalist
                  placeholder="Enter main actors (comma separated)..."
                  value={formData.actors}
                  onChange={(e) => setFormData({ ...formData, actors: e.target.value })}
                  className="bg-input"
                />
                <datalist id="actors-list">
                  {suggestions.actors.map((name, i) => <option key={i} value={name} />)}
                </datalist>
              </div>

              {/* Director */}
              <div className="space-y-2">
                <Label htmlFor="directors">Directors</Label>
                <Input
                  id="directors"
                  list="directors-list"
                  placeholder="Enter directors (comma separated)..."
                  value={formData.directors}
                  onChange={(e) => setFormData({ ...formData, directors: e.target.value })}
                  className="bg-input"
                />
                <datalist id="directors-list">
                  {suggestions.directors.map((name, i) => <option key={i} value={name} />)}
                </datalist>
              </div>

              {/* Screenwriters */}
              <div className="space-y-2">
                <Label htmlFor="screenwriters">Screenwriters</Label>
                <Input
                  id="screenwriters"
                  list="screenwriters-list"
                  placeholder="Enter writers (comma separated)..."
                  value={formData.screenwriters}
                  onChange={(e) => setFormData({ ...formData, screenwriters: e.target.value })}
                  className="bg-input"
                />
                <datalist id="screenwriters-list">
                  {suggestions.screenwriters.map((name, i) => <option key={i} value={name} />)}
                </datalist>
              </div>

              {/* Episodes & Age Rating */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="episodes">Number of Episodes</Label>
                  <Input
                    id="episodes"
                    type="number"
                    min="1" // Không cho phép nhập số nhỏ hơn 1
                    value={formData.episodes}
                    onChange={(e) => {
                      // Đảm bảo giá trị không âm nếu người dùng nhập tay
                      const val = parseInt(e.target.value);
                      setFormData({ ...formData, episodes: val < 1 ? "1" : e.target.value });
                    }}
                    className="bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Age Rating</Label>
                  <Select
                    value={formData.ageRating}
                    onValueChange={(value) => setFormData({ ...formData, ageRating: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select age rating..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["G", "13+", "15+", "18+"].map((rating) => (
                        <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Release Month & Year trên cùng 1 hàng */}
              <div className="grid gap-4 grid-cols-2"> 
                <div className="space-y-2">
                  <Label>Release Month</Label>
                  <Select
                    value={formData.month}
                    onValueChange={(value) => setFormData({ ...formData, month: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Month..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((monthName, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {monthName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Release Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1960" 
                    max="2100"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="bg-input"
                  />
                </div>
              </div>

              {/* Thêm ô nhập Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g. Revenge, Hidden Identity, Medical"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>

              {/* Thêm ô nhập Content (Dùng Textarea) */}
              <div className="space-y-2">
                <Label htmlFor="content">Synopsis / Content</Label>
                <textarea
                  id="content"
                  rows={4}
                  className="w-full rounded-md border bg-input p-2 text-sm"
                  placeholder="Paste the drama plot here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              {/* Predict Button */}
              <Button 
                onClick={handlePredict} 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                <Layers className="mr-2 h-4 w-4" />
                {isLoading ? "Analyzing..." : "Predict Rating"}
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Prediction Results</CardTitle>
              <CardDescription>AI-powered rating and trend analysis</CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* {!prediction ? ( */}
              {!backendData || !currentPredict ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-full border-2 border-dashed border-muted-foreground/50 p-6">
                    <HelpCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {"Enter drama details and click \"Predict\" to see results"}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">

                  {/* --- BỘ BA NÚT CHỌN MÔ HÌNH (MODEL TABS) --- */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Prediction Model</Label>
                    <div className="grid grid-cols-3 gap-2 bg-muted p-1 rounded-lg border">
                      {(["Ridge", "SVR", "KNN"] as const).map((algo) => (
                        <button
                          key={algo}
                          onClick={() => setSelectedAlgo(algo)}
                          className={`py-2 text-sm font-medium rounded-md transition-all ${
                            selectedAlgo === algo 
                              ? "bg-background text-foreground shadow-sm font-semibold" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {algo} Model
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating Display */}
                  {/* <div className="text-center">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <Star className={`h-8 w-8 fill-current ${getRatingColor(prediction.rating)}`} />
                      <span className={`text-5xl font-bold ${getRatingColor(prediction.rating)}`}>
                        {prediction.rating}
                      </span>
                      <span className="text-2xl text-muted-foreground">/ 10</span>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <TrendingUp className={`h-5 w-5 ${getTrendColor(prediction.trend)}`} />
                      <span className={`text-lg font-semibold ${getTrendColor(prediction.trend)}`}>
                        {prediction.trend} TREND
                      </span>
                    </div>
                  </div> */}
                  <div className="text-center border bg-card/40 p-6 rounded-xl shadow-inner">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <Star className={`h-8 w-8 fill-current ${getRatingColor(currentPredict.rating)}`} />
                      <span className={`text-5xl font-bold ${getRatingColor(currentPredict.rating)}`}>
                        {currentPredict.rating}
                      </span>
                      <span className="text-2xl text-muted-foreground">/ 10</span>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <TrendingUp className={`h-5 w-5 ${getTrendColor(currentPredict.trend)}`} />
                      <span className={`text-lg font-semibold ${getTrendColor(currentPredict.trend)}`}>
                        {currentPredict.trend} TREND
                      </span>
                    </div>
                  </div>

                  {/* Rating Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Rating</span>
                      <span>{currentPredict.rating}/10</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          currentPredict.rating >= 8.5 ? "bg-green-500" : 
                          currentPredict.rating >= 7.5 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${currentPredict.rating * 10}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Factors */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">Prediction factors</h4>
                    {currentPredict.factors.map((factor, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{factor.name}</span>
                          {/* Hiển thị giá trị: thêm % nếu là Độ Hot, còn lại giữ nguyên */}
                          {/* <span className="font-bold text-primary">
                            {factor.name === "Popularity score" ? `${factor.value}%` : factor.value}
                          </span> */}
                          {/* Đã sửa lỗi: Render trực tiếp chuỗi thuần tuý từ mảng object mà không lo bị trùng/thiếu ký tự % */}
                          <span className="font-bold text-primary">
                            {factor.value}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div 
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${factor.rawImpact}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>


          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
  
}


