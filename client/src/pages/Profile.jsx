"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useJobs } from "../contexts/JobContext"

const Profile = () => {
  const { currentUser, isProvider, isSeeker, updateProfile } = useAuth()
  const { getProviderJobs, getSeekerApplications } = useJobs()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: currentUser.name,
    location: currentUser.location,
    bio: currentUser.bio,
    skills: currentUser.skills ? currentUser.skills.join(", ") : "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Process the form data
      const userData = {
        ...formData,
        skills: isSeeker ? formData.skills.split(",").map((skill) => skill.trim().toLowerCase()) : currentUser.skills,
      }

      await updateProfile(userData)
      setIsEditing(false)
    } catch (error) {
      setError("Failed to update profile. Please try again.")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // These functions now return promises, so we need to handle them differently
  const [stats, setStats] = useState({
    providerJobs: [],
    applications: [],
    completedJobs: 0,
    openJobs: 0,
    acceptedApplications: 0,
    pendingApplications: 0,
  })

  // Load stats when component mounts
  useEffect(() => {
    const loadStats = async () => {
      try {
        if (isProvider) {
          const providerJobs = await getProviderJobs()
          const completedJobs = providerJobs.filter((job) => job.status === "completed").length
          const openJobs = providerJobs.filter((job) => job.status === "open").length

          setStats((prev) => ({
            ...prev,
            providerJobs,
            completedJobs,
            openJobs,
          }))
        }

        if (isSeeker) {
          const applications = await getSeekerApplications()
          const acceptedApplications = applications.filter((app) => app.status === "selected").length
          const pendingApplications = applications.filter((app) => app.status === "pending").length

          setStats((prev) => ({
            ...prev,
            applications,
            acceptedApplications,
            pendingApplications,
          }))
        }
      } catch (error) {
        console.error("Error loading stats:", error)
      }
    }

    loadStats()
  }, [isProvider, isSeeker, getProviderJobs, getSeekerApplications])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-32 bg-emerald-600"></div>
        <div className="px-6 py-4 md:px-8 md:py-6">
          <div className="flex flex-col md:flex-row md:items-end -mt-16 mb-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-emerald-100 flex items-center justify-center text-emerald-800 text-4xl font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="mt-4 md:mt-0 md:ml-6 md:mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{currentUser.name}</h1>
              <p className="text-gray-600">{currentUser.userType === "provider" ? "Job Provider" : "Job Seeker"}</p>
            </div>
            <div className="mt-4 md:mt-0 md:ml-auto">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select location</option>
                  <option value="North Village">North Village</option>
                  <option value="South Village">South Village</option>
                  <option value="East Village">East Village</option>
                  <option value="West Village">West Village</option>
                  <option value="Central Village">Central Village</option>
                </select>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {isSeeker && (
                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                    Skills (comma separated)
                  </label>
                  <input
                    id="skills"
                    name="skills"
                    type="text"
                    value={formData.skills}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-800 mb-2">About</h2>
                  <p className="text-gray-600">{currentUser.bio}</p>
                </div>

                {isSeeker && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-800 mb-2">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {currentUser.skills &&
                        currentUser.skills.map((skill, index) => (
                          <span key={index} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-medium text-gray-800 mb-2">Contact Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p>{currentUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p>{currentUser.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p>{currentUser.phone || "123-456-7890"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p>{new Date(currentUser.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-lg font-medium text-gray-800 mb-3">Stats</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Rating</p>
                      <div className="flex items-center">
                        <div className="flex">
                          {Array(5)
                            .fill(0)
                            .map((_, i) => (
                              <span key={i} className="text-yellow-400">
                                {i < Math.floor(currentUser.rating || 0) ? "★" : "☆"}
                              </span>
                            ))}
                        </div>
                        <span className="ml-2">{(currentUser.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>

                    {isProvider && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Jobs Posted</p>
                          <p className="font-medium">{stats.providerJobs.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Completed Jobs</p>
                          <p className="font-medium">{stats.completedJobs}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Open Jobs</p>
                          <p className="font-medium">{stats.openJobs}</p>
                        </div>
                      </>
                    )}

                    {isSeeker && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Applications</p>
                          <p className="font-medium">{stats.applications.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Jobs Accepted</p>
                          <p className="font-medium">{stats.acceptedApplications}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Pending Applications</p>
                          <p className="font-medium">{stats.pendingApplications}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
