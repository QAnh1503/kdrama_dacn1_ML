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
