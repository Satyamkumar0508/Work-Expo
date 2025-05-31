"use client"

import { useState, useEffect } from "react"
import { Filter, MapPin, Briefcase } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import JobCard from "../components/JobCard"

const JobSeekerDashboard = () => {
  const { currentUser } = useAuth()
  const [viewMode, setViewMode] = useState("available")
  const [locationFilter, setLocationFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState(["all"])
  const [categories, setCategories] = useState(["all"])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        let jobsData = []
        if (viewMode === "available") {
          // Fetch all open jobs with optional filters
          let url = `http://localhost:8000/jobs?status=open`
          if (locationFilter !== "all") url += `&location=${encodeURIComponent(locationFilter)}`
          if (categoryFilter !== "all") url += `&category=${encodeURIComponent(categoryFilter)}`
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
          jobsData = await response.json()
        } else if (viewMode === "matching") {
          // Fetch matching jobs
          const response = await fetch("http://localhost:8000/jobs/matching", {
            headers: { Authorization: `Bearer ${token}` },
          })
          jobsData = await response.json()
          if (locationFilter !== "all") {
            jobsData = jobsData.filter((job) => job.location === locationFilter)
          }
          if (categoryFilter !== "all") {
            jobsData = jobsData.filter((job) => job.category === categoryFilter)
          }
        } else {
          // Fetch applications
          const response = await fetch("http://localhost:8000/applications/seeker", {
            headers: { Authorization: `Bearer ${token}` },
          })
          const applicationsData = await response.json()
          setApplications(applicationsData || [])
          // Get job details for each application
          const jobsResponse = await fetch("http://localhost:8000/jobs?status=open", {
            headers: { Authorization: `Bearer ${token}` },
          })
          const availableJobs = await jobsResponse.json()
          jobsData = applicationsData.map((app) => {
            const job = availableJobs.find((j) => j.id === app.jobId) || {
              id: app.jobId,
              title: "Job no longer available",
              status: "unknown",
              location: "",
              category: "",
              requiredSkills: [],
              applicants: 0,
              providerName: "",
              payment: "",
              duration: "",
              createdAt: new Date().toISOString(),
            }
            return { ...job, applicationStatus: app.status }
          })
        }
        setJobs(jobsData || [])
        // Extract unique locations and categories
        const allLocations = ["all", ...new Set(jobsData.map((job) => job.location).filter(Boolean))]
        const allCategories = ["all", ...new Set(jobsData.map((job) => job.category).filter(Boolean))]
        setLocations(allLocations)
        setCategories(allCategories)
      } catch (error) {
        console.error("Error fetching data:", error)
        setJobs([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [viewMode, locationFilter, categoryFilter])

  // Filter jobs based on selected filters
  const filteredJobs = jobs

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Find Jobs</h1>
        <p className="text-gray-600">
          Welcome back, {currentUser.name}! Find the perfect job that matches your skills.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center mr-6">
            <Briefcase size={20} className="text-gray-500 mr-2" />
            <span className="text-gray-700 font-medium mr-4">View:</span>
            <div className="flex space-x-2">
              {["available", "matching", "applications"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    viewMode === mode ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {mode === "available" ? "All Jobs" : mode === "matching" ? "Matching Jobs" : "My Applications"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center mr-6">
            <MapPin size={20} className="text-gray-500 mr-2" />
            <span className="text-gray-700 font-medium mr-4">Location:</span>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 border-none focus:ring-2 focus:ring-emerald-500"
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location === "all" ? "All Locations" : location}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <Filter size={20} className="text-gray-500 mr-2" />
            <span className="text-gray-700 font-medium mr-4">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 border-none focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Loading jobs...</h3>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No jobs found</h3>
          <p className="text-gray-500">
            {viewMode === "available"
              ? "There are no available jobs matching your filters."
              : viewMode === "matching"
                ? "There are no jobs matching your skills at the moment."
                : "You haven't applied to any jobs yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} showApply={viewMode !== "applications"} />
          ))}
        </div>
      )}
    </div>
  )
}

export default JobSeekerDashboard
