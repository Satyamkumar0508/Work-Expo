import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { NotificationProvider } from "./contexts/NotificationContext"
import { JobProvider } from "./contexts/JobContext"
import ErrorBoundary from "./components/ErrorBoundary"
import PrivateRoute from "./components/PrivateRoute"
import Login from "./pages/Login"
import Register from "./pages/Register"
import JobProviderDashboard from "./pages/JobProviderDashboard"
import JobSeekerDashboard from "./pages/JobSeekerDashboard"
import JobDetails from "./pages/JobDetails"
import PostJob from "./pages/PostJob"
import Applications from "./pages/Applications"
import Profile from "./pages/Profile"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <JobProvider>
            <div className="flex flex-col min-h-screen bg-gray-50">
              <Navbar />
              <main className="flex-grow container mx-auto px-4 py-8">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/job/:id" element={<JobDetails />} />

                    <Route
                      path="/provider"
                      element={
                        <PrivateRoute userType="provider">
                          <JobProviderDashboard />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/provider/post-job"
                      element={
                        <PrivateRoute userType="provider">
                          <PostJob />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/provider/applications/:jobId"
                      element={
                        <PrivateRoute userType="provider">
                          <Applications />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/seeker"
                      element={
                        <PrivateRoute userType="seeker">
                          <JobSeekerDashboard />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/profile"
                      element={
                        <PrivateRoute>
                          <Profile />
                        </PrivateRoute>
                      }
                    />

                    <Route path="/" element={<Navigate to="/login" replace />} />
                  </Routes>
                </ErrorBoundary>
              </main>
              <Footer />
            </div>
          </JobProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
