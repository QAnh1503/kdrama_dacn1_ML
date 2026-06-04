"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  birthday: string | null
  gender: string | null
  likedDramas: number[]

  favoriteDramas?: any[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  updateProfile: (data: Partial<User>) => void
  // toggleLikeDrama: (dramaId: number) => void

  toggleLikeDrama: (drama: any) => void

  isLiked: (dramaId: number) => boolean
}



const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. Kiểm tra xem có phiên đăng nhập chính thức (User thật) trước không
    const savedUser = localStorage.getItem("kdrama_user")
    
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    } else {
      // 2. Nếu không có user thật, kiểm tra xem có id từ trang đăng ký / onboarding test không
      const savedUserId = localStorage.getItem("registered_user_id")
      if (savedUserId) {
        // Giả lập một object User test chuẩn chỉ, ép id thành chuỗi (.toString()) để khớp Type
        setUser({
          id: savedUserId.toString(), 
          email: "testuser15@example.com",
          name: "Test User 15",
          avatar: null,
          birthday: null,
          gender: null,
          likedDramas: [1, 8], // Đồng bộ sẵn phim mấu đã thích để trang Favorites hiển thị luôn
        })
      }
    }
    
    // Tắt trạng thái loading sau khi đã quét xong dữ liệu
    setIsLoading(false)
  }, []) // <--- Chỉ chạy duy nhất 1 lần khi ứng dụng khởi chạy

  // const login = async (email: string, password: string): Promise<boolean> => {
  //   // Simulate API call
  //   await new Promise(resolve => setTimeout(resolve, 1000))
    
  //   // For demo, accept any valid email/password
  //   const savedUsers = JSON.parse(localStorage.getItem("kdrama_users") || "[]")
  //   const existingUser = savedUsers.find((u: {email: string, password: string}) => 
  //     u.email === email && u.password === password
  //   )
    
  //   if (existingUser) {
  //     const userData: User = {
  //       id: existingUser.id,
  //       email: existingUser.email,
  //       name: existingUser.name,
  //       avatar: existingUser.avatar || null,
  //       birthday: existingUser.birthday || null,
  //       gender: existingUser.gender || null,
  //       likedDramas: existingUser.likedDramas || []
  //     }

  //     // ✨ THÊM DÒNG NÀY: Xóa ID test để chuyển sang dùng session thật hoàn toàn
  //     localStorage.removeItem("registered_user_id")

  //     setUser(userData)
  //     localStorage.setItem("kdrama_user", JSON.stringify(userData))
  //     return true
  //   }
    
  //   return false
  // }
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true) // Bật trạng thái loading khi đang xác thực
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        // Khởi tạo Object User chuẩn hóa dựa trên dữ liệu API trả về
        const userData: User = {
          id: data.user_id.toString(),
          email: email, // Giữ lại email đăng nhập
          name: data.username || "User",
          avatar: null,
          birthday: null,
          gender: null,
          likedDramas: data.likedDramas || [1, 8] // Nếu backend chưa trả về mảng phim, tạm để mẫu hoặc []
        }

        // ✨ QUAN TRỌNG: Cập nhật State cho toàn bộ ứng dụng nhận biết
        setUser(userData)
        
        // Lưu vào LocalStorage theo đúng key mà useEffect của AuthProvider đang tìm kiếm
        localStorage.setItem("kdrama_user", JSON.stringify(userData))
        
        // Dọn dẹp id test cũ (nếu có)
        localStorage.removeItem("registered_user_id")

        return true;
      }
      return false;
    } catch (error) {
      console.error("Authentication server error:", error);
      return false;
    } finally {
      setIsLoading(false)
    }
  };

  // const signup = async (email: string, password: string, name: string): Promise<boolean> => {
  //   await new Promise(resolve => setTimeout(resolve, 1000))
    
  //   const savedUsers = JSON.parse(localStorage.getItem("kdrama_users") || "[]")
  //   const exists = savedUsers.some((u: {email: string}) => u.email === email)
    
  //   if (exists) {
  //     return false
  //   }
    
  //   const newUser = {
  //     id: crypto.randomUUID(),
  //     email,
  //     password,
  //     name,
  //     avatar: null,
  //     birthday: null,
  //     gender: null,
  //     likedDramas: []
  //   }
    
  //   savedUsers.push(newUser)
  //   localStorage.setItem("kdrama_users", JSON.stringify(savedUsers))
    
  //   const userData: User = {
  //     id: newUser.id,
  //     email: newUser.email,
  //     name: newUser.name,
  //     avatar: null,
  //     birthday: null,
  //     gender: null,
  //     likedDramas: []
  //   }

  //   // ✨ THÊM DÒNG NÀY: Xóa ID test ngay khi đăng ký thành công tài khoản thật
  //   localStorage.removeItem("registered_user_id")


  //   setUser(userData)
  //   localStorage.setItem("kdrama_user", JSON.stringify(userData))
    
  //   return true
  // }
  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      // 1. Gọi API đăng ký tới Backend của bạn
      const response = await fetch("http://localhost:8000/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      // if (response.ok && data.status === "success") {
      if (response.ok && (data.success || data.status === "success")) {
        // 2. Chuẩn hóa dữ liệu User sau khi đăng ký thành công (thường Backend sẽ tự động đăng nhập luôn cho user)
        const userData: User = {
          id: (data.user_id || crypto.randomUUID()).toString(), // Lấy ID từ backend trả về
          email: email,
          name: name,
          avatar: null,
          birthday: null,
          gender: null,
          likedDramas: [] // Tài khoản mới tinh nên mảng phim thích sẽ rỗng
        }

        // 3. Cập nhật State và LocalStorage để toàn bộ App biết user đã login
        setUser(userData)
        localStorage.setItem("kdrama_user", JSON.stringify(userData))
        
        // Xóa ID test cũ nếu có
        localStorage.removeItem("registered_user_id")

        return true
      }
      return false
    } catch (error) {
      console.error("Signup server error:", error);
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("kdrama_user")
  }

  const updateProfile = (data: Partial<User>) => {
    if (!user) return
    
    const updatedUser = { ...user, ...data }
    setUser(updatedUser)
    localStorage.setItem("kdrama_user", JSON.stringify(updatedUser))
    
    // Also update in users list
    const savedUsers = JSON.parse(localStorage.getItem("kdrama_users") || "[]")
    const userIndex = savedUsers.findIndex((u: {id: string}) => u.id === user.id)
    if (userIndex !== -1) {
      savedUsers[userIndex] = { ...savedUsers[userIndex], ...data }
      localStorage.setItem("kdrama_users", JSON.stringify(savedUsers))
    }
  }

  // const toggleLikeDrama = (dramaId: number) => {
  //   if (!user) return
    
  //   const likedDramas = user.likedDramas.includes(dramaId)
  //     ? user.likedDramas.filter(id => id !== dramaId)
  //     : [...user.likedDramas, dramaId]
    
  //   updateProfile({ likedDramas })
  // }

  const toggleLikeDrama = async (drama: any) => {
    const dramaId = drama.id
    if (!user) return

    // 1. Tạm thời tối ưu giao diện trước (Optimistic UI) để user bấm phát ăn ngay không bị delay
    const isAlreadyLiked = user.likedDramas.includes(dramaId)
    const updatedLikedDramas = isAlreadyLiked
      ? user.likedDramas.filter(id => id !== dramaId)
      : [...user.likedDramas, dramaId]

    const updatedFavoriteDramas = isAlreadyLiked
    ? (user.favoriteDramas || []).filter(d => d.id !== dramaId)
    : [...(user.favoriteDramas || []), drama]

    // Cập nhật State & LocalStorage tạm thời ở Client
    const updatedUser = { ...user, likedDramas: updatedLikedDramas,favoriteDramas: updatedFavoriteDramas }

    console.log("Drama received:", drama)
    console.log("updatedFavoriteDramas:", updatedFavoriteDramas)
    console.log("Saving:", updatedUser)

    setUser(updatedUser)
    localStorage.setItem("kdrama_user", JSON.stringify(updatedUser))

    try {
      // 2. Đồng bộ dữ liệu lên Backend Server Python cổng 8000
      const response = await fetch("http://localhost:8000/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          user_id: user.id, 
          drama_id: dramaId 
          // user_id: parseInt(user.id), // Thử ép sang số nguyên nếu backend định nghĩa id là int
          // drama_id: Number(dramaId)   // Đảm bảo drama_id luôn là số nguyên
        }),
      })

      if (!response.ok) {
        // Nếu Server lỗi thì rollback lại dữ liệu cũ tránh sai sót
        throw new Error("Failed to sync with server")
      }
    } catch (error) {
      console.error("Lỗi đồng bộ nút Like:", error)
      // Rollback về trạng thái cũ nếu gọi API thất bại
      setUser(user)
      localStorage.setItem("kdrama_user", JSON.stringify(user))
    }
  }

  const isLiked = (dramaId: number): boolean => {
    return user?.likedDramas.includes(dramaId) || false
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      signup, 
      logout, 
      updateProfile,
      toggleLikeDrama,
      isLiked
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
