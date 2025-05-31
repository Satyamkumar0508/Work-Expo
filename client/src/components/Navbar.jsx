"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useNotifications } from "../contexts/NotificationContext"
import { Bell, Menu, X, LogOut, User } from "lucide-react"

const Navbar = () => {
  const { currentUser, logout, isProvider, isSeeker } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)

    // Navigate based on notification type
    if (notification.type === "new-application") {
      // Extract job ID from the message (this is a simplification)
      const jobId = notification.message.split(":")[1]?.trim()
      navigate(`/provider/applications/${jobId}`)
    } else if (notification.type === "job-selected") {
      navigate("/seeker")
    } else if (notification.type === "new-matching-job") {
      navigate("/seeker")
    }

    setShowNotifications(false)
  }

  return (
    <header className="bg-emerald-700 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold">
            Workers Globe
          </Link>

          <div className="md:hidden">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2" aria-label="Toggle menu">
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <nav
            className={`${
              showMobileMenu ? "flex" : "hidden"
            } md:flex flex-col md:flex-row absolute md:relative top-14 md:top-0 left-0 right-0 bg-emerald-700 md:bg-transparent z-50 md:z-auto p-4 md:p-0 shadow-md md:shadow-none`}
          >
            {currentUser ? (
              <>
                {isProvider && (
                  <>
                    <Link
                      to="/provider"
                      className="block py-2 px-4 hover:bg-emerald-600 md:hover:bg-transparent md:hover:text-emerald-200 rounded"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/provider/post-job"
                      className="block py-2 px-4 hover:bg-emerald-600 md:hover:bg-transparent md:hover:text-emerald-200 rounded"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Post Job
                    </Link>
                  </>
                )}

                {isSeeker && (
                  <Link
                    to="/seeker"
                    className="block py-2 px-4 hover:bg-emerald-600 md:hover:bg-transparent md:hover:text-emerald-200 rounded"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Find Jobs
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="block py-2 px-4 hover:bg-emerald-600 md:hover:bg-transparent md:hover:text-emerald-200 rounded"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center py-2 px-4 hover:bg-emerald-600 md:hover:bg-transparent md:hover:text-emerald-200 rounded text-left"
                >
                  <LogOut size={18} className="mr-2" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 px-4 hover:bg-emerald-600 md:hover:bg-transparent md:hover:text-emerald-200 rounded"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block py-2 px-4 hover:bg-emerald-600 md:hover:bg-transparent md:hover:text-emerald-200 rounded"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Register
                </Link>
              </>
            )}
          </nav>

          {currentUser && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="p-2 rounded-full hover:bg-emerald-600 relative"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 font-medium flex justify-between items-center">
                      <span>Notifications</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAllAsRead()
                          }}
                          className="text-sm text-emerald-600 hover:text-emerald-800"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No notifications</div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notification.read ? "bg-emerald-50" : ""
                          }`}
                        >
                          <div className="font-medium">{notification.title}</div>
                          <div className="text-sm text-gray-600">{notification.message}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <Link to="/profile" className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center mr-2">
                    <User size={16} />
                  </div>
                  <span className="hidden lg:inline">{currentUser.name}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
