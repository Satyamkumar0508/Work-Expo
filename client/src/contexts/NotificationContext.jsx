"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { useAuth } from "./AuthContext"
import axios from "axios"

const NotificationContext = createContext()

export const useNotifications = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Fetch notifications when user changes
  useEffect(() => {
    if (currentUser) {
      fetchNotifications()
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [currentUser])

  const fetchNotifications = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const response = await axios.get("/notifications")
      const notificationsData = response.data || []

      setNotifications(notificationsData)
      setUnreadCount(notificationsData.filter((notification) => !notification.read).length)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      // Don't update state on error to keep previous data
      // If this is the first load, set empty array
      if (notifications.length === 0) {
        setNotifications([])
        setUnreadCount(0)
      }
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`)

      setNotifications(
        notifications.map((notification) => {
          if (notification.id === notificationId) {
            return { ...notification, read: true }
          }
          return notification
        }),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.put("/notifications/read-all")

      setNotifications(notifications.map((notification) => ({ ...notification, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading,
    refreshNotifications: fetchNotifications,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
