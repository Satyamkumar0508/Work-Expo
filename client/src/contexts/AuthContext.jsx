"use client"

import { createContext, useState, useContext, useEffect } from "react"
import axios from "axios"

const API_URL = "http://localhost:8000" // Change this to your backend URL

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  // Configure axios defaults
  axios.defaults.baseURL = API_URL

  // Add response interceptor for handling 401 errors
  useEffect(() => {
    // Add response interceptor for handling 401 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // If we get a 401, the token is invalid or expired
          console.log("Session expired. Logging out...")
          logout()
        }
        return Promise.reject(error)
      },
    )

    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [])

  // Add token to requests if available
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common["Authorization"]
    }
  }, [token])

  useEffect(() => {
    // Check if user is stored in localStorage (simulating persistent auth)
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("currentUser")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setCurrentUser(JSON.parse(storedUser))

      // Verify token is still valid by fetching user profile
      axios
        .get("/users/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        .catch(() => {
          // If token is invalid, log out
          logout()
        })
    }

    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      // Use the token endpoint with username/password
      const response = await axios.post(
        "/token",
        new URLSearchParams({
          username: email,
          password: password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      )

      const { access_token } = response.data

      // Set the token in axios and state
      setToken(access_token)
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`

      // Get user profile
      const userResponse = await axios.get("/users/me")
      const userData = userResponse.data

      setCurrentUser(userData)
      localStorage.setItem("token", access_token)
      localStorage.setItem("currentUser", JSON.stringify(userData))

      return userData
    } catch (error) {
      console.error("Login error:", error)
      return null
    }
  }

  const register = async (userData) => {
    try {
      // Register the user
      const response = await axios.post("/register", userData)

      // After registration, log them in
      const loginResult = await login(userData.email, userData.password)

      if (!loginResult) {
        throw new Error("Auto-login after registration failed")
      }

      return loginResult
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setToken(null)
    localStorage.removeItem("token")
    localStorage.removeItem("currentUser")
  }

  const updateProfile = async (userData) => {
    try {
      const response = await axios.put("/users/me", userData)
      const updatedUser = response.data

      setCurrentUser(updatedUser)
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))

      return updatedUser
    } catch (error) {
      console.error("Update profile error:", error)
      throw error
    }
  }

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateProfile,
    isProvider: currentUser?.userType === "provider",
    isSeeker: currentUser?.userType === "seeker",
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
