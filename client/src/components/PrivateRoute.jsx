"use client"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

const PrivateRoute = ({ children, userType }) => {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (userType && currentUser.userType !== userType) {
    return <Navigate to={`/${currentUser.userType}`} replace />
  }

  return children
}

export default PrivateRoute
