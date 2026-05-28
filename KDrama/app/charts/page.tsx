"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Footer } from "@/components/footer"
import { Sparkles } from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useState, useEffect } from "react" // Thêm hook

// Sample data
// const ratingByGenre = [
//   { genre: "Romance", rating: 8.3, fill: "#ef4444" },
//   { genre: "Thriller", rating: 8.1, fill: "#eab308" },
//   { genre: "Melodrama", rating: 8.0, fill: "#22c55e" },
//   { genre: "Fantasy", rating: 7.9, fill: "#3b82f6" },
//   { genre: "Historical", rating: 7.8, fill: "#a855f7" },
//   { genre: "Comedy", rating: 7.7, fill: "#ec4899" },
//   { genre: "Action", rating: 7.6, fill: "#f97316" },
//   { genre: "Mystery", rating: 7.5, fill: "#06b6d4" },
//   { genre: "Horror", rating: 7.2, fill: "#6366f1" },
//   { genre: "Slice of Life", rating: 7.4, fill: "#84cc16" },
// ]

// const ratingTrends = [
//   { year: "2015", avgRating: 7.6, releases: 6.8 },
//   { year: "2016", avgRating: 7.7, releases: 7.0 },
//   { year: "2017", avgRating: 7.8, releases: 7.2 },
//   { year: "2018", avgRating: 7.9, releases: 7.5 },
//   { year: "2019", avgRating: 8.0, releases: 7.8 },
//   { year: "2020", avgRating: 8.1, releases: 8.0 },
//   { year: "2021", avgRating: 8.2, releases: 8.2 },
//   { year: "2022", avgRating: 8.3, releases: 8.4 },
//   { year: "2023", avgRating: 8.4, releases: 8.5 },
//   { year: "2024", avgRating: 8.5, releases: 8.6 },
// ]

// const platformDistribution = [
//   { name: "Netflix", value: 28, color: "#ef4444" },
//   { name: "tvN", value: 22, color: "#22c55e" },
//   { name: "JTBC", value: 15, color: "#3b82f6" },
//   { name: "SBS", value: 12, color: "#06b6d4" },
//   { name: "KBS", value: 10, color: "#f97316" },
//   { name: "MBC", value: 8, color: "#a855f7" },
//   { name: "Disney+", value: 3, color: "#6366f1" },
//   { name: "Other", value: 2, color: "#6b7280" },
// ]

// const ratingDistribution = [
//   { range: "5.0-5.5", count: 15 },
//   { range: "5.5-6.0", count: 35 },
//   { range: "6.0-6.5", count: 85 },
//   { range: "6.5-7.0", count: 150 },
//   { range: "7.0-7.5", count: 310 },
//   { range: "7.5-8.0", count: 480 },
//   { range: "8.0-8.5", count: 620 },
//   { range: "8.5-9.0", count: 510 },
//   { range: "9.0-9.5", count: 250 },
//   { range: "9.5-10", count: 45 },
// ]

// const monthlyReleases = [
//   { month: "Jan", y2024: 45, y2023: 42 },
//   { month: "Feb", y2024: 52, y2023: 48 },
//   { month: "Mar", y2024: 48, y2023: 45 },
//   { month: "Apr", y2024: 55, y2023: 50 },
//   { month: "May", y2024: 50, y2023: 47 },
//   { month: "Jun", y2024: 45, y2023: 43 },
//   { month: "Jul", y2024: 38, y2023: 35 },
//   { month: "Aug", y2024: 62, y2023: 58 },
//   { month: "Sep", y2024: 58, y2023: 55 },
//   { month: "Oct", y2024: 65, y2023: 60 },
//   { month: "Nov", y2024: 55, y2023: 52 },
//   { month: "Dec", y2024: 48, y2023: 45 },
// ]

// const predictionFactors = [
//   { name: "Actor Popularity", impact: 92 },
//   { name: "Genre (Romance)", impact: 78 },
//   { name: "Platform (Netflix)", impact: 71 },
//   { name: "Director Reputation", impact: 65 },
//   { name: "Episode Count", impact: 54 },
//   { name: "Release Year", impact: 42 },
// ]

// const stats = [
//   { label: "Dramas Analyzed", value: "2,847", color: "text-primary" },
//   { label: "Average Rating", value: "8.2", color: "text-yellow-500" },
//   { label: "Prediction Accuracy", value: "94%", color: "text-green-500" },
//   { label: "Genres Tracked", value: "12", color: "text-foreground" },
// ]

export default function ChartsPage() {
  // 1. Tạo state để lưu dữ liệu từ backend
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 2. Gọi API khi trang web tải xong
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/stats");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-20 text-center">Đang tải dữ liệu từ AI...</div>;
  if (!data) return <div className="p-20 text-center">Không có dữ liệu.</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-12 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Analytics Dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          Explore K-Drama rating trends and insights powered by data analysis
        </p>
      </div>

      {/* Stats */}
      {/* <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card border-border text-center">
              <CardContent className="py-6">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div> */}

      {/* Stats - Dùng data.stats từ backend */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.stats.map((stat: any, index: number) => (
            <Card key={index} className="bg-card border-border text-center">
              <CardContent className="py-6">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="container mx-auto px-6 pb-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Rating by Genre */}
          <Card className="bg-card border-border">
            {/* <CardHeader>
              <CardTitle>Rating by Genre</CardTitle>
              <CardDescription>Average ratings across different K-Drama genres</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingByGenre} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="genre" tick={{ fill: "#888", fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[6, 9]} tick={{ fill: "#888" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                    {ratingByGenre.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent> */}
            <CardHeader>
              <CardTitle>Rating by Genre</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.ratingByGenre}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="genre" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Bar dataKey="rating">
                    {data.ratingByGenre.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rating Trends by Year */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Rating Trends by Year</CardTitle>
              <CardDescription>How K-Drama ratings have evolved over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.ratingTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="year" tick={{ fill: "#888" }} />
                  <YAxis domain={[6, 9]} tick={{ fill: "#888" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgRating" 
                    name="Average Rating"
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: "#ef4444" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="releases" 
                    name="Number of Releases (scaled)"
                    stroke="#eab308" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#eab308" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rating Distribution */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
              <CardDescription>Distribution of ratings across all analyzed dramas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="range" tick={{ fill: "#888", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#888" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="count" fill="#ef4444" name="Number of Dramas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Release Pattern -------------- ẢO --------------- */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Monthly Release Pattern</CardTitle>
              <CardDescription>K-Drama releases throughout the year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthlyReleases}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" tick={{ fill: "#888" }} />
                  <YAxis domain={[20, 70]} tick={{ fill: "#888" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="y2024" 
                    name="2024 Releases"
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: "#ef4444" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="y2023" 
                    name="2023 Releases"
                    stroke="#eab308" 
                    strokeWidth={2}
                    dot={{ fill: "#eab308" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Platform Distribution */}
          {/* <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
              <CardDescription>K-Dramas distribution across streaming platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={250} height={250}>
                  <PieChart>
                    <Pie
                      data={data.platformDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {data.platformDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                      labelStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.platformDistribution.map((platform: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="text-muted-foreground">{platform.name} ({platform.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Model Insights */}
          {/* <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Model Insights</CardTitle>
              <CardDescription>Feature importance from XGBoost prediction model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                Top Prediction Factors
              </div>
              
              <div className="space-y-4">
                {data.predictionFactors.map((factor: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{factor.name}</span>
                      <span className="text-primary">{factor.impact}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${factor.impact}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg bg-muted/50 p-4">
                <h4 className="mb-3 font-semibold">Key Findings</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    Star power remains the strongest predictor of success
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    Romance dramas consistently outperform other genres
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    Netflix originals show higher average ratings
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    16-episode format is optimal for viewer engagement
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>

      {/* Thêm biểu đồ Phân bổ điểm vào Grid */}
      {/* <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
          <CardDescription>How dramas are scored across the database</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: "#888" }} />
              <YAxis tick={{ fill: "#888" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card> */}

      <Footer />
    </div>
  )
}
