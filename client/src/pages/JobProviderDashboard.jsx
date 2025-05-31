"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Plus, Filter } from "lucide-react"
import JobCard from "../components/JobCard"

const JobProviderDashboard = () => {
  const [statusFilter, setStatusFilter] = useState("all")
  const [providerJobs, setProviderJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoadingJobs(true)
        const token = localStorage.getItem("token")
        const response = await fetch("http://localhost:8000/jobs/provider", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) {
          throw new Error("Failed to fetch jobs")
        }
        const jobs = await response.json()
        setProviderJobs(Array.isArray(jobs) ? jobs : [])
      } catch (error) {
        console.error("Error fetching provider jobs:", error)
        setProviderJobs([])
      } finally {
        setLoadingJobs(false)
      }
    }

    fetchJobs()
  }, [])

  const filteredJobs = statusFilter === "all" ? providerJobs : providerJobs.filter((job) => job.status === statusFilter)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Job Listings</h1>
        <Link
          to="/provider/post-job"
          className="bg-emerald-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Post New Job
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center">
          <Filter size={20} className="text-gray-500 mr-2" />
          <span className="text-gray-700 font-medium mr-4">Filter by status:</span>
          <div className="flex space-x-2">
            {["all", "open", "assigned", "completed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md text-sm ${
                  statusFilter === status ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadingJobs ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Loading jobs...</h3>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No jobs found</h3>
          <p className="text-gray-500 mb-4">
            {statusFilter === "all" ? "You haven't posted any jobs yet." : `You don't have any ${statusFilter} jobs.`}
          </p>
          <Link
            to="/provider/post-job"
            className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
          >
            Post Your First Job
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} showApply={false} showApplications={true} />
          ))}
        </div>
      )}
    </div>
  )
}

export default JobProviderDashboard
