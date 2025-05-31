"use client"

import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { MapPin, Calendar, Clock, Users, Award, ArrowLeft } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useJobs } from "../contexts/JobContext"

const JobDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser, isProvider, isSeeker } = useAuth()
  const { jobs, applications, applyForJob, completeJob } = useJobs()
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState("")
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)

  const job = jobs.find((j) => j.id === id)

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Not Found</h2>
        <p className="text-gray-600 mb-6">The job you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  const myApplication = applications.find((app) => app.jobId === id && app.seekerId === currentUser?.id)

  const selectedApplication = applications.find((app) => app.jobId === id && app.status === "selected")

  const isJobOwner = isProvider && job.providerId === currentUser?.id
  const isAssignedSeeker = isSeeker && job.assignedTo === currentUser?.id
  const canComplete = (isJobOwner || isAssignedSeeker) && job.status === "assigned"
  const canViewContact = isJobOwner || (isAssignedSeeker && job.status === "assigned")

  const handleApply = () => {
    if (applyForJob(id)) {
      alert("Application submitted successfully!")
    } else {
      alert("You have already applied for this job.")
    }
  }

  const handleComplete = (e) => {
    e.preventDefault()
    if (completeJob(id, rating, feedback)) {
      setShowFeedbackForm(false)
      alert("Job marked as completed and feedback submitted!")
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-emerald-600 hover:text-emerald-800">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Job Details</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <MapPin size={18} className="mr-3 text-emerald-600" />
                  <span>{job.location}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Calendar size={18} className="mr-3 text-emerald-600" />
                  <span>Posted on {formatDate(job.createdAt)}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Clock size={18} className="mr-3 text-emerald-600" />
                  <span>Duration: {job.duration}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Award size={18} className="mr-3 text-emerald-600" />
                  <span>Payment: {job.payment}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Users size={18} className="mr-3 text-emerald-600" />
                  <span>{job.applicants} applicant(s)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Description</h3>
              <p className="text-gray-600">{job.description}</p>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {canViewContact && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                {isJobOwner ? "Selected Applicant Contact" : "Job Provider Contact"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">
                    {isJobOwner ? selectedApplication?.seekerName || "No one selected yet" : job.providerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">
                    {isJobOwner
                      ? selectedApplication?.seekerId + "@village.com" || "N/A"
                      : job.providerId + "@village.com"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">123-456-7890</p>
                </div>
              </div>
            </div>
          )}

          {job.status === "completed" && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Job Completion</h3>
              <p className="text-gray-600">
                This job was completed on {formatDate(job.completedAt || new Date().toISOString())}.
              </p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white mr-3">
                  {job.providerName.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{job.providerName}</div>
                  <div className="text-sm text-gray-500">Job Provider</div>
                </div>
              </div>

              <div className="flex space-x-3">
                {isJobOwner && job.status === "open" && (
                  <Link
                    to={`/provider/applications/${job.id}`}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    View Applications
                  </Link>
                )}

                {isSeeker && job.status === "open" && !myApplication && (
                  <button
                    onClick={handleApply}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Apply Now
                  </button>
                )}

                {isSeeker && myApplication && (
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      myApplication.status === "selected"
                        ? "bg-green-100 text-green-800"
                        : myApplication.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {myApplication.status === "selected"
                      ? "You were selected!"
                      : myApplication.status === "rejected"
                        ? "Not selected"
                        : "Application pending"}
                  </div>
                )}

                {canComplete && !showFeedbackForm && (
                  <button
                    onClick={() => setShowFeedbackForm(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>

          {showFeedbackForm && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Complete Job & Provide Feedback</h3>
              <form onSubmit={handleComplete} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-2xl focus:outline-none"
                      >
                        {star <= rating ? "★" : "☆"}
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">{rating} out of 5</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Complete & Submit
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobDetails
