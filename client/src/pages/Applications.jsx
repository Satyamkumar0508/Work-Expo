"use client"
import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft } from 'lucide-react'
import ApplicationCard from "../components/ApplicationCard"

const Applications = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        // Fetch job details from backend
        const jobRes = await fetch(`http://localhost:8000/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!jobRes.ok) throw new Error("Job not found")
        const jobData = await jobRes.json()
        setJob(jobData)

        // Fetch applications for this job
        const appRes = await fetch(`http://localhost:8000/applications/job/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!appRes.ok) throw new Error("Failed to load applications")
        const jobApplications = await appRes.json()
        setApplications(Array.isArray(jobApplications) ? jobApplications : [])
      } catch (err) {
        console.error("Error fetching job applications:", err)
        setError(err.message || "Failed to load applications. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [jobId])

  if (loading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Loading...</h2>
        <p className="text-gray-600">Please wait while we fetch the applications.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Error</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate("/provider")}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Not Found</h2>
        <p className="text-gray-600 mb-6">The job you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate("/provider")}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-emerald-600 hover:text-emerald-800">
          <ArrowLeft size={18} className="mr-2" />
          Back to Job
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Applications for "{job.title}"</h1>
        <p className="text-gray-600 mb-4">
          {applications.length} {applications.length === 1 ? "applicant" : "applicants"} for this job
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="font-medium mr-2">Status:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                job.status === "open"
                  ? "bg-green-100 text-green-800"
                  : job.status === "assigned"
                    ? "bg-blue-100 text-blue-800"
                    : job.status === "completed"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          <div>
            <span className="font-medium">Location:</span> {job.location}
          </div>
          <div>
            <span className="font-medium">Payment:</span> {job.payment}
          </div>
          <div>
            <span className="font-medium">Duration:</span> {job.duration}
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No applications yet</h3>
          <p className="text-gray-500 mb-4">There are no applications for this job yet. Check back later.</p>
          <Link
            to="/provider"
            className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Applications
