"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MapPin, Calendar, Clock, Users, Award } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useJobs } from "../contexts/JobContext"

const JobCard = ({ job, showApply = true, showApplications = false }) => {
  const { currentUser, isSeeker } = useAuth()
  const { getJobApplications, applyForJob } = useJobs()
  const [hasApplied, setHasApplied] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check if user has applied for this job
  useEffect(() => {
    const checkIfApplied = async () => {
      if (isSeeker && currentUser && job) {
        try {
          const applications = await getJobApplications(job.id)
          setHasApplied(applications.some((app) => app.seekerId === currentUser.id))
        } catch (error) {
          console.error("Error checking application status:", error)
          setHasApplied(false)
        }
      }
    }

    checkIfApplied()
  }, [isSeeker, currentUser, job, getJobApplications])

  const handleApply = async (e) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    try {
      const result = await applyForJob(job.id)
      if (result) {
        setHasApplied(true)
        alert("Application submitted successfully!")
      } else {
        alert("You have already applied for this job.")
      }
    } catch (error) {
      console.error("Error applying for job:", error)
      alert("Failed to apply for job. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (!job) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{job.title}</h3>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
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
          </div>
        </div>

        <p className="text-gray-600 mb-4">{job.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center text-gray-600">
            <MapPin size={16} className="mr-2 text-emerald-600" />
            <span>{job.location}</span>
          </div>

          <div className="flex items-center text-gray-600">
            <Calendar size={16} className="mr-2 text-emerald-600" />
            <span>{formatDate(job.createdAt)}</span>
          </div>

          <div className="flex items-center text-gray-600">
            <Clock size={16} className="mr-2 text-emerald-600" />
            <span>{job.duration}</span>
          </div>

          <div className="flex items-center text-gray-600">
            <Users size={16} className="mr-2 text-emerald-600" />
            <span>{job.applicants} applicant(s)</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Required Skills:</div>
          <div className="flex flex-wrap gap-2">
            {job.requiredSkills &&
              job.requiredSkills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                  {skill}
                </span>
              ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white mr-2">
              {job.providerName && job.providerName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium">{job.providerName}</div>
              <div className="flex items-center text-xs text-gray-500">
                <Award size={12} className="mr-1 text-yellow-500" />
                <span>{job.payment}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            {showApplications && (
              <Link
                to={`/provider/applications/${job.id}`}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md text-sm font-medium hover:bg-emerald-200 transition-colors"
              >
                View Applications
              </Link>
            )}

            <Link
              to={`/job/${job.id}`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Details
            </Link>

            {isSeeker && showApply && job.status === "open" && (
              <button
                onClick={handleApply}
                disabled={hasApplied || loading}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  hasApplied || loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {loading ? "Applying..." : hasApplied ? "Applied" : "Apply"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobCard
