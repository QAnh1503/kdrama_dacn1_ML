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
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  updateProfile: (data: Partial<User>) => void
  toggleLikeDrama: (dramaId: number) => void
  isLiked: (dramaId: number) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem("kdrama_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // For demo, accept any valid email/password
    const savedUsers = JSON.parse(localStorage.getItem("kdrama_users") || "[]")
    const existingUser = savedUsers.find((u: {email: string, password: string}) => 
      u.email === email && u.password === password
    )
    
    if (existingUser) {
      const userData: User = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        avatar: existingUser.avatar || null,
        birthday: existingUser.birthday || null,
        gender: existingUser.gender || null,
        likedDramas: existingUser.likedDramas || []
      }
      setUser(userData)
      localStorage.setItem("kdrama_user", JSON.stringify(userData))
      return true
    }
    
    return false
  }

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const savedUsers = JSON.parse(localStorage.getItem("kdrama_users") || "[]")
    const exists = savedUsers.some((u: {email: string}) => u.email === email)
    
    if (exists) {
      return false
    }
    
    const newUser = {
      id: crypto.randomUUID(),
      email,
      password,
      name,
      avatar: null,
      birthday: null,
      gender: null,
      likedDramas: []
    }
    
    savedUsers.push(newUser)
    localStorage.setItem("kdrama_users", JSON.stringify(savedUsers))
    
    const userData: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar: null,
      birthday: null,
      gender: null,
      likedDramas: []
    }
    setUser(userData)
    localStorage.setItem("kdrama_user", JSON.stringify(userData))
    
    return true
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

  const toggleLikeDrama = (dramaId: number) => {
    if (!user) return
    
    const likedDramas = user.likedDramas.includes(dramaId)
      ? user.likedDramas.filter(id => id !== dramaId)
      : [...user.likedDramas, dramaId]
    
    updateProfile({ likedDramas })
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
